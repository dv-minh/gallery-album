import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/* ---------- Toast ---------- */
interface ToastItem { id: number; msg: string; type: 'ok' | 'err' }

/* ---------- Dialog hộp thoại xác nhận / nhập liệu ---------- */
type DialogState =
  | { kind: 'confirm'; title: string; text: string; okLabel: string; resolve: (v: boolean) => void }
  | { kind: 'prompt'; title: string; label: string; value: string; resolve: (v: string | null) => void };

interface Ctx {
  toast: (msg: string, type?: 'ok' | 'err') => void;
  confirm: (title: string, text: string, okLabel?: string) => Promise<boolean>;
  prompt: (title: string, label: string, value?: string) => Promise<string | null>;
}
const FeedbackCtx = createContext<Ctx | null>(null);

export const useFeedback = () => {
  const c = useContext(FeedbackCtx);
  if (!c) throw new Error('useFeedback phải nằm trong <FeedbackProvider>');
  return c;
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const seq = useRef(0);

  const toast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const confirm = useCallback(
    (title: string, text: string, okLabel = 'Xác nhận') =>
      new Promise<boolean>((resolve) => setDialog({ kind: 'confirm', title, text, okLabel, resolve })), []);
  const prompt = useCallback(
    (title: string, label: string, value = '') =>
      new Promise<string | null>((resolve) => setDialog({ kind: 'prompt', title, label, value, resolve })), []);

  const ctx = useMemo(() => ({ toast, confirm, prompt }), [toast, confirm, prompt]);

  return (
    <FeedbackCtx.Provider value={ctx}>
      {children}
      {dialog && <DialogView dialog={dialog} close={() => setDialog(null)} />}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`page-enter pointer-events-auto flex items-center gap-2 rounded-xl px-space-lg py-space-sm shadow-xl label-caps ${t.type === 'err' ? 'bg-error text-white' : 'bg-inverse-surface text-inverse-on-surface'}`}>
            <Icon name={t.type === 'err' ? 'error' : 'check_circle'} className="text-[16px]" />{t.msg}
          </div>
        ))}
      </div>
    </FeedbackCtx.Provider>
  );
}

function DialogView({ dialog, close }: { dialog: DialogState; close: () => void }) {
  const [value, setValue] = useState(dialog.kind === 'prompt' ? dialog.value : '');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const cancel = () => { close(); if (dialog.kind === 'confirm') dialog.resolve(false); else dialog.resolve(null); };
  const ok = () => {
    close();
    if (dialog.kind === 'confirm') dialog.resolve(true);
    else dialog.resolve(value.trim() || null);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });

  return (
    <div className="page-enter fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/70 p-space-md backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && cancel()}>
      <div role="dialog" aria-modal className="w-full max-w-md rounded-xl bg-white p-space-lg shadow-2xl">
        <h3 className="mb-2 font-display text-[22px]">{dialog.title}</h3>
        {dialog.kind === 'confirm' ? (
          <p className="mb-space-lg text-[14px] text-on-surface-variant">{dialog.text}</p>
        ) : (
          <div className="mb-space-lg">
            <label className="label-caps text-secondary">{dialog.label}</label>
            <input ref={inputRef} className="input mt-1" value={value} onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ok()} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={cancel} className="px-space-md py-space-sm text-[13px] font-medium text-on-surface-variant">Huỷ</button>
          <button onClick={ok} className={`rounded-lg px-space-lg py-space-sm text-[13px] font-medium text-white ${dialog.kind === 'confirm' ? 'bg-error' : 'bg-primary'}`}>
            {dialog.kind === 'confirm' ? dialog.okLabel : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
