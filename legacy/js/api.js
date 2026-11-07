/*
 * GalleryAPI — lớp dữ liệu của ứng dụng.
 * Hiện tại chạy bằng localStorage + IndexedDB (mock) để web hoạt động độc lập.
 * Khi tích hợp API thật: giữ NGUYÊN chữ ký các hàm bên dưới (tất cả đều async)
 * và thay phần thân bằng fetch(`${API_BASE}/...`). UI (app.js) không cần sửa.
 */
(function () {
  const API_BASE = ''; // TODO: ví dụ 'https://api.example.com/v1'
  const KEY = 'gallery-album:v1';
  const ADMIN_PIN = '886924'; // TODO: thay bằng xác thực phía server

  const IMG = {
    hero: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMo8y1RJ2DOcIWsx6RReuhXw--zmGp4id8p3ry26vpL1m-7iCnD5NHh3hs88hZoaFhOLRyM-QFiYyI3TRx4tophzWhc8x5lPuiNeVLZZPVsF5d_wXzv54y01CXYEwQX1tCQL67GsoM2KRzyQJWbU9gujrzc2aXtCtkWynbvazvB8h8IogIMQGoC2XB67fTTRiC0UY5ZmSZTDsBOjIHnKEevDhZ4l0jChGOSSA07ws',
    aisle: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKeeEEttuveeFKnDCj4zzcXqzUu4WVhwhZM4ZlUeegL4mT-8ii5Mh4cxk0x5E_2dgBfyEdSZ0qzqlAscQYDkh5Kgxyb51vNLSmTrfduLU_QzhaRTUJ2tGqbauL2s-eYaqvgUPDatuC7GLnnYx-W3ovMRzE_8x-M89U6XlQN8len19ideCOZRc3Y3TxJhySMHcFhdu2AV0Z_zJbRHKdkxqKAGKpXoO030WgdiX1B8o',
    ring: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDG3MoGM_QtNoZT9sdt42rWdBnYdmwhbFaOmnkWN16EqpEDF0jZD9EhXE9Y17Ee5EzwRYVw13Vzm-tT5O58-T5yDqV4J4uG3P-4UHu4Jw2DmOSKd7LpKNH6p0ouO3jkeELU9KtGjKH4FiEQdm6hslMNyaSVTHUlIraCezqP3I92LHBx9nsk3yTteuAF3sduwjDyaaRdbQbLJaxbPbAKcxQiHFxBnGI1AMUBEK4FjxM',
    mirror: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9mvwtUpB7_obopxmsyqGTGYqHezZ1ZvmV3XL5CVsmlOFQepo-eaXattRj6e719oR6BX0M-1vmcl8p08iICXKkx05cfLVEZYorf5Drjs6ghPKnC1I7G8dxDFUs_o9aUgqPX4akcvqMdlbreynI4uCx5VQ7sFfWvc-5m9979A3aD2KMLTa7Yt_-d6jacO6BugkLMMbqPttZtwLFuXTZY-GXLN0TGOZ9s64eHSDzNX8',
    invite: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDml5QXDkzR8SEcs7-QPjcvdcW8mvrb0EdRhqq5opYxUQaei0pbOjkOcof77BkMyPwdpaywX742KgIkmDAonTVN-foPBeUH3ZOEbd_DAtIdR0qf96dF_KNvZV_lGFhJo-IV3gFVthY-EHL1jp9N3cZH8bg1mqhJQQrS7tuhLKE_VsAdjALpMP-QWM3TNaRQiNHDHUp31ThBlF4CrUOnjP6tt2TIvGK4fNV5kImBHCI',
    tea: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxg8TVn4jXPt5RWl14rWS5mp78iOA85EE2WLxzRvKFVlm0N1zDk78uStvythgioZlN86A0_r834srGSWbBnzjTFn13r0834SGnYbXHxMk4POFivdz9znljQlJU_AkQJhbs9dQ26lrWLHcIko4QqN_2cKLMH_ZTVyHhhmes49x3myLORhcHGbBKWPKAGycE5H3p63w_gqGqmRGBZWK3z2-2jZKxwqvISR7V4tyZsfk',
    dance: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMUJleJfIJ39g4XItdTzptOxXeNrLe2_JTf5uRPZRc6lce89xCo2dTMri48kioDrYLdnZNRsdZIUb6IBBDYUmQJR02gw7DG8VKM4ZLZmKS0ivZmS7RiY6Nm9k5PboAqlhJe3ed3PVYq2ZZmT1AYikqbrUuWDVnHeaA25g6b4iKCzwDPrd2NLPhuBTpQ-33DqwT2d855NS1TrEtRLJdvPBSfASFTzn4D8D94GfMsOc',
    embrace: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHhfXpObE9SEZ1IMB7qTEJoERXJqTgnjc5NTEYzvRvNtcWYldACEMp6I9XwPBfXCYX6Q2wjAvH-T__G4J8h2hI06Y1FtVj6-29JNL-SzlTQVogJVRsyPMDmiEYsKYN5MER9kXFG6JriIS3OELG6y-_h-YLxk8MQX0zQMJk9H79nvrDz3CwGMo0FppVf5PQ2_ZNcZr2Tb_m_7d_jJ13DhS6MtCPy_RIkYW2xgeQM-4',
  };

  const seed = () => ({
    couple: {
      names: 'Viết Minh & Huyền Linh',
      tagline: 'A celebration of enduring love & serendipity',
      date: '17 & 18 Tháng 10, 2026',
      place: 'Dalat Pine Hill, Lâm Đồng',
      cover: IMG.hero,
    },
    privacy: 'qr',
    albums: [
      { id: 'giatien', name: 'Lễ Gia Tiên & Đính Hôn', desc: 'Nghi lễ truyền thống hai bên gia đình.' },
      { id: 'prep', name: 'Khoảnh Khắc Chuẩn Bị', desc: 'Hậu trường trước giờ trọng đại.' },
      { id: 'ceremony', name: 'Nghi Thức Lễ Đường', desc: 'Lời thề nguyền bên đồi thông.' },
      { id: 'party', name: 'Tiệc Tối & Khiêu Vũ', desc: 'Đêm tiệc rực rỡ ánh đèn.' },
    ],
    photos: [
      { id: 'p1', albumId: 'ceremony', src: IMG.aisle, meta: 'Leica M11 • Noctilux 50mm f/0.95', story: 'Khoảnh khắc Lan Anh tiến vào lễ đường trong ánh hoàng hôn của rừng thông Dalat.', fav: false, size: 48e6 },
      { id: 'p2', albumId: 'ceremony', src: IMG.ring, meta: 'Leica M11 • Summilux 35mm f/1.4 ASPH', story: 'Lời thề nguyền xúc động trao nhau bên đồi thông.', fav: true, size: 52e6 },
      { id: 'p3', albumId: 'prep', src: IMG.mirror, meta: 'Hasselblad X2D 100C • XCD 80mm f/1.9', story: 'Phút tĩnh lặng của cô dâu trước gương phòng cưới.', fav: false, size: 50e6 },
      { id: 'p4', albumId: 'giatien', src: IMG.invite, meta: 'Leica SL2-S • APO 75mm f/2', story: 'Thiệp cưới đúc sáp thủ công cùng tráp trầu cau chạm khắc gỗ quý.', fav: false, size: 41e6 },
      { id: 'p5', albumId: 'giatien', src: IMG.tea, meta: 'Leica M11 • Summilux 50mm f/1.4', story: 'Cúi đầu dâng trà tạ ơn đấng sinh thành trong tà áo dài lụa tơ tằm.', fav: false, size: 47e6 },
      { id: 'p6', albumId: 'party', src: IMG.dance, meta: 'Sony A1 • FE 24-70mm f/2.8 GM II', story: 'Điệu nhảy đầu tiên dưới ngàn dây đèn fairy light và pháo hoa cầm tay.', fav: false, size: 55e6 },
      { id: 'p7', albumId: 'ceremony', src: IMG.embrace, meta: 'Leica M11 • Summilux 50mm f/1.4', story: 'Khoảnh khắc xúc động trong lời nguyện ước dưới đồi thông xanh.', fav: false, size: 49e6 },
    ],
  });

  /* ---------- lưu trữ cục bộ (mock) ---------- */
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || !state.albums) state = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* đầy bộ nhớ */ } };

  const openDB = () => new Promise((res, rej) => {
    const r = indexedDB.open('gallery-album-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('blobs');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const idb = async (mode, fn) => {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('blobs', mode);
      const req = fn(tx.objectStore('blobs'));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  };
  const urlCache = {};
  const resolve = async (p) => {
    if (!p.blobKey) return p;
    if (!urlCache[p.id]) {
      const blob = await idb('readonly', (s) => s.get(p.blobKey));
      urlCache[p.id] = blob ? URL.createObjectURL(blob) : '';
    }
    return { ...p, src: urlCache[p.id] };
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  window.GalleryAPI = {
    API_BASE,

    async getCouple() { return clone(state.couple); },

    async login(user, pin) {
      await wait(250);
      if (String(pin) !== ADMIN_PIN) throw new Error('Mã xác thực không chính xác.');
      return { token: 'mock-token', user };
    },

    async getPrivacy() { return state.privacy; },
    async setPrivacy(v) { state.privacy = v; save(); },

    async listAlbums() { return clone(state.albums); },
    async createAlbum(name) {
      const a = { id: uid(), name: name.trim(), desc: '' };
      state.albums.push(a); save(); return clone(a);
    },
    async renameAlbum(id, name) {
      const a = state.albums.find((x) => x.id === id); if (a) a.name = name.trim(); save();
    },
    async deleteAlbum(id) {
      const gone = state.photos.filter((p) => p.albumId === id);
      for (const p of gone) await this.deletePhoto(p.id);
      state.albums = state.albums.filter((a) => a.id !== id); save();
    },
    async moveAlbum(id, dir) {
      const i = state.albums.findIndex((a) => a.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= state.albums.length) return;
      [state.albums[i], state.albums[j]] = [state.albums[j], state.albums[i]]; save();
    },

    async listPhotos({ albumId } = {}) {
      const list = state.photos.filter((p) => !albumId || p.albumId === albumId);
      return Promise.all(list.map(resolve));
    },
    /** Tải ảnh lên. onProgress(0..100). Với API thật: dùng XHR/fetch multipart để báo tiến trình. */
    async uploadPhoto(albumId, file, onProgress = () => {}) {
      const id = uid();
      for (let i = 1; i <= 4; i++) { await wait(80); onProgress(i * 25 - 10); }
      await idb('readwrite', (s) => s.put(file, id));
      const p = { id, albumId, blobKey: id, name: file.name, size: file.size, fav: false,
        meta: file.type || 'Ảnh tải lên', story: '' };
      state.photos.push(p); save(); onProgress(100);
      return resolve(p);
    },
    async updatePhoto(id, patch) {
      const p = state.photos.find((x) => x.id === id); if (p) Object.assign(p, patch); save();
    },
    async deletePhoto(id) {
      const p = state.photos.find((x) => x.id === id);
      if (p && p.blobKey) { await idb('readwrite', (s) => s.delete(p.blobKey)); delete urlCache[id]; }
      state.photos = state.photos.filter((x) => x.id !== id); save();
    },
    async toggleFavorite(id) {
      const p = state.photos.find((x) => x.id === id);
      if (p) { p.fav = !p.fav; save(); return p.fav; }
    },

    /** Dung lượng: { used, total } (byte) */
    async getStorage() {
      return { used: state.photos.reduce((s, p) => s + (p.size || 0), 0), total: 9e9 };
    },
    /** Tải toàn bộ album — API thật nên trả về URL file ZIP. */
    async requestDownloadAll() { await wait(600); return { url: null, count: state.photos.length }; },
  };
})();
