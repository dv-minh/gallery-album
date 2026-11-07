/**
 * Dữ liệu giả (in-memory) để test UI mà không cần Worker/D1/R2.
 * Bật/tắt bằng VITE_USE_MOCK (xem src/config.ts). Cùng "hình dạng" với `api` thật trong api.ts.
 *
 * Ảnh thật: bỏ vào src/assets/dummy/ (xem README trong thư mục đó).
 * Không có ảnh nào thì tự sinh ảnh minh hoạ (SVG).
 */
import type { Album, CreatePhotoInput, Photo, PhotoPage, Storage, Variant } from '../../shared/types';
import { STORAGE_TOTAL } from '../../shared/types';

const files = import.meta.glob('../assets/dummy/**/*.{jpg,jpeg,png,webp,avif,gif}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

const delay = (ms = 250) => new Promise<void>((r) => setTimeout(r, ms));

/** Ảnh hero: file `cover.*` đặt ngay trong src/assets/dummy/. */
export const dummyHero: string | undefined =
  Object.entries(files).find(([p]) => /\/dummy\/cover\.[a-z]+$/i.test(p))?.[1];

const PALETTE: [string, string][] = [
  ['#e8d5c4', '#c5a880'], ['#f3e4d7', '#d9b99b'], ['#e6dccf', '#b79a6c'],
  ['#efe1d3', '#cda931'], ['#e9d8d0', '#a88b78'], ['#f1e8dc', '#8e7a5c'],
];
const RATIOS: [number, number][] = [[3, 4], [4, 3], [1, 1], [2, 3], [4, 5], [3, 2]];

function placeholder(n: number, label: string): string {
  const [w, h] = RATIOS[n % RATIOS.length];
  const [a, b] = PALETTE[n % PALETTE.length];
  const W = w * 200, H = h * 200;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<text x="50%" y="48%" text-anchor="middle" font-family="Georgia,serif" font-size="${Math.min(W, H) / 5}" fill="#ffffff" fill-opacity=".85">M&amp;L</text>` +
    `<text x="50%" y="60%" text-anchor="middle" font-family="sans-serif" font-size="${Math.min(W, H) / 16}" fill="#ffffff" fill-opacity=".8">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface Seed { album: string; name: string; url: string }

function buildSeeds(): Seed[] {
  const real = Object.entries(files)
    .filter(([p]) => !/\/dummy\/cover\.[a-z]+$/i.test(p))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([p, url]): Seed => {
      const rel = p.split('/dummy/')[1];
      const parts = rel.split('/');
      return { album: parts.length > 1 ? parts[0] : 'Ảnh Cưới', name: parts[parts.length - 1], url };
    });
  if (real.length) return real;

  const albums = ['Lễ Ăn Hỏi', 'Ngoại Cảnh Đà Lạt', 'Tiệc Cưới'];
  return Array.from({ length: 24 }, (_, i): Seed => ({
    album: albums[i % albums.length],
    name: `demo-${String(i + 1).padStart(2, '0')}.jpg`,
    url: placeholder(i, `Ảnh ${i + 1}`),
  }));
}

const STORIES = [
  'Khoảnh khắc đầu tiên của chúng mình.', 'Nụ cười không thể giấu.', 'Giữa sương sớm Đà Lạt.',
  'Cái nắm tay thật chặt.', '', 'Hoa và nắng.',
];

export class MockApi {
  private albums: Album[] = [];
  private photos: Photo[] = [];
  private urls = new Map<string, Partial<Record<Variant, string>>>();
  private seq = 0;

  constructor() {
    const byAlbum = new Map<string, Album>();
    buildSeeds().forEach((s, i) => {
      let album = byAlbum.get(s.album);
      if (!album) {
        album = { id: `al-${byAlbum.size + 1}`, name: s.album, description: '', position: byAlbum.size, photoCount: 0, coverPhotoId: null };
        byAlbum.set(s.album, album);
        this.albums.push(album);
      }
      const id = `ph-${++this.seq}`;
      this.photos.push({
        id, albumId: album.id, name: s.name, size: 2_400_000 + (i % 5) * 310_000, width: null, height: null,
        mime: 'image/jpeg', story: STORIES[i % STORIES.length], meta: '',
        position: i, createdAt: Date.now() - i * 60_000,
      });
      this.urls.set(id, { thumb: s.url, medium: s.url, original: s.url });
      album.photoCount++;
      album.coverPhotoId ??= id;
    });
  }

  /** URL ảnh theo id (thay cho /img/:id/:variant). */
  imageUrl(id: string, variant: Variant): string {
    const u = this.urls.get(id);
    return u?.[variant] ?? u?.medium ?? u?.thumb ?? u?.original ?? '';
  }

  private recount() {
    for (const a of this.albums) {
      const mine = this.photos.filter((p) => p.albumId === a.id);
      a.photoCount = mine.length;
      if (!mine.some((p) => p.id === a.coverPhotoId)) a.coverPhotoId = mine[0]?.id ?? null;
    }
  }

  verify = async (code: string): Promise<void> => {
    await delay(150);
    if (!code.trim()) throw new Error('Mã không đúng.');
  };

  listAlbums = async (): Promise<Album[]> => {
    await delay();
    return structuredClone([...this.albums].sort((a, b) => a.position - b.position));
  };
  createAlbum = async (name: string): Promise<Album> => {
    await delay();
    const a: Album = { id: `al-${++this.seq}`, name, description: '', position: this.albums.length, photoCount: 0, coverPhotoId: null };
    this.albums.push(a);
    return structuredClone(a);
  };
  renameAlbum = async (id: string, name: string): Promise<void> => {
    await delay();
    const a = this.albums.find((x) => x.id === id); if (a) a.name = name;
  };
  moveAlbum = async (id: string, direction: -1 | 1): Promise<void> => {
    await delay();
    const list = [...this.albums].sort((a, b) => a.position - b.position);
    const i = list.findIndex((a) => a.id === id), j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i].position, list[j].position] = [list[j].position, list[i].position];
  };
  deleteAlbum = async (id: string): Promise<void> => {
    await delay();
    this.albums = this.albums.filter((a) => a.id !== id);
    this.photos = this.photos.filter((p) => p.albumId !== id);
  };

  listPhotos = async (o: { albumId?: string; cursor?: number | null; limit?: number }): Promise<PhotoPage> => {
    await delay();
    const order = new Map(this.albums.map((a) => [a.id, a.position]));
    const all = this.photos
      .filter((p) => (!o.albumId || p.albumId === o.albumId))
      .sort((a, b) => (order.get(a.albumId)! - order.get(b.albumId)!) || a.position - b.position);
    const start = o.cursor ?? 0, limit = o.limit ?? 30;
    const items = all.slice(start, start + limit);
    return structuredClone({ items, nextCursor: start + limit < all.length ? start + limit : null });
  };
  uploadHero = async (_blob: Blob): Promise<void> => undefined;
  createPhotos = async (albumId: string, inputs: CreatePhotoInput[]): Promise<Photo[]> =>
    Promise.all(inputs.map((i) => this.createPhoto(albumId, i)));
  createPhoto = async (albumId: string, input: CreatePhotoInput): Promise<Photo> => {
    const p: Photo = {
      id: `ph-${++this.seq}`, albumId, name: input.name, size: input.size, width: input.width, height: input.height,
      mime: input.mime, story: '', meta: '', position: this.photos.length, createdAt: Date.now(),
    };
    this.photos.push(p);
    this.urls.set(p.id, {});
    this.recount();
    return structuredClone(p);
  };
  updatePhoto = async (id: string, patch: { story?: string; meta?: string }): Promise<void> => {
    await delay(150);
    const p = this.photos.find((x) => x.id === id); if (p) Object.assign(p, patch);
  };
  deletePhoto = async (id: string): Promise<void> => {
    await delay(150);
    this.photos = this.photos.filter((p) => p.id !== id);
    this.urls.delete(id);
    this.recount();
  };

  getStorage = async (): Promise<Storage> => {
    await delay(100);
    return { used: this.photos.reduce((s, p) => s + p.size, 0), total: STORAGE_TOTAL };
  };

  /** Giả lập upload: giữ blob dưới dạng object URL để ảnh vừa chọn hiện ra ngay. */
  uploadVariant = async (
    photoId: string, variant: Variant, blob: Blob,
    opts: { signal?: AbortSignal; onProgress?: (loaded: number) => void } = {},
  ): Promise<void> => {
    for (let i = 1; i <= 4; i++) { await delay(60); opts.onProgress?.((blob.size * i) / 4); }
    const u = this.urls.get(photoId);
    if (u) u[variant] = URL.createObjectURL(blob);
  };
}

export const mock = new MockApi();
