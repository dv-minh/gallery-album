/**
 * Client API duy nhất của ứng dụng. Component/hook KHÔNG gọi fetch trực tiếp.
 * Hợp đồng endpoint: docs/api.md.
 */
import type { Album, CreatePhotoInput, Photo, PhotoPage, Storage, Variant } from '../../shared/types';

const ADMIN_KEY = 'gallery:admin-code';

export const adminCode = {
  get: () => { try { return localStorage.getItem(ADMIN_KEY) ?? ''; } catch { return ''; } },
  set: (v: string) => { try { localStorage.setItem(ADMIN_KEY, v); } catch { /* bỏ qua */ } },
  clear: () => { try { localStorage.removeItem(ADMIN_KEY); } catch { /* bỏ qua */ } },
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const code = adminCode.get();
  if (code) headers.set('x-admin-code', code);
  let body = init.body;
  if (init.json !== undefined) { headers.set('content-type', 'application/json'); body = JSON.stringify(init.json); }

  const res = await fetch(path, { ...init, headers, body });
  if (!res.ok) {
    let msg = `Lỗi ${res.status}`;
    try { msg = ((await res.json()) as { error?: string }).error ?? msg; } catch { /* không phải JSON */ }
    throw new ApiError(msg, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const qs = (o: Record<string, string | number | null | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** URL ảnh. Nếu sau này bật public bucket/domain riêng, chỉ cần đổi hàm này. */
export const imageUrl = (id: string, variant: Variant) => `/img/${id}/${variant}`;
export const downloadUrl = (id: string) => `/api/photos/${id}/download`;

export const api = {
  verify: (code: string) =>
    request<void>('/api/verify', { method: 'POST', headers: { 'x-admin-code': code } }),

  listAlbums: () => request<Album[]>('/api/albums'),
  createAlbum: (name: string) => request<Album>('/api/albums', { method: 'POST', json: { name } }),
  renameAlbum: (id: string, name: string) => request<void>(`/api/albums/${id}`, { method: 'PATCH', json: { name } }),
  moveAlbum: (id: string, direction: -1 | 1) => request<void>(`/api/albums/${id}/move`, { method: 'POST', json: { direction } }),
  deleteAlbum: (id: string) => request<void>(`/api/albums/${id}`, { method: 'DELETE' }),

  listPhotos: (o: { albumId?: string; favorite?: boolean; cursor?: number | null; limit?: number }) =>
    request<PhotoPage>(
      (o.albumId ? `/api/albums/${o.albumId}/photos` : '/api/photos') +
        qs({ favorite: o.favorite ? 1 : undefined, cursor: o.cursor, limit: o.limit }),
    ),
  createPhoto: (albumId: string, input: CreatePhotoInput) =>
    request<Photo>(`/api/albums/${albumId}/photos`, { method: 'POST', json: input }),
  updatePhoto: (id: string, patch: { story?: string; meta?: string }) =>
    request<void>(`/api/photos/${id}`, { method: 'PATCH', json: patch }),
  toggleFavorite: (id: string) => request<{ favorite: boolean }>(`/api/photos/${id}/favorite`, { method: 'POST' }),
  deletePhoto: (id: string) => request<void>(`/api/photos/${id}`, { method: 'DELETE' }),

  getStorage: () => request<Storage>('/api/storage'),
};

/** Upload một biến thể (stream body) bằng XHR để có tiến trình theo byte. */
export function uploadVariant(
  photoId: string, variant: Variant, blob: Blob,
  opts: { signal?: AbortSignal; onProgress?: (loaded: number) => void } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/photos/${photoId}/file/${variant}`);
    xhr.setRequestHeader('x-admin-code', adminCode.get());
    xhr.upload.onprogress = (e) => opts.onProgress?.(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Lỗi ${xhr.status}`;
      try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch { /* bỏ qua */ }
      reject(new ApiError(msg, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Lỗi mạng khi tải lên.', 0));
    xhr.onabort = () => reject(new ApiError('Đã huỷ.', 0));
    opts.signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(blob);
  });
}
