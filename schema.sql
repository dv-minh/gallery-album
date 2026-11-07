-- Chạy một lần: npm run db:init (cục bộ) | npm run db:init:remote (production)
CREATE TABLE IF NOT EXISTS albums (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id         TEXT PRIMARY KEY,
  album_id   TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  width      INTEGER,
  height     INTEGER,
  mime       TEXT NOT NULL,
  story      TEXT NOT NULL DEFAULT '',
  meta       TEXT NOT NULL DEFAULT '',
  position   INTEGER NOT NULL,            -- tăng dần toàn cục theo thứ tự tạo
  variants   INTEGER NOT NULL DEFAULT 0,  -- bitmask: thumb=1, medium=2, original=4
  status     TEXT NOT NULL DEFAULT 'pending', -- 'ready' khi variants = 7
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id, position);
CREATE INDEX IF NOT EXISTS idx_photos_pos ON photos(position);

-- Cài đặt site (vd: key = hero → id ảnh bìa). Thêm sau lần tạo bảng đầu; CREATE IF NOT EXISTS nên chạy lại an toàn.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
