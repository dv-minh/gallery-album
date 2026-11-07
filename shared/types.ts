/** Kiểu dữ liệu dùng chung giữa web và worker. */

export type Variant = 'thumb' | 'medium' | 'original';
export const VARIANTS: readonly Variant[] = ['thumb', 'medium', 'original'];

export interface Album {
  id: string;
  name: string;
  description: string;
  position: number;
  photoCount: number;
  coverPhotoId: string | null;
}

export interface Photo {
  id: string;
  albumId: string;
  name: string;
  size: number;
  width: number | null;
  height: number | null;
  mime: string;
  story: string;
  meta: string;
  position: number;
  createdAt: number;
}

export interface PhotoPage {
  items: Photo[];
  nextCursor: number | null;
}

export interface Storage {
  used: number;
  total: number;
}

export interface CreatePhotoInput {
  name: string;
  size: number;
  mime: string;
  width: number | null;
  height: number | null;
}

export const STORAGE_TOTAL = 10 * 1024 * 1024 * 1024; // 10 GB (R2 free tier)
