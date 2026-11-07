import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { couple } from '../../config';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Icon } from '../ui/Icon';

/** Monogram M&L: vòng tròn viền vàng, chữ Playfair. Đổi thứ tự thành L&M bằng cách đảo hai chữ cái. */
export const Monogram = ({ size = 44, className = '', light = false }: { size?: number; className?: string; light?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="M&L" className={className}>
    <circle cx="32" cy="32" r="30" className={light ? 'fill-white/15 stroke-white' : 'fill-primary-container/30 stroke-primary'} strokeWidth="1.5" />
    <circle cx="32" cy="32" r="26.5" className={light ? 'fill-none stroke-white/50' : 'fill-none stroke-primary/40'} strokeWidth="0.75" />
    <text x="21" y="39.5" textAnchor="middle" className={`${light ? 'fill-white' : 'fill-primary'} font-display`} fontSize="23" fontWeight="500">M</text>
    <text x="32.5" y="36" textAnchor="middle" className={`${light ? 'fill-white' : 'fill-tertiary'} font-display`} fontSize="14" fontStyle="italic">&amp;</text>
    <text x="43.5" y="39.5" textAnchor="middle" className={`${light ? 'fill-white' : 'fill-primary'} font-display`} fontSize="23" fontWeight="500">L</text>
  </svg>
);

export const Logo = ({ light = false }: { light?: boolean }) => (
  <Link to="/" aria-label="Trang chủ" className="flex items-center"><Monogram light={light} /></Link>
);

const bar = 'fixed inset-x-0 top-0 z-40 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md';

/** Header trang chủ: nằm đè lên ảnh bìa, kính mờ + chữ trắng; cuộn qua bìa thì chuyển sang nền sáng. */
export function SiteHeader() {
  const { isAdmin, openLogin } = useAdminAuth();
  const nav = useNavigate();
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => setPast(window.scrollY > window.innerHeight * 0.7);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const over = !past; // đang đè lên ảnh bìa
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Hai lớp nền chồng nhau, đổi bằng độ mờ: trong suốt (chỉ một vệt tối nhẹ cho chữ dễ đọc) ↔ nền sáng khi đã cuộn qua ảnh bìa. */}
      <div aria-hidden className={`absolute inset-0 bg-gradient-to-b from-black/30 to-transparent transition-opacity duration-500 ${over ? 'opacity-100' : 'opacity-0'}`} />
      <div aria-hidden className={`absolute inset-0 bg-surface/85 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md transition-opacity duration-500 ${over ? 'opacity-0' : 'opacity-100'}`} />
      <div className="relative flex h-20 items-center justify-between gap-space-md px-space-lg lg:px-margin-desktop">
        <div className="flex items-center gap-space-md">
          <Logo light={over} />
          <span className={`hidden h-4 w-px sm:block ${over ? 'bg-white/40' : 'bg-outline-variant'}`} />
          <span className={`label-caps hidden sm:inline ${over ? 'text-white/90' : 'text-on-surface-variant'}`}>{couple.names}</span>
        </div>
        <nav className="flex items-center gap-space-sm">
          <Link to="/" className={`rounded-lg px-space-md py-space-xs text-[13px] font-medium ${over ? 'bg-white/15 text-white' : 'bg-secondary-container text-on-secondary-container'}`}>Bộ Sưu Tập</Link>
          <button onClick={() => (isAdmin ? nav('/admin') : openLogin())}
            className={`flex items-center gap-1 rounded-lg border px-space-md py-space-xs text-[13px] font-medium ${over ? 'border-white/35 text-white hover:bg-white/15' : 'border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low'}`}>
            <Icon name={isAdmin ? 'lock_open' : 'lock'} className={`text-[16px] ${over ? 'text-white' : 'text-primary'}`} />
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
  <footer className="mt-space-2xl w-full bg-surface-container-low py-space-lg">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-space-sm px-space-lg md:flex-row lg:px-margin-desktop">
      <div className="flex items-center gap-2 font-display text-[22px] italic text-primary"><Monogram size={36} />Viết Minh &amp; Huyền Linh</div>
      <p className="label-caps text-center text-on-surface-variant">© {new Date().getFullYear()} Viết Minh &amp; Huyền Linh. All Rights Reserved.</p>
    </div>
  </footer>
);
