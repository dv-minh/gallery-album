import { useCallback, useState } from 'react';
import { Lightbox } from '../components/gallery/Lightbox';
import { PhotoGrid, type Layout } from '../components/gallery/PhotoGrid';
import { Footer, SiteHeader } from '../components/layout/Headers';
import { useFeedback } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { couple } from '../config';
import { useAlbums } from '../hooks/useAlbums';
import { usePhotos } from '../hooks/usePhotos';
import { useReveal } from '../hooks/useReveal';
import type { Photo, PhotoPage } from '../../shared/types';
import { api, imageUrl } from '../lib/api';
import { downloadZip } from '../lib/zip';

type Filter = 'all' | 'favorites' | string; // string = albumId

const LAYOUTS: [Layout, string, string][] = [
  ['masonry', 'dashboard', 'Bố cục Masonry'],
  ['grid3', 'view_column', 'Lưới 3 cột'],
  ['grid4', 'grid_view', 'Lưới 4 cột'],
];

export default function ShowcasePage() {
  const { toast } = useFeedback();
  const [filter, setFilter] = useState<Filter>('all');
  const [layout, setLayout] = useState<Layout>('masonry');
  const [lb, setLb] = useState<{ index: number; autoplay: boolean } | null>(null);
  const [zipping, setZipping] = useState<string | null>(null);

  const albums = useAlbums();
  const photosQ = usePhotos(filter === 'all' ? {} : filter === 'favorites' ? { favorite: true } : { albumId: filter });
  const { photos } = photosQ;
  const total = (albums.data ?? []).reduce((s, a) => s + a.photoCount, 0);
  const headRef = useReveal<HTMLDivElement>();

  const cover = (albums.data ?? []).find((a) => a.coverPhotoId)?.coverPhotoId;
  const fetchMore = useCallback(() => { void photosQ.fetchNextPage(); }, [photosQ.fetchNextPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadAll = async () => {
    if (zipping) return;
    try {
      // Lấy toàn bộ ảnh (qua các trang) rồi nén ngay trên trình duyệt.
      const all: Photo[] = [];
      let cursor: number | null = null;
      do {
        const pg: PhotoPage = await api.listPhotos({ cursor, limit: 100 });
        all.push(...pg.items); cursor = pg.nextCursor;
      } while (cursor !== null);
      if (!all.length) return toast('Chưa có ảnh để tải.', 'err');
      await downloadZip(all, 'album-cuoi', (d, t) => setZipping(`${d}/${t}`));
      toast('Đã tạo xong tệp ZIP');
    } catch (e) { toast(e instanceof Error ? e.message : 'Không tải được album.', 'err'); }
    finally { setZipping(null); }
  };

  const tab = (id: Filter, label: string, n?: number) => (
    <button key={id} onClick={() => setFilter(id)}
      className={`label-caps whitespace-nowrap rounded-pill px-space-md py-space-xs transition ${filter === id ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}`}>
      {label}{n !== undefined && <span className="ml-1 font-normal opacity-70">({n})</span>}
    </button>
  );

  return (
    <div className="page-enter">
      <SiteHeader />

      {/* Hero */}
      <section className="relative w-full overflow-hidden bg-surface-container-low">
        <div className="relative flex min-h-[88vh] items-center justify-center">
          <div className="absolute inset-0 bg-cover bg-center brightness-[0.92] contrast-[1.03]"
            style={{ backgroundImage: `url('${cover ? imageUrl(cover, 'medium') : couple.fallbackCover}')` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-surface/20 backdrop-blur-[2px]" />
          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-space-md py-space-2xl pt-28 text-center">
            <div className="mb-space-lg inline-flex items-center gap-2 rounded-pill bg-white/80 px-space-md py-space-xs shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-pill bg-tertiary-container" />
              <span className="label-caps tracking-[0.25em] text-primary">Chapter I • Eternal Vows</span>
              <span className="h-1.5 w-1.5 rounded-pill bg-tertiary-container" />
            </div>
            <h1 className="mb-space-sm font-display text-[38px] leading-[46px] tracking-tight md:text-[56px] md:leading-[64px]">{couple.names}</h1>
            <p className="mb-space-sm max-w-xl font-display text-[18px] italic text-primary">“{couple.tagline}”</p>
            <div className="mb-space-xl flex flex-wrap items-center justify-center gap-2 text-[13px] font-medium text-secondary">
              <Icon name="calendar_today" className="text-[18px] text-primary" />{couple.date}
              <span className="text-outline-variant">•</span>
              <Icon name="location_on" className="text-[18px] text-primary" />{couple.place}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-space-md">
              <a href="#gallery" className="btn-primary px-space-xl py-space-md uppercase tracking-wider"><Icon name="photo_library" className="text-[18px]" />Bắt đầu xem kỷ niệm</a>
              <button onClick={downloadAll} disabled={!!zipping}
                className="flex items-center gap-2 rounded-lg bg-white/90 px-space-xl py-space-md text-[13px] font-medium uppercase tracking-wider shadow-sm backdrop-blur-md transition hover:bg-secondary-container disabled:opacity-60">
                <Icon name={zipping ? 'progress_activity' : 'cloud_download'} className={`text-[18px] text-primary ${zipping ? 'animate-spin' : ''}`} />
                {zipping ? `Đang nén ${zipping}` : 'Tải trọn bộ album'}
              </button>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center text-on-surface-variant/70">
            <span className="label-caps text-[10px]">Cuộn để chiêm ngưỡng</span>
            <Icon name="keyboard_arrow_down" className="animate-bounce text-primary" />
          </div>
        </div>
      </section>

      {/* Thanh lọc */}
      <section id="gallery" className="sticky top-20 z-30 scroll-mt-20 bg-surface/95 py-space-md shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-space-md px-space-md lg:flex-row lg:px-margin-desktop">
          <div className="scrollbar-none flex w-full items-center gap-1 overflow-x-auto pb-1 lg:w-auto lg:pb-0">
            {tab('all', 'Tất Cả', total)}
            {(albums.data ?? []).map((a) => tab(a.id, a.name, a.photoCount))}
          </div>
          <div className="flex w-full shrink-0 items-center justify-between gap-space-sm lg:w-auto">
            <button onClick={() => setFilter(filter === 'favorites' ? 'all' : 'favorites')}
              className={`label-caps flex items-center gap-1 rounded-pill px-space-md py-space-xs transition ${filter === 'favorites' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-low text-on-surface-variant'}`}>
              <Icon name="favorite" fill={filter === 'favorites'} className="text-[16px]" />Yêu thích
            </button>
            <div className="flex items-center rounded-lg bg-surface-container-low p-0.5">
              {LAYOUTS.map(([k, icon, title]) => (
                <button key={k} title={title} aria-label={title} onClick={() => setLayout(k)}
                  className={`rounded-xl p-1.5 transition ${layout === k ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-on-surface'}`}>
                  <Icon name={icon} className="text-[20px]" />
                </button>
              ))}
            </div>
            <button disabled={!photos.length} onClick={() => setLb({ index: 0, autoplay: true })} className="btn-primary label-caps !py-space-xs"><Icon name="slideshow" className="text-[16px]" />Trình chiếu</button>
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
          fetching={photosQ.isFetchingNextPage} onMore={fetchMore} onOpen={(i) => setLb({ index: i, autoplay: false })}
          emptyText={filter === 'favorites' ? 'Bạn chưa yêu thích ảnh nào.' : 'Chưa có ảnh nào. Vào “Quản Lý Ảnh” để tải ảnh lên.'} />
      </section>

      <Footer />

      {lb && photos.length > 0 && (
        <Lightbox photos={photos} index={Math.min(lb.index, photos.length - 1)} autoplay={lb.autoplay}
          hasMore={!!photosQ.hasNextPage} onNeedMore={fetchMore}
          onIndex={(i) => setLb({ index: i, autoplay: lb.autoplay })} onClose={() => setLb(null)} />
      )}
    </div>
  );
}
