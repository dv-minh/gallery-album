# Kiến trúc

## 1. Mục tiêu và ràng buộc
- Web cá nhân, 1 chủ sở hữu, lượng truy cập thấp. Chi phí **0 đồng**.
- Đẹp, đầy đủ tính năng: trưng bày, lightbox, trình chiếu, yêu thích, tải ảnh/ZIP, quản lý album, upload.
- Đơn giản để vận hành: **một repo, một lần deploy**.

## 2. Sơ đồ
```
Trình duyệt ──► Worker (Hono) ──┬─ Static assets (dist/)  → SPA React
                                ├─ /api/*                 → logic REST
                                ├─ D1                     → metadata
                                └─ R2                     → file ảnh (binding)
```
Cùng origin ⇒ không CORS, không Pages riêng, không presigned URL.

## 3. Dịch vụ & giới hạn free (kiểm tra lại trên trang pricing của Cloudflare)
| Dịch vụ | Dùng cho | Hạn mức free (tham khảo) |
|---|---|---|
| Workers (+ static assets) | SPA + API | 100k request/ngày, 10ms CPU/request, body ≤ 100MB |
| R2 | File ảnh | 10GB, ~1M ghi + 10M đọc/tháng, egress miễn phí |
| D1 | Metadata | 5GB, 5M dòng đọc/ngày, 100k dòng ghi/ngày |

Hệ quả thiết kế:
- Không xử lý ảnh ở server → **client sinh thumb/medium bằng canvas**.
- Không nén ZIP ở server → **client dùng `fflate`**.
- Mỗi ảnh qua Worker là 1 request → cache dài + immutable, lưới dùng thumb nhỏ.

## 4. Luồng chính
**Upload** (admin): client đọc file → sinh `thumb` (400px) và `medium` (1600px) → với mỗi ảnh gửi tuần tự
`POST /api/albums/:id/photos` (tạo bản ghi `pending`) rồi `PUT /api/photos/:id/file/{thumb|medium|original}` (stream body).
Hàng đợi chạy 3 ảnh song song.

**Xem**: `GET /api/albums`, `GET /api/albums/:id/photos?cursor=` (phân trang vô hạn). Ảnh: `/img/:id/thumb|medium|original`.

**Tải**: ảnh lẻ `GET /api/photos/:id/download` (Content-Disposition). Cả album: client lấy danh sách → fetch từng `original` → `fflate` stream ra file.

## 5. Dung lượng (ngân sách 10GB)
Ảnh JPEG ~8MB + thumb 60KB + medium 400KB ≈ 8.5MB ⇒ ~1100 ảnh. RAW 50MB ⇒ ~200 ảnh.
`GET /api/storage` trả `{used,total}` (SUM(size) từ D1) cho panel dung lượng.

## 6. Xác thực
- `ADMIN_CODE` là Worker secret. Middleware `requireAdmin` so sánh hằng thời gian header `X-Admin-Code`.
- `POST /api/verify` để UI kiểm tra code; client lưu code ở `localStorage` (cá nhân, rủi ro chấp nhận được).
- Mở rộng nếu cần khoá phần xem: thêm secret `VIEW_CODE`, middleware `requireViewer` cho `GET /api/*` và `/img/*`.
- Giới hạn thử sai: chưa làm (YAGNI); nếu cần thì dùng Cloudflare WAF rate-limit rule.

## 7. Quyết định đã chốt (ADR rút gọn)
| Quyết định | Lý do | Đánh đổi |
|---|---|---|
| Một Worker + static assets | Một deploy, cùng origin | Request ảnh tính vào 100k/ngày |
| Binding R2 thay presigned URL | Không cần S3 token/CORS | Giới hạn body 100MB/request |
| Resize ở client | Worker 10ms CPU | Upload chậm hơn trên máy yếu |
| Hono | Routing + middleware gọn (~14KB) | Thêm 1 dependency |
| D1 thay manifest JSON trong R2 | Query/sắp xếp/phân trang dễ | Thêm 1 binding |
| Không migrations | App mới, 1 người dùng | Tự viết SQL khi đổi schema |
| Không SSR | Sau đăng nhập/cá nhân, SEO không cần | — |

## 8. Triển khai
`wrangler.toml` khai báo: `assets` (dist, SPA fallback, `run_worker_first` cho `/api/*` và `/img/*`), `d1_databases`, `r2_buckets`.
Domain mặc định `*.workers.dev`. Nếu lượng xem tăng: gắn domain riêng và bật public bucket để ảnh không tốn request Worker (chỉ đổi hàm `imageUrl()` ở `src/lib/api.ts`).
