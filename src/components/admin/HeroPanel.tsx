import { useRef, useState } from 'react';
import { useUploadHero } from '../../hooks/useHero';
import { heroUrl } from '../../lib/api';
import { isImageFile } from '../../hooks/useUploadQueue';
import { useFeedback } from '../ui/Feedback';
import { Icon } from '../ui/Icon';

/** Ảnh bìa trang chủ: xem trước + đổi bằng một ảnh riêng (chỉ có một ảnh bìa). */
export function HeroPanel() {
  const { toast } = useFeedback();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadHero();
  const [src, setSrc] = useState(heroUrl);
  const [broken, setBroken] = useState(false);

  const pick = (list: FileList | null) => {
    const f = [...(list ?? [])].find(isImageFile);
    if (!f) return;
    upload.mutateAsync(f).then(
      () => { setBroken(false); setSrc(heroUrl()); toast('Đã đổi ảnh bìa'); },
      (e) => toast(e instanceof Error ? e.message : 'Không đổi được ảnh bìa.', 'err'),
    );
  };

  return (
    <section className="flex flex-col gap-space-md rounded-xl border border-outline-variant/40 bg-white p-space-lg shadow-sm sm:flex-row sm:items-center">
      <div className="flex aspect-[16/9] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container sm:w-64">
        {broken ? <Icon name="wallpaper" className="text-[40px] text-outline" />
          : <img src={src} alt="Ảnh bìa hiện tại" className="h-full w-full object-cover" onError={() => setBroken(true)} />}
      </div>
      <div className="flex-1">
        <h2 className="font-display text-[22px] italic">Ảnh bìa trang chủ</h2>
        <p className="mb-space-sm text-[12px] text-on-surface-variant">Một ảnh duy nhất hiển thị ở đầu trang chủ. Nên chọn ảnh ngang, độ phân giải cao.</p>
        <button className="btn-primary !bg-primary hover:!bg-on-primary-container" disabled={upload.isPending} onClick={() => input.current?.click()}>
          <Icon name={upload.isPending ? 'progress_activity' : 'wallpaper'} className={`text-[18px] ${upload.isPending ? 'animate-spin' : ''}`} />
          {upload.isPending ? 'Đang tải lên…' : 'Đổi ảnh bìa'}
        </button>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
      </div>
    </section>
  );
}
