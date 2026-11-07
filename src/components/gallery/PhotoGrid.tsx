import { useEffect, useMemo, useRef, useState } from 'react';
import type { Photo } from '../../../shared/types';
import { useReveal } from '../../hooks/useReveal';
import { imageUrl } from '../../lib/api';
import { Icon } from '../ui/Icon';

export type Layout = 'masonry' | 'grid3' | 'grid4';

/** Số cột theo [mobile, tablet(≥768), desktop(≥1024)]. */
const COLS: Record<Layout, [number, number, number]> = {
  masonry: [2, 2, 3],
  grid3: [2, 3, 3],
  grid4: [2, 4, 4],
};

function useColumns(layout: Layout) {
  const pick = () => {
    const [m, t, d] = COLS[layout];
    const w = window.innerWidth;
    return w >= 1024 ? d : w >= 768 ? t : m;
  };
  const [n, setN] = useState(pick);
  useEffect(() => {
    const on = () => setN(pick());
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps
  return n;
}

const ratioOf = (p: Photo) => (p.width && p.height ? p.width / p.height : 3 / 4);

function PhotoCard({ photo, index, uniform, onOpen }: { photo: Photo; index: number; uniform: boolean; onOpen: () => void }) {
  const ref = useReveal<HTMLDivElement>();
  const r = ratioOf(photo);
  return (
    <div ref={ref} style={{ transitionDelay: `${(index % 3) * 60}ms`, aspectRatio: uniform ? '1 / 1' : String(r) }} onClick={onOpen}
      className="reveal group relative w-full cursor-pointer overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-low">
      {/* Masonry: giữ nguyên tỉ lệ ảnh. Lưới đều: object-contain để thấy trọn ảnh, không cắt. */}
      <img loading="lazy" decoding="async" src={imageUrl(photo.id, 'thumb')} alt={photo.story || photo.name}
        width={photo.width ?? undefined} height={photo.height ?? undefined}
        className={`h-full w-full transition-transform duration-700 group-hover:scale-[1.03] ${uniform ? 'object-contain' : 'object-cover'}`} />
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-inverse-surface/15 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button aria-label="Phóng to" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex h-10 w-10 items-center justify-center rounded-pill bg-white/90 shadow-md transition hover:scale-110 hover:text-primary"><Icon name="fullscreen" className="text-[20px]" /></button>
      </div>
    </div>
  );
}

interface Props {
  photos: Photo[];
  layout: Layout;
  loading: boolean;
  hasMore: boolean;
  fetching: boolean;
  onMore: () => void;
  onOpen: (i: number) => void;
  emptyText: string;
}

export function PhotoGrid({ photos, layout, loading, hasMore, fetching, onMore, onOpen, emptyText }: Props) {
  const sentinel = useRef<HTMLDivElement>(null);
  const cols = useColumns(layout);
  const uniform = layout !== 'masonry';

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && !fetching && onMore(), { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, fetching, onMore, photos.length]);

  // Chia ảnh vào cột ngắn nhất (ổn định khi thêm trang mới: ảnh cũ không nhảy cột).
  const columns = useMemo(() => {
    const out: { photo: Photo; index: number }[][] = Array.from({ length: cols }, () => []);
    const heights = new Array<number>(cols).fill(0);
    photos.forEach((photo, index) => {
      let c = 0;
      for (let k = 1; k < cols; k++) if (heights[k] < heights[c]) c = k;
      out[c].push({ photo, index });
      heights[c] += uniform ? 1 : 1 / ratioOf(photo);
    });
    return out;
  }, [photos, cols, uniform]);

  if (loading) {
    return (
      <div className="flex gap-2 md:gap-gutter">
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className="flex flex-1 flex-col gap-2 md:gap-gutter">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-surface-container-low" />)}
          </div>
        ))}
      </div>
    );
  }
  if (!photos.length) {
    return (
      <div className="py-space-2xl text-center text-on-surface-variant">
        <Icon name="photo_library" className="text-[48px] text-primary/50" />
        <p className="mt-2">{emptyText}</p>
      </div>
    );
  }
  return (
    <>
      <div className="flex items-start gap-2 md:gap-gutter">
        {columns.map((col, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-2 md:gap-gutter">
            {col.map(({ photo, index }) => (
              <PhotoCard key={photo.id} photo={photo} index={index} uniform={uniform} onOpen={() => onOpen(index)} />
            ))}
          </div>
        ))}
      </div>
      <div ref={sentinel} className="flex h-24 items-center justify-center">
        {fetching && <Icon name="progress_activity" className="animate-spin text-primary" />}
      </div>
    </>
  );
}
