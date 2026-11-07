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
| `GET /api/photos?favorite=1&cursor=&limit=` | — | Ảnh toàn site (cho tab "Tất cả" và "Yêu thích") |
| `POST /api/albums/:id/photos` | admin | `{name,size,mime,width,height}` → Photo (status `pending`) |
| `PUT /api/photos/:id/file/:variant` | admin | Body là file (stream). `variant` ∈ `thumb\|medium\|original`. Khi đủ 3 → `ready` |
| `PATCH /api/photos/:id` | admin | `{story?, meta?}` |
| `POST /api/photos/:id/favorite` | — | Bật/tắt, trả `{favorite}` |
| `DELETE /api/photos/:id` | admin | Xoá R2 + D1 |
| `GET /api/photos/:id/download` | — | Stream original, `Content-Disposition: attachment` |
| `GET /api/storage` | — | `{used,total}` |
| `GET /img/:id/:variant` | — | Stream R2, cache immutable |

Phân trang: cursor là `position` của phần tử cuối; trả `nextCursor: number | null`.
