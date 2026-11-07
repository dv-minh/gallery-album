import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { Photo, PhotoPage } from '../../shared/types';
import { api } from '../lib/api';

export interface PhotoFilter { albumId?: string; favorite?: boolean }

export function usePhotos(filter: PhotoFilter) {
  const q = useInfiniteQuery({
    queryKey: ['photos', filter],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => api.listPhotos({ ...filter, cursor: pageParam, limit: 30 }),
    getNextPageParam: (last) => last.nextCursor,
  });
  const photos: Photo[] = q.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...q, photos };
}

type Cache = InfiniteData<PhotoPage, number | null>;

/** Bật/tắt yêu thích có cập nhật lạc quan trên mọi cache ảnh. */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['photos'] });
      const snapshot = qc.getQueriesData<Cache>({ queryKey: ['photos'] });
      qc.setQueriesData<Cache>({ queryKey: ['photos'] }, (d) => d && ({
        ...d,
        pages: d.pages.map((pg) => ({ ...pg, items: pg.items.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)) })),
      }));
      return { snapshot };
    },
    onError: (_e, _id, ctx) => ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['photos', { favorite: true }] }),
  });
}

export function usePhotoActions() {
  const qc = useQueryClient();
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['photos'] }),
    qc.invalidateQueries({ queryKey: ['albums'] }),
    qc.invalidateQueries({ queryKey: ['storage'] }),
  ]);
  return {
    update: useMutation({ mutationFn: (v: { id: string; story: string }) => api.updatePhoto(v.id, { story: v.story }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.deletePhoto(id), onSuccess: refresh }),
  };
}
