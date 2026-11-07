import { useStorage } from '../../hooks/useAlbums';
import { fmtSize } from '../../lib/format';
import { Icon } from '../ui/Icon';

export function StoragePanel() {
  const { data } = useStorage();
  const used = data?.used ?? 0, total = data?.total ?? 1;
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div className="flex flex-col items-center justify-between gap-space-md rounded-xl border border-outline-variant/40 bg-white p-space-lg shadow-sm md:flex-row">
      <div className="flex w-full items-center gap-space-md md:w-auto">
        <span className="rounded-lg bg-secondary-container p-2 text-on-secondary-container"><Icon name="cloud_done" className="text-[20px]" /></span>
        <div>
          <span className="label-caps block text-on-surface-variant">Dung lượng lưu trữ đã dùng</span>
          <span className="font-display text-[28px]">{fmtSize(used)}</span>{' '}
          <span className="font-light text-on-surface-variant">/ {fmtSize(total)}</span>
        </div>
      </div>
      <div className="w-full md:max-w-md">
        <div className="label-caps mb-1 flex justify-between text-on-surface-variant">
          <span>Đã dùng {pct.toFixed(1)}%</span><span className="text-primary">Còn trống {fmtSize(Math.max(0, total - used))}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-container">
          <div className="h-full rounded-pill bg-gradient-to-r from-primary to-primary-container" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
