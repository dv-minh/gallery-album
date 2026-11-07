import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { adminCode, api } from '../lib/api';

interface AuthCtx {
  isAdmin: boolean;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  login: (code: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Có code trong localStorage thì coi là đã đăng nhập; server vẫn kiểm tra mỗi thao tác ghi.
  const [isAdmin, setIsAdmin] = useState(() => adminCode.get() !== '');
  const [loginOpen, setLoginOpen] = useState(false);

  const login = useCallback(async (code: string) => {
    await api.verify(code);
    adminCode.set(code);
    setIsAdmin(true);
    setLoginOpen(false);
  }, []);
  const logout = useCallback(() => { adminCode.clear(); setIsAdmin(false); }, []);

  const value = useMemo(() => ({
    isAdmin, loginOpen, login, logout,
    openLogin: () => setLoginOpen(true), closeLogin: () => setLoginOpen(false),
  }), [isAdmin, loginOpen, login, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAdminAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAdminAuth phải nằm trong <AuthProvider>');
  return c;
};
