import { Hono } from 'hono';
import { VARIANTS, type Variant } from '../shared/types';
import { requireAdmin } from './auth';
import { albums } from './routes/albums';
import { objectKey, photos } from './routes/photos';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use('/api/*', requireAdmin);

app.post('/api/verify', (c) => c.body(null, 204)); // requireAdmin đã kiểm tra code
app.route('/api/albums', albums);
app.route('/api', photos);
app.all('/api/*', (c) => c.json({ error: 'Không tìm thấy.' }, 404));

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
