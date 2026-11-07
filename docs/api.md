# REST API

Tiền tố `/api`. Ghi (POST/PUT/PATCH/DELETE) cần header `X-Admin-Code`. Lỗi: `{ "error": "message" }` + status phù hợp.

| Method & path | Auth | Mô tả |
|---|---|---|
| `POST /api/verify` | admin | 204 nếu code đúng, 401 nếu sai |
| `GET /api/albums` | — | Danh sách album kèm `photoCount`, `coverPhotoId` |
| `POST /api/albums` | admin | `{name}` → Album |
| `PATCH /api/albums/:id` | admin | `{name?, description?}` |
| `POST /api/albums/:id/move` | admin | `{direction: -1 \| 1}` |
| `DELETE /api/albums/:id` | admin | Xoá album + toàn bộ ảnh (R2 + D1) |
| `GET /api/albums/:id/photos?cursor=&limit=` | — | `PhotoPage` (limit mặc định 30) |
| `GET /api/photos?cursor=&limit=` | — | Ảnh toàn site (cho tab "Tất cả") |
| `POST /api/albums/:id/photos` | admin | `{name,size,mime,width,height}` → Photo (status `pending`) |
| `POST /api/albums/:id/photos/batch` | admin | `{items: [{name,size,mime,width,height}]}` (1–50) → Photo[] (một D1 batch; UI dùng cái này khi upload nhiều ảnh) |
| `PUT /api/photos/:id/file/:variant` | admin | Body là file (stream). `variant` ∈ `thumb\|medium\|original`. Khi đủ 3 → `ready` |
| `PATCH /api/photos/:id` | admin | `{story?, meta?}` |
| `DELETE /api/photos/:id` | admin | Xoá R2 + D1 |
| `GET /api/photos/:id/download` | — | Stream original, `Content-Disposition: attachment` |
| `GET /api/storage` | — | `{used,total}` |
| `PUT /api/site/hero` | admin | Body là ảnh WebP (stream) — ảnh bìa trang chủ, lưu `site/hero-<id>.webp`, key ghi ở `settings.hero_file`; tệp cũ bị xoá |
| `GET /img/hero` | — | Ảnh bìa (chưa tải: ảnh ngang đầu tiên). Cache 60s |
| `GET /img/:id/:variant` | — | Stream R2, cache immutable |

Phân trang: cursor là `position` của phần tử cuối; trả `nextCursor: number | null`.
