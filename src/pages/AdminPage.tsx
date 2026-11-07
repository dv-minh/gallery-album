import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { StoragePanel } from '../components/admin/StoragePanel';
import { AdminHeader } from '../components/layout/Headers';
import { useFeedback } from '../components/ui/Feedback';
import { Icon } from '../components/ui/Icon';
import { couple } from '../config';
import { useAlbumActions, useAlbums } from '../hooks/useAlbums';
import { imageUrl } from '../lib/api';
import { pad } from '../lib/format';

export default function AdminPage() {
  const { toast, confirm, prompt } = useFeedback();
  const { data: albums = [], isLoading } = useAlbums();
  const act = useAlbumActions();
  const [name, setName] = useState('');

  const run = async (p: Promise<unknown>, ok?: string) => {
    try { await p; if (ok) toast(ok); } catch (e) { toast(e instanceof Error ? e.message : 'Có lỗi xảy ra.', 'err'); }
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast('Nhập tên album.', 'err');
    void run(act.create.mutateAsync(name.trim()), 'Đã tạo album').then(() => setName(''));
  };

  const iconBtn = 'rounded p-1 text-on-surface-variant hover:bg-surface-container';

  return (
    <div className="page-enter">
      <AdminHeader subtitle={couple.names} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-space-lg px-space-md pb-space-2xl pt-28 sm:px-space-lg lg:px-margin-desktop">
        <div className="border-b border-surface-container-high pb-space-sm">
          <div className="label-caps mb-1 flex items-center gap-1 text-primary"><Icon name="diamond" fill className="text-[15px]" />Studio Archive · Quản lý album</div>
          <h1 className="font-display text-[32px] italic tracking-tight md:text-[40px]">Tải Lên Kho Lưu Trữ</h1>
          <p className="max-w-xl text-[14px] text-on-surface-variant">Quản lý album và tải ảnh gốc cho từng chương của ngày cưới.</p>
        </div>

        <StoragePanel />

        <section className="rounded-xl border border-outline-variant/40 bg-white p-space-lg shadow-sm">
          <div className="flex flex-col justify-between gap-space-md border-b border-surface-container-high pb-space-md sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-[22px] italic">Tất cả album</h2>
                <span className="rounded-pill bg-surface-container px-2 py-0.5 text-[11px] font-medium">{albums.length} album</span>
              </div>
              <p className="text-[12px] text-on-surface-variant">Sắp xếp thứ tự hiển thị và nhấn “Tải ảnh” để thêm ảnh vào từng album.</p>
            </div>
            <form onSubmit={create} className="flex items-center gap-1">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên album mới…" className="input !w-44 !py-space-xs sm:!w-56" />
              <button className="btn-primary !bg-primary hover:!bg-on-primary-container"><Icon name="add" className="text-[18px]" />Tạo album</button>
            </form>
          </div>

          {isLoading ? <p className="py-space-xl text-center text-on-surface-variant">Đang tải…</p>
            : !albums.length ? <p className="py-space-xl text-center text-on-surface-variant">Chưa có album. Hãy tạo album đầu tiên.</p>
            : (
              <ul className="divide-y divide-surface-container-high">
                {albums.map((a, n) => (
                  <li key={a.id} className="flex flex-col justify-between gap-space-md rounded-lg px-space-sm py-space-md hover:bg-surface-container-low/60 md:flex-row md:items-center">
                    <div className="flex min-w-0 items-center gap-space-md">
                      <span className="label-caps w-6 text-on-surface-variant">{pad(n + 1)}</span>
                      {a.coverPhotoId
                        ? <img src={imageUrl(a.coverPhotoId, 'thumb')} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-outline-variant/40 object-cover" />
                        : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container"><Icon name="image" className="text-outline" /></div>}
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-[17px] font-medium italic">{a.name}</h3>
                        <p className="text-[12px] text-on-surface-variant">{a.photoCount} ảnh</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 self-end md:self-center">
                      <button className={iconBtn} title="Chuyển lên" disabled={n === 0} onClick={() => run(act.move.mutateAsync({ id: a.id, direction: -1 }))}><Icon name="arrow_upward" className="text-[18px]" /></button>
                      <button className={iconBtn} title="Chuyển xuống" disabled={n === albums.length - 1} onClick={() => run(act.move.mutateAsync({ id: a.id, direction: 1 }))}><Icon name="arrow_downward" className="text-[18px]" /></button>
                      <button className={iconBtn} title="Đổi tên" onClick={async () => {
                        const v = await prompt('Đổi tên album', 'Tên album', a.name);
                        if (v) void run(act.rename.mutateAsync({ id: a.id, name: v }), 'Đã đổi tên');
                      }}><Icon name="edit" className="text-[18px]" /></button>
                      <button className={`${iconBtn} hover:!text-error`} title="Xoá album" onClick={async () => {
                        if (await confirm('Xoá album?', `Album “${a.name}” và ${a.photoCount} ảnh bên trong sẽ bị xoá vĩnh viễn.`, 'Xoá album'))
                          void run(act.remove.mutateAsync(a.id), 'Đã xoá album');
                      }}><Icon name="delete" className="text-[18px]" /></button>
                      <Link to={`/admin/albums/${a.id}`} className="ml-1 flex items-center gap-1 rounded-lg bg-primary px-space-md py-1 text-[13px] font-medium text-white"><Icon name="cloud_upload" className="text-[16px]" />Tải ảnh</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </main>
    </div>
  );
}
