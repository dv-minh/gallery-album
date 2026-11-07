import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { ApiError } from '../lib/api';
import { Icon } from './ui/Icon';

export function LoginDialog() {
  const { loginOpen, closeLogin, login } = useAdminAuth();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (loginOpen) { setCode(''); setError(''); ref.current?.focus(); } }, [loginOpen]);
  useEffect(() => {
    if (!loginOpen) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closeLogin();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [loginOpen, closeLogin]);

  if (!loginOpen) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(code.trim()); nav('/admin'); }
    catch (err) { setError(err instanceof ApiError && err.status === 401 ? 'Mã xác thực không chính xác.' : 'Không kết nối được máy chủ.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="page-enter fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/70 p-space-md backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && closeLogin()}>
      <form onSubmit={submit} role="dialog" aria-modal className="relative flex w-full max-w-md flex-col items-center rounded-2xl bg-white p-space-xl text-center shadow-2xl">
        <button type="button" onClick={closeLogin} aria-label="Đóng" className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-pill bg-surface-container-low"><Icon name="close" className="text-[18px]" /></button>
        <div className="mb-space-md flex h-12 w-12 items-center justify-center rounded-pill bg-secondary-container text-primary"><Icon name="admin_panel_settings" className="text-[24px]" /></div>
        <span className="label-caps mb-1 text-primary">Studio Master Access</span>
        <h3 className="mb-1 font-display text-[22px]">Xác Thực Quản Trị</h3>
        <p className="mb-space-lg text-[12px] text-on-surface-variant">Nhập mã bảo mật để tải ảnh và quản lý album.</p>
        <div className="mb-space-lg w-full text-left">
          <label htmlFor="code" className="label-caps text-secondary">Mã bảo mật</label>
          <input id="code" ref={ref} type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••"
            className="input mt-1 text-center text-[18px] tracking-widest" autoComplete="current-password" />
          {error && <p className="mt-2 text-center text-[12px] text-error">{error}</p>}
        </div>
        <div className="flex w-full gap-2">
          <button type="button" onClick={closeLogin} className="btn-soft flex-1">Huỷ</button>
          <button disabled={busy || !code.trim()} className="btn-primary flex-1"><Icon name="lock_open" className="text-[16px]" />{busy ? 'Đang kiểm tra…' : 'Đăng nhập'}</button>
        </div>
      </form>
    </div>
  );
}
