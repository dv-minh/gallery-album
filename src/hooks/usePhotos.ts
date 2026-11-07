import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Photo } from '../../shared/types';
import { api } from '../lib/api';

export interface PhotoFilter { albumId?: string }

export function usePhotos(filter: PhotoFilter, enabled = true) {
  const q = useInfiniteQuery({
    queryKey: ['photos', filter],
    enabled,
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => api.listPhotos({ ...filter, cursor: pageParam, limit: 24 }),
    getNextPageParam: (last) => last.nextCursor,
  });
  const photos: Photo[] = q.data?.pages.flatMap((p) => p.items) ?? [];
  return { ...q, photos };
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
