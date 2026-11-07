# CLAUDE.md — Wedding Gallery Album

Web cá nhân lưu và trình chiếu album cưới. Một người dùng, tải ít, **mọi thứ chạy trên gói free của Cloudflare**.
Thiết kế gốc: Stitch project "Wedding Gallery Album WebApp" (design system *L'Amour Editorial*).

## Tài liệu (đọc trước khi sửa code)
- [docs/architecture.md](docs/architecture.md) — kiến trúc, quyết định, giới hạn free tier
- [docs/data-model.md](docs/data-model.md) — schema D1, cấu trúc key R2
- [docs/api.md](docs/api.md) — hợp đồng REST API
- [docs/frontend.md](docs/frontend.md) — cấu trúc React, design tokens, quy ước UI

## Stack
Vite + React 18 + TypeScript + Tailwind v3 + React Router + TanStack Query (web) ·
Cloudflare Worker + Hono (api) · D1 (metadata) · R2 (file ảnh). Một Worker phục vụ cả static assets lẫn API.

## Lệnh
```bash
npm install
npm run db:init          # tạo bảng D1 cục bộ (schema.sql)
npm run dev              # vite (5173) — proxy /api, /img sang wrangler (8787)
npm run dev:api          # wrangler dev (D1/R2 giả lập cục bộ)
npm run typecheck        # tsc cho web + worker
npm run build            # build web → dist/
npm run deploy           # build + wrangler deploy
```
Secret: `npx wrangler secret put ADMIN_CODE` (cục bộ: tự tạo file `.dev.vars` gồm một dòng `ADMIN_CODE=<mã của bạn>`, không commit).

## Quy ước bắt buộc
1. **Mọi gọi API từ UI đi qua `src/lib/api.ts`** (hook trong `src/hooks/`). Component không gọi `fetch` trực tiếp.
2. **Kiểu dữ liệu dùng chung nằm ở `shared/types.ts`**, cả web và worker import từ đó.
3. **Worker CPU ≤ 10ms/request** (free tier): không xử lý ảnh, không nén ZIP, không parse body lớn ở server.
   Resize ảnh và nén ZIP làm ở trình duyệt.
4. **File không đi qua bộ nhớ Worker**: upload stream thẳng `request.body` → `R2.put`.
5. Route ghi (POST/PUT/PATCH/DELETE) phải qua middleware `requireAdmin` (header `X-Admin-Code`).
6. Ảnh phục vụ qua `/img/:key` với `Cache-Control: public, max-age=31536000, immutable`; key bất biến (có id) nên không bao giờ ghi đè.
7. Style chỉ dùng token Tailwind từ `tailwind.config.ts` (màu, spacing, font của design system). Không hard-code hex trong component.
8. Văn bản giao diện bằng **tiếng Việt**; tên biến, commit, comment code bằng tiếng Anh.
9. Không thêm dependency khi chưa cần; ưu tiên Web API có sẵn.
10. Không commit `.dev.vars`, `.wrangler/`, `dist/`, `node_modules/`.

## Cấu trúc
```
src/        React app          worker/   Hono API (index.ts, routes/, auth.ts)
shared/     types dùng chung   docs/     tài liệu kiến trúc
schema.sql  tạo bảng D1        legacy/   prototype HTML cũ (chỉ tham khảo, sẽ xoá)
```

## Việc đã quyết định
- Xác thực: một `ADMIN_CODE`; xem ảnh công khai (không liệt kê). Có thể thêm `VIEW_CODE` sau (xem docs/architecture.md §6).
- Không dùng migrations: chỉ một `schema.sql`; khi đổi schema thì viết file SQL `ALTER` riêng lúc đó.
