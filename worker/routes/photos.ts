import { Hono } from 'hono';
import { STORAGE_TOTAL, VARIANTS, type CreatePhotoInput, type Photo, type PhotoPage, type Storage, type Variant } from '../../shared/types';
import type { AppEnv } from '../types';

export const photos = new Hono<AppEnv>();

const BIT: Record<Variant, number> = { thumb: 1, medium: 2, original: 4 };
const READY = 7;
const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 14);

export const objectKey = (id: string, v: Variant) => `photos/${id}/${v === 'original' ? 'original' : v + '.webp'}`;

export async function deletePhotoObjects(bucket: R2Bucket, ids: string[]) {
  const keys = ids.flatMap((id) => VARIANTS.map((v) => objectKey(id, v)));
  for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000));
}

interface PhotoRow {
  id: string; album_id: string; name: string; size: number; width: number | null; height: number | null;
  mime: string; story: string; meta: string; position: number; created_at: number;
}
const toPhoto = (r: PhotoRow): Photo => ({
  id: r.id, albumId: r.album_id, name: r.name, size: r.size, width: r.width, height: r.height, mime: r.mime,
  story: r.story, meta: r.meta, position: r.position, createdAt: r.created_at,
});

async function page(db: D1Database, where: string, binds: unknown[], cursor: number | null, limit: number): Promise<PhotoPage> {
  const lim = Math.min(Math.max(limit || 30, 1), 100);
  const { results } = await db.prepare(
    `SELECT * FROM photos WHERE status = 'ready' ${where} ${cursor !== null ? 'AND position > ?' : ''} ORDER BY position LIMIT ?`,
  ).bind(...binds, ...(cursor !== null ? [cursor] : []), lim + 1).all<PhotoRow>();
  const items = results.slice(0, lim).map(toPhoto);
  const more = results.length > lim;
  return { items, nextCursor: more ? items[items.length - 1].position : null };
}

const num = (v: string | undefined) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);

photos.get('/photos', async (c) => {
  return c.json(await page(c.env.DB, '', [], num(c.req.query('cursor')), Number(c.req.query('limit'))));
});

photos.get('/albums/:id/photos', async (c) =>
  c.json(await page(c.env.DB, 'AND album_id = ?', [c.req.param('id')], num(c.req.query('cursor')), Number(c.req.query('limit')))));

photos.post('/albums/:id/photos', async (c) => {
  const albumId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT 1 AS x FROM albums WHERE id = ?').bind(albumId).first();
  if (!exists) return c.json({ error: 'Không tìm thấy album.' }, 404);
  const b = await c.req.json<CreatePhotoInput>().catch(() => null);
  if (!b || !b.name || !(b.size > 0) || !b.mime) return c.json({ error: 'Dữ liệu ảnh không hợp lệ.' }, 400);
  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO photos (id, album_id, name, size, width, height, mime, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM photos), ?)`,
  ).bind(id, albumId, b.name, b.size, b.width, b.height, b.mime, Date.now()).run();
  const row = await c.env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(id).first<PhotoRow>();
  return c.json(toPhoto(row!), 201);
});

/** Tạo nhiều bản ghi ảnh trong một lần gọi (một D1 batch) để upload nhiều ảnh bớt request. */
photos.post('/albums/:id/photos/batch', async (c) => {
  const albumId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT 1 AS x FROM albums WHERE id = ?').bind(albumId).first();
  if (!exists) return c.json({ error: 'Không tìm thấy album.' }, 404);
  const body = await c.req.json<{ items?: CreatePhotoInput[] }>().catch(() => null);
  const items = body?.items;
  if (!Array.isArray(items) || !items.length || items.length > 50) return c.json({ error: 'Cần 1–50 ảnh mỗi lần.' }, 400);
  if (items.some((b) => !b || !b.name || !(b.size > 0) || !b.mime)) return c.json({ error: 'Dữ liệu ảnh không hợp lệ.' }, 400);

  const base = (await c.env.DB.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM photos').first<{ m: number }>())?.m ?? 0;
  const now = Date.now();
  const ids = items.map(() => newId());
  await c.env.DB.batch(items.map((b, i) => c.env.DB.prepare(
    `INSERT INTO photos (id, album_id, name, size, width, height, mime, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(ids[i], albumId, b.name, b.size, b.width, b.height, b.mime, base + i + 1, now)));
  const out: Photo[] = items.map((b, i) => ({
    id: ids[i], albumId, name: b.name, size: b.size, width: b.width, height: b.height, mime: b.mime,
    story: '', meta: '', position: base + i + 1, createdAt: now,
  }));
  return c.json(out, 201);
});

photos.put('/photos/:id/file/:variant', async (c) => {
  const id = c.req.param('id');
  const variant = c.req.param('variant') as Variant;
  if (!VARIANTS.includes(variant)) return c.json({ error: 'variant không hợp lệ.' }, 400);
  const row = await c.env.DB.prepare('SELECT mime FROM photos WHERE id = ?').bind(id).first<{ mime: string }>();
  if (!row) return c.json({ error: 'Không tìm thấy ảnh.' }, 404);
  if (!c.req.raw.body) return c.json({ error: 'Thiếu nội dung tệp.' }, 400);

  await c.env.BUCKET.put(objectKey(id, variant), c.req.raw.body, {
    httpMetadata: { contentType: variant === 'original' ? row.mime : 'image/webp' },
  });
  await c.env.DB.prepare(
    `UPDATE photos SET variants = variants | ?, status = CASE WHEN (variants | ?) = ? THEN 'ready' ELSE status END WHERE id = ?`,
  ).bind(BIT[variant], BIT[variant], READY, id).run();
  return c.body(null, 204);
});

photos.patch('/photos/:id', async (c) => {
  const b = await c.req.json<{ story?: string; meta?: string }>().catch(() => ({}) as { story?: string; meta?: string });
  const res = await c.env.DB.prepare(
    'UPDATE photos SET story = COALESCE(?, story), meta = COALESCE(?, meta) WHERE id = ?',
  ).bind(b.story ?? null, b.meta ?? null, c.req.param('id')).run();
  if (!res.meta.changes) return c.json({ error: 'Không tìm thấy ảnh.' }, 404);
  return c.body(null, 204);
});

photos.delete('/photos/:id', async (c) => {
  const id = c.req.param('id');
  await deletePhotoObjects(c.env.BUCKET, [id]);
  await c.env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

photos.get('/photos/:id/download', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT name FROM photos WHERE id = ?').bind(id).first<{ name: string }>();
  const obj = row && (await c.env.BUCKET.get(objectKey(id, 'original')));
  if (!row || !obj) return c.json({ error: 'Không tìm thấy ảnh.' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`);
  return new Response(obj.body, { headers });
});

photos.get('/storage', async (c) => {
  const r = await c.env.DB.prepare('SELECT COALESCE(SUM(size), 0) AS used FROM photos').first<{ used: number }>();
  const s: Storage = { used: r?.used ?? 0, total: STORAGE_TOTAL };
  return c.json(s);
});
