import { useCallback, useState } from 'react';
import { Lightbox } from '../components/gallery/Lightbox';
import { PhotoGrid, type Layout } from '../components/gallery/PhotoGrid';
import { Footer, SiteHeader } from '../components/layout/Headers';
import { Icon } from '../components/ui/Icon';
import { couple } from '../config';
import { useAlbums } from '../hooks/useAlbums';
import { usePhotos } from '../hooks/usePhotos';
import { useReveal } from '../hooks/useReveal';
import { heroUrl } from '../lib/api';

type Filter = 'all' | string; // string = albumId

const LAYOUTS: [Layout, string, string][] = [
  ['masonry', 'dashboard', 'Bố cục Masonry'],
  ['grid3', 'view_column', 'Lưới 3 cột'],
  ['grid4', 'grid_view', 'Lưới 4 cột'],
];

export default function ShowcasePage() {
  const [picked, setPicked] = useState<Filter | null>(null);
  const [layout, setLayout] = useState<Layout>('masonry');
  const [lb, setLb] = useState<number | null>(null);

  const albums = useAlbums();
  // Mặc định mở album mới nhất (cuối danh sách); "Tất cả" nặng nhất nên chỉ tải khi bấm.
  const list = albums.data ?? [];
  const filter: Filter | null = picked ?? (albums.data ? (list.length ? list[list.length - 1].id : 'all') : null);
  const setFilter = (f: Filter) => { setPicked(f); setLb(null); };
  const [heroOk, setHeroOk] = useState(false);
  const photosQ = usePhotos(filter && filter !== 'all' ? { albumId: filter } : {}, filter !== null);
  const { photos } = photosQ;
  const total = (albums.data ?? []).reduce((s, a) => s + a.photoCount, 0);
  const headRef = useReveal<HTMLDivElement>();

  const scrollToGallery = () => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });
  const fetchMore = useCallback(() => { void photosQ.fetchNextPage(); }, [photosQ.fetchNextPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const tab = (id: Filter, label: string, n?: number) => (
    <button key={id} onClick={() => setFilter(id)}
      className={`label-caps whitespace-nowrap rounded-pill px-space-md py-space-xs transition ${filter === id ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}`}>
      {label}{n !== undefined && <span className="ml-1 font-normal opacity-70">({n})</span>}
    </button>
  );

  return (
    <div className="page-enter">
      <SiteHeader />

      {/* Hero: bấm vào đâu cũng cuộn nhẹ xuống phần ảnh */}
      <section onClick={scrollToGallery} className="relative w-full cursor-pointer overflow-hidden bg-surface-container-low">
        <div className="relative flex min-h-[90vh] items-center justify-center">
          {/* Chỉ một ảnh bìa, không có ảnh thay thế: nền trung tính, ảnh hiện dần khi tải xong (tránh nháy sang ảnh khác khi F5). */}
          <img src={heroUrl()} alt="" fetchPriority="high" decoding="async"
            ref={(el) => { if (el?.complete && el.naturalWidth) setHeroOk(true); }}
            onLoad={() => setHeroOk(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${heroOk ? 'opacity-100' : 'opacity-0'}`}
            style={{ objectPosition: 'center 30%' }} />
          {/* Phủ rất nhẹ cho ảnh còn nguyên màu; độ tương phản của chữ do quầng tối mềm phía sau chữ đảm nhiệm. */}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-space-md py-space-2xl pt-28 text-center text-white">
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[120%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-pill bg-black/35 blur-3xl" />
            <h1 className="mb-space-sm font-display text-[38px] leading-[46px] tracking-tight drop-shadow-lg md:text-[56px] md:leading-[64px]">{couple.names}</h1>
            <p className="mb-space-sm max-w-xl font-display text-[18px] italic text-white/90 drop-shadow-md">“{couple.tagline}”</p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[14px] font-medium text-white/90 drop-shadow-md">
              <Icon name="calendar_today" className="text-[18px]" />{couple.date}
            </div>
          </div>
          <button type="button" aria-label="Cuộn xuống xem ảnh" onClick={(e) => { e.stopPropagation(); scrollToGallery(); }}
            className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center text-white/90 drop-shadow-md transition hover:text-white">
            <span className="label-caps tracking-[0.3em]">Xem ảnh</span>
            <Icon name="keyboard_arrow_down" className="animate-bounce text-[32px]" />
          </button>
        </div>
      </section>

      {/* Thanh lọc */}
      <section id="gallery" className="sticky top-20 z-30 scroll-mt-20 bg-surface/95 py-space-md shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-space-md px-space-md lg:flex-row lg:px-margin-desktop">
          <div className="scrollbar-none flex w-full items-center gap-1 overflow-x-auto pb-1 lg:w-auto lg:pb-0">
            {list.map((a) => tab(a.id, a.name, a.photoCount))}
            {tab('all', 'Tất Cả', total)}
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-space-sm lg:w-auto">
            <div className="flex items-center rounded-lg bg-surface-container-low p-0.5">
              {LAYOUTS.map(([k, icon, title]) => (
                <button key={k} title={title} aria-label={title} onClick={() => setLayout(k)}
                  className={`rounded-xl p-1.5 transition ${layout === k ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-on-surface'}`}>
                  <Icon name={icon} className="text-[20px]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Lưới ảnh */}
      <section className="mx-auto max-w-7xl px-space-md py-space-xl lg:px-margin-desktop">
        <div ref={headRef} className="reveal mb-space-2xl flex flex-col items-center text-center">
          <span className="label-caps mb-1 tracking-[0.2em] text-primary">Curated Passe-Partout Archival</span>
          <h2 className="mb-1 font-display text-[28px] tracking-tight md:text-[40px]">Khắc Họa Vĩnh Cửu</h2>
          <p className="max-w-lg text-[14px] text-secondary">Từng khung hình lưu giữ nguyên bản chất liệu cảm xúc của ngày trọng đại.</p>
        </div>
        <PhotoGrid photos={photos} layout={layout} loading={photosQ.isLoading} hasMore={!!photosQ.hasNextPage}
          fetching={photosQ.isFetchingNextPage} onMore={fetchMore} onOpen={(i) => setLb(i)}
          emptyText="Chưa có ảnh nào. Vào “Quản Lý Ảnh” để tải ảnh lên." />
      </section>

      <Footer />

      {lb !== null && photos.length > 0 && (
        <Lightbox photos={photos} index={Math.min(lb, photos.length - 1)} 
          hasMore={!!photosQ.hasNextPage} onNeedMore={fetchMore}
          onIndex={setLb} onClose={() => setLb(null)} />
      )}
    </div>
  );
}
