import { useRef, useState } from 'react';
import { isImageFile } from '../../hooks/useUploadQueue';
import { useFeedback } from '../ui/Feedback';
import { Icon } from '../ui/Icon';

export function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const { toast } = useFeedback();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handle = (list: FileList | null) => {
    const all = [...(list ?? [])];
    const imgs = all.filter(isImageFile);
    if (all.length > imgs.length) toast(`Bỏ qua ${all.length - imgs.length} tệp không phải ảnh.`, 'err');
    if (imgs.length) onFiles(imgs);
  };

  return (
    <div role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      onDragEnter={(e) => { e.preventDefault(); setOver(true); }} onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setOver(false); }}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      className={`flex cursor-pointer flex-col items-center gap-space-md rounded-xl border-2 border-dashed bg-white p-space-xl text-center shadow-md transition hover:shadow-xl lg:p-space-2xl ${over ? 'border-primary bg-surface-container-low ring-2 ring-primary' : 'border-primary-container/60'}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-pill bg-surface-container-low text-primary"><Icon name="filter_vintage" className="text-[36px]" /></div>
      <h2 className="font-display text-[26px]">Kéo &amp; thả ảnh vào đây</h2>
      <p className="max-w-xl text-[14px] font-light text-on-surface-variant">Hỗ trợ JPG, PNG, WEBP. Có thể chọn nhiều tệp cùng lúc. Ảnh gốc được lưu nguyên bản, kèm bản xem trước tự động.</p>
      <button type="button" onClick={(e) => { e.stopPropagation(); input.current?.click(); }} className="btn-primary px-space-xl shadow-md"><Icon name="add_photo_alternate" className="text-[18px]" />Chọn tệp từ máy tính</button>
      <input ref={input} type="file" multiple accept="image/*" hidden onChange={(e) => { handle(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
