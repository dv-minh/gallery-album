import type { UploadItem } from '../../hooks/useUploadQueue';
import { fmtSize } from '../../lib/format';
import { Icon } from '../ui/Icon';

const LABEL: Record<UploadItem['status'], string> = {
  queued: 'Chờ xử lý', preparing: 'Đang chuẩn bị', uploading: 'Đang tải', done: 'Đã lưu', error: 'Lỗi',
};

interface Props {
  items: UploadItem[];
  onRetry: (id: number) => void;
  onCancel: (id: number) => void;
  onClear: () => void;
}

export function UploadQueue({ items, onRetry, onCancel, onClear }: Props) {
  if (!items.length) return null;
  const done = items.filter((i) => i.status === 'done').length;
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-white p-space-lg shadow-sm">
      <div className="mb-2 flex items-center justify-between border-b border-outline-variant/40 pb-space-sm">
        <div className="flex items-center gap-space-sm">
          <h3 className="font-display text-[20px]">Hàng đợi tải lên</h3>
          <span className="label-caps rounded-pill bg-secondary-container/60 px-space-sm py-0.5 text-on-secondary-container">{done}/{items.length} tệp</span>
        </div>
        {done > 0 && <button onClick={onClear} className="text-[13px] font-medium text-on-surface-variant hover:text-on-surface">Xoá mục đã xong</button>}
      </div>
      <ul className="divide-y divide-outline-variant/40">
        {items.map((i) => (
          <li key={i.id} className="py-space-sm">
            <div className="flex items-center gap-space-md">
              <Icon name={i.status === 'done' ? 'check_circle' : i.status === 'error' ? 'error' : i.status === 'queued' ? 'schedule' : 'progress_activity'}
                className={`text-[18px] ${i.status === 'done' ? 'text-primary' : i.status === 'error' ? 'text-error' : 'animate-pulse text-tertiary'}`} />
              <span className="flex-1 truncate text-[14px] font-medium">{i.file.name}</span>
              <span className="hidden text-[12px] text-on-surface-variant sm:inline">{fmtSize(i.file.size)}</span>
              <span className={`label-caps w-28 text-right ${i.status === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
                {i.status === 'uploading' ? `${i.progress}%` : LABEL[i.status]}
              </span>
              {i.status === 'error' && <button onClick={() => onRetry(i.id)} title="Thử lại" className="p-1 text-on-surface-variant hover:text-primary"><Icon name="refresh" className="text-[18px]" /></button>}
              {(i.status === 'queued' || i.status === 'error') && <button onClick={() => onCancel(i.id)} title="Bỏ khỏi hàng đợi" className="p-1 text-on-surface-variant hover:text-error"><Icon name="close" className="text-[18px]" /></button>}
            </div>
            {i.status === 'uploading' && (
              <div className="ml-9 mt-1 h-1 overflow-hidden rounded-pill bg-surface-container"><div className="h-full bg-primary transition-all" style={{ width: `${i.progress}%` }} /></div>
            )}
            {i.error && <p className="ml-9 mt-1 text-[12px] text-error">{i.error}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
