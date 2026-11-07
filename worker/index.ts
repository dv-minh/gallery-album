import { Hono } from 'hono';
import { VARIANTS, type Variant } from '../shared/types';
import { requireAdmin } from './auth';
import { albums } from './routes/albums';
import { objectKey, photos } from './routes/photos';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use('/api/*', requireAdmin);

app.post('/api/verify', (c) => c.body(null, 204)); // requireAdmin đã kiểm tra code
/** Ảnh bìa trang chủ: một tệp riêng, stream thẳng body → R2. Khoá mới mỗi lần (bất biến), xoá khoá cũ. */
app.put('/api/site/hero', async (c) => {
  if (!c.req.raw.body) return c.json({ error: 'Thiếu nội dung tệp.' }, 400);
  const key = `site/hero-${crypto.randomUUID().slice(0, 8)}.webp`;
  await c.env.BUCKET.put(key, c.req.raw.body, { httpMetadata: { contentType: 'image/webp' } });
  const old = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'hero_file'").first<{ value: string }>();
  await c.env.DB.prepare("INSERT INTO settings (key, value) VALUES ('hero_file', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key).run();
  if (old?.value) await c.env.BUCKET.delete(old.value);
  return c.body(null, 204);
});
app.route('/api/albums', albums);
app.route('/api', photos);
app.all('/api/*', (c) => c.json({ error: 'Không tìm thấy.' }, 404));

/** Ảnh bìa: tệp đã tải lên ở trang quản lý; chưa có thì lấy ảnh ngang đầu tiên. Cache ngắn vì có thể đổi. */
app.get('/img/hero', async (c) => {
  const set = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'hero_file'").first<{ value: string }>();
  let obj = set ? await c.env.BUCKET.get(set.value) : null;
  if (!obj) {
    const row = await c.env.DB.prepare(
      "SELECT id FROM photos WHERE status = 'ready' ORDER BY (width > height) DESC, position LIMIT 1",
    ).first<{ id: string }>();
    obj = row && (await c.env.BUCKET.get(objectKey(row.id, 'medium')));
  }
  if (!obj) return c.notFound();
  if (c.req.header('if-none-match') === obj.httpEtag) return c.body(null, 304);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=60');
  return new Response(obj.body, { headers });
});

/** Ảnh: khoá bất biến nên cache lâu dài. */
app.get('/img/:id/:variant', async (c) => {
  const variant = c.req.param('variant') as Variant;
  if (!VARIANTS.includes(variant)) return c.notFound();
  const obj = await c.env.BUCKET.get(objectKey(c.req.param('id'), variant));
  if (!obj) return c.notFound();
  if (c.req.header('if-none-match') === obj.httpEtag) return c.body(null, 304);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
});

// Mọi đường dẫn còn lại do static assets (SPA) phục vụ.
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
