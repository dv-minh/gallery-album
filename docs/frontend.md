# Frontend

## Routes
| Path | Trang | Quyền |
|---|---|---|
| `/` | Showcase (hero, lọc album, lưới, lightbox, trình chiếu) | công khai |
| `/admin` | Quản lý album | cần code |
| `/admin/albums/:id` | Tải ảnh + quản lý ảnh trong album | cần code |
`RequireAdmin` chuyển về `/` và mở hộp thoại đăng nhập nếu chưa có code hợp lệ.

## Cấu trúc `src/`
```
main.tsx  App.tsx            router + QueryClientProvider
pages/    ShowcasePage, AdminPage, AlbumUploadPage
components/
  layout/   SiteHeader, AdminHeader, Footer
  gallery/  Hero, FilterBar, PhotoGrid, PhotoCard, Lightbox
  admin/    StoragePanel, AlbumRow, UploadZone, UploadQueue
  ui/       Dialog, Toast, ConfirmDialog, PromptDialog, Icon, Button
hooks/      useAlbums, usePhotos (infinite), useStorage, useAdminAuth, useUploadQueue
lib/        api.ts (client duy nhất), image.ts (resize canvas), zip.ts (fflate), format.ts
```

## Data layer
- `lib/api.ts`: `request()` bọc fetch (JSON, lỗi chuẩn hoá, gắn `X-Admin-Code`), các hàm theo resource, `imageUrl(id, variant)`.
- TanStack Query: key `['albums']`, `['photos', {albumId, favorite}]`, `['storage']`.
  Yêu thích dùng optimistic update. Sau upload/xoá: invalidate `photos`, `albums`, `storage`.

## Upload (useUploadQueue)
Mỗi file: `createImageBitmap` → canvas → blob `thumb` (400px, webp 0.8) + `medium` (1600px, webp 0.85) →
`POST` tạo bản ghi → `PUT` 3 file. Song song tối đa 3 ảnh. Có trạng thái `queued|uploading|done|error`, tiến trình theo byte (XHR cho `onprogress`), huỷ/thử lại.

## Design tokens
Nguồn: Stitch "L'Amour Editorial". Định nghĩa trong `tailwind.config.ts` (màu surface/primary…, spacing `space-*`/`gutter*`/`margin*`,
font `font-display` = Playfair Display, `font-sans` = Plus Jakarta Sans). Lớp tiện ích: `.label-caps`. Icon: Material Symbols Outlined.
Quy ước hình ảnh: bo góc 4px cho thẻ ảnh, pill (`rounded-full` tự định nghĩa 9999px) cho chip/nút nổi, viền `outline-variant/40`, glass overlay cho điều khiển.

## Trải nghiệm
Hiệu ứng hiện dần khi cuộn (`IntersectionObserver`, tôn trọng `prefers-reduced-motion`), lightbox có phím ←/→/Esc/Space + vuốt, skeleton khi tải, toast cho mọi thao tác ghi, trạng thái rỗng và lỗi rõ ràng, responsive từ 360px.
