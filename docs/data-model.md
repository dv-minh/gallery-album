# Mô hình dữ liệu

## D1 (`schema.sql`)
```sql
albums(
  id TEXT PRIMARY KEY,          -- nanoid
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL,    -- thứ tự hiển thị
  created_at INTEGER NOT NULL   -- epoch ms
)
photos(
  id TEXT PRIMARY KEY,          -- nanoid; cũng là phần của key R2
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- tên file gốc
  size INTEGER NOT NULL,        -- byte của original
  width INTEGER, height INTEGER,
  mime TEXT NOT NULL,
  story TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '',-- thông số máy ảnh/ống kính (hiển thị trong lightbox)
  favorite INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,    -- tăng dần TOÀN CỤC theo thứ tự tạo (dùng làm cursor phân trang)
  variants INTEGER NOT NULL DEFAULT 0, -- bitmask: thumb=1, medium=2, original=4
  status TEXT NOT NULL DEFAULT 'pending', -- pending → ready (khi variants = 7)
  created_at INTEGER NOT NULL
)
INDEX photos(album_id, position)
```
Xoá album: xoá R2 object của các ảnh trước (`DELETE` handler), D1 cascade lo bản ghi.

## R2 key
```
photos/{photoId}/thumb.webp      ~400px
photos/{photoId}/medium.webp     ~1600px
photos/{photoId}/original        giữ nguyên định dạng gốc
```
Key bất biến (không bao giờ ghi đè) ⇒ cache `immutable` an toàn.

## Kiểu dùng chung (`shared/types.ts`)
`Album`, `Photo`, `PhotoPage {items, nextCursor}`, `Storage {used,total}`.
