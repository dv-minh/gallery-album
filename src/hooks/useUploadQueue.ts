import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, uploadVariant } from '../lib/api';
import { prepareImage } from '../lib/image';

export type UploadStatus = 'queued' | 'preparing' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: number;
  file: File;
  status: UploadStatus;
  progress: number; // 0..100
  error?: string;
}

const CONCURRENCY = 3;
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
export const isImageFile = (f: File) => f.type.startsWith('image/') || IMAGE_RE.test(f.name);

/** Hàng đợi upload: mỗi ảnh = sinh thumb/medium → tạo bản ghi → PUT 3 biến thể. Chạy song song tối đa 3 ảnh. */
export function useUploadQueue(albumId: string) {
  const qc = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const controllers = useRef(new Map<number, AbortController>());
  const active = useRef(0);
  const seq = useRef(0);

  const commit = (next: UploadItem[]) => { itemsRef.current = next; setItems(next); };
  const patch = (id: number, p: Partial<UploadItem>) =>
    commit(itemsRef.current.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const refresh = useCallback(() => Promise.all([
    qc.invalidateQueries({ queryKey: ['photos'] }),
    qc.invalidateQueries({ queryKey: ['albums'] }),
    qc.invalidateQueries({ queryKey: ['storage'] }),
  ]), [qc]);

  const processOne = useCallback(async (item: UploadItem) => {
    const ac = new AbortController();
    controllers.current.set(item.id, ac);
    let photoId: string | null = null;
    try {
      patch(item.id, { status: 'preparing', progress: 0, error: undefined });
      const prep = await prepareImage(item.file);
      const photo = await api.createPhoto(albumId, {
        name: item.file.name, size: item.file.size, mime: item.file.type || 'image/jpeg',
        width: prep.width, height: prep.height,
      });
      photoId = photo.id;

      patch(item.id, { status: 'uploading' });
      const parts = [['thumb', prep.thumb], ['medium', prep.medium], ['original', item.file]] as const;
      const total = parts.reduce((s, [, b]) => s + b.size, 0);
      let done = 0;
      for (const [variant, blob] of parts) {
        await uploadVariant(photo.id, variant, blob, {
          signal: ac.signal,
          onProgress: (loaded) => patch(item.id, { progress: Math.round(((done + loaded) / total) * 100) }),
        });
        done += blob.size;
      }
      patch(item.id, { status: 'done', progress: 100 });
    } catch (e) {
      if (photoId) api.deletePhoto(photoId).catch(() => undefined); // dọn bản ghi dở dang
      patch(item.id, { status: 'error', error: e instanceof Error ? e.message : 'Lỗi không xác định' });
    } finally {
      controllers.current.delete(item.id);
    }
  }, [albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pump = useCallback(() => {
    while (active.current < CONCURRENCY) {
      const next = itemsRef.current.find((i) => i.status === 'queued');
      if (!next) break;
      patch(next.id, { status: 'preparing' });
      active.current++;
      processOne(next).finally(() => {
        active.current--;
        if (active.current === 0 && !itemsRef.current.some((i) => i.status === 'queued')) void refresh();
        pump();
      });
    }
  }, [processOne, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

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
