import { useCallback, useEffect, useRef, useState } from 'react';
import type { Photo } from '../../../shared/types';
import { useFeedback } from '../ui/Feedback';
import { Monogram } from '../layout/Headers';
import { Icon } from '../ui/Icon';
import { downloadUrl, imageUrl } from '../../lib/api';
import { pad } from '../../lib/format';

const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const DOUBLE_TAP_ZOOM = 2.5;
const SWIPE_MIN = 60;
/** Tự nạp ảnh gốc ở nền khi mạng tốt và người dùng không bật tiết kiệm dữ liệu (mọi thiết bị). */
const AUTO_ORIGINAL = (() => {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !c?.saveData && (c?.effectiveType === undefined || c.effectiveType === '4g');
})();

interface View { zoom: number; x: number; y: number }
const HOME: View = { zoom: 1, x: 0, y: 0 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Props {
  photos: Photo[];
  index: number;
  hasMore: boolean;
  onNeedMore: () => void;
  onIndex: (i: number) => void;
  onClose: () => void;
}

interface Gesture {
  pts: Map<number, { x: number; y: number }>;
  multi: boolean;          // đã từng dùng ≥2 ngón trong lượt chạm này → không tính là vuốt chuyển ảnh
  moved: boolean;
  startX: number; startY: number;
  panX: number; panY: number;
  pinchDist: number; pinchZoom: number;
  lastTap: { t: number; x: number; y: number };
}

export function Lightbox({ photos, index, hasMore, onNeedMore, onIndex, onClose }: Props) {
  const { toast } = useFeedback();
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>(HOME);
  const viewRef = useRef<View>(HOME);
  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const g = useRef<Gesture>({
    pts: new Map(), multi: false, moved: false, startX: 0, startY: 0, panX: 0, panY: 0,
    pinchDist: 0, pinchZoom: 1, lastTap: { t: 0, x: 0, y: 0 },
  });
  const photo = photos[index];

  /** Đặt zoom/pan, giữ ảnh không trôi ra ngoài khung. */
  const apply = useCallback((zoom: number, x: number, y: number) => {
    const z = clamp(+zoom.toFixed(3), 1, MAX_ZOOM);
    const el = imgRef.current;
    const mx = el && z > 1 ? (el.offsetWidth * (z - 1)) / 2 : 0;
    const my = el && z > 1 ? (el.offsetHeight * (z - 1)) / 2 : 0;
    const next = { zoom: z, x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
    viewRef.current = next;
    setView(next);
  }, []);
  const reset = useCallback(() => apply(1, 0, 0), [apply]);
  const zoomBy = useCallback((d: number) => { const v = viewRef.current; apply(v.zoom + d, v.x, v.y); }, [apply]);

  const go = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => { setLoaded(false); reset(); }, [photo?.id, reset]);
  useEffect(() => { if (hasMore && index >= photos.length - 3) onNeedMore(); }, [index, photos.length, hasMore, onNeedMore]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === '+' || e.key === '=') zoomBy(ZOOM_STEP);
      else if (e.key === '-') zoomBy(-ZOOM_STEP);
      else if (e.key === '0') reset();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [go, onClose, reset, zoomBy]);

  // Lăn chuột để zoom (cần listener không-passive để chặn cuộn trang).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const w = (e: WheelEvent) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP); };
    el.addEventListener('wheel', w, { passive: false });
    return () => el.removeEventListener('wheel', w);
  }, [zoomBy]);

  // Ảnh gốc: nạp ngay khi zoom > 1.2x, và tự nạp nền sau ~0.8s xem một ảnh khi mạng tốt. Giải mã xong mới thay để không nháy.
  const [hiId, setHiId] = useState<string | null>(null);
  const zoomed = view.zoom > 1.2;
  const needHi = zoomed && hiId !== photo?.id;
  const wantHi = hiId !== photo?.id && (zoomed || (loaded && AUTO_ORIGINAL));
  useEffect(() => {
    if (!wantHi || !photo) return;
    let live = true;
    const t = setTimeout(() => {
      const im = new Image();
      im.src = imageUrl(photo.id, 'original');
      im.decode().catch(() => undefined).then(() => { if (live) setHiId(photo.id); });
    }, zoomed ? 0 : 800);
    return () => { live = false; clearTimeout(t); };
  }, [wantHi, zoomed, photo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tải trước ảnh kế tiếp để chuyển mượt.
  useEffect(() => {
    const next = photos[(index + 1) % photos.length];
    if (next) new Image().src = imageUrl(next.id, 'medium');
  }, [index, photos]);

  const onPointerDown = (e: React.PointerEvent) => {
    const s = g.current;
    e.currentTarget.setPointerCapture(e.pointerId);
    s.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (s.pts.size === 1) {
      s.multi = false; s.moved = false;
      s.startX = e.clientX; s.startY = e.clientY;
      s.panX = viewRef.current.x; s.panY = viewRef.current.y;
    } else if (s.pts.size === 2) {
      s.multi = true;
      const [a, b] = [...s.pts.values()];
      s.pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      s.pinchZoom = viewRef.current.zoom;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s.pts.has(e.pointerId)) return;
    s.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (s.pts.size >= 2) {
      const [a, b] = [...s.pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const v = viewRef.current;
      apply(s.pinchZoom * (d / s.pinchDist), v.x, v.y);
      s.moved = true;
    } else {
      const dx = e.clientX - s.startX, dy = e.clientY - s.startY;
      if (Math.hypot(dx, dy) > 8) s.moved = true;
      if (viewRef.current.zoom > 1) apply(viewRef.current.zoom, s.panX + dx, s.panY + dy);
    }
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s.pts.has(e.pointerId)) return;
    s.pts.delete(e.pointerId);
    if (s.pts.size === 1) { // nhả bớt 1 ngón sau khi pinch: tiếp tục kéo bằng ngón còn lại, không tính vuốt
      const [p] = [...s.pts.values()];
      s.startX = p.x; s.startY = p.y; s.panX = viewRef.current.x; s.panY = viewRef.current.y;
      return;
    }
    if (s.pts.size > 0) return;

    const v = viewRef.current;
    if (v.zoom < 1.05) reset();
    if (s.multi || e.type === 'pointercancel') return;

    const dx = e.clientX - s.startX, dy = e.clientY - s.startY;
    if (!s.moved) { // chạm: nhấp đúp để phóng to/thu nhỏ
      const now = Date.now(), lt = s.lastTap;
      if (now - lt.t < 300 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) {
        if (v.zoom > 1) reset(); else apply(DOUBLE_TAP_ZOOM, 0, 0);
        s.lastTap = { t: 0, x: 0, y: 0 };
      } else s.lastTap = { t: now, x: e.clientX, y: e.clientY };
    } else if (v.zoom === 1 && Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1);
    }
  };

  if (!photo) return null;

  const share = async () => {
    const url = location.origin;
    if (navigator.share) { try { await navigator.share({ title: 'Viết Minh & Huyền Linh', url }); } catch { /* người dùng huỷ */ } return; }
    try { await navigator.clipboard.writeText(url); toast('Đã sao chép liên kết'); } catch { toast(url); }
  };

  return (
    <div className="page-enter fixed inset-0 z-[55] flex flex-col justify-between overscroll-contain bg-inverse-surface/95 text-inverse-on-surface backdrop-blur-2xl"
      style={{ touchAction: 'none' }}>
      <div className="flex items-center justify-between bg-inverse-surface/40 p-space-md">
        <div className="flex items-center gap-space-md">
          <Monogram size={36} className="hidden sm:block" />
          <span className="hidden h-4 w-px bg-outline/40 sm:block" />
          <span className="label-caps text-surface-variant">{pad(index + 1)} / {pad(photos.length)}{hasMore ? '+' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="glass-btn hidden sm:flex" onClick={() => zoomBy(-ZOOM_STEP)} disabled={view.zoom <= 1} title="Thu nhỏ (-)"><Icon name="zoom_out" className="text-[22px]" /></button>
          <button className="label-caps hidden w-12 text-center text-surface-variant hover:text-white sm:block" onClick={reset} title="Đặt lại (0)">{Math.round(view.zoom * 100)}%</button>
          <button className="glass-btn hidden sm:flex" onClick={() => zoomBy(ZOOM_STEP)} disabled={view.zoom >= MAX_ZOOM} title="Phóng to (+)"><Icon name="zoom_in" className="text-[22px]" /></button>
          <span className="mx-1 hidden h-4 w-px bg-outline/40 sm:block" />
          <a className="glass-btn" href={downloadUrl(photo.id)} download title="Tải ảnh gốc"><Icon name="download" className="text-[20px]" /></a>
          <button className="glass-btn" onClick={share} title="Chia sẻ"><Icon name="share" className="text-[20px]" /></button>
          <button className="glass-btn ml-1" onClick={onClose} title="Đóng (Esc)"><Icon name="close" className="text-[22px]" /></button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Vùng cử chỉ: 1 ngón vuốt = chuyển ảnh (khi chưa zoom) / kéo (khi đã zoom); 2 ngón = zoom, không bao giờ chuyển ảnh. */}
        <div ref={stageRef} className="absolute inset-0 flex items-center justify-center p-space-sm md:p-space-md"
          style={{ touchAction: 'none', cursor: view.zoom > 1 ? 'grab' : 'zoom-in' }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
          {!loaded && <div className="absolute h-10 w-10 animate-spin rounded-pill border-2 border-white/20 border-t-primary-fixed" />}
          <img ref={imgRef} key={photo.id} src={imageUrl(photo.id, hiId === photo.id ? 'original' : 'medium')} alt={photo.story || photo.name} onLoad={() => setLoaded(true)}
            draggable={false}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
            className={`max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
        </div>
        {needHi && <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-pill bg-black/50 px-space-md py-space-xs label-caps text-white">Đang tải ảnh gốc…</div>}
        <button aria-label="Ảnh trước" onClick={() => go(-1)} className="absolute left-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-pill bg-black/40 transition hover:bg-primary sm:flex md:left-6"><Icon name="chevron_left" className="text-[24px]" /></button>
        <button aria-label="Ảnh sau" onClick={() => go(1)} className="absolute right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-pill bg-black/40 transition hover:bg-primary sm:flex md:right-6"><Icon name="chevron_right" className="text-[24px]" /></button>
      </div>
    </div>
  );
}
