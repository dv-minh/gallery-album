import { Hono } from 'hono';
import type { Album } from '../../shared/types';
import type { AppEnv } from '../types';
import { deletePhotoObjects } from './photos';

export const albums = new Hono<AppEnv>();

const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

interface AlbumRow {
  id: string; name: string; description: string; position: number;
  photoCount: number; coverPhotoId: string | null;
}
const toAlbum = (r: AlbumRow): Album => ({ ...r });

albums.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT a.id, a.name, a.description, a.position,
       (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id AND p.status = 'ready') AS photoCount,
       (SELECT id FROM photos p WHERE p.album_id = a.id AND p.status = 'ready' ORDER BY (p.width > p.height) DESC, position LIMIT 1) AS coverPhotoId
     FROM albums a ORDER BY a.position`,
  ).all<AlbumRow>();
  return c.json(results.map(toAlbum));
});

albums.post('/', async (c) => {
  const body = await c.req.json<{ name?: string; description?: string }>().catch(() => ({}) as { name?: string; description?: string });
  const name = body.name?.trim();
  if (!name) return c.json({ error: 'Tên album là bắt buộc.' }, 400);
  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO albums (id, name, description, position, created_at)
     VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM albums), ?)`,
  ).bind(id, name, body.description?.trim() ?? '', Date.now()).run();
  const row = await c.env.DB.prepare('SELECT position FROM albums WHERE id = ?').bind(id).first<{ position: number }>();
  const album: Album = { id, name, description: body.description?.trim() ?? '', position: row?.position ?? 0, photoCount: 0, coverPhotoId: null };
  return c.json(album, 201);
});

albums.patch('/:id', async (c) => {
  const body = await c.req.json<{ name?: string; description?: string }>().catch(() => ({}) as { name?: string; description?: string });
  const name = body.name?.trim();
  if (body.name !== undefined && !name) return c.json({ error: 'Tên album không được để trống.' }, 400);
  const res = await c.env.DB.prepare(
    'UPDATE albums SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
  ).bind(name ?? null, body.description?.trim() ?? null, c.req.param('id')).run();
  if (!res.meta.changes) return c.json({ error: 'Không tìm thấy album.' }, 404);
  return c.body(null, 204);
});

albums.post('/:id/move', async (c) => {
  const { direction } = await c.req.json<{ direction: -1 | 1 }>().catch(() => ({ direction: 0 }) as { direction: number });
  if (direction !== -1 && direction !== 1) return c.json({ error: 'direction phải là -1 hoặc 1.' }, 400);
  const id = c.req.param('id');
  const cur = await c.env.DB.prepare('SELECT position FROM albums WHERE id = ?').bind(id).first<{ position: number }>();
  if (!cur) return c.json({ error: 'Không tìm thấy album.' }, 404);
  const op = direction === -1 ? '<' : '>';
  const order = direction === -1 ? 'DESC' : 'ASC';
  const other = await c.env.DB.prepare(
    `SELECT id, position FROM albums WHERE position ${op} ? ORDER BY position ${order} LIMIT 1`,
  ).bind(cur.position).first<{ id: string; position: number }>();
  if (other) {
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE albums SET position = ? WHERE id = ?').bind(other.position, id),
      c.env.DB.prepare('UPDATE albums SET position = ? WHERE id = ?').bind(cur.position, other.id),
    ]);
  }
  return c.body(null, 204);
});

albums.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { results } = await c.env.DB.prepare('SELECT id FROM photos WHERE album_id = ?').bind(id).all<{ id: string }>();
  await deletePhotoObjects(c.env.BUCKET, results.map((r) => r.id));
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM photos WHERE album_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM albums WHERE id = ?').bind(id),
  ]);
  return c.body(null, 204);
});
