import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginDialog } from './components/LoginDialog';
import { FeedbackProvider } from './components/ui/Feedback';
import { AuthProvider, useAdminAuth } from './hooks/useAdminAuth';
import ShowcasePage from './pages/ShowcasePage';

// Trang quản trị tách chunk riêng: khách xem không phải tải code upload/quản lý.
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AlbumUploadPage = lazy(() => import('./pages/AlbumUploadPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdminAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-primary">Đang tải…</div>}>
              <Routes>
                <Route path="/" element={<ShowcasePage />} />
                <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
                <Route path="/admin/albums/:id" element={<RequireAdmin><AlbumUploadPage /></RequireAdmin>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <LoginDialog />
          </AuthProvider>
        </BrowserRouter>
      </FeedbackProvider>
    </QueryClientProvider>
  );
}
