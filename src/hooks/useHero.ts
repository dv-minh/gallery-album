import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { prepareCover } from '../lib/image';

/** Đổi ảnh bìa trang chủ: resize ở trình duyệt rồi stream lên R2. */
export const useUploadHero = () =>
  useMutation({ mutationFn: async (file: File) => api.uploadHero(await prepareCover(file)) });
