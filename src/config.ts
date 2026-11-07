import { dummyHero } from './lib/mock';

/** true = dùng dữ liệu giả (src/lib/mock.ts), không gọi API. Mặc định dùng API thật; đặt VITE_USE_MOCK=true trong .env.local để test UI. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/** Thông tin cặp đôi hiển thị ở trang chủ. Sửa trực tiếp tại đây. */
export const couple = {
  names: 'Viết Minh & Huyền Linh',
  tagline: 'A celebration of enduring love & serendipity',
  date: '17 & 18 Tháng 10, 2026',
  place: 'Dalat Pine Hill, Lâm Đồng',
  /** Ảnh nền hero ép cứng (chỉ mock: file src/assets/dummy/cover.*). Thật: ảnh bìa tải ở trang quản lý, lấy qua /img/hero. */
  heroImage: USE_MOCK ? dummyHero : undefined,
};
