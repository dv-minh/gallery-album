import { useCallback, useEffect, useState } from 'react';
import type { Photo } from '../../../shared/types';
import { useFeedback } from '../ui/Feedback';
import { Icon } from '../ui/Icon';
import { useToggleFavorite } from '../../hooks/usePhotos';
import { downloadUrl, imageUrl } from '../../lib/api';
import { pad } from '../../lib/format';

interface Props {
  photos: Photo[];
  index: number;
  autoplay?: boolean;
  hasMore: boolean;
  onNeedMore: () => void;
  onIndex: (i: number) => void;
  onClose: () => void;
}

export function Lightbox({ photos, index, autoplay = false, hasMore, onNeedMore, onIndex, onClose }: Props) {
  const { toast } = useFeedback();
  const fav = useToggleFavorite();
  const [playing, setPlaying] = useState(autoplay);
  const [loaded, setLoaded] = useState(false);
  const photo = photos[index];

  const go = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => { setLoaded(false); }, [photo?.id]);
  useEffect(() => { if (hasMore && index >= photos.length - 3) onNeedMore(); }, [index, photos.length, hasMore, onNeedMore]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => go(1), 4000);
    return () => clearInterval(t);
  }, [playing, go]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') { setPlaying(false); go(1); }
      else if (e.key === 'ArrowLeft') { setPlaying(false); go(-1); }
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [go, onClose]);

  // Tải trước ảnh kế tiếp để chuyển mượt.
  useEffect(() => {
    const next = photos[(index + 1) % photos.length];
    if (next) new Image().src = imageUrl(next.id, 'medium');
  }, [index, photos]);

  const [x0, setX0] = useState<number | null>(null);
  if (!photo) return null;

  const share = async () => {
    const url = location.origin;
    if (navigator.share) { try { await navigator.share({ title: 'Éternel Archive', url }); } catch { /* người dùng huỷ */ } return; }
    try { await navigator.clipboard.writeText(url); toast('Đã sao chép liên kết'); } catch { toast(url); }
  };

  return (
    <div className="page-enter fixed inset-0 z-[55] flex flex-col justify-between bg-inverse-surface/95 text-inverse-on-surface backdrop-blur-2xl"
      onTouchStart={(e) => setX0(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { setPlaying(false); go(dx < 0 ? 1 : -1); } setX0(null); }}>
      <div className="flex items-center justify-between bg-inverse-surface/40 p-space-md">
        <div className="flex items-center gap-space-md">
          <span className="hidden font-display text-[20px] italic text-primary-fixed sm:inline">Éternel Archive</span>
          <span className="hidden h-4 w-px bg-outline/40 sm:block" />
          <span className="label-caps text-surface-variant">{pad(index + 1)} / {pad(photos.length)}{hasMore ? '+' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="glass-btn" onClick={() => setPlaying((p) => !p)} title="Trình chiếu (Space)"><Icon name={playing ? 'pause' : 'play_arrow'} className="text-[22px]" /></button>
          <button className="glass-btn" onClick={() => fav.mutate(photo.id)} title="Yêu thích"><Icon name="favorite" fill={photo.favorite} className={`text-[20px] ${photo.favorite ? 'text-error' : ''}`} /></button>
          <a className="glass-btn" href={downloadUrl(photo.id)} download title="Tải ảnh gốc"><Icon name="download" className="text-[20px]" /></a>
          <button className="glass-btn" onClick={share} title="Chia sẻ"><Icon name="share" className="text-[20px]" /></button>
          <button className="glass-btn ml-1" onClick={onClose} title="Đóng (Esc)"><Icon name="close" className="text-[22px]" /></button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-space-md">
        <button aria-label="Ảnh trước" onClick={() => { setPlaying(false); go(-1); }} className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-pill bg-black/40 transition hover:bg-primary md:left-6"><Icon name="chevron_left" className="text-[24px]" /></button>
        {!loaded && <div className="absolute h-10 w-10 animate-spin rounded-pill border-2 border-white/20 border-t-primary-fixed" />}
        <img key={photo.id} src={imageUrl(photo.id, 'medium')} alt={photo.story || photo.name} onLoad={() => setLoaded(true)}
          className={`max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} />
        <button aria-label="Ảnh sau" onClick={() => { setPlaying(false); go(1); }} className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-pill bg-black/40 transition hover:bg-primary md:right-6"><Icon name="chevron_right" className="text-[24px]" /></button>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-space-md rounded-t-xl border-t border-white/10 bg-black/40 p-space-lg backdrop-blur-xl md:flex-row md:items-center">
        <div className="max-w-xl">
          <span className="label-caps mb-1 block text-primary-fixed">Ghi chú câu chuyện</span>
          <p className="text-[14px] leading-relaxed text-surface-variant">{photo.story || 'Khoảnh khắc cưới nguyên bản.'}</p>
        </div>
        <div className="shrink-0">
          <span className="label-caps block text-primary-fixed">Thông tin</span>
          <span className="text-[13px] text-surface-variant">{photo.meta || photo.name}</span>
        </div>
      </div>
    </div>
  );
}
