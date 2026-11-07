import { useEffect, useRef } from 'react';
import type { Photo } from '../../../shared/types';
import { useReveal } from '../../hooks/useReveal';
import { useToggleFavorite } from '../../hooks/usePhotos';
import { imageUrl } from '../../lib/api';
import { Icon } from '../ui/Icon';

export type Layout = 'masonry' | 'grid3' | 'grid4';

const GRID: Record<Layout, string> = {
  masonry: 'grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-gutter lg:grid-cols-3',
  grid3: 'grid grid-cols-1 gap-gutter sm:grid-cols-2 md:grid-cols-3',
  grid4: 'grid grid-cols-2 gap-gutter-sm md:grid-cols-4',
};

function PhotoCard({ photo, layout, wide, delay, onOpen }: { photo: Photo; layout: Layout; wide: boolean; delay: number; onOpen: () => void }) {
  const ref = useReveal<HTMLDivElement>();
  const fav = useToggleFavorite();
  const ratio = layout === 'grid4' ? 'aspect-square' : wide ? 'aspect-[3/4] md:col-span-2 md:aspect-[16/10]' : 'aspect-[3/4]';
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} onClick={onOpen}
      className={`reveal group relative cursor-pointer overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-low ${ratio}`}>
      <img loading="lazy" src={imageUrl(photo.id, wide ? 'medium' : 'thumb')} alt={photo.story || photo.name}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-inverse-surface/15 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button aria-label="Phóng to" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex h-10 w-10 items-center justify-center rounded-pill bg-white/90 shadow-md transition hover:scale-110 hover:text-primary"><Icon name="fullscreen" className="text-[20px]" /></button>
        <button aria-label="Yêu thích" onClick={(e) => { e.stopPropagation(); fav.mutate(photo.id); }}
          className={`flex h-10 w-10 items-center justify-center rounded-pill bg-white/90 shadow-md transition hover:scale-110 ${photo.favorite ? 'text-error' : 'hover:text-error'}`}><Icon name="favorite" fill={photo.favorite} className="text-[20px]" /></button>
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
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && !fetching && onMore(), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, fetching, onMore, photos.length]);

  if (loading) {
    return (
      <div className={GRID[layout]}>
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-surface-container-low" />)}
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
      <div className={GRID[layout]}>
        {photos.map((p, i) => (
          <PhotoCard key={p.id} photo={p} layout={layout} wide={layout === 'masonry' && i % 7 === 1} delay={(i % 3) * 80} onOpen={() => onOpen(i)} />
        ))}
      </div>
      <div ref={sentinel} className="flex h-24 items-center justify-center">
        {fetching && <Icon name="progress_activity" className="animate-spin text-primary" />}
      </div>
    </>
  );
}
