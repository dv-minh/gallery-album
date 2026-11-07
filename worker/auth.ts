import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from './types';

const enc = new TextEncoder();

/** So sánh hằng thời gian: băm SHA-256 hai chuỗi rồi so sánh digest. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  return (crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean }).timingSafeEqual(ha, hb);
}

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const m = c.req.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return next();

  const code = c.req.header('x-admin-code') ?? '';
  if (!c.env.ADMIN_CODE || !(await safeEqual(code, c.env.ADMIN_CODE))) {
    return c.json({ error: 'Mã xác thực không chính xác.' }, 401);
  }
  return next();
};
