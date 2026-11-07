import { Link, Navigate, useParams } from 'react-router-dom';
import { StoragePanel } from '../components/admin/StoragePanel';
import { UploadQueue } from '../components/admin/UploadQueue';
import { UploadZone } from '../components/admin/UploadZone';
import { AdminHeader } from '../components/layout/Headers';
import { useFeedback } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { useAlbums } from '../hooks/useAlbums';
import { usePhotoActions, usePhotos } from '../hooks/usePhotos';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { imageUrl } from '../lib/api';

export default function AlbumUploadPage() {
  const { id = '' } = useParams();
  const { toast, confirm, prompt } = useFeedback();
  const albums = useAlbums();
  const album = albums.data?.find((a) => a.id === id);
  const { photos, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = usePhotos({ albumId: id });
  const actions = usePhotoActions();
  const queue = useUploadQueue(id);

  if (albums.isSuccess && !album) return <Navigate to="/admin" replace />;

  const fail = (e: unknown) => toast(e instanceof Error ? e.message : 'Có lỗi xảy ra.', 'err');

  return (
    <div className="page-enter">
      <AdminHeader subtitle={album?.name ?? '…'} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-space-lg px-space-md pb-space-2xl pt-28 sm:px-space-lg lg:px-margin-desktop">
        <Link to="/admin" className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-primary"><Icon name="arrow_back" className="text-[18px]" />Tất cả album</Link>
        <h1 className="font-display text-[32px] italic md:text-[40px]">{album?.name}</h1>

        <StoragePanel />
        <UploadZone onFiles={queue.add} />
        <UploadQueue items={queue.items} onRetry={queue.retry} onCancel={queue.cancel} onClear={queue.clearFinished} />

        <section>
          <h2 className="mb-space-md font-display text-[22px] italic">Ảnh trong album <span className="text-[14px] not-italic text-on-surface-variant">({album?.photoCount ?? 0})</span></h2>
          {isLoading ? <p className="text-on-surface-variant">Đang tải…</p> : !photos.length ? (
            <p className="py-space-xl text-center text-on-surface-variant">Album chưa có ảnh.</p>
          ) : (
            <div className="grid grid-cols-2 gap-gutter-sm md:grid-cols-4 lg:grid-cols-6">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-low">
                  <img src={imageUrl(p.id, 'thumb')} alt={p.story || p.name} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent p-2 text-[11px] text-white">{p.name}</div>
                  <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <button title="Sửa chú thích" className="flex h-8 w-8 items-center justify-center rounded-pill bg-white/90" onClick={async () => {
                      const v = await prompt('Chú thích ảnh', 'Câu chuyện của khoảnh khắc này', p.story);
                      if (v !== null) actions.update.mutateAsync({ id: p.id, story: v }).then(() => toast('Đã lưu chú thích'), fail);
                    }}><Icon name="edit_note" className="text-[18px]" /></button>
                    <button title="Xoá ảnh" className="flex h-8 w-8 items-center justify-center rounded-pill bg-white/90 hover:text-error" onClick={async () => {
                      if (await confirm('Xoá ảnh?', 'Ảnh sẽ bị xoá vĩnh viễn khỏi album.', 'Xoá ảnh'))
                        actions.remove.mutateAsync(p.id).then(() => toast('Đã xoá ảnh'), fail);
                    }}><Icon name="delete" className="text-[18px]" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasNextPage && (
            <div className="mt-space-lg text-center">
              <button className="btn-soft" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>{isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
