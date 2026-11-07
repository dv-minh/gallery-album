/** Sinh biến thể thumb/medium ở trình duyệt (Worker free không xử lý ảnh được). */

export interface Prepared {
  thumb: Blob;
  medium: Blob;
  width: number;
  height: number;
}

/** Cạnh dài + chất lượng WebP của từng biến thể. */
const THUMB = { side: 1280, quality: 0.86 };
const MEDIUM = { side: 3840, quality: 0.92 };
const COVER = { side: 3840, quality: 0.92 };

function canvasOf(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Làm nét nhẹ (unsharp 3x3) để bù độ mềm sau khi thu nhỏ. amount ~0.25–0.5. */
function sharpen(canvas: HTMLCanvasElement, amount: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width < 3 || canvas.height < 3) return;
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const k = amount;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const j = i + c;
        const blur = (src[j - 4] + src[j + 4] + src[j - w * 4] + src[j + w * 4]) / 4;
        out[j] = src[j] + (src[j] - blur) * k;
      }
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

/** Thu nhỏ từng bước (tối đa 1/2 mỗi lần) để ảnh không bị răng cưa/nhoè khi giảm nhiều. */
async function resize(bitmap: ImageBitmap, maxSide: number, quality: number, sharp = 0.35): Promise<Blob> {
  const target = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  let src: CanvasImageSource = bitmap;
  let w = bitmap.width;
  let h = bitmap.height;
  const tw = bitmap.width * target;
  const th = bitmap.height * target;
  let canvas = canvasOf(w, h);
  do {
    w = Math.max(tw, w / 2);
    h = Math.max(th, h / 2);
    canvas = canvasOf(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    src = canvas;
  } while (w > tw + 1);
  if (target < 1) sharpen(canvas, sharp);
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
    const medium = await resize(bitmap, MEDIUM.side, MEDIUM.quality);
    const thumb = await resize(bitmap, THUMB.side, THUMB.quality);
    return { thumb, medium, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

/** Ảnh bìa trang chủ: một blob WebP chất lượng cao. */
export async function prepareCover(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Trình duyệt không đọc được định dạng này. Hãy dùng JPG, PNG hoặc WEBP.');
  }
  try {
    return await resize(bitmap, COVER.side, COVER.quality);
  } finally {
    bitmap.close();
  }
}
