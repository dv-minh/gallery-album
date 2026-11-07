/* UI ứng dụng Wedding Gallery Album. Mọi dữ liệu đi qua window.GalleryAPI (xem js/api.js). */
(function () {
  const API = window.GalleryAPI;
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast-root');

  /* ---------- tiện ích ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = '', fill = false) => `<span class="material-symbols-outlined ${fill ? 'fill' : ''} ${cls}">${n}</span>`;
  const fmtSize = (b) => (b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(1) + ' MB');
  const isAdmin = () => sessionStorage.getItem('admin') === '1';

  function toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = `pointer-events-auto px-space-lg py-space-sm rounded-xl shadow-xl label-caps flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-2 ${type === 'err' ? 'bg-error text-white' : 'bg-inverse-surface text-inverse-on-surface'}`;
    el.innerHTML = `${icon(type === 'err' ? 'error' : 'check_circle', 'text-[16px]')}<span>${esc(msg)}</span>`;
    $toast.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('opacity-0', 'translate-y-2'));
    setTimeout(() => { el.classList.add('opacity-0'); setTimeout(() => el.remove(), 300); }, 3200);
  }

  function modal(html, { onMount } = {}) {
    $modal.innerHTML = `<div id="mdl" class="fixed inset-0 z-[60] bg-inverse-surface/70 backdrop-blur-sm flex items-center justify-center p-space-md page-enter">${html}</div>`;
    const m = document.getElementById('mdl');
    const close = () => { $modal.innerHTML = ''; };
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    if (onMount) onMount(m, close);
    return close;
  }

  const confirmBox = (title, text, okLabel = 'Xác nhận') => new Promise((res) => {
    modal(`<div class="bg-white rounded-xl max-w-md w-full p-space-lg shadow-2xl">
      <h3 class="font-display text-[22px] mb-2">${esc(title)}</h3>
      <p class="text-[14px] text-on-surface-variant mb-space-lg">${esc(text)}</p>
      <div class="flex justify-end gap-2">
        <button data-no class="px-space-md py-space-sm text-[13px] font-medium text-on-surface-variant">Huỷ</button>
        <button data-yes class="px-space-lg py-space-sm bg-error text-white rounded-lg text-[13px] font-medium">${esc(okLabel)}</button>
      </div></div>`, { onMount: (m, close) => {
      m.querySelector('[data-no]').onclick = () => { close(); res(false); };
      m.querySelector('[data-yes]').onclick = () => { close(); res(true); };
    } });
  });

  const promptBox = (title, label, value = '') => new Promise((res) => {
    modal(`<div class="bg-white rounded-xl max-w-md w-full p-space-lg shadow-2xl">
      <h3 class="font-display text-[22px] mb-space-md">${esc(title)}</h3>
      <label class="label-caps text-secondary">${esc(label)}</label>
      <input id="pb-in" value="${esc(value)}" class="w-full mt-1 px-space-md py-space-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary">
      <div class="flex justify-end gap-2 mt-space-lg">
        <button data-no class="px-space-md py-space-sm text-[13px] font-medium text-on-surface-variant">Huỷ</button>
        <button data-yes class="px-space-lg py-space-sm bg-primary text-white rounded-lg text-[13px] font-medium">Lưu</button>
      </div></div>`, { onMount: (m, close) => {
      const i = m.querySelector('#pb-in'); i.focus(); i.select();
      const ok = () => { close(); res(i.value.trim() || null); };
      m.querySelector('[data-no]').onclick = () => { close(); res(null); };
      m.querySelector('[data-yes]').onclick = ok;
      i.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    } });
  });

  /* ---------- khung chung ---------- */
  const logo = `<a href="#/" class="flex items-center gap-space-sm">
    <span class="w-8 h-8 rounded-full bg-primary-container/40 flex items-center justify-center">${icon('filter_vintage', 'text-primary text-[20px]')}</span>
    <span class="font-display italic text-[22px] tracking-wide">Éternel Archive</span></a>`;

  function footer() {
    return `<footer class="w-full bg-surface-container-low py-space-xl mt-space-2xl"><div class="max-w-7xl mx-auto px-space-lg lg:px-margin-desktop">
      <div class="flex flex-col md:flex-row items-center justify-between gap-space-md pb-space-lg">
        <div class="flex items-center gap-2 text-primary font-display italic text-[22px]">${icon('filter_vintage')}Éternel Archive</div>
        <div class="flex flex-wrap justify-center items-center gap-space-lg text-[12px] text-on-surface-variant">
          <span class="flex items-center gap-1">${icon('lock', 'text-primary text-[16px]')}Bảo Mật Kỷ Niệm 256-bit</span>
          <span class="flex items-center gap-1">${icon('photo_library', 'text-primary text-[16px]')}Độ Phân Giải Gốc</span>
          <span class="flex items-center gap-1">${icon('diamond', 'text-primary text-[16px]')}Lưu Trữ Vĩnh Viễn</span></div></div>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-space-md text-on-surface-variant label-caps">
        <p>© ${new Date().getFullYear()} Éternel Fine Art Studio. All Rights Reserved.</p>
        <p>Passe-Partout Matting · Curated Masterpiece</p></div></div></footer>`;
  }

  /* ======================================================================
   *  TRANG TRƯNG BÀY (khách xem)
   * ==================================================================== */
  const view = { filter: 'all', layout: 'masonry', favOnly: false };
  const GRID = {
    masonry: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-gutter',
    grid3: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-gutter',
    grid4: 'grid grid-cols-2 md:grid-cols-4 gap-gutter-sm',
  };

  async function showcase() {
    const [couple, albums, photos] = await Promise.all([API.getCouple(), API.listAlbums(), API.listPhotos()]);
    let visible = [];

    $app.innerHTML = `<div class="page-enter">
    <header class="fixed top-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div class="h-20 px-space-lg lg:px-margin-desktop flex items-center justify-between gap-space-md">
        <div class="flex items-center gap-space-md">${logo}<span class="h-4 w-px bg-outline-variant hidden sm:block"></span>
          <span class="label-caps text-on-surface-variant hidden sm:inline">${esc(couple.names)}</span></div>
        <nav class="flex items-center gap-space-sm">
          <a href="#/" class="px-space-md py-space-xs text-[13px] font-medium bg-secondary-container text-on-secondary-container rounded-lg">Bộ Sưu Tập</a>
          <button id="btn-admin" class="flex items-center gap-1 px-space-md py-space-xs text-[13px] font-medium text-on-surface-variant hover:bg-surface-container-low rounded-lg border border-outline-variant/60">
            ${icon('lock', 'text-primary text-[16px]')}<span class="hidden sm:inline">Quản Lý Ảnh</span></button>
        </nav></div></header>

    <section class="relative w-full overflow-hidden bg-surface-container-low">
      <div class="relative min-h-[88vh] flex items-center justify-center">
        <div class="absolute inset-0 bg-cover bg-center brightness-[0.92] contrast-[1.03]" style="background-image:url('${esc(couple.cover)}')"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-surface/20 backdrop-blur-[2px]"></div>
        <div class="relative z-10 max-w-5xl mx-auto px-space-md text-center flex flex-col items-center py-space-2xl pt-28">
          <div class="inline-flex items-center gap-2 px-space-md py-space-xs rounded-full bg-white/80 backdrop-blur-md shadow-sm mb-space-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
            <span class="label-caps text-primary tracking-[0.25em]">Chapter I • Eternal Vows</span>
            <span class="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span></div>
          <h1 class="font-display text-[38px] leading-[46px] md:text-[56px] md:leading-[64px] tracking-tight mb-space-sm">${esc(couple.names)}</h1>
          <p class="font-display italic text-[18px] text-primary max-w-xl mb-space-sm">“${esc(couple.tagline)}”</p>
          <div class="flex flex-wrap justify-center items-center gap-2 text-secondary text-[13px] font-medium mb-space-xl">
            ${icon('calendar_today', 'text-primary text-[18px]')}<span>${esc(couple.date)}</span><span class="text-outline-variant">•</span>
            ${icon('location_on', 'text-primary text-[18px]')}<span>${esc(couple.place)}</span></div>
          <div class="flex flex-wrap items-center justify-center gap-space-md">
            <a href="#gallery-view" id="btn-start" class="px-space-xl py-space-md bg-inverse-surface text-inverse-on-surface rounded-lg text-[13px] font-medium tracking-wider uppercase hover:bg-primary transition shadow-md flex items-center gap-2">${icon('photo_library', 'text-[18px]')}Bắt đầu xem kỷ niệm</a>
            <button id="btn-dl-all" class="px-space-xl py-space-md bg-white/90 backdrop-blur-md rounded-lg text-[13px] font-medium tracking-wider uppercase hover:bg-secondary-container transition shadow-sm flex items-center gap-2">${icon('cloud_download', 'text-primary text-[18px]')}Tải trọn bộ album</button>
          </div></div>
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-on-surface-variant/70">
          <span class="label-caps text-[10px]">Cuộn để chiêm ngưỡng</span>${icon('keyboard_arrow_down', 'text-primary animate-bounce')}</div>
      </div></section>

    <section id="gallery-view" class="sticky top-20 z-30 bg-surface/95 backdrop-blur-md shadow-sm py-space-md">
      <div class="max-w-7xl mx-auto px-space-md lg:px-margin-desktop flex flex-col lg:flex-row items-center justify-between gap-space-md">
        <div id="tabs" class="flex items-center gap-1 overflow-x-auto w-full lg:w-auto scrollbar-none pb-1 lg:pb-0"></div>
        <div class="flex items-center justify-between w-full lg:w-auto gap-space-sm shrink-0">
          <button id="fav-only" class="flex items-center gap-1 px-space-md py-space-xs rounded-full label-caps bg-surface-container-low text-on-surface-variant transition">${icon('favorite', 'text-[16px]')}Yêu thích <span id="fav-n"></span></button>
          <div class="flex items-center bg-surface-container-low rounded-lg p-0.5" id="layouts">
            ${[['masonry', 'dashboard', 'Bố cục Masonry'], ['grid3', 'view_column', 'Lưới 3 cột'], ['grid4', 'grid_view', 'Lưới 4 cột']].map(([k, i, t]) => `<button data-layout="${k}" title="${t}" class="p-1.5 rounded-md transition">${icon(i, 'text-[20px]')}</button>`).join('')}</div>
          <button id="btn-slide" class="flex items-center gap-1 px-space-md py-space-xs rounded-lg bg-inverse-surface text-inverse-on-surface label-caps hover:bg-primary transition">${icon('slideshow', 'text-[16px]')}Trình chiếu</button>
        </div></div></section>

    <section class="max-w-7xl mx-auto px-space-md lg:px-margin-desktop py-space-xl">
      <div class="mb-space-2xl text-center flex flex-col items-center reveal">
        <span class="label-caps text-primary tracking-[0.2em] mb-1">Curated Passe-Partout Archival</span>
        <h2 class="font-display text-[28px] md:text-[40px] tracking-tight mb-1">Khắc Họa Vĩnh Cửu</h2>
        <p class="text-[14px] text-secondary max-w-lg">Từng khung hình lưu giữ nguyên bản chất liệu cảm xúc của ngày trọng đại.</p></div>
      <div id="gallery"></div>
    </section></div>${footer()}`;

    const $tabs = $app.querySelector('#tabs'), $gal = $app.querySelector('#gallery');
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    $app.querySelectorAll('.reveal').forEach((n) => io.observe(n));

    function paint() {
      const favN = photos.filter((p) => p.fav).length;
      $app.querySelector('#fav-n').textContent = `(${favN})`;
      const fb = $app.querySelector('#fav-only');
      fb.classList.toggle('bg-secondary-container', view.favOnly); fb.classList.toggle('text-on-secondary-container', view.favOnly);
      fb.classList.toggle('bg-surface-container-low', !view.favOnly);

      const tab = (id, label, n) => `<button data-f="${id}" class="px-space-md py-space-xs rounded-full label-caps whitespace-nowrap transition ${view.filter === id ? 'bg-secondary-container text-on-secondary-container shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}">${esc(label)} <span class="opacity-70 font-normal">(${n})</span></button>`;
      $tabs.innerHTML = tab('all', 'Tất Cả', photos.length) + albums.map((a) => tab(a.id, a.name, photos.filter((p) => p.albumId === a.id).length)).join('');
      $app.querySelectorAll('#layouts button').forEach((b) => {
        const on = b.dataset.layout === view.layout;
        b.className = `p-1.5 rounded-md transition ${on ? 'text-primary bg-white shadow-sm' : 'text-secondary hover:text-on-surface'}`;
      });

      visible = photos.filter((p) => (view.filter === 'all' || p.albumId === view.filter) && (!view.favOnly || p.fav));
      if (!visible.length) {
        $gal.className = '';
        $gal.innerHTML = `<div class="text-center py-space-2xl text-on-surface-variant">${icon('photo_library', 'text-[48px] text-primary/50')}<p class="mt-2">Chưa có ảnh nào trong mục này.</p></div>`;
        return;
      }
      $gal.className = GRID[view.layout];
      $gal.innerHTML = visible.map((p, i) => {
        const wide = view.layout === 'masonry' && i % 7 === 1;
        return `<div data-i="${i}" class="photo reveal group relative overflow-hidden rounded-md cursor-pointer ${view.layout === 'grid4' ? 'aspect-square' : 'aspect-[3/4]'} ${wide ? 'md:col-span-2 md:aspect-[16/10]' : ''} bg-surface-container-low border border-outline-variant/40" style="transition-delay:${(i % 3) * 80}ms">
          <img loading="lazy" src="${esc(p.src)}" alt="${esc(p.story || 'Khoảnh khắc cưới')}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">
          <div class="absolute inset-0 bg-inverse-surface/15 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-opacity flex items-center justify-center gap-2">
            <button data-act="open" aria-label="Phóng to" class="w-10 h-10 rounded-full bg-white/90 hover:text-primary shadow-md flex items-center justify-center hover:scale-110 transition">${icon('fullscreen', 'text-[20px]')}</button>
            <button data-act="fav" aria-label="Yêu thích" class="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:scale-110 transition ${p.fav ? 'text-error' : 'hover:text-error'}">${icon('favorite', 'text-[20px]', p.fav)}</button></div></div>`;
      }).join('');
      $gal.querySelectorAll('.reveal').forEach((n) => io.observe(n));
    }

    $app.onclick = async (e) => {
      const f = e.target.closest('[data-f]'); if (f) { view.filter = f.dataset.f; paint(); return; }
      const l = e.target.closest('[data-layout]'); if (l) { view.layout = l.dataset.layout; paint(); return; }
      const card = e.target.closest('.photo');
      if (card) {
        const i = +card.dataset.i;
        if (e.target.closest('[data-act="fav"]')) {
          const p = visible[i]; p.fav = await API.toggleFavorite(p.id);
          const orig = photos.find((x) => x.id === p.id); if (orig) orig.fav = p.fav;
          if (view.favOnly) paint(); else {
            const b = card.querySelector('[data-act="fav"]');
            b.classList.toggle('text-error', p.fav); b.firstElementChild.classList.toggle('fill', p.fav);
            $app.querySelector('#fav-n').textContent = `(${photos.filter((x) => x.fav).length})`;
          }
        } else lightbox(visible, i);
      }
    };
    $app.querySelector('#fav-only').onclick = () => { view.favOnly = !view.favOnly; paint(); };
    $app.querySelector('#btn-slide').onclick = () => visible.length ? lightbox(visible, 0, true) : toast('Chưa có ảnh để trình chiếu', 'err');
    $app.querySelector('#btn-dl-all').onclick = async () => {
      toast('Đang chuẩn bị gói tải xuống…');
      const r = await API.requestDownloadAll();
      if (r.url) location.href = r.url; else toast(`Gói ${r.count} ảnh sẵn sàng khi tích hợp API tải ZIP.`);
    };
    $app.querySelector('#btn-admin').onclick = () => isAdmin() ? (location.hash = '#/admin') : loginModal();
    paint();
  }

  function loginModal() {
    modal(`<div class="bg-white rounded-2xl p-space-xl max-w-md w-full shadow-2xl text-center flex flex-col items-center relative">
      <button data-close aria-label="Đóng" class="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">${icon('close', 'text-[18px]')}</button>
      <div class="w-12 h-12 rounded-full bg-secondary-container text-primary flex items-center justify-center mb-space-md">${icon('admin_panel_settings', 'text-[24px]')}</div>
      <span class="label-caps text-primary mb-1">Studio Master Access</span>
      <h3 class="font-display text-[22px] mb-1">Xác Thực Quản Trị</h3>
      <p class="text-[12px] text-on-surface-variant mb-space-lg">Nhập thông tin đăng nhập để truy cập không gian Quản Lý &amp; Tải Ảnh.</p>
      <div class="w-full flex flex-col gap-space-md mb-space-lg text-left">
        <div><label class="label-caps text-secondary" for="lg-user">Tài khoản / Studio ID</label>
          <input id="lg-user" placeholder="studio@eternel.art" class="w-full mt-1 px-space-md py-space-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary"></div>
        <div><label class="label-caps text-secondary" for="lg-pin">Mã bảo mật (PIN)</label>
          <input id="lg-pin" type="password" maxlength="12" placeholder="••••••" class="w-full mt-1 px-space-md py-space-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-center text-[18px] tracking-widest">
          <p id="lg-err" class="text-error text-[12px] text-center mt-2 hidden"></p></div></div>
      <div class="flex gap-2 w-full">
        <button data-close class="flex-1 py-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-[13px] font-medium">Huỷ</button>
        <button id="lg-ok" class="flex-1 py-space-sm rounded-lg bg-inverse-surface hover:bg-primary text-inverse-on-surface text-[13px] font-medium flex items-center justify-center gap-1">${icon('lock_open', 'text-[16px]')}Đăng nhập</button></div>
    </div>`, { onMount: (m, close) => {
      const pin = m.querySelector('#lg-pin'), err = m.querySelector('#lg-err');
      m.querySelector('#lg-user').focus();
      const go = async () => {
        try { await API.login(m.querySelector('#lg-user').value.trim(), pin.value); sessionStorage.setItem('admin', '1'); close(); location.hash = '#/admin'; }
        catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); pin.select(); }
      };
      m.querySelector('#lg-ok').onclick = go;
      pin.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    } });
  }

  /* ---------- Lightbox + trình chiếu ---------- */
  let lbKey;
  function lightbox(list, start, autoplay = false) {
    let i = start, timer = null;
    const root = document.createElement('div');
    root.className = 'fixed inset-0 z-[55] bg-inverse-surface/95 backdrop-blur-2xl flex flex-col justify-between page-enter text-inverse-on-surface';
    root.innerHTML = `
      <div class="p-space-md flex items-center justify-between bg-inverse-surface/40">
        <div class="flex items-center gap-space-md"><span class="font-display italic text-[20px] text-primary-fixed hidden sm:inline">Éternel Archive</span>
          <span class="h-4 w-px bg-outline/40 hidden sm:block"></span><span id="lb-n" class="label-caps text-surface-variant"></span></div>
        <div class="flex items-center gap-2">
          <button id="lb-play" title="Trình chiếu" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"></button>
          <button id="lb-fav" title="Yêu thích" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"></button>
          <a id="lb-dl" title="Tải xuống" download class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">${icon('download', 'text-[20px]')}</a>
          <button id="lb-share" title="Chia sẻ" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">${icon('share', 'text-[20px]')}</button>
          <button id="lb-close" title="Đóng (Esc)" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center ml-1">${icon('close', 'text-[22px]')}</button></div></div>
      <div class="relative flex-1 flex items-center justify-center p-space-md overflow-hidden min-h-0">
        <button id="lb-prev" aria-label="Ảnh trước" class="absolute left-3 md:left-6 z-10 w-12 h-12 rounded-full bg-black/40 hover:bg-primary flex items-center justify-center transition">${icon('chevron_left', 'text-[24px]')}</button>
        <img id="lb-img" class="max-h-full max-w-full object-contain rounded-md shadow-2xl transition-opacity duration-300" alt="">
        <button id="lb-next" aria-label="Ảnh sau" class="absolute right-3 md:right-6 z-10 w-12 h-12 rounded-full bg-black/40 hover:bg-primary flex items-center justify-center transition">${icon('chevron_right', 'text-[24px]')}</button></div>
      <div class="p-space-lg bg-black/40 backdrop-blur-xl border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md max-w-5xl mx-auto w-full rounded-t-xl">
        <div class="max-w-xl"><span class="label-caps text-primary-fixed block mb-1">Ghi chú câu chuyện</span><p id="lb-story" class="text-[14px] text-surface-variant leading-relaxed"></p></div>
        <div class="shrink-0"><span class="label-caps text-primary-fixed block">Thông số</span><span id="lb-meta" class="text-[13px] text-surface-variant"></span></div></div>`;
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
    const q = (s) => root.querySelector(s);

    function show() {
      const p = list[i]; const img = q('#lb-img');
      img.style.opacity = 0;
      img.onload = () => { img.style.opacity = 1; };
      img.src = p.src; img.alt = p.story || '';
      q('#lb-n').textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
      q('#lb-story').textContent = p.story || 'Khoảnh khắc cưới nguyên bản.';
      q('#lb-meta').textContent = p.meta || '—';
      q('#lb-dl').href = p.src; q('#lb-dl').setAttribute('download', p.name || `anh-${p.id}.jpg`);
      q('#lb-fav').innerHTML = icon('favorite', `text-[20px] ${p.fav ? 'text-error' : ''}`, p.fav);
      q('#lb-play').innerHTML = icon(timer ? 'pause' : 'play_arrow', 'text-[22px]');
    }
    const go = (d) => { i = (i + d + list.length) % list.length; show(); };
    const stop = () => { clearInterval(timer); timer = null; };
    const toggle = () => { if (timer) stop(); else timer = setInterval(() => go(1), 4000); show(); };
    function close() { stop(); root.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', lbKey); }

    q('#lb-prev').onclick = () => { stop(); go(-1); };
    q('#lb-next').onclick = () => { stop(); go(1); };
    q('#lb-close').onclick = close;
    q('#lb-play').onclick = toggle;
    q('#lb-fav').onclick = async () => { const p = list[i]; p.fav = await API.toggleFavorite(p.id); show(); };
    q('#lb-share').onclick = async () => {
      const url = location.href.split('#')[0];
      if (navigator.share) { try { await navigator.share({ title: 'Éternel Archive', url }); } catch (e) { /* huỷ */ } }
      else { try { await navigator.clipboard.writeText(url); toast('Đã sao chép liên kết'); } catch (e) { toast(url); } }
    };
    root.addEventListener('click', (e) => { if (e.target.id === 'lb-img' || e.currentTarget === e.target) return; });
    lbKey = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') { stop(); go(1); } else if (e.key === 'ArrowLeft') { stop(); go(-1); } else if (e.key === ' ') { e.preventDefault(); toggle(); } };
    document.addEventListener('keydown', lbKey);
    let x0 = null;
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { stop(); go(dx < 0 ? 1 : -1); } x0 = null; });
    show(); if (autoplay) toggle();
  }

  /* ======================================================================
   *  TRANG QUẢN LÝ (studio)
   * ==================================================================== */
  const adminHeader = (sub) => `<header class="fixed top-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
    <div class="h-20 px-space-md sm:px-space-lg lg:px-margin-desktop flex items-center justify-between gap-space-md">
      <div class="flex items-center gap-space-lg">${logo}<span class="h-4 w-px bg-outline-variant hidden sm:block"></span>
        <div class="hidden sm:flex flex-col"><span class="label-caps text-primary">Master Archival Console</span><span class="text-[12px] text-on-surface-variant font-medium">${esc(sub)}</span></div></div>
      <div class="flex items-center gap-space-sm">
        <a href="#/" class="flex items-center gap-1 px-space-md py-space-xs text-[13px] font-medium rounded-lg bg-surface-container-low hover:bg-surface-container">${icon('arrow_back', 'text-[18px]')}<span class="hidden sm:inline">Quay lại Bộ Sưu Tập</span></a>
        <button id="btn-logout" class="flex items-center gap-1 px-space-sm py-space-xs bg-white rounded-full border border-outline-variant/40">${icon('verified', 'text-tertiary text-[16px]')}<span class="label-caps text-primary hidden md:inline">Quản trị viên</span>${icon('logout', 'text-[16px] text-on-surface-variant')}</button></div></div></header>`;

  const storagePanel = async () => {
    const s = await API.getStorage(); const pct = Math.min(100, s.used / s.total * 100);
    return `<div class="bg-white p-space-lg rounded-xl shadow-sm border border-outline-variant/40 flex flex-col md:flex-row items-center justify-between gap-space-md">
      <div class="flex items-center gap-space-md w-full md:w-auto"><span class="p-2 bg-secondary-container text-on-secondary-container rounded-lg">${icon('cloud_done', 'text-[20px]')}</span>
        <div><span class="label-caps text-on-surface-variant block">Dung lượng lưu trữ đã dùng</span>
        <span class="font-display text-[28px]">${fmtSize(s.used)}</span> <span class="text-on-surface-variant font-light">/ ${fmtSize(s.total)}</span></div></div>
      <div class="w-full md:max-w-md"><div class="flex justify-between label-caps text-on-surface-variant mb-1"><span>Đã dùng ${pct.toFixed(1)}%</span><span class="text-primary">Còn trống ${fmtSize(s.total - s.used)}</span></div>
        <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden"><div class="bg-gradient-to-r from-primary to-primary-container h-full rounded-full" style="width:${pct}%"></div></div></div></div>`;
  };

  const bindLogout = () => {
    const b = $app.querySelector('#btn-logout');
    if (b) b.onclick = () => { sessionStorage.removeItem('admin'); location.hash = '#/'; };
  };

  async function admin() {
    const [albums, photos, couple] = await Promise.all([API.listAlbums(), API.listPhotos(), API.getCouple()]);
    const storage = await storagePanel();
    $app.innerHTML = `<div class="page-enter">${adminHeader(couple.names)}
    <main class="pt-20"><div class="px-space-md sm:px-space-lg lg:px-margin-desktop py-space-lg max-w-[1440px] mx-auto flex flex-col gap-space-lg">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm border-b border-surface-container-high">
        <div><div class="flex items-center gap-1 text-primary label-caps mb-1">${icon('diamond', 'text-[15px]', true)}Studio Archive · Quản lý album</div>
          <h1 class="font-display italic text-[32px] md:text-[40px] tracking-tight">Tải Lên Kho Lưu Trữ</h1>
          <p class="text-[14px] text-on-surface-variant max-w-xl">Quản lý album và tải ảnh gốc cho từng chương của ngày cưới.</p></div>
        <button id="btn-privacy" class="flex items-center gap-1 px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high rounded-lg shadow-sm text-[13px] font-medium self-start md:self-auto">${icon('shield_person', 'text-primary text-[18px]')}Quyền riêng tư</button></div>
      ${storage}
      <section class="bg-white p-space-lg rounded-xl border border-outline-variant/40 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-md border-b border-surface-container-high">
          <div><div class="flex items-center gap-2"><h2 class="font-display italic text-[22px]">Tất cả album</h2><span class="px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-medium">${albums.length} album</span></div>
            <p class="text-[12px] text-on-surface-variant">Sắp xếp thứ tự hiển thị và nhấn “Tải ảnh” để thêm ảnh vào từng album.</p></div>
          <form id="new-album" class="flex items-center gap-1"><input id="new-name" placeholder="Tên album mới…" class="px-space-md py-space-xs bg-surface-container-low border border-outline-variant/40 rounded-lg w-40 sm:w-52 focus:outline-none focus:ring-1 focus:ring-primary">
            <button class="flex items-center gap-1 px-space-md py-space-xs bg-primary text-white rounded-lg text-[13px] font-medium shadow-sm">${icon('add', 'text-[18px]')}Tạo album</button></form></div>
        <div id="albums" class="flex flex-col divide-y divide-surface-container-high mt-2">
        ${albums.length ? albums.map((a, n) => {
          const ps = photos.filter((p) => p.albumId === a.id);
          const ic = (act, i, t, extra = '') => `<button data-act="${act}" data-id="${a.id}" title="${t}" class="p-1 text-on-surface-variant hover:bg-surface-container rounded ${extra}">${icon(i, 'text-[18px]')}</button>`;
          return `<div class="py-space-md px-space-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md hover:bg-surface-container-low/60 rounded-lg">
            <div class="flex items-center gap-space-md min-w-0"><span class="label-caps text-on-surface-variant w-6">${String(n + 1).padStart(2, '0')}</span>
              ${ps[0] ? `<img src="${esc(ps[0].src)}" alt="" class="w-16 h-16 rounded-lg object-cover border border-outline-variant/40 shrink-0">` : `<div class="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center shrink-0">${icon('image', 'text-outline')}</div>`}
              <div class="min-w-0"><h3 class="font-display italic text-[17px] font-medium truncate">${esc(a.name)}</h3><p class="text-[12px] text-on-surface-variant">${ps.length} ảnh${a.desc ? ' · ' + esc(a.desc) : ''}</p></div></div>
            <div class="flex items-center gap-1 self-end md:self-center">
              ${ic('up', 'arrow_upward', 'Chuyển lên')}${ic('down', 'arrow_downward', 'Chuyển xuống')}${ic('view', 'open_in_new', 'Xem album')}${ic('rename', 'edit', 'Đổi tên')}${ic('del', 'delete', 'Xoá album', 'hover:text-error')}
              <a href="#/admin/album/${a.id}" class="ml-1 px-space-md py-1 rounded-lg bg-primary text-white text-[13px] font-medium flex items-center gap-1">${icon('cloud_upload', 'text-[16px]')}Tải ảnh</a></div></div>`;
        }).join('') : `<p class="py-space-xl text-center text-on-surface-variant">Chưa có album. Hãy tạo album đầu tiên.</p>`}
        </div></section></div></main></div>`;
    bindLogout();

    $app.querySelector('#new-album').onsubmit = async (e) => {
      e.preventDefault(); const v = $app.querySelector('#new-name').value.trim();
      if (!v) return toast('Nhập tên album', 'err');
      await API.createAlbum(v); toast('Đã tạo album'); admin();
    };
    $app.querySelector('#albums').onclick = async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = b.dataset.id, a = albums.find((x) => x.id === id);
      if (b.dataset.act === 'up') { await API.moveAlbum(id, -1); admin(); }
      else if (b.dataset.act === 'down') { await API.moveAlbum(id, 1); admin(); }
      else if (b.dataset.act === 'view') { view.filter = id; location.hash = '#/'; }
      else if (b.dataset.act === 'rename') { const n = await promptBox('Đổi tên album', 'Tên album', a.name); if (n) { await API.renameAlbum(id, n); toast('Đã đổi tên'); admin(); } }
      else if (b.dataset.act === 'del') {
        const n = photos.filter((p) => p.albumId === id).length;
        if (await confirmBox('Xoá album?', `Album “${a.name}” và ${n} ảnh bên trong sẽ bị xoá vĩnh viễn.`, 'Xoá album')) { await API.deleteAlbum(id); toast('Đã xoá album'); admin(); }
      }
    };
    $app.querySelector('#btn-privacy').onclick = async () => {
      const cur = await API.getPrivacy();
      const opts = [['qr', 'Công khai cho khách mời có mã QR', 'Khách có thiệp mời có thể duyệt và tải ảnh.'], ['vip', 'VIP PIN (gia đình & người thân)', 'Yêu cầu mã PIN 6 số để mở các album riêng tư.'], ['private', 'Chỉ cặp đôi & nhiếp ảnh gia', 'Chỉ tài khoản studio được xem.']];
      modal(`<div class="bg-white rounded-xl max-w-lg w-full p-space-lg shadow-2xl">
        <div class="flex items-center justify-between mb-2"><h3 class="font-display text-[22px] flex items-center gap-2 text-primary">${icon('verified_user')}<span class="text-on-surface">Quyền riêng tư</span></h3><button data-close>${icon('close')}</button></div>
        <div class="space-y-2 my-space-md">${opts.map(([v, t, d]) => `<label class="flex items-start gap-2 p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer"><input type="radio" name="pv" value="${v}" ${cur === v ? 'checked' : ''} class="mt-1"><div><div class="text-[13px] font-medium">${t}</div><div class="text-[12px] text-on-surface-variant">${d}</div></div></label>`).join('')}</div>
        <div class="flex justify-end gap-2"><button data-close class="px-space-md py-space-sm text-[13px] text-on-surface-variant">Đóng</button><button id="pv-save" class="px-space-lg py-space-sm bg-primary text-white rounded-lg text-[13px] font-medium">Lưu thiết lập</button></div></div>`,
      { onMount: (m, close) => { m.querySelector('#pv-save').onclick = async () => { await API.setPrivacy(m.querySelector('input[name=pv]:checked').value); close(); toast('Đã cập nhật quyền riêng tư'); }; } });
    };
  }

  async function albumUpload(albumId) {
    const albums = await API.listAlbums(); const album = albums.find((a) => a.id === albumId);
    if (!album) { location.hash = '#/admin'; return; }
    const storage = await storagePanel();
    $app.innerHTML = `<div class="page-enter">${adminHeader(album.name)}
    <main class="pt-20"><div class="px-space-md sm:px-space-lg lg:px-margin-desktop py-space-lg max-w-[1440px] mx-auto flex flex-col gap-space-lg">
      <a href="#/admin" class="inline-flex items-center gap-1 text-[13px] text-primary font-medium w-fit">${icon('arrow_back', 'text-[18px]')}Tất cả album</a>
      <div><h1 class="font-display italic text-[32px] md:text-[40px]">${esc(album.name)}</h1></div>
      ${storage}
      <div id="drop" class="relative cursor-pointer bg-white rounded-xl p-space-xl lg:p-space-2xl shadow-md hover:shadow-xl transition text-center flex flex-col items-center gap-space-md border-2 border-dashed border-primary-container/60">
        <div class="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center text-primary">${icon('filter_vintage', 'text-[36px]')}</div>
        <h2 class="font-display text-[26px]">Kéo &amp; thả ảnh vào đây</h2>
        <p class="text-[14px] text-on-surface-variant font-light max-w-xl">Hỗ trợ JPG, PNG, WEBP, HEIC, TIFF và RAW. Bạn có thể chọn nhiều tệp cùng lúc.</p>
        <div class="flex flex-wrap justify-center gap-space-md"><button id="pick" class="px-space-xl py-space-sm bg-on-surface text-white hover:bg-primary rounded-lg text-[13px] font-medium shadow-md flex items-center gap-1">${icon('add_photo_alternate', 'text-[18px]')}Chọn tệp từ máy tính</button></div>
        <input id="file" type="file" multiple accept="image/*,.heic,.tif,.tiff,.dng,.arw,.cr3,.nef" class="hidden"></div>
      <div id="queue" class="bg-white rounded-xl p-space-lg shadow-sm border border-outline-variant/40 hidden"><h3 class="font-display text-[20px] mb-2">Hàng đợi tải lên</h3><div id="qlist" class="divide-y divide-outline-variant/40"></div></div>
      <section><div class="flex items-center justify-between mb-space-md"><h2 class="font-display italic text-[22px]">Ảnh trong album <span id="count" class="text-[14px] text-on-surface-variant not-italic"></span></h2></div>
        <div id="photos" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-gutter-sm"></div></section>
    </div></main></div>`;
    bindLogout();

    const $photos = $app.querySelector('#photos');
    async function paint() {
      const ps = await API.listPhotos({ albumId });
      $app.querySelector('#count').textContent = `(${ps.length})`;
      $photos.innerHTML = ps.length ? ps.map((p) => `<div class="group relative aspect-square rounded-lg overflow-hidden border border-outline-variant/40 bg-surface-container-low">
        <img src="${esc(p.src)}" alt="" class="w-full h-full object-cover">
        <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-[11px] truncate">${esc(p.name || p.story || '')}</div>
        <div class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button data-edit="${p.id}" title="Sửa chú thích" class="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">${icon('edit_note', 'text-[18px]')}</button>
          <button data-rm="${p.id}" title="Xoá ảnh" class="w-8 h-8 rounded-full bg-white/90 hover:text-error flex items-center justify-center">${icon('delete', 'text-[18px]')}</button></div></div>`).join('')
        : `<p class="col-span-full text-center py-space-xl text-on-surface-variant">Album chưa có ảnh.</p>`;
    }
    $photos.onclick = async (e) => {
      const ed = e.target.closest('[data-edit]'), rm = e.target.closest('[data-rm]');
      if (ed) {
        const p = (await API.listPhotos({ albumId })).find((x) => x.id === ed.dataset.edit);
        const s = await promptBox('Chú thích ảnh', 'Câu chuyện của khoảnh khắc này', p.story || '');
        if (s !== null) { await API.updatePhoto(p.id, { story: s }); toast('Đã lưu chú thích'); paint(); }
      } else if (rm && await confirmBox('Xoá ảnh?', 'Ảnh sẽ bị xoá vĩnh viễn khỏi album.', 'Xoá ảnh')) { await API.deletePhoto(rm.dataset.rm); toast('Đã xoá ảnh'); paint(); }
    };

    const $q = $app.querySelector('#queue'), $ql = $app.querySelector('#qlist');
    async function handle(files) {
      const imgs = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|tiff?|dng|arw|cr3|nef)$/i.test(f.name));
      if (!imgs.length) return toast('Không có tệp ảnh hợp lệ', 'err');
      $q.classList.remove('hidden'); $ql.innerHTML = '';
      let ok = 0;
      await Promise.all(imgs.map(async (f) => {
        const row = document.createElement('div');
        row.className = 'py-2 flex items-center gap-space-md';
        row.innerHTML = `${icon('progress_activity', 'text-tertiary animate-pulse text-[18px]')}<span class="flex-1 truncate text-[14px] font-medium">${esc(f.name)}</span><span class="text-[12px] text-on-surface-variant">${fmtSize(f.size)}</span><span class="st label-caps w-24 text-right text-on-surface-variant">0%</span>`;
        $ql.appendChild(row); const st = row.querySelector('.st');
        try {
          await API.uploadPhoto(albumId, f, (p) => { st.textContent = p + '%'; });
          st.textContent = 'Đã lưu'; st.classList.add('text-primary'); row.firstElementChild.outerHTML = icon('check_circle', 'text-primary text-[18px]'); ok++;
        } catch (ex) { st.textContent = 'Lỗi'; st.classList.add('text-error'); row.firstElementChild.outerHTML = icon('error', 'text-error text-[18px]'); }
      }));
      toast(`Đã tải lên ${ok}/${imgs.length} ảnh`, ok ? 'ok' : 'err'); paint();
    }
    const input = $app.querySelector('#file'), drop = $app.querySelector('#drop');
    $app.querySelector('#pick').onclick = (e) => { e.stopPropagation(); input.click(); };
    drop.onclick = () => input.click();
    input.onchange = () => { handle(input.files); input.value = ''; };
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('ring-2', 'ring-primary', 'bg-surface-container-low'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('ring-2', 'ring-primary', 'bg-surface-container-low'); if (ev === 'drop') handle(e.dataTransfer.files); }));
    paint();
  }

  /* ---------- router ---------- */
  async function route() {
    $modal.innerHTML = ''; $app.onclick = null;
    const h = location.hash.replace(/^#\/?/, '');
    if (h.startsWith('gallery-view')) return; // neo cuộn trong trang chủ
    window.scrollTo(0, 0);
    try {
      if (h.startsWith('admin')) {
        if (!isAdmin()) { location.hash = '#/'; return; }
        const m = h.match(/^admin\/album\/(.+)$/);
        return m ? await albumUpload(m[1]) : await admin();
      }
      await showcase();
    } catch (err) {
      console.error(err);
      $app.innerHTML = `<div class="min-h-screen flex items-center justify-center text-center p-space-lg"><div>${icon('error', 'text-[48px] text-error')}<p class="mt-2">Đã xảy ra lỗi khi tải dữ liệu.</p><a href="#/" class="text-primary underline">Về trang chủ</a></div></div>`;
    }
  }
  window.addEventListener('hashchange', route);
  route();
})();
