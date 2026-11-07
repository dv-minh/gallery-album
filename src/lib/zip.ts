import { Zip, ZipPassThrough } from 'fflate';
import type { Photo } from '../../shared/types';
import { downloadUrl } from './api';

/** Nén ZIP ngay trên trình duyệt (ảnh đã nén sẵn nên chỉ "lưu"). Cả album nằm trong bộ nhớ khi tạo file. */
export async function downloadZip(
  photos: Photo[], zipName: string, onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const chunks: Uint8Array[] = [];
  let failed: Error | null = null;
  const zip = new Zip((err, chunk) => { if (err) failed = err; else chunks.push(chunk); });
  const used = new Set<string>();

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const res = await fetch(downloadUrl(p.id));
    if (!res.ok) throw new Error(`Không tải được "${p.name}".`);
    let name = p.name;
    for (let n = 2; used.has(name); n++) name = p.name.replace(/(\.[^.]*)?$/, ` (${n})$1`);
    used.add(name);

    const entry = new ZipPassThrough(name);
    zip.add(entry);
    entry.push(new Uint8Array(await res.arrayBuffer()), true);
    onProgress?.(i + 1, photos.length);
  }
  zip.end();
  if (failed) throw failed;

  const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'application/zip' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${zipName}.zip` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
