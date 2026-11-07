import { Link, useNavigate } from 'react-router-dom';
import { couple } from '../../config';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Icon } from '../ui/Icon';

export const Logo = () => (
  <Link to="/" className="flex items-center gap-space-sm">
    <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-primary-container/40"><Icon name="filter_vintage" className="text-[20px] text-primary" /></span>
    <span className="font-display text-[22px] italic tracking-wide">Éternel Archive</span>
  </Link>
);

const bar = 'fixed inset-x-0 top-0 z-40 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md';

export function SiteHeader() {
  const { isAdmin, openLogin } = useAdminAuth();
  const nav = useNavigate();
  return (
    <header className={bar}>
      <div className="flex h-20 items-center justify-between gap-space-md px-space-lg lg:px-margin-desktop">
        <div className="flex items-center gap-space-md">
          <Logo />
          <span className="hidden h-4 w-px bg-outline-variant sm:block" />
          <span className="label-caps hidden text-on-surface-variant sm:inline">{couple.names}</span>
        </div>
        <nav className="flex items-center gap-space-sm">
          <Link to="/" className="rounded-lg bg-secondary-container px-space-md py-space-xs text-[13px] font-medium text-on-secondary-container">Bộ Sưu Tập</Link>
          <button onClick={() => (isAdmin ? nav('/admin') : openLogin())}
            className="flex items-center gap-1 rounded-lg border border-outline-variant/60 px-space-md py-space-xs text-[13px] font-medium text-on-surface-variant hover:bg-surface-container-low">
            <Icon name={isAdmin ? 'lock_open' : 'lock'} className="text-[16px] text-primary" />
            <span className="hidden sm:inline">Quản Lý Ảnh</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

export function AdminHeader({ subtitle }: { subtitle: string }) {
  const { logout } = useAdminAuth();
  const nav = useNavigate();
  return (
    <header className={bar}>
      <div className="flex h-20 items-center justify-between gap-space-md px-space-md sm:px-space-lg lg:px-margin-desktop">
        <div className="flex items-center gap-space-lg">
          <Logo />
          <span className="hidden h-4 w-px bg-outline-variant sm:block" />
          <div className="hidden flex-col sm:flex">
            <span className="label-caps text-primary">Master Archival Console</span>
            <span className="text-[12px] font-medium text-on-surface-variant">{subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <Link to="/" className="flex items-center gap-1 rounded-lg bg-surface-container-low px-space-md py-space-xs text-[13px] font-medium hover:bg-surface-container">
            <Icon name="arrow_back" className="text-[18px]" /><span className="hidden sm:inline">Quay lại Bộ Sưu Tập</span>
          </Link>
          <button onClick={() => { logout(); nav('/'); }} title="Đăng xuất"
            className="flex items-center gap-1 rounded-pill border border-outline-variant/40 bg-white px-space-sm py-space-xs">
            <Icon name="verified" className="text-[16px] text-tertiary" />
            <span className="label-caps hidden text-primary md:inline">Quản trị viên</span>
            <Icon name="logout" className="text-[16px] text-on-surface-variant" />
          </button>
        </div>
      </div>
    </header>
  );
}

export const Footer = () => (
  <footer className="mt-space-2xl w-full bg-surface-container-low py-space-xl">
    <div className="mx-auto max-w-7xl px-space-lg lg:px-margin-desktop">
      <div className="flex flex-col items-center justify-between gap-space-md pb-space-lg md:flex-row">
        <div className="flex items-center gap-2 font-display text-[22px] italic text-primary"><Icon name="filter_vintage" />Éternel Archive</div>
        <div className="flex flex-wrap items-center justify-center gap-space-lg text-[12px] text-on-surface-variant">
          {[['lock', 'Bảo Mật Kỷ Niệm'], ['photo_library', 'Độ Phân Giải Gốc'], ['diamond', 'Lưu Trữ Vĩnh Viễn']].map(([i, t]) => (
            <span key={t} className="flex items-center gap-1"><Icon name={i} className="text-[16px] text-primary" />{t}</span>
          ))}
        </div>
      </div>
      <div className="label-caps flex flex-col items-center justify-between gap-2 pt-space-md text-on-surface-variant sm:flex-row">
        <p>© {new Date().getFullYear()} Éternel Fine Art Studio. All Rights Reserved.</p>
        <p>Passe-Partout Matting · Curated Masterpiece</p>
      </div>
    </div>
  </footer>
);
