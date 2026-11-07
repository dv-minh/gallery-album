import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const useAlbums = () => useQuery({ queryKey: ['albums'], queryFn: api.listAlbums });

export const useStorage = () => useQuery({ queryKey: ['storage'], queryFn: api.getStorage });

/** Các thao tác ghi trên album; tự làm mới cache liên quan. */
export function useAlbumActions() {
  const qc = useQueryClient();
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['albums'] }),
    qc.invalidateQueries({ queryKey: ['photos'] }),
    qc.invalidateQueries({ queryKey: ['storage'] }),
  ]);
  return {
    create: useMutation({ mutationFn: (name: string) => api.createAlbum(name), onSuccess: refresh }),
    rename: useMutation({ mutationFn: (v: { id: string; name: string }) => api.renameAlbum(v.id, v.name), onSuccess: refresh }),
    move: useMutation({ mutationFn: (v: { id: string; direction: -1 | 1 }) => api.moveAlbum(v.id, v.direction), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteAlbum(id), onSuccess: refresh }),
  };
}
