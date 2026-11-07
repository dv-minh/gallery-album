/** Sinh biến thể thumb/medium ở trình duyệt (Worker free không xử lý ảnh được). */

export interface Prepared {
  thumb: Blob;
  medium: Blob;
  width: number;
  height: number;
}

async function resize(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được ảnh thu nhỏ.'))), 'image/webp', quality));
}

export async function prepareImage(file: File): Promise<Prepared> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Trình duyệt không đọc được định dạng này (RAW/HEIC chưa hỗ trợ). Hãy dùng JPG, PNG hoặc WEBP.');
  }
  try {
    const [thumb, medium] = [await resize(bitmap, 400, 0.8), await resize(bitmap, 1600, 0.85)];
    return { thumb, medium, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
