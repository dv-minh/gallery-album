# Ảnh test UI (chế độ mock)

Bỏ ảnh vào thư mục này (jpg, jpeg, png, webp, avif, gif). Vite tự nhận, chỉ cần F5 (không cần sửa code).

```
src/assets/dummy/
├── cover.jpg            ← ảnh nền (hero) trang chủ
├── Lễ Ăn Hỏi/           ← mỗi thư mục con = 1 album (tên thư mục = tên album)
│   ├── 01.jpg
│   └── 02.jpg
├── Ngoại Cảnh/
│   └── ...
└── anh-le.jpg           ← ảnh nằm ngoài thư mục con → album "Ảnh Cưới"
```

- Không có ảnh nào: hệ thống tự sinh 24 ảnh minh hoạ.
- Không có `cover.*`: hero để trống.
- Ảnh thật nên ≤ ~500KB/ảnh để dev server tải nhanh.
