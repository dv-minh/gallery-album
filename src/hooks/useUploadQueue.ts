import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, uploadVariant } from '../lib/api';
import { prepareImage, type Prepared } from '../lib/image';

export type UploadStatus = 'queued' | 'preparing' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: number;
  file: File;
  status: UploadStatus;
  progress: number; // 0..100
  error?: string;
}

const PREPARE_CONCURRENCY = 3;   // giải mã + resize ở trình duyệt (tốn RAM/CPU)
const UPLOAD_CONCURRENCY = 3;    // PUT lên R2
const BATCH_MIN = 6;             // đủ ngần này ảnh đã chuẩn bị thì tạo bản ghi ngay
const BATCH_MAX = 20;
const BUFFER_MAX = 12;           // số ảnh đã resize được giữ trong RAM chờ upload
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
export const isImageFile = (f: File) => f.type.startsWith('image/') || IMAGE_RE.test(f.name);

interface Prepped { item: UploadItem; prep: Prepared }
interface Created extends Prepped { photoId: string }

/**
 * Hàng đợi upload 3 giai đoạn:
 *  1. chuẩn bị: sinh thumb/medium (tối đa 3 ảnh song song)
 *  2. tạo bản ghi: GOM nhiều ảnh vào một request `POST /photos/batch`
 *  3. upload: PUT thumb/medium/original lên R2 (tối đa 3 ảnh song song)
 * Gom batch thích ứng: ảnh đầu tạo ngay cho upload chạy sớm; trong lúc upload, các ảnh sau dồn lại rồi tạo một lượt.
 */
export function useUploadQueue(albumId: string) {
  const qc = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const controllers = useRef(new Map<number, AbortController>());
  const seq = useRef(0);
  const st = useRef({ prep: 0, creating: false, up: 0, dirty: false });
  const prepared = useRef<Prepped[]>([]);
  const ready = useRef<Created[]>([]);

  const commit = (next: UploadItem[]) => { itemsRef.current = next; setItems(next); };
  const patch = (id: number, p: Partial<UploadItem>) =>
    commit(itemsRef.current.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const fail = (id: number, e: unknown) =>
    patch(id, { status: 'error', error: e instanceof Error ? e.message : 'Lỗi không xác định' });

  const refresh = useCallback(() => Promise.all([
    qc.invalidateQueries({ queryKey: ['photos'] }),
    qc.invalidateQueries({ queryKey: ['albums'] }),
    qc.invalidateQueries({ queryKey: ['storage'] }),
  ]), [qc]);

  const uploadOne = useCallback(async ({ item, prep, photoId }: Created) => {
    const ac = new AbortController();
    controllers.current.set(item.id, ac);
    try {
      patch(item.id, { status: 'uploading' });
      const parts = [['thumb', prep.thumb], ['medium', prep.medium], ['original', item.file]] as const;
      const total = parts.reduce((s, [, b]) => s + b.size, 0);
      let done = 0;
      for (const [variant, blob] of parts) {
        await uploadVariant(photoId, variant, blob, {
          signal: ac.signal,
          onProgress: (loaded) => patch(item.id, { progress: Math.round(((done + loaded) / total) * 100) }),
        });
        done += blob.size;
      }
      patch(item.id, { status: 'done', progress: 100 });
      st.current.dirty = true;
    } catch (e) {
      api.deletePhoto(photoId).catch(() => undefined); // dọn bản ghi dở dang
      fail(item.id, e);
    } finally {
      controllers.current.delete(item.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pump = useCallback(() => {
    const s = st.current;

    // 1) Chuẩn bị
    while (s.prep < PREPARE_CONCURRENCY && prepared.current.length + ready.current.length < BUFFER_MAX) {
      const next = itemsRef.current.find((i) => i.status === 'queued');
      if (!next) break;
      patch(next.id, { status: 'preparing', progress: 0, error: undefined });
      s.prep++;
      prepareImage(next.file)
        .then((prep) => { prepared.current.push({ item: next, prep }); })
        .catch((e) => fail(next.id, e))
        .finally(() => { s.prep--; pump(); });
    }

    // 2) Tạo bản ghi theo lô
    if (!s.creating && prepared.current.length) {
      const backlog = ready.current.length + s.up;
      const noMore = s.prep === 0 && !itemsRef.current.some((i) => i.status === 'queued');
      if (prepared.current.length >= BATCH_MIN || backlog === 0 || noMore) {
        s.creating = true;
        const batch = prepared.current.splice(0, BATCH_MAX);
        api.createPhotos(albumId, batch.map(({ item, prep }) => ({
          name: item.file.name, size: item.file.size, mime: item.file.type || 'image/jpeg',
          width: prep.width, height: prep.height,
        })))
          .then((photos) => batch.forEach((b, i) => ready.current.push({ ...b, photoId: photos[i].id })))
          .catch((e) => batch.forEach((b) => fail(b.item.id, e)))
          .finally(() => { s.creating = false; pump(); });
      }
    }

    // 3) Upload
    while (s.up < UPLOAD_CONCURRENCY && ready.current.length) {
      const r = ready.current.shift()!;
      s.up++;
      void uploadOne(r).finally(() => { s.up--; pump(); });
    }

    // Xong hết: làm mới danh sách đúng một lần.
    const idle = s.prep === 0 && !s.creating && s.up === 0 && !prepared.current.length && !ready.current.length
      && !itemsRef.current.some((i) => i.status === 'queued');
    if (idle && s.dirty) { s.dirty = false; void refresh(); }
  }, [albumId, uploadOne, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback((files: File[]) => {
    const added: UploadItem[] = files.map((file) => ({ id: ++seq.current, file, status: 'queued', progress: 0 }));
    commit([...itemsRef.current, ...added]);
    pump();
  }, [pump]);

  const retry = useCallback((id: number) => { patch(id, { status: 'queued', error: undefined }); pump(); }, [pump]); // eslint-disable-line react-hooks/exhaustive-deps
  const cancel = useCallback((id: number) => {
    controllers.current.get(id)?.abort();
    commit(itemsRef.current.filter((i) => i.id !== id || i.status === 'uploading' || i.status === 'preparing'));
  }, []);
  const clearFinished = useCallback(() => commit(itemsRef.current.filter((i) => i.status !== 'done')), []);

  useEffect(() => () => controllers.current.forEach((c) => c.abort()), []);

  return { items, add, retry, cancel, clearFinished };
}
