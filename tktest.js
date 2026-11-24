(function () {
  'use strict';
  if (window.__tkDhInstalled) return;
  window.__tkDhInstalled = true;
  const API_RE = /gwtms\.dmx\.vn\/tmsapi\/api\//i;
  const SEARCH_RE = /ShipmentOrder\/SearchShipmentOrder$/i;
  const PAGE_RE = /\/ShipmentRoute/i;
  let searchTemplate = null, apiReq = null, waitCapture = null;
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    let u = '';
    try { u = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) {}
    if (API_RE.test(u) && SEARCH_RE.test(u) && init && typeof init.body === 'string') {
      try { searchTemplate = JSON.parse(init.body); apiReq = { url: u, init }; } catch (e) {}
      if (waitCapture) { const w = waitCapture; waitCapture = null; w(); }
    }
    return _fetch.apply(this, arguments);
  };
  function findSearchButton() {
    return [...document.querySelectorAll('button')].find((b) => /Tìm kiếm/.test(b.textContent || '') && b.offsetParent !== null && !b.closest('#tk-host') && !b.closest('#tkdh-host'));
  }
  function ensureApiReq() {
    if (apiReq) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const btn = findSearchButton();
      if (!btn) return reject(new Error('Không thấy nút "Tìm kiếm" trên trang.'));
      const timer = setTimeout(() => { waitCapture = null; reject(new Error('Hết thời gian chờ trang gửi tìm kiếm (30 giây).')); }, 30000);
      waitCapture = () => { clearTimeout(timer); resolve(); };
      btn.click();
    });
  }
  async function callApi(body) {
    const r = await _fetch.call(window, apiReq.url, Object.assign({}, apiReq.init, { body }));
    return r.json();
  }
  const VUNG = 'Thanh Hóa + Thọ Xuân';
  const KHO_LIST = [
    [33386, 'VHN_THO - Kho Thợ DMX Thanh Hóa (MST mới)'], [33139, 'VHN_THO - Kho Thợ DMX Thọ Xuân (MST mới)']];
  const norm = (s) => (s || '').normalize('NFC').trim();
  const KHO = {};
  KHO_LIST.forEach(([id, full]) => {
    const m = norm(full).match(/^(\S+)\s*-\s*Kho Thợ DMX\s*(.*)$/);
    KHO[id] = (m ? m[2] : norm(full)).replace(/\s*\([^)]*\)/g, '').replace(/\s+\d{4}$/, '').trim();
  });
  const KHO_ORDER = ['Thanh Hóa', 'Thọ Xuân'];
  const ordOf = (n) => { const i = KHO_ORDER.indexOf(norm(n)); return i < 0 ? 999 : i; };
  const XE_NB = { 'Thanh Hóa': '50H64749,29E91205,29E91343,29E89909', 'Thọ Xuân': '50H58779,50E96676,29C61094' };
  const NB_SET = new Set(Object.values(XE_NB).join(',').split(','));
  const bsNorm = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const CN_GAN = 24, CN_GIO = 48, TB_HQ = 10, THUE_DU = 12, THUE_NGAY = 1550000, THUE_DON = 125000;
  const tienThue = (n) => (n >= THUE_DU ? THUE_NGAY : n * THUE_DON);
  const BS_KEY = 'tk_dh_bsx_cache';
  let bsCache = {}; try { bsCache = JSON.parse(localStorage.getItem(BS_KEY) || '{}'); } catch (e) {}
  const bsMem = new Map();
  async function fetchPlates(sos, onProg) {
    bsMem.clear();
    const t = ymd(today()), url = apiReq.url.replace(/ShipmentOrder\/SearchShipmentOrder/i, 'ShipmentRoute/GetShipmentOrderRouteLst');
    const need = [...new Set(sos.filter((s) => s.rt && !(s.rt in bsCache) && !bsMem.has(s.rt)).map((s) => s.rt))];
    const dayOf = {}; sos.forEach((s) => { if (s.rt) dayOf[s.rt] = s.rd > s.day ? s.rd : s.day; });
    let i = 0, done = 0;
    const worker = async () => {
      while (i < need.length) {
        const id = need[i++];
        try {
          const r = await _fetch.call(window, url, Object.assign({}, apiReq.init, { body: JSON.stringify(id) }));
          const j = await r.json();
          const p = bsNorm(((j && j.ResultObject) || []).map((x) => x.LicensePlateNumber).find(Boolean));
          if (dayOf[id] < t && p) bsCache[id] = p; else bsMem.set(id, p);
        } catch (e) {}
        done++; onProg && onProg(done, need.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, need.length) }, worker));
    try { localStorage.setItem(BS_KEY, JSON.stringify(bsCache)); } catch (e) {}
    sos.forEach((s) => { if (s.rt) s.bs = bsCache[s.rt] || bsMem.get(s.rt) || ''; });
  }
  // Danh sách thợ (cập nhật 24/11/2026 – Thanh Hóa + Thọ Xuân theo danh sách anh gửi)
  const THO = [["Thanh Hóa", "27080-Đinh Trọng Hòa", "NV"], ["Thanh Hóa", "111333-Phạm Đình Cao", "NV"], ["Thanh Hóa", "112413-Nguyễn Xuân Toàn", "NV"], ["Thanh Hóa", "158216-Phan Văn Tuấn", "NV"], ["Thanh Hóa", "171740-Trần Xuân Ước", "NV"], ["Thanh Hóa", "186020-Trần Đăng Nam", "NV"], ["Thanh Hóa", "54831-Lê Văn Quang", "NV"], ["Thanh Hóa", "55554-Bùi Xuân Hướng", "NV"], ["Thanh Hóa", "62102-Phạm Văn Thành", "NV"], ["Thanh Hóa", "79044-Lê Văn Dũng", "NV"], ["Thanh Hóa", "79181-Nguyễn Xuân Chương", "NV"], ["Thanh Hóa", "79833-Nguyễn Quốc Cường", "NV"], ["Thanh Hóa", "85688-Lâm Ngọc Nhân", "NV"], ["Thanh Hóa", "90733-Hoàng Văn Hải", "NV"], ["Thanh Hóa", "98501-Đặng Minh Đức", "NV"], ["Thanh Hóa", "171499-Dương Văn Trường", "NV"], ["Thanh Hóa", "178401-Nguyễn Văn Nghĩa", "NV"], ["Thanh Hóa", "168584-Lê Duy Thông", "NV"], ["Thanh Hóa", "253933-Nguyễn Văn Thiên", "NV"], ["Thanh Hóa", "132267-Đoàn Văn Sơn", "NV"], ["Thanh Hóa", "155926-Trần Văn Tuấn", "NV"], ["Thanh Hóa", "79141-Lò Văn Kiên", "NV"], ["Thanh Hóa", "94586-Trần Gia Tuấn", "NV"], ["Thanh Hóa", "173590-Phạm Ngọc Anh", "NV"], ["Thanh Hóa", "241185-Đỗ Văn Vương", "NV"], ["Thanh Hóa", "232664-Lê Hữu Khang", "NV"], ["Thanh Hóa", "256004-Nguyễn Bá Sơn", "NV"], ["Thanh Hóa", "299121-Lê Thúc Bình", "NV"], ["Thanh Hóa", "236108-Nguyễn Hữu Trường", "NV"], ["Thanh Hóa", "169249-Lê Văn Thịnh", "CTV"], ["Thanh Hóa", "293706-Trần Công Minh", "CTV"], ["Thanh Hóa", "84219-Ngô Văn Dân", "CTV"], ["Thanh Hóa", "280020-Đỗ Văn Tùng", "CTV"], ["Thanh Hóa", "117574-Ngô Văn Phong", "CTV"], ["Thanh Hóa", "168585-Lương Văn Minh", "CTV"], ["Thanh Hóa", "79182-Phạm Xuân Phương", "CTV"], ["Thanh Hóa", "254232-Nguyễn Bá Tưởng", "CTV"], ["Thanh Hóa", "169491-Lê Văn Định", "CTV"], ["Thanh Hóa", "314378-Trịnh Duy Đạt", "CTV"], ["Thọ Xuân", "194361-Hoàng Văn Báo", "NV"], ["Thọ Xuân", "146505-Nguyễn Ngọc Nam", "NV"], ["Thọ Xuân", "233379-Lê Văn Đức", "NV"], ["Thọ Xuân", "249264-Lê Xuân Đạt", "NV"], ["Thọ Xuân", "255361-Nguyễn Văn Xuân", "NV"], ["Thọ Xuân", "255987-Trịnh Đình Anh", "NV"], ["Thọ Xuân", "253100-Hồ Văn Vũ", "NV"], ["Thọ Xuân", "259641-Đỗ Huy Duẩn", "NV"], ["Thọ Xuân", "179105-Lê Kim Đức", "NV"], ["Thọ Xuân", "278856-Vũ Trọng Chung", "NV"], ["Thọ Xuân", "272180-Trần Hữu Hòa", "CTV"], ["Thọ Xuân", "85301-Phạm Như Hiển", "CTV"], ["Thọ Xuân", "113009-Lê Xuân Cường", "NV"], ["Thọ Xuân", "115723-Lê Xuân Biên", "NV"], ["Thọ Xuân", "222281-Hà Văn Cướn", "NV"], ["Thọ Xuân", "179880-Phạm Tuấn Anh", "NV"], ["Thọ Xuân", "155163-Lê Minh Tâm", "NV"], ["Thọ Xuân", "278830-Trần Ngọc Lượng", "NV"], ["Thọ Xuân", "255438-Vìn Bá Đạt", "CTV"], ["Thọ Xuân", "81504-Lê Văn An", "CTV"], ["Thọ Xuân", "273351-Trịnh Xuân Huy", "CTV"]];
  try { localStorage.setItem('tk_dh_tho', JSON.stringify(THO)); } catch (e) {}
  const WARN_BEFORE_MIN = 60;
  const isCancelled = (o) => /^\s*đã\s*hủy/i.test(norm(o.ShipmentOrderStatusName)) || o.IsCancelDelivery === true;
  const isDone = (o) => o.IsCompleteDeliveried || /Kết thúc vận đơn|Hoàn tất dịch vụ/i.test(o.ShipmentOrderStatusName || '');
  const ARRIVED_STEP = 105;
  // "Đã lấy hàng và đang tới nhà khách" = CHƯA đến nhà khách → vẫn tính cảnh báo trễ
  const NOT_ARRIVED_RE = /đang tới nhà khách|đang đến nhà khách|đã lấy hàng/i;
  const isArrived = (o) => !NOT_ARRIVED_RE.test(norm(o.ShipmentOrderStatusName)) && (!!o.EarliesDeliveryTime || Number(o.CurrentShipmentOrderStepID) >= ARRIVED_STEP);
  const KM_RE = /(^|[^A-Za-z0-9])KM([^A-Za-z0-9]|$)|khuy[eế]n\s*m[aã]i/i;
  const hasKM = (o) => KM_RE.test([o.ShipItemNameList, o.PrimaryShipItemName, o.ShipmentOrderTypeName].join(';'));
  const ML_RE = /máy lạnh|điều hòa|điều hoà/i;
  const isML = (o) => ML_RE.test([o.ShipItemNameList, o.PrimaryShipItemName, o.ShipmentOrderTypeName].join(';'));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const shift = (s, n) => ymd(addDays(parseYmd(s), n));
  const vn = (s) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const hm = (s) => String(s || '').slice(11, 16);
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmt = (n) => n.toLocaleString('vi-VN');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const range = (a, b) => { const r = []; for (let d = a; d <= b; d = shift(d, 1)) r.push(d); return r; };
  const dayCache = new Map();
  window.__tkdbg = { callApi: (b) => callApi(b), tplFor: (d) => tplFor(d), ensure: () => ensureApiReq() };
  function tplFor(day) {
    const tpl = (searchTemplate || []).map((x) => ({ ...x }));
    const set = (k, v) => { const e = tpl.find((x) => x.SearchKey.toLowerCase() === k.toLowerCase()); if (e) e.SearchValue = v; else tpl.push({ SearchKey: k, SearchValue: v }); };
    set('@Keyword', ''); set('@RECEIVERPHONENUMBER', ''); set('@SHIPMENTORDERTYPEID', '');
    set('@FromDate', day + 'T00:00:00.000'); set('@ToDate', day + 'T23:59:59.000');
    set('@RECEIVERPROVINCEID', -1); set('@RECEIVERWARDID', '-1'); set('@SENDERSTOREID', -1);
    set('@COORDINATORSTOREIDLST', Object.keys(KHO).join(',')); set('@SHIPMENTORDERSTATUSGROUPID', ''); set('@IsCoordinator', -1);
    set('@CARRIERTYPEID', -1); set('@Typename', -1); set('@RequestStoreID', '-1'); set('@IsUnableToContact', -1);
    return { tpl, set };
  }
  // Mã siêu thị yêu cầu (Kho yêu cầu) của vận đơn
  let ST_KEY = null;
  const stOf = (o) => {
    if (ST_KEY === null) ST_KEY = Object.keys(o).find((k) => /^request_?store_?id$/i.test(k)) || '';
    let v = ST_KEY ? o[ST_KEY] : '';
    if (v == null || v === '' || Number(v) <= 0) { const m = String(o.RequestStoreName || o.RequestStoreFullName || '').match(/^\s*(\d+)/); v = m ? m[1] : ''; }
    return v === '' ? '' : String(Number(v));
  };
  const slim = (o) => ({
    id: o.ShipmentOrderID, so: norm(o.PartnerSaleOrderID) || String(o.ShipmentOrderID), exp: o.ExpectedDeliveryDate || '',
    den: o.EarliesDeliveryTime || '', arr: isArrived(o), st: o.ShipmentOrderStatusName || '', done: !!isDone(o), cancel: isCancelled(o), ret: o.IsInputReturn === true, km: hasKM(o), ml: isML(o),
    xt: Number(o.CarrierTypeID) === 2, rt: Number(o.CarrierTypeID) === 2 ? String(o.ShipmentRouteID || '') : '', no: (o.IsOutputGoods || o.OutputGoodsDate) && !isCancelled(o) ? Number(o.TotalUnPaidInMoney) || 0 : 0, xg: String(o.OutputGoodsDate || ''), dd: String(o.EarliesDeliveryTime || o.CompletedDoServiceTime || '').slice(0, 10),
    tho: norm(String(o.DeliverUserFullNameList || '').split(/[,;]/)[0]), kho: KHO[Number(o.CoordinatorStoreID)] || '', stid: stOf(o), stn: norm(String(o.RequestStoreName || '')), spn: norm(String(o.ShipItemNameList || o.PrimaryShipItemName || '')), ntd: String(o.CompletedDoServiceTime || o.DeliveryCompletionTime || ''), huy: isCancelled(o) || /hủy|huỷ/i.test(norm(o.ShipmentOrderStatusName)), gx: !isCancelled(o) && /giao hàng thành công|đã giao|lắp đặt thành công|hoàn tất|kết thúc vận đơn/i.test(norm(o.ShipmentOrderStatusName)), tf: /chuyển kho/i.test(norm(o.ShipmentOrderTypeName)) || /^TFR/i.test(String(o.PartnerSaleOrderID || '')),
  });
  async function fetchDay(day) {
    const isPast = day < ymd(today());
    if (isPast && dayCache.has(day)) return dayCache.get(day);
    const { tpl, set } = tplFor(day);
    const SIZE = 5000; let page = 0, total = 0; const all = [];
    while (page < 20) {
      set('@PAGESIZE', SIZE); set('@PAGEINDEX', page);
      const j = await callApi(JSON.stringify(tpl));
      if (!j || j.IsError) throw new Error((j && j.Message) || 'API báo lỗi');
      const a = j.ResultObject || []; all.push(...a);
      if (a[0]) total = a[0].TotaLRows;
      if (a.length < SIZE || all.length >= total) break;
      page++;
    }
    const uniq = new Map(all.map((o) => [o.ShipmentOrderID, o]));
    if (total && uniq.size < total) throw new Error('Ngày ' + vn(day) + ' chưa tải đủ: ' + uniq.size + '/' + total + '. Anh bấm Thống kê lại.');
    const rows = [...uniq.values()].map(slim);
    if (isPast) dayCache.set(day, rows);
    return rows;
  }
  async function fetchDays(days, onProg) {
    const out = {}; let i = 0, done = 0;
    const worker = async () => { while (i < days.length) { const d = days[i++]; out[d] = await fetchDay(d); done++; onProg && onProg(done, days.length); } };
    await Promise.all(Array.from({ length: Math.min(6, days.length) }, worker));
    return out;
  }
  function toSO(rows) {
    const m = new Map();
    rows.filter((r) => !r.cancel && !r.ret && !r.km).forEach((r) => {
      let s = m.get(r.so);
      if (!s) { s = { so: r.so, vd: 0, done: true, arr: false, den: '', exp: '', day: '', ml: false, tho: '', kho: r.kho, st: r.st, xt: false, rt: '', bs: '', no: 0, xg: '', run: '' }; m.set(r.so, s); }
      if (r.xt && r.dd && (!s.run || r.dd < s.run)) s.run = r.dd;
      if (r.xt) s.xt = true; if (r.rt && !s.rt) s.rt = r.rt; s.no += r.no || 0;
      if (r.no > 0 && r.xg && (!s.xg || r.xg < s.xg)) s.xg = r.xg;
      s.vd++; if (!r.done) { s.done = false; s.st = r.st; }
      if (r.arr) s.arr0 = true; if (!r.done && !r.arr) { s.na = true; s.stN = r.st; }
      if (r.den && (!s.den || r.den < s.den)) s.den = r.den;
      if (r.ml) s.ml = true;
      if (!s.tho && r.tho) s.tho = r.tho;
      if (!s.kho && r.kho) s.kho = r.kho;
      if (!s.exp || r.exp < s.exp) s.exp = r.exp;
    });
    m.forEach((s) => { s.arr = !!s.arr0 && !s.na; if (s.stN) s.st = s.stN; s.day = s.exp.slice(0, 10); s.rd = s.run || s.day; });
    return [...m.values()];
  }
  function soStatus(s) {
    if (s.done) return 'h';
    if (s.arr) return 'd';
    const t = ymd(today());
    if (s.day < t) return 'r';
    if (s.day > t) return 'g';
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), h = toMin(hm(s.exp) || '23:59');
    return nowMin >= h ? 'r' : nowMin > h - WARN_BEFORE_MIN ? 'o' : 'g';
  }
  const WL = { r: 'Có ĐH Trễ Hẹn', o: 'Có ĐH Sắp Trễ', g: 'An Toàn', n: 'Chưa có ĐH' };
  const SL = { h: 'Hoàn tất', d: 'Đã đến nhà', g: 'An toàn', o: 'Sắp trễ', r: 'Trễ hẹn' };
  const CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:Roboto,system-ui,Segoe UI,Arial,sans-serif}',
    '.ov{position:fixed;inset:0;background:rgba(15,23,42,.25);z-index:2147483000}',
    '.dr{position:fixed;top:0;right:0;height:100vh;width:min(800px,100vw);background:#fff;color:#1f2937;z-index:2147483001;box-shadow:-8px 0 28px rgba(15,23,42,.18);display:flex;flex-direction:column;font-size:12px}',
    '.hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1f5bd8}',
    '.hd b{font-size:14px;color:#fff}',
    '.x{background:none;border:0;color:#dbeafe;font-size:20px;cursor:pointer;line-height:1}.x:hover{color:#fff}',
    '.bd{padding:10px 16px 12px;flex:1;display:flex;flex-direction:column;min-height:0}',
    '.tabs{display:flex;margin-bottom:10px;border-bottom:2px solid #1f5bd8}',
    '.tab{padding:6px 16px;font-weight:700;cursor:pointer;border:1px solid #d1d5db;border-bottom:none;background:#f5f7fa;color:#374151;border-radius:5px 5px 0 0;margin-right:4px}',
    '.tab.on{background:#1f5bd8;color:#fff;border-color:#1f5bd8}',
    'label{display:block;color:#374151;font-weight:700;font-size:10.5px;margin-bottom:3px}',
    '.row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px}',
    'input,select{background:#fff;color:#111827;border:1px solid #cfd5dd;border-radius:4px;padding:4px 7px;font-size:11px;height:26px;color-scheme:light}',
    '.btn{background:#fff;color:#1f2937;border:1px solid #d1d5db;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;height:26px}',
    '.pri{background:#1f5bd8;border-color:#1f5bd8;color:#fff}.pri:disabled{opacity:.6;cursor:wait}',
    '.q{background:#e9f9ef;border-color:#9fe0b6;color:#16a34a}.q.on{background:#1f5bd8;border-color:#1f5bd8;color:#fff}',
    '.msg{color:#15803d;min-height:15px;font-size:11px;margin-bottom:4px}.msg.err{color:#dc2626}',
    '.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:2px 0 8px} .c5{border-color:#c4b5fd;background:#f3efff}.c5 .n{color:#7c3aed}',
    '.card{border:1px solid #e5e7eb;border-radius:6px;padding:7px 12px;font-size:12px}',
    '.card .n{font-size:22px;font-weight:700;margin-top:2px}',
    '.c1{border-color:#c9d8fb;background:#eaf1ff}.c1 .n{color:#1f5bd8}',
    '.c2{border-color:#9fe0b6;background:#e9f9ef}.c2 .n{color:#16a34a}',
    '.c3{border-color:#f7c873;background:#fff4e0}.c3 .n{color:#d97706}',
    '.c4{border-color:#f3a6a6;background:#fdecec}.c4 .n{color:#dc2626}',
    '.note{color:#6b7280;font-size:11px;margin:0 0 6px}',
    '.tw{overflow:auto;border:1px solid #d1d5db;flex:1;min-height:200px}',
    'table{border-collapse:separate;border-spacing:0;width:100%}',
    'th,td{border-right:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:5px 6px;text-align:center;white-space:nowrap}',
    'thead th{background:#f3f6fb;font-weight:700;position:sticky;z-index:2;color:#111827}',
    'thead tr:nth-child(1) th{top:0;height:27px} thead tr:nth-child(2) th{top:27px}',
    'th.day{background:#e2eaf8} th.main{background:#d6e4ff;color:#173a8a}',
    'td.l{text-align:left} td.kho{font-weight:700;background:#fafbfd}',
    'tbody tr.click{cursor:pointer} tbody tr.click:hover td{background:#f4f8ff} tbody tr.dayrow{cursor:pointer} tbody tr.dayrow td{background:#f7faff} tbody tr.dayrow:hover td{background:#eaf1ff}',
    'tr.tot td{font-weight:700;background:#f3f6fb;position:sticky;bottom:0;z-index:1}',
    '.sep{border-left:3px solid #5b6b8a} td.sep{font-weight:700;color:#0b2a6b} th.mon{background:#c6efd3;color:#14532d} td.mon{background:#f0fdf4} td.sep.mon{color:#166534} tr.tot td.mon{background:#dcfce7}',
    '.zz{color:#b6bcc6}',
    'th.xt{background:#ffedd5;color:#9a3412} th.cno{background:#fee2e2;color:#991b1b} td.tien{text-align:right;color:#b91c1c;font-weight:700} th.thue{background:#ede9fe;color:#5b21b6} td.tien2{text-align:right;color:#5b21b6;font-weight:700}',
    'thead tr:nth-child(2) th{white-space:normal;line-height:1.25;min-width:60px;width:60px;vertical-align:middle} thead tr:nth-child(2) th.wd{min-width:112px;width:112px} thead tr:nth-child(2) th.wm{min-width:86px;width:86px} .cn48{cursor:pointer;text-decoration:underline} .stk{position:sticky;left:8px;display:inline-block}',
    '.dg-ok{background:#00B0F0;color:#fff}.dg-no{background:#FF0000;color:#fff}',
    '.w{display:block;font-weight:700;font-size:11px;padding:4px 3px;margin:-5px -6px}',
    '.w-g{background:#00B0F0;color:#fff}.w-o{background:#FFFF00;color:#FF0000}.w-r{background:#FF0000;color:#fff}',
    '.w-n{color:#6b7280;font-weight:400;font-style:italic}',
    'tr.det>td{background:#fbfcfe;padding:6px 10px;text-align:left}',
    'tr.det table{width:auto;border:1px solid #d1d5db} tr.det th{position:static;background:#eef2f7}',
    '.bdg{display:inline-block;padding:2px 8px;border-radius:10px;font-weight:700;font-size:10.5px}',
    '.b-g{background:#00B0F0;color:#fff}.b-o{background:#FFFF00;color:#f00}.b-r{background:#FF0000;color:#fff}.b-d{background:#e9f9ef;color:#16a34a}.b-h{background:#e5e7eb;color:#374151}',
    '.empty{color:#6b7280;padding:30px 0;text-align:center}',
    '@media (max-width:820px){.cards{grid-template-columns:repeat(2,1fr)}}'].join('\n');
  let host, root;
  const state = { view: 'cn', from: '', to: '', preset: 'today', cn: '', warn: '', q: '', open: new Set(), open48: new Set(), open24: new Set(), openDay: new Set(), data: null };
  function topSlot() {
    const nav = document.querySelector('header.topnav > nav.topnav-menu');
    if (!nav) return null;
    let s = document.getElementById('tk-topbar');
    if (!s) { s = document.createElement('div'); s.id = 'tk-topbar'; s.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 12px;flex:0 0 auto'; }
    if (s.previousElementSibling !== nav) nav.after(s);
    return s;
  }
  function findStatusField() {
    const tb = document.querySelector('.sr-search .toolbar'); if (!tb) return null;
    return [...tb.children].find((c) => { const t = c.textContent.trim(); return /^Trạng thái/.test(t) && !/^Trạng thái điều phối/.test(t); }) || null;
  }
  function ensureButton() {
    const onPage = PAGE_RE.test(location.pathname);
    let btn = document.getElementById('tkdh-open-btn');
    if (!onPage) { if (btn) btn.remove(); return; }
    if (!document.body) return;
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'tkdh-open-btn'; btn.textContent = '📋 Thống kê Đơn Hàng'; btn.title = 'Thống kê đơn hàng theo chi nhánh / theo thợ + cảnh báo trễ hẹn'; btn.onclick = openPanel;
    }
    const base = 'background:#0f9d58;color:#fff;border:0;border-radius:8px;padding:0 14px;font:600 13px Roboto,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(15,157,88,.35);';
    const slot = topSlot();
    if (slot) {
      if (btn.parentElement !== slot) { btn.style.cssText = base + 'height:32px;white-space:nowrap;order:2'; slot.appendChild(btn); }
      return;
    }
    const anchor = document.getElementById('tk-open-btn') || findStatusField();
    if (btn.parentElement && anchor && btn.previousElementSibling === anchor) return;
    if (btn.parentElement === document.body && !anchor) return;
    if (anchor && anchor.parentElement !== document.body) { btn.style.cssText = base + 'height:34px;align-self:flex-end;white-space:nowrap;margin-left:8px'; anchor.after(btn); }
    else { btn.style.cssText = base + 'position:fixed;top:12px;right:200px;z-index:2147482999;height:32px'; document.body.appendChild(btn); }
  }
  function setRange(p) {
    const d0 = today(); let f = d0, e = d0;
    const d = state.view === 'sp' && state.mon ? new Date(+state.mon.slice(0, 4), +state.mon.slice(5, 7) - 1, 1) : d0;
    if (p === 'tomorrow') f = e = addDays(d0, 1);
    if (p === 'next7') e = addDays(d0, 6);
    if (p === 'mtd') f = new Date(d.getFullYear(), d.getMonth(), 1);
    if (p === 'month') { f = new Date(d.getFullYear(), d.getMonth(), 1); e = new Date(d.getFullYear(), d.getMonth() + 1, 0); }
    const W = { w1: [1, 7], w2: [8, 14], w3: [15, 21], w4: [22, 31] }[p];
    if (W) { const endM = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); f = new Date(d.getFullYear(), d.getMonth(), W[0]); e = new Date(d.getFullYear(), d.getMonth(), Math.min(W[1], endM)); }
    state.from = ymd(f); state.to = ymd(e);
  }
  function openPanel() {
    if (!host) { host = document.createElement('div'); host.id = 'tkdh-host'; root = host.attachShadow({ mode: 'open' }); document.body.appendChild(host); }
    if (!state.from) setRange('today');
    const cnOpts = '<option value="">Kho Thanh Hóa + Kho Thọ Xuân</option>' + KHO_ORDER.map((k) => '<option value="' + esc(k) + '"' + (k === state.cn ? ' selected' : '') + '>Kho ' + esc(k) + '</option>').join('');
    root.innerHTML = '<style>' + CSS + '</style><div class="ov"></div>' +
      '<div class="dr"><div class="hd"><b>📋 Thống kê Đơn Hàng</b><button class="x" title="Đóng">✕</button></div><div class="bd">' +
      '<div class="tabs"><div class="tab" data-v="tre">Cảnh Báo Trễ</div><div class="tab" data-v="cno">Công Nợ</div><div class="tab" data-v="cn">ĐH theo chi nhánh</div><div class="tab" data-v="tho">ĐH theo thợ</div><div class="tab" data-v="xt">ĐH Xe tải</div><div class="tab" data-v="st">ĐH theo ST</div><div class="tab" data-v="sp">Sản Phẩm</div></div>' +
      '<div class="row"><div><label>Từ ngày</label><input type="date" id="f" value="' + state.from + '"></div>' +
      '<div><label>Đến ngày</label><input type="date" id="t" value="' + state.to + '"></div>' +
      '<div><label>Chi nhánh</label><select id="cn">' + cnOpts + '</select></div>' +
      '<div><label>Cảnh báo trễ hẹn</label><select id="fw"><option value="">Tất cả</option><option value="r">Có ĐH trễ hẹn</option><option value="o">Có ĐH sắp trễ</option><option value="g">An toàn</option><option value="n">Chưa có ĐH</option></select></div>' +
      '<div id="qs"><label id="ql">Tìm thợ</label><input id="q" placeholder="Mã / tên thợ" value="' + esc(state.q) + '"></div>' +
      '<button class="btn pri" id="go">Thống kê</button><button class="btn" id="csv" title="Xuất file Excel giữ nguyên giao diện bảng đang xem">⬇ Xuất Excel</button></div>' +
      '<div class="row" id="prow"><button class="btn q" data-p="today">Hôm nay</button><button class="btn q" data-p="tomorrow">Ngày mai</button>' +
      '<button class="btn q" data-p="next7">7 ngày tới</button><button class="btn q" data-p="mtd">Đầu tháng – nay</button><button class="btn q" data-p="month">Cả tháng này</button><button class="btn q" data-p="w1">Tuần 1 (1–7)</button><button class="btn q" data-p="w2">Tuần 2 (8–14)</button><button class="btn q" data-p="w3">Tuần 3 (15–21)</button><button class="btn q" data-p="w4">Tuần 4 (22–cuối tháng)</button>' +
      (() => { const t = today(); const opts = (sel) => { let o = ''; for (let i = 0; i < 12; i++) { const m = new Date(t.getFullYear(), t.getMonth() - i, 1), v = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'); o += '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>Tháng ' + (m.getMonth() + 1) + '/' + m.getFullYear() + '</option>'; } return o; }; const cur = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); const st = 'padding:4px 8px;font-weight:600;color:#5b21b6;border-color:#c4b5fd;background:#f5f3ff'; return '<span id="spmw" style="display:inline-flex;align-items:center;gap:6px;color:#5b21b6;font-weight:600">📅 Từ <select id="spm" class="btn" style="' + st + '">' + opts(state.mon || cur) + '</select> đến <select id="spm2" class="btn" style="' + st + '">' + opts(state.mon2 || state.mon || cur) + '</select>'; })() + '<button class="btn pri" id="spmgo" title="Thống kê từ ngày 1 của tháng đầu đến ngày cuối của tháng cuối">Thống kê tháng</button></span></div>' +
      '<div class="msg" id="msg"></div><div id="cards"></div><div class="note" id="note"></div>' +
      '<div class="tw" id="out"><div class="empty">Chọn khoảng ngày rồi bấm <b>Thống kê</b>.</div></div></div></div>';
    const $ = (s) => root.querySelector(s);
    const close = () => { root.innerHTML = ''; };
    $('.x').onclick = close; $('.ov').onclick = close;
    $('#fw').value = state.warn;
    const mark = () => {
      root.querySelectorAll('[data-p]').forEach((x) => x.classList.toggle('on', x.dataset.p === state.preset));
      // Tab Sản Phẩm: ẩn "7 ngày tới", hiện Tuần 1–4; các tab khác ngược lại
      $('#spmw').style.display = state.view === 'sp' ? 'inline-flex' : 'none';
      root.querySelectorAll('[data-p]').forEach((x) => { const sp = true; if (x.dataset.p === 'next7' || x.dataset.p === 'mtd') x.style.display = sp ? 'none' : ''; if (/^w[1-4]$/.test(x.dataset.p)) x.style.display = sp ? '' : 'none'; });
      root.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x.dataset.v === state.view));
      { const c = state.view === 'cno'; $('#prow').style.display = c || state.view === 'tre' ? 'none' : ''; [$('#f'), $('#t'), $('#fw')].forEach((e) => (e.parentNode.style.display = c ? 'none' : '')); $('#fw').parentNode.style.display = c || state.view === 'tre' ? 'none' : ''; $('#go').textContent = c ? 'Tải công nợ' : 'Thống kê'; }
      $('#qs').style.display = state.view === 'cn' || state.view === 'st' || state.view === 'sp' ? 'none' : ''; $('#ql').textContent = state.view === 'xt' ? 'Tìm biển số' : 'Tìm thợ'; $('#q').placeholder = state.view === 'xt' ? 'Biển số xe' : 'Mã / tên thợ';
    };
    mark();
    $('#go').onclick = run;
    $('#csv').onclick = exportView;
    $('#f').onchange = $('#t').onchange = () => { state.preset = ''; mark(); };
    $('#spm').onchange = () => { state.mon = $('#spm').value; };
    $('#spm2').onchange = () => { state.mon2 = $('#spm2').value; };
    $('#spmgo').onclick = () => {
      let a = $('#spm').value, b = $('#spm2').value; if (b < a) { const x = a; a = b; b = x; }
      state.mon = a; state.mon2 = b; state.preset = a === b ? 'month' : '';
      state.from = a + '-01'; const e = new Date(+b.slice(0, 4), +b.slice(5, 7), 0); state.to = ymd(e);
      $('#spm').value = a; $('#spm2').value = b; $('#f').value = state.from; $('#t').value = state.to; mark(); run();
    };
    root.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { state.preset = b.dataset.p; if (/^(today|tomorrow)$/.test(b.dataset.p)) { state.mon = state.mon2 = ''; $('#spm').selectedIndex = $('#spm2').selectedIndex = 0; } setRange(b.dataset.p); $('#f').value = state.from; $('#t').value = state.to; mark(); run(); }));
    root.querySelectorAll('.tab').forEach((t) => (t.onclick = () => { state.view = t.dataset.v; state.q = ''; $('#q').value = ''; state.open.clear(); state.open48.clear(); state.open24.clear(); state.openDay.clear(); mark(); render(); if (state.view === 'cno' && !state.cno) loadCNO(); else if (state.view !== 'cno' && !state.data) run(); }));
    $('#cn').onchange = () => { state.cn = $('#cn').value; render(); };
    $('#fw').onchange = () => { state.warn = $('#fw').value; render(); };
    $('#q').oninput = () => { state.q = $('#q').value; render(); };
    $('#out').onclick = (e) => { const cu = e.target.closest('[data-cu],[data-cuall]'); if (cu) { e.stopPropagation(); const B = buildCNO(); const L = state.view === 'tre' ? (buildTRE() || {}).list : state.view === 'sp' ? (buildSP() || {}).th : B && B.list; const txt = cu.dataset.cuall ? (L || []).filter((x) => x.user).map((x) => '@' + x.user).join('\n') : '@' + cu.dataset.cu; const done = () => setMsg('📋 Đã copy ' + (cu.dataset.cuall ? txt.split('\n').filter(Boolean).length + ' user' : 'user ' + txt) + '.'); try { navigator.clipboard.writeText(txt).then(done, () => { cpFallback(txt); done(); }); } catch (er) { cpFallback(txt); done(); } return; } const cc = e.target.closest('[data-kcn]'); if (cc) { state.openCN = state.openCN || new Set(); const k = cc.dataset.kcn; state.openCN.has(k) ? state.openCN.delete(k) : state.openCN.add(k); render(); return; } const c = e.target.closest('[data-k48]'); if (c) { const k = c.dataset.k48; state.open48.has(k) ? state.open48.delete(k) : state.open48.add(k); render(); return; } const cd = e.target.closest('[data-kd]'); if (cd) { const k = cd.dataset.kd; state.openDay.has(k) ? state.openDay.delete(k) : state.openDay.add(k); render(); return; } const c2 = e.target.closest('[data-k24]'); if (c2) { const k = c2.dataset.k24; state.open24.has(k) ? state.open24.delete(k) : state.open24.add(k); render(); return; } const tr = e.target.closest('tr.click'); if (!tr) return; const k = tr.dataset.k; state.open.has(k) ? state.open.delete(k) : state.open.add(k); render(); };
    if (state.view === 'cno' ? state.cno : state.data) render(); else run();
  }
  function cpFallback(t) { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
  function setMsg(t, err) { const m = root && root.querySelector('#msg'); if (m) { m.textContent = t; m.className = 'msg' + (err ? ' err' : ''); } }
  async function run() {
    if (state.view === 'cno') return loadCNO();
    return loadOrders();
  }
  async function loadOrders() {
    const rMsg = (t, e) => { if (state.view !== 'cno') setMsg(t, e); };
    const F = root.querySelector('#f').value, T = root.querySelector('#t').value;
    if (!F || !T || F > T) { rMsg('Khoảng ngày không hợp lệ.', true); return; }
    state.from = F; state.to = T;
    const month0 = T.slice(0, 8) + '01';
    const prev = [1, 2, 3].map((n) => shift(F, -n));
    const all = range([F, month0, prev[2]].sort()[0], T);
    root.querySelector('#go').disabled = true;
    const t0 = Date.now();
    try {
      rMsg('Đang tải dữ liệu…');
      await ensureApiReq();
      const byDay = await fetchDays([...all, shift(T, 1)], (d, n) => rMsg('Đang tải dữ liệu… ' + d + '/' + n + ' ngày'));
      const sos = toSO(Object.values(byDay).flat());
      await fetchPlates(sos.filter((s) => s.xt && s.rd >= F && s.rd <= T), (d, n) => rMsg('Đang lấy biển số xe tải… ' + d + '/' + n + ' tuyến'));
      const vdCount = range(F, T).reduce((a, d) => a + byDay[d].length, 0);
      state.data = { F, T, month0, prev, sos, vdCount, rows: Object.values(byDay).flat() };
      try { rMsg('Đang tải công nợ (trang Quản lý công nợ)…'); await loadDebt((d, n) => rMsg('Đang tải công nợ… ' + d + '/' + n + ' thợ')); } catch (e) { state.debt = null; }
      render();
      rMsg('✔ Đã tải ' + all.length + ' ngày dữ liệu (' + vn(all[0]) + ' → ' + vn(T) + ') · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' giây · cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN') + '. Cảnh báo tự tính lại mỗi phút.');
    } catch (e) { rMsg(e.message || String(e), true); }
    finally { const g = root.querySelector('#go'); if (g) g.disabled = false; }
  }
  function build() {
    const D = state.data; if (!D) return null;
    const inMain = (s) => s.day >= D.F && s.day <= D.T;
    const inMon = (s) => s.day >= D.month0 && s.day <= D.T;
    const sos = D.sos.filter((s) => !state.cn || s.kho === state.cn);
    sos.forEach((s) => { s.ss = soStatus(s); });
    const blank = () => ({ m: { tong: 0, ml: 0, dhk: 0 }, c: { h: 0, d: 0, g: 0, o: 0, r: 0 }, mon: { tong: 0, ml: 0, dhk: 0 }, pv: D.prev.map(() => ({ tong: 0, ml: 0, dhk: 0 })), list: [], xt: 0, non: 0, not: 0, no48: 0, l48: [], no24: 0, l24: [], lcn: [], maxH: -1, bsx: new Map() });
    const now = Date.now();
    const add = (x, s) => {
      const t = (o) => { o.tong++; s.ml ? o.ml++ : o.dhk++; };
      if (inMain(s)) { t(x.m); x.c[s.ss]++; if (s.ss !== 'h') x.list.push(s); }
      if (s.xt && s.rd >= D.F && s.rd <= D.T) { x.xt++; if (s.bs) { const k = s.bs + '|' + s.rd; x.bsx.set(k, (x.bsx.get(k) || 0) + 1); } }
      if (inMon(s)) t(x.mon);
      const i = D.prev.indexOf(s.day); if (i >= 0) t(x.pv[i]);
    };
    const rows = new Map();
    if (state.view === 'cn') {
      KHO_ORDER.filter((k) => !state.cn || k === state.cn).forEach((k) => rows.set(k, Object.assign({ key: 'k:' + k, kho: k }, blank())));
      sos.forEach((s) => { const r = rows.get(s.kho); if (r) add(r, s); });
    } else {
      THO.filter(([k]) => !state.cn || k === state.cn).sort((a, b) => ordOf(a[0]) - ordOf(b[0]))
        .forEach(([kho, nm, vt]) => rows.set(nm.split('-')[0].trim(), Object.assign({ key: 't:' + nm, kho, tho: nm, vt }, blank())));
      sos.forEach((s) => {
        const code = s.tho ? s.tho.split('-')[0].trim() : '';
        const id = code || '__none__' + s.kho;
        let r = rows.get(id);
        if (!r) return; // Chỉ thợ trong danh sách (Thanh Hóa + Thọ Xuân)
        if (!r) { r = Object.assign({ key: 't:' + id, kho: s.kho, tho: s.tho || '(Chưa gán thợ)', vt: '' }, blank()); rows.set(id, r); }
        add(r, s);
      });
    }
    // Công nợ: lấy từ trang Quản lý công nợ (StaffDebt) – cùng nguồn với tab Công Nợ, số giờ nợ do TMS tính
    if (state.debt && state.view !== 'tho') {
      const byId = new Map(); D.rows.forEach((r) => byId.set(String(r.id), r));
      state.debt.users.filter((u) => !state.cn || u.kho === state.cn).forEach((u) => {
        let x;
        if (state.view === 'cn') x = rows.get(u.kho);
        else { x = rows.get(u.user); if (!x) { x = Object.assign({ key: 't:' + u.user, kho: u.kho, tho: u.user + '-' + u.name, vt: '' }, blank()); rows.set(u.user, x); } }
        if (!x) return;
        u.list.forEach((d) => {
          const r = byId.get(d.id), hh = d.h;
          const s2 = { so: r ? r.so : d.id, day: String(d.hen || '').slice(0, 10), xg: String(d.xg || ''), no: d.tien, st: r ? r.st : '', tho: u.user + '-' + u.name, kho: u.kho, hh };
          x.non++; x.not += d.tien;
          if (hh >= CN_GIO) { x.no48++; x.l48.push(s2); } else if (hh >= CN_GAN) { x.no24++; x.l24.push(s2); }
          x.lcn.push(s2); x.maxH = Math.max(x.maxH, hh);
        });
      });
    }
    let list = [...rows.values()];
    list.forEach((x) => { x.chua = x.c.d + x.c.g + x.c.o + x.c.r; x.warn = x.c.r ? 'r' : x.c.o ? 'o' : x.m.tong ? 'g' : 'n'; });
    // Tab thợ: ưu tiên 1 = thợ có ĐH sắp trễ; sau đó theo kho
    if (state.view === 'tho') {
      const pri = (x) => (x.c.o ? 0 : 2);
      list.sort((a, b) => pri(a) - pri(b) || (pri(a) === 0 ? b.c.o - a.c.o : 0) || (pri(a) <= 1 ? b.maxH - a.maxH : 0) || ordOf(a.kho) - ordOf(b.kho));
    }
    if (state.warn) list = list.filter((x) => x.warn === state.warn);
    const q = norm(state.q).toLowerCase();
    if (state.view === 'tho' && q) list = list.filter((x) => x.tho.toLowerCase().includes(q));
    const S = blank(); S.chua = 0;
    list.forEach((x) => {
      ['tong', 'ml', 'dhk'].forEach((k) => { S.m[k] += x.m[k]; S.mon[k] += x.mon[k]; x.pv.forEach((p, i) => (S.pv[i][k] += p[k])); });
      Object.keys(S.c).forEach((k) => (S.c[k] += x.c[k])); S.chua += x.chua;
      S.xt += x.xt; S.non += x.non; S.not += x.not; S.no48 += x.no48; S.no24 += x.no24; S.maxH = Math.max(S.maxH, x.maxH); if (x.no48) S.th48 = (S.th48 || 0) + 1;
      x.bsx.forEach((n, k) => S.bsx.set(k, (S.bsx.get(k) || 0) + n));
    });
    const fin = (o) => {
      let nb = 0, th = 0, dh = 0, thDH = 0, tien = 0;
      o.bsx.forEach((n, k) => { dh += n; if (NB_SET.has(k.split('|')[0])) nb++; else { th++; thDH += n; tien += tienThue(n); } });
      Object.assign(o, { nb, th, thDH, tien, xe: nb + th });
      o.tb = o.xe ? dh / o.xe : null;
      o.dg = o.tb == null ? '' : o.tb >= TB_HQ ? 'Hiệu Quả' : 'Chưa Hiệu Quả';
    };
    list.forEach(fin); fin(S);
    return { D, list, S };
  }
  function render() {
    const out = root && root.querySelector('#out'); if (!out) return;
    if (state.view === 'xt') return renderXT(out);
    if (state.view === 'st') return renderST(out);
    if (state.view === 'sp') return renderSP(out);
    if (state.view === 'cno') return renderCNO(out);
    if (state.view === 'tre') return renderTRE(out);
    const B = build(); if (!B) return;
    const { D, list, S } = B, tho = state.view === 'tho';
    const mainLabel = D.F === D.T ? 'Ngày ' + vn(D.T) : 'Từ ' + vn(D.F) + ' đến ' + vn(D.T);
    root.querySelector('#cards').innerHTML = '<div class="cards">' +
      '<div class="card c1"><div>Tổng Đơn Hàng</div><div class="n">' + fmt(S.m.tong) + '</div></div>' +
      '<div class="card c2"><div>ĐH Hoàn tất</div><div class="n">' + fmt(S.c.h) + '</div></div>' +
      '<div class="card c5"><div>ĐH Chưa hoàn tất</div><div class="n">' + fmt(S.chua) + '</div></div>' +
      '<div class="card c3"><div>Có ĐH sắp trễ</div><div class="n">' + fmt(S.c.o) + '</div></div>' +
      '<div class="card c4"><div>Có ĐH trễ hẹn</div><div class="n">' + fmt(S.c.r) + '</div></div></div>';
    root.querySelector('#note').textContent = mainLabel + ': ' + fmt(D.vdCount) + ' vận đơn → ' + fmt(D.sos.filter((s) => s.day >= D.F && s.day <= D.T).length) + ' SO sau khi bỏ trùng (đã bỏ đơn hủy, nhập trả, khuyến mãi). Bấm vào 1 dòng để xem SO chưa hoàn tất. Công nợ lấy từ trang Quản lý công nợ của TMS (cùng nguồn với tab Công Nợ), số giờ nợ do TMS tính' + (state.debt ? ', cập nhật lúc ' + state.debt.at.toLocaleTimeString('vi-VN') : ' – chưa tải được') + '. Xe tải / xe thuê tính theo ngày xe chạy thật (ngày đến nhà khách), đơn chưa chạy tính theo ngày hẹn.';
    const ext = tho ? 0 : 10, lead = tho ? 3 : 1, cols = lead + 18 + ext;
    const CN_CLS = (h) => (h < 24 ? 'w-g' : h < 40 ? 'w-o' : 'w-r');
    const CN_COL = (h) => (h < 24 ? '#0284c7' : h < 40 ? '#b45309' : '#dc2626');
    const VND = (v) => (v ? fmt(Math.round(v)) : '<span class="zz">-</span>');
    const DG = (o) => (o.dg ? '<span class="w ' + (o.tb >= TB_HQ ? 'dg-ok' : 'dg-no') + '">' + o.dg + '</span>' : '<span class="zz">-</span>');
    const TB = (o) => (o.tb == null ? '<span class="zz">-</span>' : o.tb.toLocaleString('vi-VN', { maximumFractionDigits: 1 }));
    const CNW = (x) => {
      if (tho) { // Tab thợ: hiện số giờ nợ lâu nhất — xanh < 24h, vàng 24h–dưới 40h, đỏ từ 40h
        if (!x.non) return '<span class="zz">-</span>';
        if (x.maxH < 0) return '<span class="w w-g">' + fmt(x.non) + ' ĐH</span>';
        const cls = CN_CLS(x.maxH), more = x.non > 1 ? ' · ' + fmt(x.non) + ' ĐH' : '';
        return x === S ? '<span class="w ' + cls + '">Lâu nhất ' + x.maxH + 'h</span>' : '<span class="w ' + cls + ' cn48" data-kcn="' + esc(x.key) + '" title="Số giờ nợ lâu nhất (do TMS tính). Bấm để xem từng ĐH">' + x.maxH + 'h' + more + '</span>';
      }
      if (x === S) return (tho && S.no24 ? '<span style="color:#d97706">' + fmt(S.no24) + ' ĐH Gần 48h</span>' : '') + (tho && S.no48 && S.no24 ? ', ' : '') + (S.no48 ? '<span style="color:#dc2626">' + fmt(S.no48) + ' ĐH Trên 48h</span>' : '');
      if (tho && (x.no24 || x.no48)) {
        const g = x.no24 ? '<span class="cn48" data-k24="' + esc(x.key) + '" title="Bấm để xem ĐH công nợ từ 24h đến dưới 48h"' + (x.no48 ? ' style="color:#FFFF00"' : '') + '>' + x.no24 + ' ĐH Gần 48h</span>' : '';
        const t = x.no48 ? '<span class="cn48" data-k48="' + esc(x.key) + '" title="Bấm để xem ĐH quá 48h">' + x.no48 + ' ĐH Trên 48h</span>' : '';
        return '<span class="w ' + (x.no48 ? 'w-r' : 'w-o') + '" style="white-space:nowrap">' + g + (g && t ? ', ' : '') + t + '</span>';
      }
      const a = x.no48 ? '<span class="w w-r cn48" data-k48="' + esc(x.key) + '" title="Bấm để xem ĐH quá 48h">Có ' + x.no48 + ' ĐH Trên 48h</span>' : '';
      if (a) return a;
      return x.non ? '<span class="w w-g">CN Dưới ' + (tho ? CN_GAN : CN_GIO) + 'h</span>' : '<span class="zz">-</span>';
    };
    const WCELL = (x) => {
      if (tho || !(x.c.r || x.c.o)) return '<span class="w w-' + x.warn + '">' + WL[x.warn] + '</span>';
      const r = x.c.r ? '<span class="w w-r"' + (x.c.o ? ' style="margin-bottom:0"' : '') + '>' + x.c.r + ' ĐH Trễ Hẹn</span>' : '';
      const o = x.c.o ? '<span class="w w-o"' + (x.c.r ? ' style="margin-top:0"' : '') + '>' + x.c.o + ' ĐH Sắp Trễ</span>' : '';
      return r + o;
    };
    const cnH1 = '<th colspan="3" class="cno sep">Công Nợ</th>';
    const cnH2 = '<th class="cno sep">SL ĐH Còn Công Nợ</th><th class="cno wd">Số Tiền</th><th class="cno wd" title="Số giờ nợ do TMS tính (trang Quản lý công nợ)">Đánh Giá Công Nợ</th>';
    const cnD = (x) => '<td class="sep">' + Z(x.non) + '</td><td class="tien">' + VND(x.not) + '</td><td>' + CNW(x) + '</td>';
    const extH1 = tho ? '' : '<th colspan="5" class="xt sep">Xe Tải</th><th colspan="2" class="thue sep">Xe Thuê</th>' + cnH1;
    const extH2 = tho ? ''
      : '<th class="xt sep">Tổng ĐH Xe Tải</th><th class="xt" title="Số xe nội bộ đã chạy (cộng theo ngày)">Xe Nội Bộ</th><th class="xt" title="Biển số không có trong danh sách xe nội bộ (cộng theo ngày)">Xe Thuê</th><th class="xt">Trung Bình Xe</th><th class="xt wm">Đánh Giá</th>' +
        '<th class="thue sep">SL ĐH Xe Thuê</th><th class="thue wm" title="1 xe/ngày: từ 12 đơn = 1.550.000; dưới 12 đơn = số đơn × 125.000">Tiền Xe Thuê</th>' + cnH2;
    const extD = (x) => tho ? ''
      : '<td class="sep">' + Z(x.xt) + '</td><td>' + Z(x.nb) + '</td><td>' + Z(x.th) + '</td><td>' + TB(x) + '</td><td>' + DG(x) + '</td>' +
        '<td class="sep">' + Z(x.thDH) + '</td><td class="tien2">' + VND(x.tien) + '</td>' + cnD(x);
    const Z = (v) => (v ? fmt(v) : '<span class="zz">-</span>');
    const trioM = (o) => '<td class="sep mon">' + Z(o.tong) + '</td><td class="mon">' + Z(o.ml) + '</td><td class="mon">' + Z(o.dhk) + '</td>';
    const trio = (o) => '<td class="sep">' + Z(o.tong) + '</td><td>' + Z(o.ml) + '</td><td>' + Z(o.dhk) + '</td>';
    let h = '<table><thead><tr><th rowspan="2">Kho</th>' + (tho ? '<th rowspan="2">Họ Và Tên</th><th rowspan="2">Vị Trí</th>' : '') +
      '<th colspan="6" class="main sep">' + esc(mainLabel) + '</th>' + extH1 + '<th colspan="3" class="mon sep">Tổng Tháng ' + Number(D.T.slice(5, 7)) + '</th>' +
      D.prev.map((d) => '<th colspan="3" class="day sep">Ngày ' + vn(d) + '</th>').join('') + '</tr>' +
      '<tr><th class="main sep">Tổng ĐH</th><th class="main">ML</th><th class="main">ĐHK</th><th class="main">Hoàn Tất</th><th class="main">Chưa HT</th><th class="main wm">Cảnh Báo Trễ Hẹn</th>' + extH2 +
      '<th class="sep mon">Tổng ĐH</th><th class="mon">ML</th><th class="mon">ĐHK</th>' + [1, 2, 3].map(() => '<th class="sep">Tổng ĐH</th><th>ML</th><th>ĐHK</th>').join('') + '</tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="' + cols + '" class="empty">Không có dữ liệu phù hợp.</td></tr>';
    list.forEach((x) => {
      h += '<tr class="click" data-k="' + esc(x.key) + '"><td class="l kho">' + esc(x.kho) + '</td>' + (tho ? '<td class="l">' + esc(x.tho) + '</td><td>' + esc(x.vt) + '</td>' : '') +
        '<td class="sep"><b>' + Z(x.m.tong) + '</b></td><td>' + Z(x.m.ml) + '</td><td>' + Z(x.m.dhk) + '</td><td>' + Z(x.c.h) + '</td><td>' + Z(x.chua) + '</td>' +
        '<td>' + WCELL(x) + '</td>' + extD(x) + trioM(x.mon) + x.pv.map(trio).join('') + '</tr>';
      if (state.open48.has(x.key) && x.l48.length) {
        const l = x.l48.slice().sort((a, b) => b.hh - a.hh);
        h += '<tr class="det"><td colspan="' + cols + '"><div class="stk"><b style="color:#dc2626">ĐH công nợ quá ' + CN_GIO + 'h – ' + esc(x.tho || x.kho) + '</b><table><thead><tr><th>Mã SO</th>' + (tho ? '' : '<th>Thợ</th>') + '<th>Ngày hẹn</th><th>Giờ xuất hàng</th><th>Quá (giờ)</th><th>Số tiền</th><th>Trạng thái TMS</th></tr></thead><tbody>' +
          l.map((s) => '<tr><td>' + esc(s.so) + '</td>' + (tho ? '' : '<td class="l">' + esc(s.tho || '(Chưa gán thợ)') + '</td>') + '<td>' + vn(s.day) + '</td><td>' + dtv(s.xg) + '</td><td><b style="color:#dc2626">' + s.hh + 'h</b></td><td class="tien">' + fmt(Math.round(s.no)) + '</td><td class="l">' + esc(s.st) + '</td></tr>').join('') +
          '</tbody></table></div></td></tr>';
      }
      if (tho && state.openCN && state.openCN.has(x.key) && x.lcn.length) {
        const l = x.lcn.slice().sort((a, b) => b.hh - a.hh);
        h += '<tr class="det"><td colspan="' + cols + '"><div class="stk"><b style="color:#0f172a">ĐH còn công nợ – ' + esc(x.tho || x.kho) + ' (xanh &lt; 24h · vàng 24h–dưới 40h · đỏ từ 40h)</b><table><thead><tr><th>Mã SO</th><th>Ngày hẹn</th><th>Giờ xuất hàng</th><th>Số giờ</th><th>Số tiền</th><th>Trạng thái TMS</th></tr></thead><tbody>' +
          l.map((s) => { const hh = s.hh; return '<tr><td>' + esc(s.so) + '</td><td>' + vn(s.day) + '</td><td>' + dtv(s.xg) + '</td><td><b style="color:' + CN_COL(hh) + '">' + hh + 'h</b></td><td class="tien">' + fmt(Math.round(s.no)) + '</td><td class="l">' + esc(s.st) + '</td></tr>'; }).join('') +
          '</tbody></table></div></td></tr>';
      }
      if (tho && state.open24.has(x.key) && x.l24.length) {
        const l = x.l24.slice().sort((a, b) => b.hh - a.hh);
        h += '<tr class="det"><td colspan="' + cols + '"><div class="stk"><b style="color:#d97706">ĐH công nợ gần 48h (từ ' + CN_GAN + 'h đến dưới ' + CN_GIO + 'h) – ' + esc(x.tho || x.kho) + '</b><table><thead><tr><th>Mã SO</th><th>Ngày hẹn</th><th>Giờ xuất hàng</th><th>Đã (giờ)</th><th>Còn (giờ) tới 48h</th><th>Số tiền</th><th>Trạng thái TMS</th></tr></thead><tbody>' +
          l.map((s) => { const hh = s.hh; return '<tr><td>' + esc(s.so) + '</td><td>' + vn(s.day) + '</td><td>' + dtv(s.xg) + '</td><td><b style="color:#d97706">' + hh + 'h</b></td><td>' + Math.max(0, CN_GIO - hh) + 'h</td><td class="tien">' + fmt(Math.round(s.no)) + '</td><td class="l">' + esc(s.st) + '</td></tr>'; }).join('') +
          '</tbody></table></div></td></tr>';
      }
      if (state.open.has(x.key)) {
        const ls = x.list.slice().sort((a, b) => 'roagd'.indexOf(a.ss) - 'roagd'.indexOf(b.ss) || a.exp.localeCompare(b.exp));
        h += '<tr class="det"><td colspan="' + cols + '">' + (ls.length ? '<table><thead><tr><th>Mã SO</th><th>Số VĐ</th><th>Loại</th>' + (tho ? '' : '<th>Thợ</th>') + '<th>Ngày hẹn</th><th>Giờ hẹn</th><th>Giờ đến nhà</th><th>Trạng thái TMS</th><th>Cảnh báo</th></tr></thead><tbody>' +
          ls.map((s) => '<tr><td>' + esc(s.so) + '</td><td>' + s.vd + '</td><td>' + (s.ml ? 'ML' : 'ĐHK') + '</td>' + (tho ? '' : '<td class="l">' + esc(s.tho || '(Chưa gán thợ)') + '</td>') + '<td>' + vn(s.day) + '</td><td>' + hm(s.exp) + '</td><td>' + (hm(s.den) || (s.arr ? 'Đã tới' : '—')) + '</td><td class="l">' + esc(s.st) + '</td><td><span class="bdg b-' + s.ss + '">' + SL[s.ss] + '</span></td></tr>').join('') +
          '</tbody></table>' : '<i>Không có SO chưa hoàn tất.</i>') + '</td></tr>';
      }
    });
    h += '<tr class="tot"><td colspan="' + lead + '">Tổng cộng</td><td class="sep">' + Z(S.m.tong) + '</td><td>' + Z(S.m.ml) + '</td><td>' + Z(S.m.dhk) + '</td><td>' + Z(S.c.h) + '</td><td>' + Z(S.chua) + '</td>' +
      '<td><span style="color:#dc2626">' + (S.c.r ? S.c.r + ' trễ' : '') + '</span>' + (S.c.r && S.c.o ? ' · ' : '') + '<span style="color:#d97706">' + (S.c.o ? S.c.o + ' sắp trễ' : '') + '</span></td>' + extD(S) +
      trioM(S.mon) + S.pv.map(trio).join('') + '</tr>';
    out.innerHTML = h + '</tbody></table>';
  }
  // ---- Tab ĐH Xe tải: biển số → bấm ra từng ngày → bấm ngày ra danh sách SO (theo ngày xe chạy thật) ----
  const LX = (x) => (!x.bs ? 'Chưa có biển số' : x.nb ? 'Xe Nội Bộ' : 'Xe Thuê');
  const blankC = () => ({ tong: 0, ml: 0, dhk: 0, c: { h: 0, d: 0, g: 0, o: 0, r: 0 }, list: [] });
  const addC = (o, s) => { o.tong++; s.ml ? o.ml++ : o.dhk++; o.c[s.ss]++; o.list.push(s); };
  const finC = (o) => { o.chua = o.c.d + o.c.g + o.c.o + o.c.r; o.warn = o.c.r ? 'r' : o.c.o ? 'o' : o.tong ? 'g' : 'n'; return o; };
  function buildXT() {
    const D = state.data; if (!D) return null;
    const sos = D.sos.filter((s) => s.xt && s.rd >= D.F && s.rd <= D.T && (!state.cn || s.kho === state.cn));
    const m = new Map();
    sos.forEach((s) => {
      s.ss = soStatus(s);
      const id = s.bs || '__none__' + s.kho;
      let r = m.get(id);
      if (!r) { r = Object.assign({ key: 'x:' + id, bs: s.bs || '', nb: s.bs ? NB_SET.has(s.bs) : false, khos: new Set(), days: new Map() }, blankC()); m.set(id, r); }
      r.khos.add(s.kho); addC(r, s);
      let d = r.days.get(s.rd); if (!d) { d = Object.assign({ day: s.rd }, blankC()); r.days.set(s.rd, d); } addC(d, s);
    });
    let list = [...m.values()];
    list.forEach((r) => {
      finC(r); r.days.forEach(finC);
      r.kho = [...r.khos].filter(Boolean).sort((a, b) => ordOf(a) - ordOf(b)).join(', ');
      r.ngay = r.bs ? r.days.size : 0; r.tb = r.ngay ? r.tong / r.ngay : null;
      r.dg = r.tb == null ? '' : r.tb >= TB_HQ ? 'Hiệu Quả' : 'Chưa Hiệu Quả';
    });
    if (state.warn) list = list.filter((x) => x.warn === state.warn);
    const q = bsNorm(state.q); if (q) list = list.filter((x) => x.bs.includes(q));
    const grp = (x) => (!x.bs ? 2 : x.nb ? 0 : 1);
    list.sort((a, b) => (a.bs ? 0 : 1) - (b.bs ? 0 : 1) || ordOf(a.kho.split(', ')[0]) - ordOf(b.kho.split(', ')[0]) || grp(a) - grp(b) || b.tong - a.tong);
    const S = blankC(); S.ngay = 0; S.nbX = 0; S.thX = 0; S.dhBs = 0;
    list.forEach((x) => {
      ['tong', 'ml', 'dhk', 'ngay'].forEach((k) => (S[k] += x[k])); Object.keys(S.c).forEach((k) => (S.c[k] += x.c[k]));
      if (x.bs) { S.dhBs += x.tong; x.nb ? (S.nbX += x.ngay) : (S.thX += x.ngay); }
    });
    finC(S); S.tb = S.ngay ? S.dhBs / S.ngay : null; S.dg = S.tb == null ? '' : S.tb >= TB_HQ ? 'Hiệu Quả' : 'Chưa Hiệu Quả';
    return { D, list, S };
  }
  function renderXT(out) {
    const B = buildXT(); if (!B) return;
    const { D, list, S } = B;
    const Z = (v) => (v ? fmt(v) : '<span class="zz">-</span>');
    const TB = (o) => (o.tb == null ? '<span class="zz">-</span>' : o.tb.toLocaleString('vi-VN', { maximumFractionDigits: 1 }));
    // Đánh giá: đạt thì chỉ ghi Hiệu Quả; chưa đạt thì ghi thêm số ĐH còn thiếu
    const DG = (o, thieu) => (o.dg ? '<span class="w ' + (o.tb >= TB_HQ ? 'dg-ok' : 'dg-no') + '" style="white-space:nowrap">' + o.dg + (o.tb < TB_HQ && thieu > 0 ? ' (+' + fmt(Math.ceil(thieu)) + ' ĐH)' : '') + '</span>' : '<span class="zz">-</span>');
    const WC = (x) => {
      if (!(x.c.r || x.c.o)) return '<span class="w w-' + x.warn + '">' + WL[x.warn] + '</span>';
      return (x.c.r ? '<span class="w w-r"' + (x.c.o ? ' style="margin-bottom:0"' : '') + '>' + x.c.r + ' ĐH Trễ Hẹn</span>' : '') +
        (x.c.o ? '<span class="w w-o"' + (x.c.r ? ' style="margin-top:0"' : '') + '>' + x.c.o + ' ĐH Sắp Trễ</span>' : '');
    };
    const mainLabel = D.F === D.T ? 'Ngày ' + vn(D.T) : 'Từ ' + vn(D.F) + ' đến ' + vn(D.T);
    root.querySelector('#cards').innerHTML = '<div class="cards">' +
      '<div class="card c1"><div>Tổng ĐH Xe Tải</div><div class="n">' + fmt(S.tong) + '</div></div>' +
      '<div class="card c2"><div>ĐH Hoàn tất</div><div class="n">' + fmt(S.c.h) + '</div></div>' +
      '<div class="card c5"><div>ĐH Chưa hoàn tất</div><div class="n">' + fmt(S.chua) + '</div></div>' +
      '<div class="card c3"><div>ĐH sắp trễ</div><div class="n">' + fmt(S.c.o) + '</div></div>' +
      '<div class="card c4"><div>ĐH trễ hẹn</div><div class="n">' + fmt(S.c.r) + '</div></div></div>';
    root.querySelector('#note').textContent = mainLabel + ': mỗi dòng là 1 biển số xe (lấy từ ô Biển Số Xe Logistic), tính theo ngày xe chạy thật (ngày đến nhà khách); đơn chưa chạy tính theo ngày hẹn. Bấm vào biển số để xem từng ngày, bấm vào ngày để xem danh sách SO. Đánh giá: TB ĐH / ngày từ ' + TB_HQ + ' đơn trở lên = Hiệu Quả, dưới ' + TB_HQ + ' = Chưa Hiệu Quả (kèm số ĐH còn thiếu để đạt ' + TB_HQ + ' ĐH/ngày). Xe chưa có biển số xếp cuối bảng.';
    const cols = 10;
    let h = '<table style="table-layout:fixed;width:100%"><colgroup><col style="width:13%"><col style="width:9%"><col style="width:10%"><col style="width:10%"><col style="width:7%"><col style="width:8%"><col style="width:8%"><col style="width:17%"><col style="width:9%"><col style="width:9%"></colgroup><th style="white-space:normal;line-height:1.25"ead><tr><th style="white-space:normal;line-height:1.25">Biển Số</th><th style="white-space:normal;line-height:1.25">Kho</th><th style="white-space:normal;line-height:1.25" class="wm">Loại Xe</th><th style="white-space:normal;line-height:1.25" class="main sep">Tổng ĐH Xe Tải</th><th style="white-space:normal;line-height:1.25" class="main">ĐHK</th><th style="white-space:normal;line-height:1.25" class="main">Hoàn Tất</th><th style="white-space:normal;line-height:1.25" class="main">Chưa HT</th><th style="white-space:normal;line-height:1.25" class="main wm" title="TB ĐH / ngày từ ' + TB_HQ + ' trở lên = Hiệu Quả">Đánh Giá</th><th style="white-space:normal;line-height:1.25" class="xt sep">Số Ngày Chạy</th><th style="white-space:normal;line-height:1.25" class="xt">TB ĐH / Ngày</th></tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="' + cols + '" class="empty">Không có đơn xe tải trong khoảng này.</td></tr>';
    list.forEach((x) => {
      const op = state.open.has(x.key);
      h += '<tr class="click" data-k="' + esc(x.key) + '"><td class="l kho">' + (op ? '▾ ' : '▸ ') + (x.bs ? esc(x.bs) : '<i>(chưa có BS)</i>') + '</td><td class="l">' + esc(x.kho) + '</td><td>' + LX(x) + '</td>' +
        '<td class="sep"><b>' + Z(x.tong) + '</b></td><td>' + Z(x.dhk) + '</td><td>' + Z(x.c.h) + '</td><td>' + Z(x.chua) + '</td><td>' + DG(x, TB_HQ * x.ngay - x.tong) + '</td>' +
        '<td class="sep">' + Z(x.ngay) + '</td><td>' + TB(x) + '</td></tr>';
      if (!op) return;
      [...x.days.values()].sort((a, b) => a.day.localeCompare(b.day)).forEach((d) => {
        const kd = x.key + '|' + d.day, opd = state.openDay.has(kd);
        h += '<tr class="dayrow" data-kd="' + esc(kd) + '"><td class="l" style="padding-left:22px">' + (opd ? '▾ ' : '▸ ') + 'Ngày ' + vn(d.day) + '</td><td class="l">' + esc(x.kho) + '</td><td>' + LX(x) + '</td>' +
          '<td class="sep"><b>' + Z(d.tong) + '</b></td><td>' + Z(d.dhk) + '</td><td>' + Z(d.c.h) + '</td><td>' + Z(d.chua) + '</td><td>' + (x.bs ? DG({ tb: d.tong, dg: d.tong >= TB_HQ ? 'Hiệu Quả' : 'Chưa Hiệu Quả' }, TB_HQ - d.tong) : '<span class="zz">-</span>') + '</td><td class="sep"></td><td></td></tr>';
        if (!opd) return;
        const ls = d.list.slice().sort((a, b) => 'roagdh'.indexOf(a.ss) - 'roagdh'.indexOf(b.ss) || a.exp.localeCompare(b.exp));
        h += '<tr class="det"><td colspan="' + cols + '"><div class="stk"><b>Danh sách SO – ' + (x.bs ? esc(x.bs) : '(chưa có biển số)') + ' – ngày ' + vn(d.day) + '</b><table><thead><tr><th>Mã SO</th><th>Số VĐ</th><th>Loại</th><th>Thợ</th><th>Ngày hẹn</th><th>Giờ hẹn</th><th>Giờ đến nhà</th><th>Trạng thái TMS</th><th>Cảnh báo</th></tr></thead><tbody>' +
          ls.map((s) => '<tr><td>' + esc(s.so) + '</td><td>' + s.vd + '</td><td>' + (s.ml ? 'ML' : 'ĐHK') + '</td><td class="l">' + esc(s.tho || '(Chưa gán thợ)') + '</td><td>' + vn(s.day) + '</td><td>' + hm(s.exp) + '</td><td>' + (hm(s.den) || (s.arr ? 'Đã tới' : '—')) + '</td><td class="l">' + esc(s.st) + '</td><td><span class="bdg b-' + s.ss + '">' + SL[s.ss] + '</span></td></tr>').join('') +
          '</tbody></table></div></td></tr>';
      });
    });
    h += '<tr class="tot"><td colspan="3">Tổng cộng (' + fmt(list.filter((x) => x.bs).length) + ' xe)</td><td class="sep">' + Z(S.tong) + '</td><td>' + Z(S.dhk) + '</td><td>' + Z(S.c.h) + '</td><td>' + Z(S.chua) + '</td>' +
      '<td>' + DG(S, TB_HQ * S.ngay - S.dhBs) + '</td>' +
      '<td class="sep">' + Z(S.ngay) + '</td><td>' + TB(S) + '</td></tr>';
    out.innerHTML = h + '</tbody></table>';
  }
  function csvXT() {
    const B = buildXT(); if (!B) return;
    const { D, list } = B;
    const r = [['Biển Số', 'Kho', 'Loại Xe', 'Ngày Chạy', 'Tổng ĐH Xe Tải', 'ĐHK', 'Hoàn Tất', 'Chưa HT', 'Đánh Giá']];
    list.forEach((x) => {
      r.push([x.bs || '(chưa có)', x.kho, LX(x), 'Tổng ' + x.ngay + ' ngày', x.tong, x.dhk, x.c.h, x.chua, x.dg + (x.tb != null && x.tb < TB_HQ ? ' (+' + Math.ceil(TB_HQ * x.ngay - x.tong) + ' ĐH)' : '')]);
      [...x.days.values()].sort((a, b) => a.day.localeCompare(b.day)).forEach((d) => r.push([x.bs || '(chưa có)', x.kho, LX(x), vn(d.day), d.tong, d.dhk, d.c.h, d.chua, x.bs ? (d.tong >= TB_HQ ? 'Hiệu Quả' : 'Chưa Hiệu Quả (+' + (TB_HQ - d.tong) + ' ĐH)') : '']));
    });
    const text = '﻿' + r.map((a) => a.map((c) => { const s = String(c == null ? '' : c); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'thongke_xetai_' + D.F + '_' + D.T + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  // ---- Tab Theo dõi ST: số đơn hàng, nhập trả, tỉ lệ nhập theo siêu thị yêu cầu (theo ngày hẹn giao) ----
  const ST_LIST = {"Thanh Hóa": [["00006", "Online"], ["00001", ""], ["02552", "ĐMM_THO_NXU - Yên Cát"], ["06595", "ĐMM_THO_NCO - Nông Cống"], ["01925", "ĐMM_THO_NTH - Bến Sung"], ["09002", "ĐMS_THO_NCO - Minh Khôi"], ["08232", "ĐMS_THO_NCO - Trung Chính"], ["01303", "ĐMM_THO_THO - 184 Lê Lai"], ["00971", "ĐML_THO_THO - 664 Bà Triệu"], ["02297", "ĐML_THO_THO - Đại Lộ Lê Lợi"], ["08309", "ĐMSU_THO_QXU - Tiên Trang"], ["08062", "ĐMS_THO_QXU - Quảng Bình"], ["11109", "ĐMS_THO_THO - Quảng Tâm"], ["00266", "ĐMM_THO_SSO - 91 Lê Lợi"], ["12800", "ĐMS_THO_QXU - Quảng Lưu"], ["04679", "ĐMM_THO_QXU - Quảng Xương"], ["00373", "ĐMM_THO_THO - 353 Quang Trung"], ["08176", "ĐMS_THO_DSO - Rừng Thông"], ["10845", "ĐMM_THO_HHO - Hoằng Ngọc"], ["09705", "ĐMM_THO_HHO - Bút Sơn"], ["07913", "ĐMS_THO_HHO - Hoằng Lộc"], ["08175", "ĐMS_THO_HHO - Hoằng Kim"], ["02197", "ĐMM_THO_TSO - 234 Phố Giắt"], ["09069", "ĐMS_THO_TSO - Thọ Dân"], ["01800", "ĐMS_THO_TSO - 60 Phố Thiều"], ["07914", "ĐMS_THO_TSO - Hợp Thành"], ["08028", "ĐMS_THO_TSO - Thị Trấn Nưa"]], "Thọ Xuân": [["00006", "Online"], ["00001", ""], ["01146", "ĐMM_THO_BTH - Cành Nàng"], ["04804", "ĐMM_THO_CTH - Cẩm Sơn"], ["09187", "ĐMS_THO_CTH - Cẩm Thạch"], ["10014", "ĐMS_THO_LCH - Lang Chánh"], ["00252", "ĐMM_THO_NLA - 17B Lê Thánh Tông"], ["12801", "ĐMS3_THO_NLA - Kiên Thọ"], ["02075", "ĐMS_THO_QHO - Quan Hóa"], ["10016", "ĐMS_THO_TTH - Thạch Quảng"], ["00459", "ĐMM_THO_TXU - Lam Sơn"], ["09339", "ĐMS_THO_TXU - Sao Vàng"], ["09732", "ĐMS_THO_TXU - Xuân Thiên"], ["05244", "ĐMM_THO_TXU - Thọ Xuân"], ["11709", "ĐMS3_THO_TXU - Xuân Lai"], ["09880", "ĐMS_THO_TXU - Thường Xuân"], ["02299", "ĐMS_THO_THX - Luận Thành"], ["02156", "TGD_THO_NLA - 02 Phố Lê Duẩn"], ["01667", "TGD_THO_THX - Thường Xuân"]]};
  const pctS = (a, b) => (b ? (a / b * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%' : '-');
  function buildST() {
    const D = state.data; if (!D || !D.rows) return null;
    // gộp vận đơn theo SO trong khoảng ngày chọn
    const so = new Map();
    D.rows.forEach((r) => {
      const day = String(r.exp || '').slice(0, 10); if (day < D.F || day > D.T) return;
      let s = so.get(r.so); if (!s) { s = { so: r.so, kho: r.kho, stid: r.stid, stn: r.stn, ret: false, cancel: true, km: false, vds: [], sp: '', ntd: '', exp: String(r.exp || '') }; so.set(r.so, s); }
      s.vds.push(r.id); if (r.ml) s.ml = true; if (r.spn && r.spn.length > s.sp.length) s.sp = r.spn; if (r.huy && r.ntd > s.ntd) s.ntd = r.ntd;
      if (!r.huy) s.cancel = false; if (r.km) s.km = true;
      if (!s.stid && r.stid) { s.stid = r.stid; s.stn = r.stn; } if (!s.kho && r.kho) s.kho = r.kho;
    });
    const groups = KHO_ORDER.filter((k) => !state.cn || k === state.cn).map((k) => {
      const rows = new Map();
      (ST_LIST[k] || []).forEach(([ma, ten]) => {
        const id = String(Number(ma));
        if (id === '1' || id === '6') { let o = rows.get('6') || rows.get('1'); if (!o) o = { ma: '00006, 00001', ten: 'Online', dh: 0, nt: 0, list: [] }; rows.set(id, o); return; }
        rows.set(id, { ma, ten, dh: 0, nt: 0, list: [] });
      });
      return { kho: k, rows, other: { ma: '', ten: 'ST Khác (ngoài danh sách)', dh: 0, nt: 0, list: [], names: new Set() } };
    });
    so.forEach((s) => {
      if (s.km) return;
      const g = groups.find((x) => x.kho === s.kho); if (!g) return;
      const r = g.rows.get(s.stid) || g.other;
      if (r === g.other && s.stn) g.other.names.add(s.stn);
      r.dh++; if (s.cancel) r.nt++; if (s.ml) r.ml = (r.ml || 0) + 1; else r.spk = (r.spk || 0) + 1;
      r.list.push(s);
      const d = String(s.exp || '').slice(0, 10);
      [r, g].forEach((o) => { if (!o.days) o.days = new Map(); const x = o.days.get(d) || { dh: 0, nt: 0, ml: 0, spk: 0 }; x.dh++; if (s.cancel) x.nt++; if (s.ml) x.ml++; else x.spk++; o.days.set(d, x); });
    });
    const T = { dh: 0, nt: 0 };
    groups.forEach((g) => {
      g.list = [...new Set(g.rows.values())];
      g.list.sort((a, b) => b.dh - a.dh || b.nt - a.nt); // ST nhiều đơn lên trên
      g.top = new Set(g.list.filter((x) => x.dh > 0).slice(0, 3)); // top 3 ST nhiều đơn nhất
      g.dh = 0; g.nt = 0; g.ml = 0; g.spk = 0; [...g.list, g.other].forEach((r) => { g.dh += r.dh; g.nt += r.nt; g.ml += r.ml || 0; g.spk += r.spk || 0; }); T.dh += g.dh; T.nt += g.nt;
    });
    return { D, groups, T };
  }
  function renderST(out) {
    const B = buildST(); if (!B) return;
    const { D, groups, T } = B;
    const Z = (v) => (v ? fmt(v) : '<span class="zz">-</span>');
    const mainLabel = D.F === D.T ? 'Ngày ' + vn(D.T) : 'Từ ' + vn(D.F) + ' đến ' + vn(D.T);
    root.querySelector('#cards').innerHTML = '<div class="cards" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="card c1"><div>Tổng Đơn Hàng</div><div class="n">' + fmt(T.dh) + '</div></div>' +
      '<div class="card c4"><div>Nhập Trả</div><div class="n">' + fmt(T.nt) + '</div></div>' +
      '<div class="card c3"><div>Tỉ Lệ Nhập</div><div class="n">' + pctS(T.nt, T.dh) + '</div></div></div>';
    root.querySelector('#note').textContent = mainLabel + ' (theo ngày hẹn giao): đếm theo SO (bỏ trùng), theo siêu thị yêu cầu (Kho yêu cầu) và kho điều phối. Đơn hàng = tổng SO (kể cả đơn hủy); Nhập trả = SO có trạng thái đã hủy; TL nhập = Nhập trả / Đơn hàng. Không tính đơn khuyến mãi. Mỗi kho xếp ST nhiều đơn lên trên, tô xanh top 3 ST nhiều đơn nhất. ML = đơn có máy lạnh/điều hòa, SPK = đơn sản phẩm khác, TL = Tổng của ST / Tổng của kho. Mã 00006 và 00001 gộp chung là Online. Bấm vào 1 siêu thị để xem danh sách SO.';
    const cols = 9;
    const MX = (o) => { let n = 0, d = ''; (o.days || new Map()).forEach((x, k) => { if (x.dh > n || (x.dh === n && k > d)) { n = x.dh; d = k; } }); return n ? '<b>' + fmt(n) + '</b> <span style="color:#6b7280">(' + Number(d.slice(8, 10)) + '/' + Number(d.slice(5, 7)) + ')</span>' : '<span class="zz">-</span>'; };
    let h = '<div style="margin:0 0 8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="csvsum" style="background:#dbeafe;border-color:#93c5fd;color:#1e3a8a">⬇ Xuất CSV tổng khoảng ngày chọn</button><button class="btn" id="csvnt" style="background:#fee2e2;border-color:#fca5a5;color:#991b1b">⬇ Xuất CSV chi tiết nhập trả (' + fmt(T.nt) + ' đơn)</button></div>';
    h += '<table><thead><tr><th>Mã ST</th><th>Tên Siêu Thị</th><th class="main sep" style="width:90px;min-width:90px;max-width:90px" title="Máy lạnh / điều hòa">ML</th><th class="main" style="width:90px;min-width:90px;max-width:90px" title="Sản phẩm khác">SPK</th><th class="main" style="width:90px;min-width:90px;max-width:90px">Tổng</th><th class="main" style="width:90px;min-width:90px;max-width:90px" title="Tỉ lệ đơn của ST trên tổng đơn của kho">TL</th><th class="main" title="Ngày có nhiều đơn nhất trong khoảng chọn">Ngày Max</th><th class="cno">Nhập Trả</th><th class="xt">TL Nhập</th></tr></thead><tbody>';
    groups.forEach((g) => {
      h += '<tr><td colspan="2" class="l kho" style="background:#dbeafe;color:#173a8a">Kho ' + esc(g.kho) + '</td><td class="sep" style="background:#dbeafe"><b>' + Z(g.ml) + '</b></td><td style="background:#dbeafe"><b>' + Z(g.spk) + '</b></td><td style="background:#dbeafe"><b>' + Z(g.dh) + '</b></td><td style="background:#dbeafe"><b>' + (g.dh ? '100%' : '-') + '</b></td><td style="background:#dbeafe">' + MX(g) + '</td><td style="background:#dbeafe"><b>' + Z(g.nt) + '</b></td><td style="background:#dbeafe"><b>' + pctS(g.nt, g.dh) + '</b></td></tr>';
      const list = [...g.list, g.other];
      list.forEach((r) => {
        const key = 's:' + g.kho + ':' + (r.ma || 'other');
        const tp = g.top && g.top.has(r) ? ' style="background:#bbf7d0"' : '';
        h += '<tr class="click" data-k="' + esc(key) + '"><td' + tp + '>' + esc(r.ma) + '</td><td class="l"' + tp + '>' + esc(r.ten || '') + '</td><td class="sep"' + tp + '>' + Z(r.ml || 0) + '</td><td' + tp + '>' + Z(r.spk || 0) + '</td><td' + tp + '><b>' + Z(r.dh) + '</b></td><td' + tp + '>' + (r.dh ? pctS(r.dh, g.dh) : '<span class="zz">-</span>') + '</td><td' + tp + '>' + MX(r) + '</td><td>' + Z(r.nt) + '</td><td' + (r.nt ? ' style="color:#dc2626;font-weight:700"' : '') + '>' + pctS(r.nt, r.dh) + '</td></tr>';
        if (state.open.has(key) && r.list.length) {
          h += '<tr class="det"><td colspan="' + cols + '"><div class="stk"><b>' + esc((r.ma ? r.ma + ' - ' : '') + (r.ten || '')) + ' – ' + esc(g.kho) + '</b>' + (r === g.other && g.other.names.size ? '<div style="color:#6b7280;margin:2px 0">' + esc([...g.other.names].join(' · ')) + '</div>' : '') +
            '<table><thead><tr><th>Mã SO</th><th>Loại</th>' + (r === g.other ? '<th>Kho yêu cầu</th>' : '') + '</tr></thead><tbody>' +
            r.list.slice().sort((a, b) => Number(b.cancel) - Number(a.cancel)).map((s) => '<tr><td>' + esc(s.so) + '</td><td>' + (s.cancel ? '<span class="bdg b-r">Nhập trả (đã hủy)</span>' : 'Đơn hàng') + '</td>' + (r === g.other ? '<td class="l">' + esc(s.stn || s.stid || '(không rõ)') + '</td>' : '') + '</tr>').join('') +
            '</tbody></table></div></td></tr>';
        }
      });
    });
    out.innerHTML = h + '</tbody></table>';
    const bt = out.querySelector('#csvnt'); if (bt) bt.onclick = (e) => { e.stopPropagation(); csvNT(); };
    const bd = out.querySelector('#csvsum'); if (bd) bd.onclick = (e) => { e.stopPropagation(); csvST(); };
  }
  const mxOf = (o) => { let n = 0, d = ''; (o.days || new Map()).forEach((x, k) => { if (x.dh > n || (x.dh === n && k > d)) { n = x.dh; d = k; } }); return { n, d }; };
  // CSV theo từng ngày: mỗi dòng = 1 siêu thị × 1 ngày
  function csvDAY() {
    const B = buildST(); if (!B) return;
    const { D, groups } = B;
    const r = [['Ngày', 'Kho', 'Mã ST', 'Tên Siêu Thị', 'ML', 'SPK', 'Tổng', 'TL', 'Nhập Trả', 'TL Nhập']];
    const lines = [];
    groups.forEach((g) => { [...g.list, g.other].forEach((x) => { (x.days || new Map()).forEach((v, d) => { const gd = (g.days && g.days.get(d)) || { dh: 0 }; lines.push([d, g.kho, x.ma ? "'" + x.ma : '', x.ten, v.ml || 0, v.spk || 0, v.dh, pctS(v.dh, gd.dh), v.nt, pctS(v.nt, v.dh)]); }); }); });
    lines.sort((a, b) => a[0].localeCompare(b[0]) || ordOf(a[1]) - ordOf(b[1]) || b[6] - a[6]);
    lines.forEach((l) => { l[0] = vn(l[0]); r.push(l); });
    const text = '\uFEFF' + r.map((a) => a.map((c) => { const v = String(c == null ? '' : c); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'theodoi_st_theongay_' + (state.cn || 'ThanhHoa_ThoXuan') + '_' + D.F + '_' + D.T + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  function csvNT() {
    const B = buildST(); if (!B) return;
    const { D, groups } = B;
    const dt = (v) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; };
    const r = [['Kho', 'Mã ST', 'Tên Siêu Thị', 'Mã đơn hàng', 'Mã vận đơn', 'Tên sản phẩm', 'Ngày hẹn giao', 'Ngày nhập trả']];
    groups.forEach((g) => { [...g.list, g.other].forEach((x) => { x.list.filter((s) => s.cancel).forEach((s) => {
      r.push([g.kho, x.ma ? "'" + x.ma : (s.stid || ''), x === g.other ? (s.stn || x.ten) : x.ten, s.so, "'" + s.vds.join(', '), s.sp, dt(s.exp), dt(s.ntd) || dt(s.exp)]);
    }); }); });
    const text = '\uFEFF' + r.map((a) => a.map((c) => { const v = String(c == null ? '' : c); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'nhaptra_chitiet_' + (state.cn || 'ThanhHoa_ThoXuan') + '_' + D.F + '_' + D.T + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  function csvST() {
    const B = buildST(); if (!B) return;
    const { D, groups } = B;
    const r = [['Kho', 'Mã ST', 'Tên Siêu Thị', 'ML', 'SPK', 'Tổng', 'TL', 'Ngày Max (số đơn)', 'Ngày Max', 'Nhập Trả', 'TL Nhập']];
    groups.forEach((g) => { [...g.list, g.other].forEach((x) => { const m = mxOf(x); r.push([g.kho, x.ma ? "'" + x.ma : '', x.ten, x.ml || 0, x.spk || 0, x.dh, pctS(x.dh, g.dh), m.n || '', m.d ? vn(m.d) : '', x.nt, pctS(x.nt, x.dh)]); }); });
    const text = '﻿' + r.map((a) => a.map((c) => { const s = String(c == null ? '' : c); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'DH_theo_ST_' + (state.cn || 'ThanhHoa_ThoXuan') + '_' + D.F + '_den_' + D.T + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  // ---- Tab Sản Phẩm: số lượng sản phẩm (không tính khuyến mãi / quà tặng / phiếu mua hàng) theo ngày trong tháng ----
  // Chỉ tính vận đơn Đã giao + Hoàn tất + Kết thúc; bỏ đơn chuyển kho; ngày = ngày hẹn giao.
  const SP_COLS = ['Máy lạnh', 'Máy nước nóng', 'Máy giặt/sấy/rửa chén', 'Tủ lạnh/Tủ đông/tủ mát', 'Tivi', 'Loa karaoke/Dàn máy', 'Máy lọc nước', 'Gia dụng lắp đặt', 'Camera'];
  const spCat = (it) => {
    const t = norm((it.SubGroupName || '') + ' | ' + (it.ProductName || '')).toLowerCase();
    if (/khung treo|giá đỡ|giá treo/.test(t)) return -1; // không tính
    if (/lõi lọc/.test(t)) return -1; // không tính
    if (/máy lạnh|điều hòa|điều hoà/.test(t)) return 0;
    if (/nước nóng/.test(t)) return 1;
    if (/máy giặt|máy sấy|giặt sấy|rửa chén|rửa bát/.test(t)) return 2;
    if (/tủ lạnh|tủ đông|tủ mát/.test(t)) return 3;
    if (/tivi|ti vi|smart tv|google tv/.test(t)) return 4;
    if (/loa|karaoke|dàn máy|amply|micro/.test(t)) return 5;
    if (/lọc nước/.test(t)) return 6;
    if (/camera/.test(t)) return 8;
    return it.IsInstallItem ? 7 : -1;
  };
  // Sản phẩm thật: không phải SP ảo / khuyến mãi / quà tặng kèm (quà tặng có RelateProductID và không phải hàng lắp đặt)
  const spReal = (it) => !it.IsVirtualProduct && !it.IsPromotionProduct && !it.IsDeleted && (it.IsInstallItem || !it.RelateProductID) && !KM_RE.test(it.ProductName || '') && (Number(it.Quantity) || 0) - (Number(it.ReturnQuantity) || 0) > 0;
  const SP_KEY = 'tk_sp_cache3'; try { localStorage.removeItem('tk_sp_cache'); localStorage.removeItem('tk_sp_cache2'); } catch (e) {}
  let spCache = {}; try { spCache = JSON.parse(localStorage.getItem(SP_KEY) || '{}'); } catch (e) {}
  let spLoading = null;
  async function loadSP(ids, onProg) {
    const url = apiReq.url.replace(/ShipmentOrder\/SearchShipmentOrder/i, 'ShipmentOrder/LoadPrintData');
    const need = ids.filter((id) => !(id in spCache));
    let i = 0, done = 0, fail = 0;
    const worker = async () => {
      while (i < need.length) {
        const id = need[i++];
        try {
          const r = await _fetch.call(window, url, Object.assign({}, apiReq.init, { body: JSON.stringify(id) }));
          const j = await r.json();
          if (j && !j.IsError && j.ResultObject) {
            spCache[id] = ((j.ResultObject.ShipmentOrder_ItemList) || []).filter(spReal).map((it) => [String(it.ProductID || it.ProductName), spCat(it), (Number(it.Quantity) || 0) - (Number(it.ReturnQuantity) || 0), String(it.ProductName || '')]).filter((x) => x[1] >= 0);
          } else fail++;
        } catch (e) { fail++; }
        done++; if (onProg && done % 10 === 0) onProg(done, need.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(12, need.length) }, worker));
    // giữ bộ nhớ đệm gọn: tối đa ~8000 vận đơn
    const keys = Object.keys(spCache); if (keys.length > 8000) { const keep = new Set(ids); keys.forEach((k) => { if (!keep.has(k)) delete spCache[k]; }); }
    try { localStorage.setItem(SP_KEY, JSON.stringify(spCache)); } catch (e) { try { localStorage.removeItem(SP_KEY); } catch (e2) {} }
    return fail;
  }
  // Sản phẩm của đơn HỦY: TMS thường đánh dấu xóa / trả hết khi hủy, nên lấy SL gốc (Quantity), bỏ SP ảo / KM / quà tặng
  const spRealH = (it) => !it.IsVirtualProduct && !it.IsPromotionProduct && (it.IsInstallItem || !it.RelateProductID) && !KM_RE.test(it.ProductName || '') && (Number(it.Quantity) || 0) > 0;
  const SPH_KEY = 'tk_sph_cache1';
  let spCacheH = {}; try { spCacheH = JSON.parse(localStorage.getItem(SPH_KEY) || '{}'); } catch (e) {}
  async function loadSPH(ids, onProg) {
    const url = apiReq.url.replace(/ShipmentOrder\/SearchShipmentOrder/i, 'ShipmentOrder/LoadPrintData');
    const need = ids.filter((id) => !(id in spCacheH)); let i = 0, done = 0, fail = 0;
    const worker = async () => { while (i < need.length) { const id = need[i++]; try { const r = await _fetch.call(window, url, Object.assign({}, apiReq.init, { body: JSON.stringify(id) })); const j = await r.json(); if (j && !j.IsError && j.ResultObject) spCacheH[id] = ((j.ResultObject.ShipmentOrder_ItemList) || []).filter(spRealH).map((it) => [String(it.ProductID || it.ProductName), spCat(it), Number(it.Quantity) || 0]).filter((x) => x[1] >= 0); else fail++; } catch (e) { fail++; } done++; if (onProg && done % 10 === 0) onProg(done, need.length); } };
    await Promise.all(Array.from({ length: Math.min(12, need.length) }, worker));
    const keys = Object.keys(spCacheH); if (keys.length > 4000) { const keep = new Set(ids); keys.forEach((k) => { if (!keep.has(k)) delete spCacheH[k]; }); }
    try { localStorage.setItem(SPH_KEY, JSON.stringify(spCacheH)); } catch (e) {}
    return fail;
  }
  // Cùng tập đơn với tab "ĐH theo chi nhánh": SO theo ngày hẹn giao, không tính vận đơn hủy / nhập trả / đơn KM
  function spRows() {
    const D = state.data; if (!D || !D.rows) return null;
    const sos = new Map(D.sos.filter((s) => s.day >= D.F && s.day <= D.T && (!state.cn || s.kho === state.cn)).map((s) => [s.so, s]));
    return { D, sos, rows: D.rows.filter((r) => sos.has(r.so) && !r.cancel && !r.ret && !r.km) };
  }
  function buildSP() {
    const X = spRows(); if (!X) return null;
    const { D, sos, rows } = X;
    // gộp theo SO: mỗi sản phẩm lấy số lượng lớn nhất giữa các vận đơn của cùng SO (tránh đếm trùng vận đơn giao + lắp)
    const so = new Map([...sos.values()].map((x) => [x.so, { day: x.day, tho: x.tho || '', kho: x.kho, p: new Map() }]));
    rows.forEach((r) => {
      const items = spCache[r.id]; if (!items) return;
      const s = so.get(r.so); if (!s) return;
      items.forEach(([pid, cat, q, name]) => { const o = s.p.get(pid); if (!o || q > o.q) s.p.set(pid, { cat, q, name }); });
    });
    const days = range(D.F, D.T).map((day) => ({ day, don: 0, c: SP_COLS.map(() => 0) }));
    const idx = new Map(days.map((x, i) => [x.day, i]));
    const tot = { don: 0, c: SP_COLS.map(() => 0) };
    // theo thợ (chỉ thợ trong danh sách)
    const th = THO.filter(([k]) => !state.cn || k === state.cn).map(([k, nm, vt]) => ({ kho: k, user: nm.split('-')[0].trim(), name: nm.slice(nm.indexOf('-') + 1).trim(), vt, don: 0, c: SP_COLS.map(() => 0) }));
    const thIdx = new Map(th.map((x) => [x.kho + '|' + x.user, x]));
    so.forEach((s) => {
      const t = thIdx.get(s.kho + '|' + String(s.tho).split('-')[0].trim());
      if (t) { t.don++; s.p.forEach((o) => { t.c[o.cat] += o.q; }); }
    });
    so.forEach((s) => {
      const row = days[idx.get(s.day)]; if (!row) return;
      row.don++; tot.don++;
      s.p.forEach((o) => { row.c[o.cat] += o.q; tot.c[o.cat] += o.q; });
    });
    return { D, days, tot, th, missing: rows.filter((r) => !(r.id in spCache)).length };
  }
  function renderSP(out) {
    const X = spRows(); if (!X) return;
    const ids = [...new Set(X.rows.map((r) => r.id))];
    const miss = ids.filter((id) => !(id in spCache));
    if (miss.length && !spLoading) {
      spLoading = loadSP(ids, (d, n) => setMsg('Đang lấy chi tiết sản phẩm… ' + d + '/' + n + ' vận đơn (lần đầu hơi lâu, các lần sau nhanh)')).then((fail) => { spLoading = null; setMsg('✔ Đã lấy chi tiết sản phẩm' + (fail ? ' (' + fail + ' vận đơn lỗi, bấm Thống kê lại)' : '') + '.'); if (state.view === 'sp') render(); });
    }
    const B = buildSP(); if (!B) return;
    const { D, days, tot, th } = B;
    const Z = (v) => (v ? fmt(v) : '<span class="zz">-</span>');
    const thang = D.F === D.T ? 'ngày ' + vn(D.F) : 'từ ' + vn(D.F) + ' đến ' + vn(D.T);
    const kho = state.cn ? 'Kho ' + state.cn : 'Kho Thanh Hóa + Kho Thọ Xuân';
    root.querySelector('#cards').innerHTML = '<div class="cards" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="card c1"><div>Tổng đơn ' + thang + '</div><div class="n">' + fmt(tot.don) + '</div></div>' +
      '<div class="card c2"><div>Tổng số lượng sản phẩm</div><div class="n">' + fmt(tot.c.reduce((a, b) => a + b, 0)) + '</div></div>' +
      '<div class="card c5"><div>Phạm vi</div><div class="n" style="font-size:16px">' + esc(kho) + '</div></div></div>';
    root.querySelector('#note').textContent = 'Khoảng ' + thang + ' (theo ngày hẹn giao): TỔNG ĐƠN đếm giống tab \"ĐH theo chi nhánh\" (mọi trạng thái, không tính đơn hủy, nhập trả, khuyến mãi). Sản phẩm: không tính phần đã hủy/trả. Đếm theo SỐ LƯỢNG sản phẩm, không tính hàng khuyến mãi, quà tặng kèm, phiếu mua hàng, sản phẩm ảo. Ô "Kho" phía trên để xem Thanh Hóa / Thọ Xuân / cả 2 kho.' + (spLoading ? ' — Đang lấy chi tiết sản phẩm, bảng sẽ tự cập nhật.' : '');
    let h = '<table><thead><tr><th>Ngày</th><th class="main sep">TỔNG ĐƠN</th>' + SP_COLS.map((c) => '<th class="xt" style="white-space:normal;width:81px;min-width:81px;max-width:81px;overflow-wrap:anywhere;line-height:1.25">' + esc(c).replace(/\//g, '/&#8203;') + '</th>').join('') + '</tr></thead><tbody>';
    days.forEach((r) => {
      const future = false;
      h += '<tr' + (future ? ' style="color:#c0c4cc"' : '') + '><td>' + Number(r.day.slice(8, 10)) + '/' + Number(r.day.slice(5, 7)) + '</td><td class="sep"><b>' + (future ? '' : Z(r.don)) + '</b></td>' + r.c.map((v) => '<td>' + (future ? '' : Z(v)) + '</td>').join('') + '</tr>';
    });
    h += '<tr class="tot"><td>Tổng</td><td class="sep">' + fmt(tot.don) + '</td>' + tot.c.map((v) => '<td>' + Z(v) + '</td>').join('') + '</tr>';
    const sumSP = tot.c.reduce((a, b) => a + b, 0), pc = (v) => (sumSP ? (Math.round(v / sumSP * 1000) / 10).toLocaleString('vi-VN') + '%' : '-');
    const st = 'position:static;font-weight:700;background:#f5f3ff;';
    h += '<tr><td style="' + st + 'color:#5b21b6">Tỉ lệ %</td><td class="sep" style="' + st + 'font-weight:400;color:#6b7280">' + fmt(sumSP) + ' SP</td>' + tot.c.map((v) => '<td style="' + st + 'color:#7c3aed">' + (v ? pc(v) : '<span class="zz">-</span>') + '</td>').join('') + '</tr>';
    h += '</tbody></table>';
    // Bảng sản phẩm theo thợ – đặt bên phải bảng ngày
    let g = '<table><thead><tr><th>Kho</th><th>User <button data-cuall="1" title="Copy tất cả user đang hiện" style="margin-left:4px;padding:1px 6px;font-size:11px;border:1px solid #1f5bd8;background:#eff4ff;color:#1f5bd8;border-radius:4px;cursor:pointer">📋</button></th><th>Tên thợ</th><th>Vị Trí</th><th class="main sep">TỔNG ĐƠN</th><th class="main">TỔNG SP</th>' + SP_COLS.map((c) => '<th class="xt" style="white-space:normal;width:81px;min-width:81px;max-width:81px;overflow-wrap:anywhere;line-height:1.25">' + esc(c).replace(/\//g, '/&#8203;') + '</th>').join('') + '</tr></thead><tbody>';
    const gt = { don: 0, c: SP_COLS.map(() => 0) };
    th.forEach((x) => { gt.don += x.don; x.c.forEach((v, i) => (gt.c[i] += v)); const sp = x.c.reduce((a, b) => a + b, 0);
      g += '<tr><td class="kho">' + esc(x.kho) + '</td><td data-cu="' + esc(x.user) + '" title="Bấm để copy user" style="cursor:copy;font-weight:700;color:#1f5bd8">' + esc(x.user) + '</td><td class="l" style="white-space:nowrap">' + esc(x.name) + '</td><td>' + esc(x.vt) + '</td><td class="sep"><b>' + Z(x.don) + '</b></td><td><b>' + Z(sp) + '</b></td>' + x.c.map((v) => '<td>' + Z(v) + '</td>').join('') + '</tr>'; });
    g += '<tr class="tot"><td colspan="4">Tổng cộng (' + th.length + ' thợ)</td><td class="sep">' + fmt(gt.don) + '</td><td>' + fmt(gt.c.reduce((a, b) => a + b, 0)) + '</td>' + gt.c.map((v) => '<td>' + Z(v) + '</td>').join('') + '</tr></tbody></table>';
    out.innerHTML = '<div class="sbs" style="display:flex;gap:18px;align-items:flex-start;width:max-content">' + h + g + '</div>';
  }
  function csvSP() {
    const B = buildSP(); if (!B) return;
    const { D, days, tot } = B;
    const r = [['Ngày', 'TỔNG ĐƠN', ...SP_COLS]];
    days.forEach((x) => r.push([vn(x.day), x.don, ...x.c]));
    r.push(['Tổng', tot.don, ...tot.c]);
    const sumSP = tot.c.reduce((a, b) => a + b, 0);
    r.push(['Tỉ lệ %', sumSP + ' SP', ...tot.c.map((v) => (sumSP ? (Math.round(v / sumSP * 1000) / 10) + '%' : ''))]);
    const text = '﻿' + r.map((a) => a.map((c) => { const s = String(c == null ? '' : c); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'sanpham_' + (state.cn || 'ThanhHoa_ThoXuan') + '_' + D.F + '_' + D.T + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  // ---- Tab Công Nợ: lấy từ trang Quản lý công nợ (StaffDebt), chỉ thợ trạng thái Đã khóa ----
  const CNO_KHO = [[33386, 'Thanh Hóa'], [33139, 'Thọ Xuân']];
  async function loadDebt(onMsg) {
    await ensureApiReq();
    const base = apiReq.url.replace(/ShipmentOrder\/SearchShipmentOrder/i, '');
    const post = async (path, body, tries = 2) => { let r; try { const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 15000); r = await _fetch.call(window, base + path, Object.assign({}, apiReq.init, { body: JSON.stringify(body), signal: ac.signal })); clearTimeout(tm); } catch (e) { if (tries > 1) return post(path, body, tries - 1); throw new Error('Hết thời gian chờ TMS trả công nợ'); } const j = await r.json(); if (!j || j.IsError) throw new Error((j && j.Message) || 'Lỗi tải công nợ'); return j.ResultObject || []; };
    const users = [];
    for (const [id, kho] of CNO_KHO) {
      const l = await post('StaffDebt/SearchNew', [{ SearchKey: '@USERNAME', SearchValue: -1 }, { SearchKey: '@STOREID', SearchValue: id }, { SearchKey: '@ISLOCKDELIVERY', SearchValue: -1 }, { SearchKey: '@PAGESIZE', SearchValue: 1000 }, { SearchKey: '@PAGEINDEX', SearchValue: 0 }]);
      l.forEach((u) => users.push({ key: 'c:' + u.UserName + '|' + id, kho, sid: id, user: String(u.UserName), name: norm(u.FullName), lock: !!u.IsLockDelivery, tien: +u.TotalMoney || 0, thu: +u.CollectedTotalMoney || 0, no: +u.TotalRemainDebt || 0, nDH: +u.TotalDebtOrders || 0, nQH: +u.TotALoverDueDebtOrders || 0, list: [], maxH: -1 }));
    }
    let i = 0, done = 0;
    const worker = async () => { while (i < users.length) { const u = users[i++]; try { const l = await post('StaffDebtDetail/Search', [{ SearchKey: '@USERNAME', SearchValue: u.user }, { SearchKey: '@STOREID', SearchValue: u.sid }]); u.list = l.map((d) => ({ id: String(d.ShipmentOrderID), xe: norm(String(d.CarrierTypeName || '').replace(/^\d+\s*-\s*/, '')), tao: d.CreatedOrderTime, hen: d.ExpectedDeliveryDate, xg: d.OutputDate, thuLuc: d.CollectedTime, h: d.DebtInterval == null ? -1 : +d.DebtInterval, tien: +d.TotalMoney || 0, thu: +d.CollectedTotalMoney || 0, qh: !!d.IsOverDueDebt, khoa: !!d.IsLockDelivery && !d.IsUnLockDelivery })); u.maxH = u.list.reduce((m, d) => Math.max(m, d.h), -1); } catch (e) { u.err = 1; } done++; onMsg && onMsg(done, users.length); } };
    await Promise.all([1, 2, 3, 4].map(worker));
    state.debt = { users, at: new Date() };
    return state.debt;
  }
  async function loadCNO() {
    const g = root.querySelector('#go'); if (g) g.disabled = true;
    const t0 = Date.now();
    try {
      setMsg('Đang tải công nợ…');
      const dbt = await loadDebt((d, n) => setMsg('Đang tải chi tiết công nợ… ' + d + '/' + n + ' thợ'));
      const td = ymd(new Date()), days = range(shift(td, -1), shift(td, 9));
      let unSos = null, rws = [];
      try { const byDay = await fetchDays(days, (d, n) => setMsg('Đang tải ĐH hôm qua → 9 ngày tới… ' + d + '/' + n + ' ngày')); rws = Object.values(byDay).flat(); unSos = toSO(rws); } catch (e) {}
      const byId = new Map(); (state.data ? state.data.rows : []).concat(rws).forEach((r) => byId.set(String(r.id), r));
      const oldDone = (d) => { if (d.thuLuc && String(d.thuLuc).slice(0, 10) < td) return true; const r = byId.get(d.id); return !!(r && r.done && r.ntd && String(r.ntd).slice(0, 10) < td); };
      const nowT = Date.now();
      const xgH = (d) => (d.xg ? Math.floor((nowT - new Date(d.xg).getTime()) / 3600000) : -1);
      dbt.users.forEach((u) => u.list.forEach((d) => { d.ly = [oldDone(d) ? 'Hoàn tất hôm trước' : '', xgH(d) >= 24 ? 'Xuất hàng ' + xgH(d) + 'h' : ''].filter(Boolean).join(' · '); }));
      const users = dbt.users.filter((u) => u.lock).concat(dbt.users.filter((u) => !u.lock).map((u) => { const l = u.list.filter((d) => d.ly); return Object.assign({}, u, { list: l, tien: l.reduce((a, d) => a + d.tien, 0), nDH: l.length, nQH: l.filter((d) => d.qh).length, maxH: l.reduce((m, d) => Math.max(m, d.h), -1) }); }).filter((u) => u.list.length));
      state.cno = { users, at: dbt.at, unSos, unF: days[0], unT: days[days.length - 1] };
      render();
      setMsg('✔ Đã tải công nợ ' + users.filter((u) => u.lock).length + ' thợ đang bị khóa, ' + users.filter((u) => !u.lock).length + ' thợ chưa khóa (ĐH hoàn tất hôm trước / xuất hàng từ 24h) · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' giây · cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN') + '.');
    } catch (e) { setMsg(e.message || String(e), true); }
    finally { const g2 = root.querySelector('#go'); if (g2) g2.disabled = false; }
  }
  function buildCNO() {
    const C = state.cno; if (!C) return null;
    const q = norm(state.q || '').toLowerCase();
    let list = C.users.filter((u) => (!state.cn || u.kho === state.cn) && (!q || (u.user + ' ' + u.name).toLowerCase().includes(q)));
    list.sort((a, b) => (b.lock ? 1 : 0) - (a.lock ? 1 : 0) || b.maxH - a.maxH || b.tien - a.tien);
    const S = { nDH: 0, nQH: 0, tien: 0, thu: 0, no: 0, maxH: -1 };
    list.forEach((x) => { ['nDH', 'nQH', 'tien', 'thu', 'no'].forEach((k) => (S[k] += x[k])); S.maxH = Math.max(S.maxH, x.maxH); });
    const now = Date.now();
    const un = (C.unSos || []).filter((s) => s.no > 0 && !s.tho && s.xg && (!state.cn || s.kho === state.cn)).map((s) => Object.assign(s, { ageH: Math.floor((now - new Date(s.xg).getTime()) / 3600000) })).filter((s) => s.ageH >= 24).sort((a, b) => b.ageH - a.ageH);
    return { C, list, S, un };
  }
  const dtv = (s) => (s ? vn(String(s).slice(0, 10)) + ' ' + hm(String(s)) : '—');
  const dts = (s) => (s ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) + ' ' + hm(String(s)) : '—');
  function renderCNO(out) {
    const B = buildCNO();
    if (!B) { root.querySelector('#cards').innerHTML = ''; root.querySelector('#note').textContent = ''; out.innerHTML = '<div class="empty">Bấm <b>Thống kê</b> để tải công nợ.</div>'; return; }
    const { C, list, S, un } = B;
    const Z = (v) => (v ? fmt(v) : '<span class="zz">-</span>');
    const VND = (v) => (v ? fmt(Math.round(v)) : '<span class="zz">-</span>');
    const CLS = (h) => (h < 24 ? 'w-g' : h < 40 ? 'w-o' : 'w-r'), COL = (h) => (h < 24 ? '#0284c7' : h < 40 ? '#b45309' : '#dc2626');
    const LK = list.filter((x) => x.lock), CK = list.filter((x) => !x.lock);
    const sm = (a, k) => a.reduce((t, x) => t + x[k], 0);
    root.querySelector('#cards').innerHTML = '<div class="cards" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="card c4"><div>Thợ đang bị khóa</div><div class="n">' + fmt(LK.length) + '</div></div>' +
      '<div class="card c1"><div>Số ĐH đã khóa</div><div class="n">' + fmt(sm(LK, 'nDH')) + '</div></div>' +
      '<div class="card c5"><div>Tổng tiền ĐH đã khóa</div><div class="n" style="font-size:22px">' + fmt(Math.round(sm(LK, 'tien'))) + '</div></div>' +
      '</div>';
    root.querySelector('#note').textContent = 'Dữ liệu lấy từ trang Quản lý công nợ (StaffDebt) của TMS: trên là thợ Đã khóa (mọi ĐH còn nợ), dưới là thợ Chưa khóa nhưng còn nợ ĐH hoàn tất từ hôm trước hoặc ĐH đã xuất hàng từ 24h trở lên – chỉ tính các ĐH đó. Cập nhật lúc ' + C.at.toLocaleTimeString('vi-VN') + ' ' + C.at.toLocaleDateString('vi-VN') + '. Số giờ nợ do TMS tính: xanh dưới 24h · vàng 24h đến dưới 40h · đỏ từ 40h. Bấm vào 1 dòng để xem chi tiết ĐH.';
    const cols = 7;
    let h = '<table style="table-layout:fixed;width:100%"><colgroup><col style="width:13%"><col style="width:13%"><col style="width:24%"><col style="width:11%"><col style="width:17%"><col style="width:11%"><col style="width:11%"></colgroup><thead><tr>' +
      ['Kho', 'User <button data-cuall="1" title="Copy tất cả user đang hiện" style="margin-left:4px;padding:1px 6px;font-size:11px;border:1px solid #1f5bd8;background:#eff4ff;color:#1f5bd8;border-radius:4px;cursor:pointer">📋</button>', 'Tên thợ', 'ĐH quá hạn', 'Tổng tiền ĐH đã khóa', 'Nợ lâu nhất', 'Trạng thái'].map((t, i) => '<th class="' + (i >= 3 ? 'cno' : '') + '" style="white-space:normal;line-height:1.25">' + t + '</th>').join('') + '</tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="' + cols + '" class="empty">Không có thợ nào đang bị khóa.</td></tr>';
    list.forEach((x) => {
      const op = state.open.has(x.key);
      h += '<tr class="click" data-k="' + esc(x.key) + '"><td class="l kho">' + (op ? '▾ ' : '▸ ') + esc(x.kho) + '</td><td data-cu="' + esc(x.user) + '" title="Bấm để copy user" style="cursor:copy;font-weight:700;color:#1f5bd8;user-select:text">' + esc(x.user) + '</td><td class="l">' + esc(x.name) + '</td><td style="color:#dc2626;font-weight:700">' + Z(x.nQH) + '</td><td class="tien">' + VND(x.tien) + '</td>' +
        '<td>' + (x.maxH >= 0 ? '<span class="w ' + CLS(x.maxH) + '">' + x.maxH + 'h</span>' : '<span class="zz">-</span>') + '</td><td>' + (x.lock ? '<span class="w w-r">Đã khóa</span>' : '<span class="w w-o">Chưa khóa</span>') + '</td></tr>';
      if (!op) return;
      const l = x.list.slice().sort((a, b) => b.h - a.h);
      h += '<tr class="det"><td colspan="' + cols + '"><div class="stk"><b>' + (x.lock ? 'Chi tiết ĐH đã khóa – ' : 'ĐH hoàn tất hôm trước / xuất hàng từ 24h chưa đóng công nợ – ') + esc(x.user + ' - ' + x.name) + '</b>' + (x.err ? ' <span style="color:#dc2626">(lỗi tải chi tiết)</span>' : '') + '<table style="width:100%;font-size:11.5px"><thead><tr><th>Mã vận đơn</th><th>Loại xe</th><th>Hẹn giao</th><th>Xuất hàng</th><th>Thu tiền lúc</th><th>Số giờ nợ</th><th>Tổng tiền</th><th>Quá hạn</th><th>Lý do</th></tr></thead><tbody>' +
        (l.length ? l.map((d) => '<tr><td>' + esc(d.id) + '</td><td>' + esc(d.xe) + '</td><td>' + dts(d.hen) + '</td><td>' + dts(d.xg) + '</td><td>' + dts(d.thuLuc) + '</td><td>' + (d.h >= 0 ? '<b style="color:' + COL(d.h) + '">' + d.h + 'h</b>' : '—') + '</td><td class="tien">' + fmt(Math.round(d.tien)) + '</td><td>' + (d.qh ? '<b style="color:#dc2626">Quá hạn</b>' : '') + '</td><td class="l" style="color:#b45309">' + esc(d.ly || '') + '</td></tr>').join('') : '<tr><td colspan="9" class="empty">Không có chi tiết.</td></tr>') +
        '</tbody></table></div></td></tr>';
    });
    h += '<tr class="tot"><td colspan="3">Tổng cộng (' + fmt(list.length) + ' thợ)</td><td>' + Z(S.nQH) + '</td><td class="tien">' + VND(S.tien) + '</td><td>' + (S.maxH >= 0 ? '<span class="w ' + CLS(S.maxH) + '">' + S.maxH + 'h</span>' : '') + '</td><td></td></tr>';
    h += '</tbody></table>';
    h += '<div style="margin:14px 0 6px;font-weight:700;color:#991b1b;font-size:13px">ĐH chưa gán user – còn công nợ, xuất hàng từ 24h trở lên · đơn hẹn ' + vn(C.unF).slice(0, 5) + ' → ' + vn(C.unT).slice(0, 5) + ' (' + fmt(un.length) + ' ĐH' + (un.length ? ' · ' + fmt(Math.round(un.reduce((a, s) => a + s.no, 0))) + 'đ' : '') + ')</div>';
    h += '<table style="table-layout:fixed;width:100%"><colgroup><col style="width:12%"><col style="width:22%"><col style="width:12%"><col style="width:15%"><col style="width:9%"><col style="width:13%"><col style="width:17%"></colgroup><thead><tr>' + ['Kho', 'Mã SO', 'Ngày hẹn', 'Xuất hàng', 'Số giờ', 'Số tiền', 'Trạng thái TMS'].map((t, i) => '<th class="' + (i >= 4 ? 'cno' : '') + '">' + t + '</th>').join('') + '</tr></thead><tbody>';
    if (!C.unSos) h += '<tr><td colspan="7" class="empty">Chưa tải được dữ liệu đơn hàng.</td></tr>';
    else if (!un.length) h += '<tr><td colspan="7" class="empty">Không có ĐH chưa gán user nào nợ từ 24h.</td></tr>';
    un.forEach((s) => { h += '<tr><td class="l kho">' + esc(s.kho) + '</td><td style="font-weight:700;user-select:text">' + esc(s.so) + '</td><td>' + vn(s.day) + '</td><td>' + dts(s.xg) + '</td><td><b style="color:' + COL(s.ageH) + '">' + s.ageH + 'h</b></td><td class="tien">' + fmt(Math.round(s.no)) + '</td><td class="l">' + esc(s.st) + '</td></tr>'; });
    out.innerHTML = h + '</tbody></table>';
  }
  function csvCNO() {
    const B = buildCNO(); if (!B) return;
    const { list, un } = B;
    const r = [['Kho', 'Mã thợ', 'Tên thợ', 'Mã vận đơn', 'Loại xe', 'Tạo đơn', 'Hẹn giao', 'Xuất hàng', 'Thu tiền lúc', 'Số giờ nợ', 'Mức', 'Tổng tiền', 'Quá hạn', 'Trạng thái thợ', 'Lý do']];
    list.forEach((x) => x.list.slice().sort((a, b) => b.h - a.h).forEach((d) => r.push([x.kho, x.user, x.name, d.id, d.xe, dtv(d.tao), dtv(d.hen), dtv(d.xg), dtv(d.thuLuc), d.h >= 0 ? d.h : '', d.h < 0 ? '' : d.h < 24 ? 'Xanh (<24h)' : d.h < 40 ? 'Vàng (24-40h)' : 'Đỏ (≥40h)', Math.round(d.tien), d.qh ? 'Quá hạn' : '', x.lock ? 'Đã khóa' : 'Chưa khóa', d.ly || ''])));
    un.forEach((s) => r.push([s.kho, '', '(Chưa gán user)', s.so, '', '', vn(s.day), dtv(s.xg), '', s.ageH, s.ageH < 40 ? 'Vàng (24-40h)' : 'Đỏ (≥40h)', Math.round(s.no), '']));
    const text = '﻿' + r.map((a) => a.map((c) => { const v = String(c == null ? '' : c); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'Cong_no_da_khoa_' + (state.cn || 'TH_TX').replace(/\s+/g, '_') + '_' + ymd(new Date()) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }
  // ---- Tab Cảnh Báo Trễ: ĐH sắp trễ / trễ hẹn trong khoảng ngày, gom theo thợ ----
  function buildTRE() {
    const D = state.data; if (!D) return null;
    const q = norm(state.q || '').toLowerCase();
    const m = new Map();
    D.sos.filter((s) => s.day >= D.F && s.day <= D.T && (!state.cn || s.kho === state.cn)).forEach((s) => {
      s.ss = soStatus(s); if (s.ss !== 'r' && s.ss !== 'o') return;
      const t = s.tho || '', i = t.indexOf('-'), user = i > 0 ? t.slice(0, i).trim() : '', name = i > 0 ? t.slice(i + 1).trim() : (t || '(Chưa gán thợ)');
      const id = (user || '__' + name) + '|' + s.kho;
      let x = m.get(id); if (!x) { x = { key: 'tr:' + id, kho: s.kho, user, name, r: 0, o: 0, list: [] }; m.set(id, x); }
      x[s.ss]++; x.list.push(s);
    });
    let list = [...m.values()];
    if (q) list = list.filter((x) => (x.user + ' ' + x.name).toLowerCase().includes(q));
    list.forEach((x) => { x.list.sort((a, b) => 'ro'.indexOf(a.ss) - 'ro'.indexOf(b.ss) || a.exp.localeCompare(b.exp)); x.first = x.list[0].exp; });
    list.sort((a, b) => b.r - a.r || b.o - a.o || a.first.localeCompare(b.first));
    const S = { r: 0, o: 0 }; list.forEach((x) => { S.r += x.r; S.o += x.o; });
    return { D, list, S };
  }
  function renderTRE(out) {
    const B = buildTRE(); if (!B) return;
    const { D, list, S } = B;
    const Z = (v) => (v ? fmt(v) : '<span class="zz">-</span>');
    root.querySelector('#cards').innerHTML = '<div class="cards" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="card c5"><div>Thợ có cảnh báo</div><div class="n">' + fmt(list.length) + '</div></div>' +
      '<div class="card c4"><div>ĐH trễ hẹn</div><div class="n">' + fmt(S.r) + '</div></div>' +
      '<div class="card c3"><div>ĐH sắp trễ</div><div class="n">' + fmt(S.o) + '</div></div></div>';
    root.querySelector('#note').textContent = (D.F === D.T ? 'Ngày ' + vn(D.T) : 'Từ ' + vn(D.F) + ' đến ' + vn(D.T)) + ': ĐH chưa hoàn tất, chưa tới nhà khách, đã quá giờ hẹn (trễ hẹn) hoặc sắp tới giờ hẹn (sắp trễ). Tự tính lại mỗi phút. Bấm vào ô User để copy, bấm dòng để xem từng ĐH.';
    const cols = 6;
    let h = '<table style="table-layout:fixed;width:100%"><colgroup><col style="width:14%"><col style="width:16%"><col style="width:30%"><col style="width:13%"><col style="width:13%"><col style="width:14%"></colgroup><thead><tr>' +
      ['Kho', 'User <button data-cuall="1" title="Copy tất cả user đang hiện" style="margin-left:4px;padding:1px 6px;font-size:11px;border:1px solid #1f5bd8;background:#eff4ff;color:#1f5bd8;border-radius:4px;cursor:pointer">📋</button>', 'Tên thợ', 'Trễ hẹn', 'Sắp trễ', 'Giờ hẹn sớm nhất'].map((t, i) => '<th class="' + (i >= 3 ? 'cno' : '') + '" style="white-space:normal;line-height:1.25">' + t + '</th>').join('') + '</tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="' + cols + '" class="empty">Không có ĐH sắp trễ hoặc trễ hẹn.</td></tr>';
    list.forEach((x) => {
      const op = state.open.has(x.key);
      h += '<tr class="click" data-k="' + esc(x.key) + '"><td class="l kho">' + (op ? '▾ ' : '▸ ') + esc(x.kho) + '</td>' +
        (x.user ? '<td data-cu="' + esc(x.user) + '" title="Bấm để copy user" style="cursor:copy;font-weight:700;color:#1f5bd8;user-select:text">' + esc(x.user) + '</td>' : '<td><span class="zz">-</span></td>') +
        '<td class="l">' + esc(x.name) + '</td><td>' + (x.r ? '<span class="w w-r">' + x.r + ' ĐH</span>' : '<span class="zz">-</span>') + '</td><td>' + (x.o ? '<span class="w w-o">' + x.o + ' ĐH</span>' : '<span class="zz">-</span>') + '</td><td>' + vn(x.first.slice(0, 10)).slice(0, 5) + ' ' + hm(x.first) + '</td></tr>';
      if (!op) return;
      h += '<tr class="det"><td colspan="' + cols + '"><table style="width:100%;font-size:11.5px"><thead><tr><th>Mã SO</th><th>Loại</th><th>Ngày hẹn</th><th>Giờ hẹn</th><th>Trạng thái TMS</th><th>Cảnh báo</th></tr></thead><tbody>' +
        x.list.map((s) => '<tr><td style="user-select:text">' + esc(s.so) + '</td><td>' + (s.ml ? 'ML' : 'ĐHK') + '</td><td>' + vn(s.day) + '</td><td>' + hm(s.exp) + '</td><td class="l">' + esc(s.st) + '</td><td><span class="bdg b-' + s.ss + '">' + SL[s.ss] + '</span></td></tr>').join('') + '</tbody></table></td></tr>';
    });
    h += '<tr class="tot"><td colspan="3">Tổng cộng (' + fmt(list.length) + ' thợ)</td><td>' + Z(S.r) + '</td><td>' + Z(S.o) + '</td><td></td></tr>';
    out.innerHTML = h + '</tbody></table>';
  }
  function csvTRE() {
    const B = buildTRE(); if (!B) return;
    const r = [['Kho', 'User', 'Tên thợ', 'Mã SO', 'Loại', 'Ngày hẹn', 'Giờ hẹn', 'Trạng thái TMS', 'Cảnh báo']];
    B.list.forEach((x) => x.list.forEach((s) => r.push([x.kho, x.user, x.name, s.so, s.ml ? 'ML' : 'ĐHK', vn(s.day), hm(s.exp), s.st, SL[s.ss]])));
    const text = '\ufeff' + r.map((a) => a.map((c) => { const v = String(c == null ? '' : c); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'Canh_bao_tre_' + (state.cn || 'TH_TX').replace(/\s+/g, '_') + '_' + B.D.F + '_' + B.D.T + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }
  // ---- Xuất Excel giữ nguyên giao diện bảng đang xem (màu, tiêu đề gộp, cột) ----
  function exportView() {
    const tbls = [...root.querySelectorAll('#out > table, #out > .sbs > table')], tbl = tbls[0];
    if (!tbl) { setMsg('Chưa có bảng để xuất, bấm Thống kê trước.', true); return; }
    const clear = (c) => !c || c === 'transparent' || /rgba\(0, 0, 0, 0\)/.test(c);
    const styleOf = (el) => {
      const cs = getComputedStyle(el);
      let bg = cs.backgroundColor, col = cs.color, fw = cs.fontWeight;
      const tr = el.parentElement; if (clear(bg) && tr) bg = getComputedStyle(tr).backgroundColor;
      const b = [...el.querySelectorAll('span,b')].find((x) => !clear(getComputedStyle(x).backgroundColor));
      if (b) { const bs = getComputedStyle(b); bg = bs.backgroundColor; col = bs.color; fw = bs.fontWeight; }
      else { const t = el.querySelector('b,span'); if (t && t.textContent.trim() === el.textContent.trim()) { const ts = getComputedStyle(t); col = ts.color; if (Number(ts.fontWeight) > Number(fw)) fw = ts.fontWeight; } }
       return 'border:1px solid #9ca3af;vertical-align:middle;' + (clear(bg) ? '' : 'background:' + bg + ';') + 'color:' + col + ';font-weight:' + (Number(fw) >= 600 ? 'bold' : 'normal') + ';text-align:' + cs.textAlign + ';width:' + Math.round(el.offsetWidth) + 'px;white-space:normal';
    };
    const mk = (tbl) => {
      const cl = tbl.cloneNode(true);
      const o = [...tbl.querySelectorAll('th,td')], c = [...cl.querySelectorAll('th,td')];
      o.forEach((el, i) => { const d = c[i]; if (!d) return; d.setAttribute('style', styleOf(el)); d.querySelectorAll('button').forEach((x) => x.remove()); const tx = d.textContent.replace(/^[▸▾]\s*/, '').replace(/\s+/g, ' ').trim(); d.textContent = tx;
        const m = !el.hasAttribute('data-cu') && tx.match(/^(-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?)(%?)$/);
        if (m) { let v = parseFloat(m[1].replace(/\./g, '').replace(',', '.')); const dec = m[1].includes(','); if (m[2]) v = v / 100; d.setAttribute('x:num', String(v)); d.setAttribute('style', d.getAttribute('style') + ';mso-number-format:"' + (m[2] ? (dec ? '0.0%' : '0%') : dec ? '#,##0.0' : '#,##0') + '"'); }
        else d.setAttribute('style', d.getAttribute('style') + ';mso-number-format:"\\@"'); });
      cl.querySelectorAll('tr.det').forEach((x) => x.remove());
      cl.querySelectorAll('colgroup').forEach((x) => x.remove());
      cl.removeAttribute('style'); cl.setAttribute('border', '1'); cl.setAttribute('style', 'border-collapse:collapse;font-family:Arial;font-size:11pt');
      return cl.outerHTML;
    };
    const tab = (root.querySelector('.tab.on') || {}).textContent || '';
    const cards = [...root.querySelectorAll('#cards .card')].map((k) => { const cs = getComputedStyle(k), n = k.querySelector('.n'); return '<td style="border:1px solid #9ca3af;background:' + cs.backgroundColor + ';padding:4px"><div>' + esc(k.firstElementChild.textContent) + '</div><div style="font-size:16pt;font-weight:bold;color:' + (n ? getComputedStyle(n).color : '#000') + '">' + esc(n ? n.textContent : '') + '</div></td>'; }).join('');
    const kho = state.cn ? 'Kho ' + state.cn : 'Kho Thanh Hóa + Kho Thọ Xuân';
    const rng = state.view === 'cno' ? 'cập nhật ' + new Date().toLocaleString('vi-VN') : (state.from === state.to ? 'Ngày ' + vn(state.from) : 'Từ ' + vn(state.from) + ' đến ' + vn(state.to));
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>' + esc(tab.slice(0, 30)) + '</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>' +
      '<table style="font-family:Arial"><tr><td style="font-size:14pt;font-weight:bold;color:#1f5bd8">Thống kê Đơn Hàng – ' + esc(tab) + '</td></tr><tr><td>' + esc(kho + ' · ' + rng) + '</td></tr></table>' +
      (cards ? '<table style="font-family:Arial;border-collapse:collapse"><tr>' + cards + '</tr></table><br>' : '') + tbls.map(mk).join('<br>') + '</body></html>';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
    a.download = (tab || 'Thong_ke').replace(/\s+/g, '_') + '_' + (state.cn || 'TH_TX').replace(/\s+/g, '_') + '_' + (state.view === 'cno' ? ymd(new Date()) : state.from + '_' + state.to) + '.xls';
    document.body.appendChild(a); a.click(); a.remove();
    setMsg('⬇ Đã xuất file Excel: ' + a.download);
  }
  function csv() {
    if (state.view === 'xt') return csvXT();
    if (state.view === 'st') return csvST();
    if (state.view === 'sp') return csvSP();
    if (state.view === 'cno') return csvCNO();
    if (state.view === 'tre') return csvTRE();
    const B = build(); if (!B) return;
    const { D, list } = B, tho = state.view === 'tho';
    const r = [[...(tho ? ['Kho', 'Họ Và Tên', 'Vị Trí'] : ['Kho']), 'Tổng ĐH', 'ML', 'ĐHK', 'Hoàn Tất', 'Chưa HT', 'Cảnh Báo Trễ Hẹn',
      ...(tho ? [] : ['Tổng ĐH Xe Tải', 'Xe Nội Bộ', 'Xe Thuê', 'Trung Bình Xe', 'Đánh Giá', 'SL ĐH Xe Thuê', 'Tiền Xe Thuê', 'SL ĐH Còn Công Nợ', 'Số Tiền Công Nợ', 'Đánh Giá Công Nợ']),
      'Tổng T' + Number(D.T.slice(5, 7)), 'ML', 'ĐHK', ...D.prev.flatMap((d) => ['Ngày ' + vn(d), 'ML', 'ĐHK'])]];
    const wTxt = (x) => (tho || !(x.c.r || x.c.o) ? WL[x.warn] : [x.c.r ? x.c.r + ' ĐH Trễ Hẹn' : '', x.c.o ? x.c.o + ' ĐH Sắp Trễ' : ''].filter(Boolean).join(' · '));
    list.forEach((x) => r.push([...(tho ? [x.kho, x.tho, x.vt] : [x.kho]), x.m.tong, x.m.ml, x.m.dhk, x.c.h, x.chua, wTxt(x),
      ...(tho ? [] : [x.xt, x.nb, x.th, x.tb == null ? '' : Math.round(x.tb * 10) / 10, x.dg, x.thDH, x.tien, x.non, x.not, x.no48 ? 'Có ' + x.no48 + ' ĐH Trên 48h' : x.non ? 'CN Dưới 48h' : '']),
      x.mon.tong, x.mon.ml, x.mon.dhk, ...x.pv.flatMap((p) => [p.tong, p.ml, p.dhk])]));
    const text = '\uFEFF' + r.map((a) => a.map((c) => { const s = String(c == null ? '' : c); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = 'thongke_' + state.view + '_' + D.F + '_' + D.T + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  setInterval(() => { if (root && root.querySelector('#out') && state.data) render(); }, 60000);
  setInterval(ensureButton, 1000);
  ensureButton();
  // ======================= 🎯 TỔNG QUAN (mục tiêu tháng, KPI tuần, lũy kế, dự kiến) =======================
  // Mục tiêu tháng theo kho — cập nhật mỗi tháng. Tỉ lệ 4 tuần: Tuần 1 (1–7), Tuần 2 (8–14), Tuần 3 (15–21), Tuần 4 (22–cuối tháng).
  const TQ_TARGET = {
    '2026-10': { kho: { 'Thanh Hóa': 4800, 'Thọ Xuân': 1100 }, ratio: [0.23, 0.245, 0.255, 0.27] },
    '2026-11': { kho: { 'Thanh Hóa': 5000, 'Thọ Xuân': 1200 }, ratio: [0.20, 0.22, 0.25, 0.33] },
  };
  const TQ_CSS = [
    ':host{all:initial}', '*{box-sizing:border-box;font-family:Roboto,system-ui,Segoe UI,Arial,sans-serif}',
    '.ov{position:fixed;inset:0;background:rgba(15,23,42,.25);z-index:2147483000}',
    '.dr{position:fixed;top:0;right:0;height:100vh;width:min(1100px,100vw);background:#f8fafc;color:#1f2937;z-index:2147483001;box-shadow:-8px 0 28px rgba(15,23,42,.18);display:flex;flex-direction:column;font-size:12px}',
    '.hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#7c3aed}', '.hd b{font-size:14px;color:#fff}',
    '.x{background:none;border:0;color:#ede9fe;font-size:20px;cursor:pointer;line-height:1}',
    '.bd{padding:12px 16px 18px;overflow:auto;flex:1}',
    'label{display:block;color:#374151;font-weight:700;font-size:10.5px;margin-bottom:3px}',
    'select{background:#fff;color:#111827;border:1px solid #cfd5dd;border-radius:4px;padding:4px 7px;font-size:12px;height:28px}',
    '.btn{background:#fff;border:1px solid #d1d5db;border-radius:4px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;height:28px}',
    '.msg{color:#15803d;font-size:11px;margin:6px 0}.msg.err{color:#dc2626}',
    '.top3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}',
    '.kc{color:#fff;border-radius:10px;padding:10px 12px}.kc .t{font-size:12px}.kc .v{font-size:24px;font-weight:700}.kc .s{font-size:12px}',
    '.box{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px}',
    '.wk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) minmax(0,1.2fr);gap:8px;margin-top:10px}',
    '.card{border-radius:12px;padding:10px}.card .h{font-size:13px;font-weight:700}.card .v{font-size:22px;font-weight:700;margin-top:4px}.card .l{font-size:12px;margin-top:2px}',
    '.empty{color:#6b7280;padding:30px 0;text-align:center}',
    '.sec{font-size:14px;font-weight:700;color:#5b21b6;margin:16px 0 8px;border-left:4px solid #7c3aed;border-radius:0;padding-left:8px}',
    '.act{border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.55}.act div{margin:2px 0}',
    '@media (max-width:760px){.top3{grid-template-columns:1fr}.wk{grid-template-columns:repeat(2,minmax(0,1fr))}}'].join('\n');
  const GOOD = (t) => '<span style="color:#15803d;font-weight:700">' + t + '</span>', BAD = (t) => '<span style="color:#b91c1c;font-weight:700">' + t + '</span>';
  const TQC = (pc) => (pc >= 100 ? ['#dcfce7', '#15803d', '#22c55e'] : pc >= 95 ? ['#fef3c7', '#b45309', '#f59e0b'] : ['#fee2e2', '#b91c1c', '#ef4444']);
  let tqHost, tqRoot; const tq = { month: '', kho: '', data: null, loading: false };
  function ensureTQButton() {
    if (!PAGE_RE.test(location.pathname)) { const o = document.getElementById('tktq-open-btn'); if (o) o.remove(); return; }
    const slot = topSlot(); let btn = document.getElementById('tktq-open-btn');
    if (!btn) { btn = document.createElement('button'); btn.id = 'tktq-open-btn'; btn.textContent = '🎯 Tổng quan'; btn.title = 'Mục tiêu tháng, KPI tuần, lũy kế'; btn.onclick = openTQ; }
    const css = 'background:#7c3aed;color:#fff;border:0;border-radius:8px;padding:0 14px;font:600 13px Roboto,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(124,58,237,.35);height:32px;white-space:nowrap;order:1';
    if (slot) { if (btn.parentElement !== slot) { btn.style.cssText = css; slot.appendChild(btn); } return; }
    const a = document.getElementById('tkdh-open-btn');
    if (a && btn.nextElementSibling !== a) { btn.style.cssText = css + ';margin-right:8px'; a.before(btn); }
  }
  function tqMonths() { const d = today(), out = []; for (let i = 0; i < 4; i++) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(ymd(x).slice(0, 7)); } return out; }
  function openTQ() {
    if (!tqHost) { tqHost = document.createElement('div'); tqHost.id = 'tktq-host'; tqRoot = tqHost.attachShadow({ mode: 'open' }); document.body.appendChild(tqHost); }
    if (!tq.month) tq.month = ymd(today()).slice(0, 7);
    const mo = tqMonths().map((m) => '<option value="' + m + '"' + (m === tq.month ? ' selected' : '') + '>' + Number(m.slice(5, 7)) + '/' + m.slice(0, 4) + '</option>').join('');
    const ko = '<option value="">Kho Thanh Hóa + Kho Thọ Xuân</option>' + KHO_ORDER.map((k) => '<option value="' + esc(k) + '"' + (k === tq.kho ? ' selected' : '') + '>Kho ' + esc(k) + '</option>').join('');
    tqRoot.innerHTML = '<style>' + TQ_CSS + '</style><div class="ov"></div><div class="dr"><div class="hd"><b>🎯 Tổng quan</b><button class="x" title="Đóng">✕</button></div><div class="bd">' +
      '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap"><div><label>Tháng</label><select id="mo">' + mo + '</select></div><div><label>Kho</label><select id="kh">' + ko + '</select></div><button class="btn" id="rf">↻ Tải lại</button><button class="btn" id="sh" style="background:#7c3aed;border-color:#7c3aed;color:#fff">📤 Chia sẻ</button></div>' +
      '<div class="msg" id="msg"></div><div id="out"><div class="empty">Đang tải…</div></div></div></div>';
    const $ = (s) => tqRoot.querySelector(s), close = () => { tqRoot.innerHTML = ''; };
    $('.x').onclick = close; $('.ov').onclick = close;
    $('#mo').onchange = () => { tq.month = $('#mo').value; tq.data = null; tq.rate = null; loadTQ(); };
    $('#kh').onchange = () => { tq.kho = $('#kh').value; tq.rate = null; renderTQ(); };
    $('#rf').onclick = () => { tq.data = null; loadTQ(); };
    $('#sh').onclick = shareTQ;
    if (tq.data && tq.data.month === tq.month) renderTQ(); else loadTQ();
  }
  function tqMsg(t, err) { const m = tqRoot && tqRoot.querySelector('#msg'); if (m) { m.textContent = t; m.className = 'msg' + (err ? ' err' : ''); } }
  async function loadTQ() {
    if (tq.loading) return; tq.loading = true;
    const m = tq.month, first = m + '-01', nd = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate(), last = m + '-' + String(nd).padStart(2, '0');
    const t = ymd(today()), to = last < t ? last : t;
    try {
      tqMsg('Đang tải dữ liệu…'); await ensureApiReq();
      const days = range(first, to < first ? first : to);
      const byDay = await fetchDays(days, (d, n) => tqMsg('Đang tải dữ liệu… ' + d + '/' + n + ' ngày'));
      // Đếm SỐ LƯỢNG SẢN PHẨM (giống tab Sản Phẩm): SO không hủy / nhập trả / khuyến mãi, theo ngày hẹn giao;
      // sản phẩm thật (không KM, quà tặng, phiếu mua hàng, SP ảo, phần đã hủy/trả), mỗi sản phẩm lấy SL lớn nhất giữa các vận đơn của cùng SO.
      const all = Object.values(byDay).flat();
      const sos = new Map(toSO(all).filter((s) => s.day >= first && s.day <= to).map((s) => [s.so, s]));
      const rows = all.filter((r) => sos.has(r.so) && !r.cancel && !r.ret && !r.km);
      // đơn hủy: SO hủy toàn bộ (không còn vận đơn nào giao), theo ngày hẹn giao trong tháng
      const allHuy = new Map(); all.forEach((r) => { if (r.km) return; const d = String(r.exp).slice(0, 10); if (d < first || d > to) return; allHuy.set(r.so, (allHuy.has(r.so) ? allHuy.get(r.so) : true) && !!r.huy); });
      const hrows = all.filter((r) => !r.km && r.kho && allHuy.get(r.so) === true && String(r.exp).slice(0, 10) >= first && String(r.exp).slice(0, 10) <= to); // SO hủy (giống cách tính nhập trả ở tab ĐH theo ST)
      const ids = [...new Set(rows.map((r) => r.id))];
      const fail = await loadSP(ids, (d, n) => tqMsg('Đang lấy chi tiết sản phẩm… ' + d + '/' + n + ' vận đơn (lần đầu hơi lâu, các lần sau nhanh)'));
      const per = new Map(); rows.forEach((r) => { const items = spCache[r.id]; if (!items) return; let m = per.get(r.so); if (!m) { m = new Map(); per.set(r.so, m); } items.forEach(([pid, , q]) => { if (!m.has(pid) || q > m.get(pid)) m.set(pid, q); }); });
      const cnt = {}; per.forEach((m, so) => { const s = sos.get(so); const k = s.kho || '?'; let q = 0; m.forEach((v) => (q += v)); (cnt[k] = cnt[k] || {})[s.day] = (cnt[k][s.day] || 0) + q; });
      await loadSPH([...new Set(hrows.map((r) => r.id))], (d, n) => tqMsg('Đang lấy sản phẩm đơn hủy… ' + d + '/' + n));
      window.__tkHuy = hrows.map((r) => r.id);
      const perH = new Map(); hrows.forEach((r) => { const items = spCacheH[r.id]; if (!items) return; let x = perH.get(r.so); if (!x) { x = { kho: r.kho, day: String(r.exp).slice(0, 10), m: new Map() }; perH.set(r.so, x); } if (String(r.exp).slice(0, 10) < x.day) x.day = String(r.exp).slice(0, 10); items.forEach(([pid, , q]) => { if (!x.m.has(pid) || q > x.m.get(pid)) x.m.set(pid, q); }); });
      const cntH = {}; perH.forEach((x) => { let q = 0; x.m.forEach((v) => (q += v)); (cntH[x.kho] = cntH[x.kho] || {})[x.day] = (cntH[x.kho][x.day] || 0) + q; });
      tq.fail = fail;
      tq.data = { month: m, nd, to, cnt, cntH, nHuy: perH.size, nHuySO: [...allHuy.values()].filter(Boolean).length };
      tqMsg('✔ Cập nhật lúc ' + new Date().toLocaleTimeString('vi-VN') + ' · đếm theo SỐ LƯỢNG SẢN PHẨM (giống tab Sản Phẩm), theo ngày hẹn giao, không tính đơn hủy / nhập trả / khuyến mãi' + (tq.fail ? ' · ' + tq.fail + ' vận đơn chưa lấy được chi tiết, bấm Tải lại' : '') + '.');
      renderTQ();
    } catch (e) { tqMsg(e.message || String(e), true); }
    finally { tq.loading = false; }
  }
  function renderTQ() {
    const out = tqRoot && tqRoot.querySelector('#out'); if (!out) return;
    const D = tq.data; if (!D) return;
    const cfg = TQ_TARGET[D.month];
    const khos = tq.kho ? [tq.kho] : KHO_ORDER;
    if (!cfg) { out.innerHTML = '<div class="empty">Chưa có mục tiêu cho tháng ' + Number(D.month.slice(5, 7)) + '/' + D.month.slice(0, 4) + '. Nhắn Claude để cập nhật mục tiêu tháng và tỉ lệ tuần.</div>'; return; }
    const mt = khos.reduce((a, k) => a + (cfg.kho[k] || 0), 0), R = cfg.ratio;
    const W = [[1, 7], [8, 14], [15, 21], [22, D.nd]], pass = Number(D.to.slice(8, 10));
    const perDay = (d) => khos.reduce((a, k) => a + ((D.cnt[k] || {})[d] || 0), 0);
    const day = (n) => D.month + '-' + String(n).padStart(2, '0');
    const f = (n) => fmt(Math.round(n)), p = (n) => fmt(Math.round(n)) + '%', p1 = (n) => (Math.round(n * 10) / 10).toLocaleString('vi-VN') + '%';
    let lk = 0; const wk = W.map(([a, b], i) => {
      const dn = Math.max(0, Math.min(b, pass) - a + 1), len = b - a + 1; let s = 0; for (let n = a; n < a + dn; n++) s += perDay(day(n));
      lk += s; return { i, len, dn, s, kpi: mt * R[i], run: dn > 0 && dn < len };
    });
    const avgM = pass ? lk / pass : 0, fcM = avgM * D.nd, pcNowM = mt ? lk / mt * 100 : 0, pcFcM = mt ? fcM / mt * 100 : 0;
    // 3 ô trên cùng
    const miss = mt - lk, left = D.nd - pass;
    let top = '<div class="top3"><div class="kc" style="background:#15803d"><div class="t">Mục tiêu tháng</div><div class="v">' + f(mt) + '</div><div class="s">sản phẩm</div></div>' +
      '<div class="kc" style="background:#15803d"><div class="t">Đã đạt</div><div class="v">' + f(lk) + '</div><div class="s">' + p1(pcNowM) + ' mục tiêu tháng</div></div>' +
      (miss > 0 ? '<div class="kc" style="background:#dc2626"><div class="t">Còn thiếu để đạt tháng</div><div class="v">' + f(miss) + '</div><div class="s">' + (left > 0 ? '≈ ' + f(miss / left) + ' SP/ngày trong ' + left + ' ngày còn lại' : 'Tháng đã kết thúc') + '</div></div>'
        : '<div class="kc" style="background:#15803d"><div class="t">Đã vượt mục tiêu tháng</div><div class="v">+' + f(-miss) + '</div><div class="s">sản phẩm</div></div>') + '</div>';
    // biểu đồ % đạt KPI
    const TOP = 130, H = 200, y = (v) => Math.min(Math.max(v, 0), TOP) / TOP * H;
    const bar = (now, fc, c, lbl) => '<div style="position:relative;height:100%">' + (fc > now ? '<div style="position:absolute;bottom:0;left:12%;right:12%;height:' + y(fc) + 'px;background:' + c + ';opacity:.28;border-radius:8px 8px 0 0"></div>' : '') +
      '<div style="position:absolute;bottom:0;left:12%;right:12%;height:' + y(now) + 'px;background:' + c + ';border-radius:8px 8px 0 0;z-index:1"></div>' +
      '<div style="position:absolute;bottom:' + (y(Math.max(now, fc)) + 4) + 'px;width:100%;text-align:center;z-index:3;font-size:12px;font-weight:700">' + lbl + '</div></div>';
    let grid = ''; [0, 50, 100].forEach((v) => { grid += '<div style="position:absolute;left:-34px;right:0;bottom:' + y(v) + 'px;border-top:' + (v === 100 ? '2px dashed #111827' : '1px solid #eef0f3') + ';z-index:' + (v === 100 ? 2 : 0) + '"><span style="position:absolute;left:0;top:-8px;font-size:11px;color:#6b7280">' + v + '%</span></div>'; });
    let bars = '', labs = '';
    wk.forEach((w) => {
      labs += '<div style="color:#6b7280">Tuần ' + (w.i + 1) + '</div>';
      if (!w.dn) { bars += '<div style="position:relative;height:100%"><div style="position:absolute;bottom:0;left:12%;right:12%;height:' + y(100) + 'px;border:1.5px dashed #cbd5e1;border-bottom:none;border-radius:8px 8px 0 0"></div><div style="position:absolute;bottom:' + (y(100) + 4) + 'px;width:100%;text-align:center;font-size:11px;color:#9ca3af">KPI ' + f(w.kpi) + '</div></div>'; return; }
      w.fc = w.run ? w.s / w.dn * w.len : w.s; w.pcNow = w.kpi ? w.s / w.kpi * 100 : 0; w.pcFc = w.kpi ? w.fc / w.kpi * 100 : 0; w.c = TQC(w.pcFc);
      bars += bar(w.pcNow, w.pcFc, w.c[2], '<span style="color:' + w.c[1] + '">' + p(w.pcFc) + '</span>');
    });
    const cM = TQC(pcFcM);
    bars += '<div style="border-left:1px solid #d1d5db;height:100%"></div>' + bar(pcNowM, pcFcM, cM[2], '<span style="color:' + cM[1] + '">' + p(pcFcM) + '</span>');
    labs += '<div></div><div style="font-weight:700">Tổng tháng</div>';
    const chart = '<div class="box"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px"><b style="font-size:13px">Biểu đồ % đạt KPI</b>' +
      '<span style="color:#6b7280"><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:2px;vertical-align:-1px"></span> Đã đạt &nbsp;<span style="display:inline-block;width:10px;height:10px;background:#22c55e;opacity:.3;border-radius:2px;vertical-align:-1px"></span> Dự kiến &nbsp;<span style="display:inline-block;width:14px;border-top:2px dashed #111827;vertical-align:3px"></span> Mục tiêu 100%</span></div>' +
      '<div style="position:relative;height:200px;margin:22px 0 0 34px">' + grid + '<div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) 6px minmax(0,1.2fr);gap:16px;align-items:end;padding:0 8px">' + bars + '</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) 6px minmax(0,1.2fr);gap:16px;padding:6px 8px 0;margin-left:34px;font-size:12px;text-align:center">' + labs + '</div></div>';
    // thẻ tuần + tổng tháng
    let cards = '';
    wk.forEach((w) => {
      const head = '<div class="h">Tuần ' + (w.i + 1) + ' <span style="font-weight:400;font-size:11px">· KPI ' + (Math.round(R[w.i] * 1000) / 10).toLocaleString('vi-VN') + '% tháng</span></div>';
      if (!w.dn) { cards += '<div class="card" style="border:1px dashed #cbd5e1;color:#9ca3af">' + head + '<div class="l" style="margin-top:8px">KPI ' + f(w.kpi) + ' SP</div><div class="l">Chưa tới</div></div>'; return; }
      const prev = w.i ? wk[w.i - 1] : null, cmp = prev && prev.dn && prev.s ? ((w.s / w.dn) / (prev.s / prev.dn) - 1) * 100 : null, gap = w.fc - w.kpi;
      cards += '<div class="card" style="background:' + w.c[0] + ';color:' + w.c[1] + (w.run ? ';outline:2px solid ' + w.c[2] : '') + '">' + head +
        '<div class="v">' + f(w.s) + '<span style="font-size:13px;font-weight:400"> / ' + f(w.kpi) + '</span></div>' +
        '<div class="l">% KPI tuần: ' + (w.pcNow >= 100 ? GOOD(p1(w.pcNow)) : '<b>' + p1(w.pcNow) + '</b>') + '</div>' +
        (w.run ? '<div class="l">Lũy kế tuần dự kiến: ' + (w.pcFc >= 100 ? GOOD(f(w.fc) + ' (' + p(w.pcFc) + ')') : '<b>' + f(w.fc) + '</b> (' + p(w.pcFc) + ')') + '</div>' : '') +
        '<div class="l">' + (gap >= 0 ? GOOD('Vượt ' + f(gap) + ' SP') : BAD('Thiếu ' + f(-gap) + ' SP')) + '</div>' +
        '<div class="l">' + (cmp == null ? '&nbsp;' : 'So tuần trước ' + (cmp >= 0 ? GOOD('▲ ' + p1(cmp)) : BAD('▼ ' + p1(-cmp)))) + '</div></div>';
    });
    const month = '<div class="card" style="background:' + cM[0] + ';color:' + cM[1] + ';outline:2px solid ' + cM[2] + '"><div class="h">Tổng tháng</div>' +
      '<div class="v">' + f(lk) + '<span style="font-size:13px;font-weight:400"> / ' + f(mt) + '</span></div>' +
      '<div class="l">Lũy kế tháng có thể đạt: ' + (pcFcM >= 100 ? GOOD(f(fcM) + ' (' + p(pcFcM) + ')') : '<b>' + f(fcM) + '</b> (' + p(pcFcM) + ')') + '</div>' +
      '<div class="l">' + (fcM >= mt ? GOOD('Vượt ' + f(fcM - mt) + ' SP') : BAD('Thiếu ' + f(mt - fcM) + ' SP')) + '</div></div>';
    // Ô 1–3: đơn hủy, thay đổi tỉ lệ hủy, kết quả nếu hủy giảm
    let huy = 0; for (let n = 1; n <= pass; n++) huy += khos.reduce((a, k) => a + (((D.cntH || {})[k] || {})[day(n)] || 0), 0);
    const T = lk + huy, rateNow = T ? huy / T * 100 : 0;
    const rNew = tq.rate == null || isNaN(tq.rate) ? Math.round(rateNow * 10) / 10 : Math.max(0, Math.min(100, tq.rate));
    const giaoNew = T * (1 - rNew / 100), them = giaoNew - lk, pcNew = mt ? giaoNew / mt * 100 : 0, fcNew = pass ? giaoNew / pass * D.nd : 0, pcFcNew = mt ? fcNew / mt * 100 : 0;
    const cH = ['#fff7ed', '#9a3412', '#fb923c'], cN = TQC(pcFcNew);
    const huyCards = '<div class="card" style="background:' + cH[0] + ';color:' + cH[1] + ';outline:2px solid ' + cH[2] + '"><div class="h">Đơn hủy</div>' +
      '<div class="v">' + f(huy) + '<span style="font-size:13px;font-weight:400"> SP hủy</span></div>' +
      '<div class="l">Tỉ lệ hủy: <b>' + p1(rateNow) + '</b></div>' +
      '<div class="l" style="font-size:11px;opacity:.85">= SP hủy / SP giao (' + f(huy) + ' / ' + f(T) + ') · ' + fmt(D.nHuy || 0) + ' đơn hủy cả tháng</div></div>' +
      '<div class="card" style="background:#eef2ff;color:#3730a3;outline:2px solid #818cf8"><div class="h">Thay đổi tỉ lệ hủy</div>' +
      '<div class="l" style="margin-top:6px">Tỉ lệ hủy mới: <input id="tqrate" type="number" min="0" max="100" step="0.1" value="' + rNew + '" style="width:70px;height:26px;border:1px solid #a5b4fc;border-radius:5px;padding:0 6px;font:700 13px Roboto,system-ui,sans-serif;color:#3730a3"> %</div>' +
      '<div class="v" style="margin-top:4px;color:' + (them >= 0 ? '#15803d' : '#b91c1c') + '">' + (them >= 0 ? '+' : '−') + f(Math.abs(them)) + '<span style="font-size:13px;font-weight:400"> SP so với hiện tại</span></div>' +
      '<div class="l">SP hủy còn lại: <b>' + f(T * rNew / 100) + '</b> (trước ' + f(huy) + ')</div></div>' +
      '<div class="card" style="background:' + cN[0] + ';color:' + cN[1] + ';outline:2px solid ' + cN[2] + '"><div class="h">Kết quả nếu SL hủy giảm</div>' +
      '<div class="v">' + f(giaoNew) + '<span style="font-size:13px;font-weight:400"> / ' + f(mt) + '</span></div>' +
      '<div class="l" style="color:#15803d">= Đã giao ' + f(lk) + ' ' + (them >= 0 ? '+' : '−') + ' ' + f(Math.abs(them)) + ' (' + p1(pcNew) + ' mục tiêu)</div>' +
      '<div class="l" style="color:#15803d">Lũy kế tháng có thể đạt: <b>' + f(fcNew) + '</b> (' + p(pcFcNew) + ')</div>' +
      '<div class="l">' + (fcNew >= mt ? GOOD('Vượt ' + f(fcNew - mt) + ' SP') : BAD('Thiếu ' + f(mt - fcNew) + ' SP')) + '</div></div>';
    const note = '<div style="color:#6b7280;font-size:11px;margin-top:10px">Tuần 1 (1–7) · Tuần 2 (8–14) · Tuần 3 (15–21) · Tuần 4 (22–' + D.nd + '). Đã đạt = số lượng sản phẩm theo ngày hẹn giao đến hết ' + vn(D.to) + '. Lũy kế tuần dự kiến = TB SP/ngày của tuần × số ngày của tuần. Lũy kế tháng có thể đạt = TB SP/ngày đã qua × số ngày của tháng. Màu: xanh ≥ 100%, vàng 95–100%, đỏ < 95%.</div>';
    // IV. Hành động: gợi ý cụ thể cần làm
    const acts = [];
    const runW = wk.find((w) => w.run);
    if (runW) {
      const lw = runW.len - runW.dn, needW = runW.kpi - runW.s, avgW = runW.s / runW.dn;
      if (runW.fc < runW.kpi && lw > 0) acts.push([0, 'Tuần ' + (runW.i + 1) + ': còn thiếu <b>' + f(needW) + '</b> SP trong ' + lw + ' ngày → mỗi ngày cần <b>≥ ' + f(needW / lw) + '</b> SP (hiện TB ' + f(avgW) + ' SP/ngày).']);
      else acts.push([1, 'Tuần ' + (runW.i + 1) + ': đang vượt tiến độ, giữ TB ≥ <b>' + f(Math.max(0, needW) / Math.max(1, lw)) + '</b> SP/ngày là đủ KPI tuần (hiện TB ' + f(avgW) + ').']);
    }
    wk.filter((w) => !w.dn).forEach((w) => acts.push([2, 'Tuần ' + (w.i + 1) + ': KPI <b>' + f(w.kpi) + '</b> SP → cần TB <b>' + f(w.kpi / w.len) + '</b> SP/ngày (' + w.len + ' ngày).']));
    if (left > 0) {
      if (fcM < mt) acts.push([0, 'Tháng: dự kiến chỉ đạt ' + p(pcFcM) + '. Cần <b>' + f(miss / left) + '</b> SP/ngày trong ' + left + ' ngày còn lại (hiện TB ' + f(avgM) + ', cần tăng <b>' + p(avgM ? (miss / left / avgM - 1) * 100 : 100) + '</b>).']);
      else acts.push([1, 'Tháng: dự kiến đạt ' + p(pcFcM) + '. Giữ TB ≥ <b>' + f(Math.max(0, miss) / left) + '</b> SP/ngày là đủ mục tiêu.']);
    }
    if (!tq.kho && KHO_ORDER.length > 1) KHO_ORDER.forEach((k) => {
      const mk = cfg.kho[k] || 0; if (!mk) return; let lkk = 0; for (let n = 1; n <= pass; n++) lkk += ((D.cnt[k] || {})[day(n)] || 0);
      const fk = pass ? lkk / pass * D.nd : 0;
      if (left <= 0) return;
      if (fk < mk) acts.push([0, 'Kho ' + esc(k) + ': dự kiến ' + p(fk / mk * 100) + ' mục tiêu → cần <b>' + f((mk - lkk) / left) + '</b> SP/ngày (hiện TB ' + f(pass ? lkk / pass : 0) + ').']);
      else acts.push([1, 'Kho ' + esc(k) + ': dự kiến ' + p(fk / mk * 100) + ' mục tiêu, giữ TB ≥ <b>' + f(Math.max(0, mk - lkk) / left) + '</b> SP/ngày.']);
    });
    const bad = acts.some((x) => x[0] === 0);
    const action = '<div class="act" style="background:#fff;color:#374151;border:1px solid ' + (bad ? '#fca5a5' : '#86efac') + '">' +
      (acts.length ? acts.map((x) => '<div style="color:' + (x[0] === 0 ? '#b91c1c' : x[0] === 1 ? '#15803d' : '#4b5563') + '">' + (x[0] === 0 ? '🔴 ' : x[0] === 1 ? '🟢 ' : '⚪ ') + x[1] + '</div>').join('') : '<div>Tháng đã kết thúc.</div>') + '</div>';
    const h = '<div class="sec">I. Mục tiêu</div>' + top +
      '<div class="sec">II. KPI tuần</div><div class="wk" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + cards + '</div>' +
      '<div class="sec">III. Kết quả</div><div class="wk" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + month + huyCards + '</div>' +
      '<div class="sec">Biểu đồ</div>' + chart + note +
      '<div class="sec">IV. Hành động</div>' + action;
    out.innerHTML = h;
    const ri = out.querySelector('#tqrate'); if (ri) ri.onchange = () => { tq.rate = parseFloat(String(ri.value).replace(',', '.')); renderTQ(); const r2 = tqRoot.querySelector('#tqrate'); if (r2) r2.focus(); };
  }

  // ======================= 🚚 GHÉP TUYẾN (trong Tổng quan) =======================
  // Gom đơn "Chưa điều phối" đang hiện trên trang theo xã/phường → mỗi tuyến 1 lần Phân tuyến giao hàng, phương tiện Xe máy.
  const GT_ROUTES = [
    ['Triệu Sơn', ['Xã Triệu Sơn', 'Xã Thọ Bình', 'Xã Thọ Ngọc', 'Xã Thọ Phú', 'Xã Hợp Tiến', 'Xã An Nông', 'Xã Tân Ninh', 'Xã Đồng Tiến']],
    ['Sầm Sơn', ['Phường Sầm Sơn', 'Phường Nam Sầm Sơn']],
    ['Quảng Xương', ['Xã Lưu Vệ', 'Xã Quảng Yên', 'Xã Quảng Ngọc', 'Xã Quảng Ninh', 'Xã Quảng Bình', 'Xã Tiên Trang', 'Xã Quảng Chính']],
    ['Bỉm Sơn', ['Xã Hà Trung', 'Xã Tống Sơn', 'Xã Hà Long', 'Xã Hoạt Giang', 'Xã Lĩnh Toại', 'Phường Bỉm Sơn', 'Phường Quang Trung', 'Xã Nga Sơn', 'Xã Nga Thắng', 'Xã Hồ Vương', 'Xã Tân Tiến', 'Xã Nga An', 'Xã Ba Đình', 'Xã Đông Thành', 'Xã Hậu Lộc', 'Xã Hoa Lộc', 'Xã Vạn Lộc']],
    ['Yên Định', ['Xã Yên Định', 'Xã Yên Trường', 'Xã Yên Phú', 'Xã Quý Lộc', 'Xã Yên Ninh', 'Xã Định Tân', 'Xã Định Hòa', 'Xã Vĩnh Lộc', 'Xã Tây Đô', 'Xã Biện Thượng', 'Xã Thiệu Hóa', 'Xã Thiệu Quang', 'Xã Thiệu Tiến', 'Xã Thiệu Toán', 'Xã Thiệu Trung']],
    ['Nghi Sơn', ['Phường Ngọc Sơn', 'Phường Tân Dân', 'Phường Hải Lĩnh', 'Phường Đào Duy Từ', 'Phường Tĩnh Gia', 'Phường Hải Bình', 'Phường Trúc Lâm', 'Phường Nghi Sơn']],
    ['Hoằng Hóa', ['Xã Hoằng Hóa', 'Xã Hoằng Tiến', 'Xã Hoằng Thanh', 'Xã Hoằng Lộc', 'Xã Hoằng Châu', 'Xã Hoằng Sơn', 'Xã Hoằng Phú', 'Xã Hoằng Giang']],
    ['Thành Phố', ['Phường Hạc Thành', 'Phường Quảng Phú', 'Phường Đông Sơn', 'Phường Đông Quang', 'Phường Đông Tiến', 'Phường Hàm Rồng', 'Phường Nguyệt Viên']],
    ['Nông Cống', ['Xã Nông Cống', 'Xã Thắng Lợi', 'Xã Trung Chính', 'Xã Trường Văn', 'Xã Thăng Bình', 'Xã Tượng Lĩnh', 'Xã Công Chính']],
    ['Như Thanh', ['Xã Như Thanh', 'Xã Xuân Du', 'Xã Mậu Lâm', 'Xã Yên Thọ', 'Xã Thanh Kỳ', 'Xã Xuân Thái']],
  ];
  // khóa so khớp: chữ thường, dấu thanh không phụ thuộc vị trí ("Hoà" = "Hòa")
  const gtKey = (s) => String(s || '').normalize('NFD').toLowerCase().split(/\s+/).filter(Boolean).map((w) => { const t = (w.match(/[̣̀́̃̉]/g) || []).join(''); return w.replace(/[̣̀́̃̉]/g, '') + t; }).join(' ');
  // Tuyến gộp: 1 nút lọc nhiều tuyến cùng lúc
  const GT_COMBOS = []; // (đã bỏ NC-NT theo yêu cầu anh)
  const GT_USERS = ["111333 - Phạm Đình Cao", "112413 - Nguyễn Xuân Toàn", "112790 - Trần Đức Duy", "113009 - Lê Xuân Cường", "115723 - Lê Xuân Biên", "117398 - Phạm Xuân Đạt", "117574 - Ngô Văn Phong", "132267 - Đoàn Văn Sơn", "132713 - Huỳnh Tấn Đạt", "146459 - Trương Văn Hùng", "146505 - Nguyễn Ngọc Nam", "147033 - Trần Văn Quang", "151285 - Lê Văn Toán", "155163 - Lê Minh Tâm", "155926 - Trần Văn Tuấn", "158216 - Phan Văn Tuấn", "168584 - Lê Duy Thông", "168585 - Lương Văn Minh", "169249 - Lê Văn Thịnh", "169411 - Nguyễn Thị Hạnh", "169491 - Lê Văn Định", "171499 - Dương Văn Trường", "171740 - Trần Xuân Ước", "173590 - Phạm Ngọc Anh", "173871 - Lê Xuân Trường", "177307 - Lê Văn Vinh", "178000 - Nguyễn Văn Tuấn", "178401 - Nguyễn Văn Nghĩa", "179105 - Lê Kim Đức", "179880 - Phạm Tuấn Anh", "18045 - Tống Văn Đức", "182365 - Lê Văn Hà", "186020 - Trần Đăng Nam", "189091 - Nguyễn Văn Dũng", "194361 - Hoàng Văn Báo", "222281 - Hà Văn Cướn", "22845 - Đoàn Văn Thêm", "232664 - Lê Hữu Khang", "233379 - Lê Văn Đức", "236108 - Nguyễn Hữu Trường", "241185 - Đỗ Văn Vương", "249264 - Lê Xuân Đạt", "251957 - Đàm Xuân Dũng", "251966 - Nguyễn Văn Quân", "253100 - Hồ Văn Vũ", "253933 - Nguyễn Văn Thiên", "254232 - Nguyễn Bá Tưởng", "255361 - Nguyễn Văn Xuân", "255438 - Vìn Bá Đạt", "255987 - Trịnh Đình Anh", "256004 - Nguyễn Bá Sơn", "256241 - Trần Văn Chinh", "256572 - Bùi Văn Phụng", "259641 - Đỗ Huy Duẩn", "27080 - Đinh Trọng Hòa", "272180 - Trần Hữu Hòa", "273351 - Trịnh Xuân Huy", "278830 - Trần Ngọc Lượng", "278856 - Vũ Trọng Chung", "280020 - Đỗ Văn Tùng", "282931 - Phạm Văn Cường", "293706 - Trần Công Minh", "299121 - Lê Thúc Bình", "308214 - Lê Khả Trí", "308692 - Phạm Đức Hùng", "314378 - Trịnh Duy Đạt", "32901 - Lê Ngọc Anh", "32902 - Đoàn Văn Hải", "32912 - Lê Nhân Hưng", "34809 - Lê Văn Thanh", "35030 - Nguyễn Văn Đạt", "37220 - Phạm Hồng Thống", "48329 - Phạm Nguyên Hoàng", "48330 - Đồng Xuân Trí", "49709 - Nguyễn Quảng Hưng", "50797 - Nguyễn Hữu Hưng", "52272 - Lê Văn Hợp", "52925 - Võ Văn Thức", "54831 - Lê Văn Quang", "55554 - Bùi Xuân Hướng", "62100 - Nguyễn Xuân Hùng", "62102 - Phạm Văn Thành", "62103 - Trịnh Hữu Tú", "62232 - Trương Văn Kiên", "64673 - Nguyễn Văn Định", "74151 - Lê Xuân Cường", "79044 - Lê Văn Dũng", "79137 - Trần Văn Tâm", "79141 - Lò Văn Kiên", "79181 - Nguyễn Xuân Chương", "79182 - Phạm Xuân Phương", "79833 - Nguyễn Quốc Cường", "79836 - Hà Văn Sơn", "81504 - Lê Văn An", "84219 - Ngô Văn Dân", "85301 - Phạm Như Hiển", "85688 - Lâm Ngọc Nhân", "90733 - Hoàng Văn Hải", "94586 - Trần Gia Tuấn", "98501 - Đặng Minh Đức"]; // danh sách Nhân viên thực hiện (lấy từ khung Phân tuyến của TMS)
  const GT_KHAC = '#khac'; // mục "Khác": đơn không thuộc tuyến nào
  const GT_KHO = { '#k5888': '5888' }; // mục lọc theo Kho gửi (vd "5888": chỉ đơn có Kho gửi 5888)
  const gtCombo = (v) => (GT_COMBOS.find((c) => c[0] === v) || [])[1];
  const gtCnt = (S, v) => { if (v === GT_KHAC) return S.none.length; if (GT_KHO[v]) return S.rows.filter((o) => o.kho === GT_KHO[v]).length; const c = gtCombo(v); return c ? c.reduce((a, r) => a + S.by[r].length, 0) : S.by[v].length; };
  const GT_MAP = new Map(); GT_ROUTES.forEach(([r, ws]) => ws.forEach((w) => GT_MAP.set(gtKey(w), r)));
  const gt = { route: '', running: false, log: [], scan: null, from: '', to: '' };
  gt.ptUsers = []; try { gt.ptUsers = JSON.parse(localStorage.getItem('tk_pt_users') || '[]'); if (!gt.ptUsers.length && localStorage.getItem('tk_pt_user')) gt.ptUsers = [localStorage.getItem('tk_pt_user')]; } catch (e) {}
  const gtSleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function gtWard(addr) {
    const segs = String(addr || '').split(',').map((s) => s.trim()).filter(Boolean).reverse();
    for (const s of segs) { if (/^(tỉnh|thành phố|tp\.?)\s/i.test(s)) continue; return { ward: s, route: GT_MAP.get(gtKey(s)) || '' }; }
    return { ward: '', route: '' };
  }
  function gtScan() {
    const rows = [...document.querySelectorAll('tr.ant-table-row.mso-row')].map((tr) => {
      const addr = ((tr.querySelector('.mso-addr') || {}).textContent || '').trim(), key = tr.getAttribute('data-row-key') || '', w = gtWard(addr);
      const klb = [...tr.querySelectorAll('.sr-kv > span')].find((e) => e.textContent.trim() === 'Kho gửi'), kho = klb && klb.nextElementSibling ? (klb.nextElementSibling.textContent.trim().match(/^\d+/) || [''])[0] : '';
      return { tr, id: key.replace(/-\d+$/, ''), addr, ward: w.ward, route: w.route, kho };
    });
    const by = {}; GT_ROUTES.forEach(([r]) => (by[r] = []));
    rows.forEach((o) => { if (o.route) by[o.route].push(o); });
    const te = [...document.querySelectorAll('.mso-total')].find((e) => /Tổng đơn/.test(e.innerText)), total = te ? Number((te.innerText.match(/\d+/) || [])[0]) : null;
    return { rows, by, none: rows.filter((o) => !o.route), total };
  }
  // Ẩn/hiện dòng trên trang TMS: chỉ để lại đơn thuộc tuyến đang chọn ('' = tất cả 5 tuyến)
  function gtApplyView() {
    const S = gt.scan; if (!S) return;
    S.rows.forEach((o) => { const cb = gtCombo(gt.route), show = gt.route === '*' ? true : gt.route === '#sel' ? [...(gt.barSel || [])].some((v) => (v === GT_KHAC ? !o.route : GT_KHO[v] ? o.kho === GT_KHO[v] : gtCombo(v) ? gtCombo(v).includes(o.route) : o.route === v)) : GT_KHO[gt.route] ? o.kho === GT_KHO[gt.route] : gt.route === GT_KHAC ? !o.route : cb ? cb.includes(o.route) : gt.route ? o.route === gt.route : !!o.route; o.tr.style.display = show ? '' : 'none'; });
    gtHeadCk();
  }
  function gtShowAll() { document.querySelectorAll('tr.ant-table-row.mso-row').forEach((tr) => (tr.style.display = '')); document.querySelectorAll('.tkgt-tag').forEach((t) => t.remove()); gtUnKho(); const w = document.getElementById('tkgt-all'); if (w) w.remove(); }
  function renderGT() {
    const box = gtRoot && gtRoot.querySelector('#gt'); if (!box) return;
    const bt = (v, t, bg) => '<button class="btn gtgo" data-v="' + esc(v) + '" style="background:' + bg + ';border-color:' + bg + ';color:#fff;height:36px;font-size:13.5px;padding:0 16px"' + (gt.running ? ' disabled' : '') + '>' + t + '</button>';
    box.innerHTML = '<div class="box">' +
      '<div style="color:#374151;margin-bottom:8px">Anh chọn Từ ngày / Đến ngày rồi bấm tên tuyến → em vào trang TMS đặt đúng Từ ngày / Đến ngày, chọn <b>Chưa điều phối</b> → <b>Bộ lọc nâng cao</b> → Tỉnh/thành phố <b>1015 - Tỉnh Thanh Hóa</b> (Phường/Xã để trống) → Tìm kiếm, rồi chỉ để lại các đơn của tuyến đó trên trang để anh xử lý tiếp.</div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap"><label style="margin:0;font-size:12.5px">Từ ngày</label><input type="date" id="gtfrom" value="' + (gt.from || ymd(today())) + '" style="height:30px;border:1px solid #cfd5dd;border-radius:4px;padding:0 6px;font-size:13px"><label style="margin:0 0 0 6px;font-size:12.5px">Đến ngày</label><input type="date" id="gtto" value="' + (gt.to || ymd(today())) + '" style="height:30px;border:1px solid #cfd5dd;border-radius:4px;padding:0 6px;font-size:13px"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + GT_ROUTES.map(([r]) => bt(r, '🚚 ' + r, '#7c3aed')).join('') + GT_COMBOS.map(([c, rs]) => bt(c, '🚚 ' + c + ' (' + rs.join(' + ') + ')', '#9333ea')).join('') + bt(GT_KHAC, '📦 Khác (ngoài các tuyến)', '#64748b') + Object.keys(GT_KHO).map((k) => bt(k, '🏬 ' + GT_KHO[k] + ' (Kho gửi ' + GT_KHO[k] + ')', '#b45309')).join('') + bt('', '⚡ Tất cả tuyến', '#15803d') + '</div>' +
      (gt.log.length ? '<div style="margin-top:8px;color:' + (/⛔/.test(gt.log.join('')) ? '#b91c1c' : '#15803d') + '">' + gt.log.join(' · ') + '</div>' : '') + '</div>';
    box.querySelector('#gtfrom').onchange = (e) => { gt.from = e.target.value; if (gt.to && gt.to < gt.from) { gt.to = gt.from; box.querySelector('#gtto').value = gt.to; } };
    box.querySelector('#gtto').onchange = (e) => { gt.to = e.target.value; if (gt.from && gt.to < gt.from) { gt.from = gt.to; box.querySelector('#gtfrom').value = gt.from; } };
    box.querySelectorAll('.gtgo').forEach((x) => (x.onclick = () => runGT(x.dataset.v)));
  }
  // 🚀 Phân tuyến tự động: lọc tuyến → tick tất cả → + Phân tuyến giao hàng → Xe máy → Nhân viên thực hiện → Cập nhật
  async function runPT(route, users, opt) {
    opt = opt || {};
    if (gt.running) return;
    if (!route) return alert('Anh chọn tuyến trước nhé.');
    users = (users || []).filter(Boolean); const codes = users.map((u) => (String(u).match(/^\d+/) || [''])[0]).filter(Boolean);
    if (!codes.length) return alert('Anh chọn ít nhất 1 user (Nhân viên thực hiện) nhé.');
    const user = users.join(', ');
    const rname = opt.rname ? opt.rname : route === '#all' ? 'Tất cả tuyến' : GT_KHO[route] ? 'Kho gửi ' + GT_KHO[route] : route === GT_KHAC ? 'Khác' : 'Tuyến ' + route;
    let toast = document.getElementById('tkpt-toast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'tkpt-toast'; document.body.appendChild(toast); }
    toast.style.cssText = 'position:fixed;right:16px;bottom:60px;z-index:2147483000;max-width:320px;background:#fff;border:1.5px solid #ea580c;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,.18);padding:6px 9px;font:11.5px/1.4 Roboto,system-ui,sans-serif;color:#111827';
    const lines = []; const T = (t) => { lines.push(t); toast.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px"><b style="color:#9a3412">🚀 Phân tuyến ' + esc(rname) + ' · ' + esc(user) + '</b><span id="tkpt-x" style="cursor:pointer;color:#6b7280">✕</span></div>' + lines.join('<br>'); toast.querySelector('#tkpt-x').onclick = () => toast.remove(); };
    try {
      if (!opt.skip) {
        T('① Lọc ' + esc(rname) + ' trên TMS…');
        await runGT(route === '#all' ? '' : route);
        if (route === '#all') { gt.route = ''; gtApplyView(); gtBar(); }
        if (/⛔/.test(gt.log.join(''))) throw new Error(gt.log.join(' ').replace(/<[^>]+>/g, ''));
      } else T(opt.manual ? '① Dùng ' + esc(rname) : '① Dùng các đơn ' + esc(rname) + ' đang hiện trên trang');
      gt.running = true;
      const vis = opt.manual ? [...document.querySelectorAll('tr.ant-table-row.mso-row td.mso-act input.ant-checkbox-input')].filter((c) => c.checked) : gtVisRows();
      if (!vis.length) throw new Error(opt.manual ? 'Chưa có đơn nào được tick' : 'Không có đơn ' + rname + ' chưa điều phối trong khoảng ngày đã chọn');
      // bỏ tick cũ (kể cả đơn đang ẩn), rồi tick tất cả đơn của tuyến đang hiện (chế độ đơn tự tick: giữ nguyên)
      if (!opt.manual) for (const c of document.querySelectorAll('tr.ant-table-row.mso-row td.mso-act input.ant-checkbox-input')) { if (c.checked && !vis.includes(c)) { c.click(); await gtSleep(80); } }
      for (const c of vis) { if (!c.checked) { c.click(); await gtSleep(120); } }
      await gtSleep(500);
      const ids = vis.filter((c) => c.checked).map((c) => (c.closest('tr').getAttribute('data-row-key') || '').replace(/-\d+$/, ''));
      const nSel = ckSel();
      if (ids.length !== vis.length || (nSel != null && nSel !== vis.length)) throw new Error('Đơn đã chọn = ' + nSel + ', cần ' + vis.length + ' — dừng');
      T('② Đã tick ' + ids.length + ' đơn → + Phân tuyến giao hàng');
      const pb = [...document.querySelectorAll('button')].find((b) => /Phân tuyến giao hàng/.test(b.textContent) && b.offsetParent && !b.disabled);
      if (!pb) throw new Error('Không thấy nút + Phân tuyến giao hàng');
      pb.click();
      const dr = await ckWait(() => [...document.querySelectorAll('.ant-drawer-content, .ant-modal')].find((x) => ckVis(x) && /Phân tuyến điều phối/.test(x.textContent) && x.querySelectorAll('.ant-select').length >= 2), 10000);
      if (!dr) throw new Error('Khung Phân tuyến điều phối không mở');
      await gtSleep(800);
      const closeDr = () => { const x = dr.querySelector('.ant-drawer-close, .ant-modal-close'); x && x.click(); };
      const miss = ids.filter((i) => !dr.textContent.includes(i));
      if (miss.length) { closeDr(); throw new Error('Khung thiếu vận đơn ' + miss.join(', ') + ' — đã đóng, không cập nhật'); }
      const xm = [...dr.querySelectorAll('button')].find((b) => /Xe máy\s*$/.test(b.textContent.trim()));
      if (!xm) { closeDr(); throw new Error('Không thấy nút Xe máy — đã đóng'); }
      xm.click(); await gtSleep(700);
      T('③ Xe máy ✔ → chọn Nhân viên thực hiện ' + esc(user));
      const us = [...dr.querySelectorAll('.ant-select')].find((x) => x.classList.contains('ant-select-multiple')) || dr.querySelectorAll('.ant-select')[1];
      const ui = us.querySelector('input');
      const lbls = [];
      for (const code of codes) {
        // đóng danh sách cũ (nếu đang mở) rồi mở lại cho chắc, tránh bấm nhầm vào danh sách đang đóng
        const openDd = () => { const l = document.getElementById(ui.id + '_list'), d = l && l.closest('.ant-select-dropdown'); return d && !d.classList.contains('ant-select-dropdown-hidden') && d.getClientRects().length ? d : null; };
        if (openDd()) { ui.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); await gtSleep(400); }
        if (!openDd()) { us.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); await gtSleep(400); }
        ui.focus();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(ui, code); ui.dispatchEvent(new Event('input', { bubbles: true }));
        const op = await ckWait(() => { const l = document.getElementById(ui.id + '_list'), d = l && l.closest('.ant-select-dropdown'); return d && [...d.querySelectorAll('.ant-select-item-option')].find((o) => o.textContent.trim().startsWith(code + ' - ')); }, 6000);
        if (!op) { closeDr(); throw new Error('Không tìm thấy user ' + code + ' — đã đóng, không cập nhật'); }
        if (!/selected/.test(op.className)) op.click();
        lbls.push(op.textContent.trim());
        await gtSleep(900);
        if (![...us.querySelectorAll('.ant-select-selection-item')].some((t) => t.textContent.trim().startsWith(code + ' - '))) { const op2 = [...((openDd() || document).querySelectorAll('.ant-select-item-option'))].find((o) => o.textContent.trim().startsWith(code + ' - ')); if (op2) { op2.click(); await gtSleep(900); } }
      }
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); await gtSleep(500);
      const lbl = lbls.join(', '), tags = [...us.querySelectorAll('.ant-select-selection-item')].map((t) => t.textContent.trim());
      const missU = codes.filter((c) => !tags.some((t) => t.startsWith(c + ' - ')));
      if (missU.length) { closeDr(); throw new Error('Chọn user ' + missU.join(', ') + ' chưa được — đã đóng, không cập nhật'); }
      const got = [...dr.querySelectorAll('*')].filter((e) => e.children.length === 0 && codes.some((c) => e.textContent.trim().startsWith(c + ' - ')) && !e.closest('.ant-select') && !e.closest('.ant-select-dropdown')).length; // số thẻ đơn đã gán user
      if (got < ids.length) { closeDr(); throw new Error('Mới gán user cho ' + Math.max(0, got) + '/' + ids.length + ' đơn — đã đóng, không cập nhật'); }
      if (window.__tkptDry) { T('🧪 THỬ: đã gán ' + got + '/' + ids.length + ' đơn cho ' + esc(lbl) + ' — không bấm Cập nhật'); closeDr(); await gtSleep(600); for (const c of vis) { if (c.checked) { c.click(); await gtSleep(80); } } return; }
      const up = [...dr.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cập nhật');
      if (!up) { closeDr(); throw new Error('Không thấy nút Cập nhật'); }
      T('④ Bấm Cập nhật…');
      ckMarkOld(document); up.click();
      const r = await ckWait(() => (ckAlert(document) ? 'ERR:' + ckAlert(document) : null) || ckToast(document, /cập nhật.*thành công/i), 15000);
      if (!r || /^ERR:/.test(r)) { if (r) ckCloseAlert(document); throw new Error('TMS báo: ' + (r ? r.slice(4) : 'không thấy thông báo')); }
      T('✅ ' + esc((String(r).match(/Cập nhật.*?thành công/i) || [r])[0]) + ' — ' + ids.length + ' đơn ' + esc(rname) + ' · Xe máy · ' + esc(lbl));
      await gtSleep(800);
      const m2 = [...document.querySelectorAll('.ant-drawer-content, .ant-modal')].find((x) => ckVis(x) && /Phân tuyến điều phối/.test(x.textContent));
      if (m2) { const d = [...m2.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Đóng') || m2.querySelector('.ant-drawer-close, .ant-modal-close'); d && d.click(); }
      gt.route = '*'; gtApplyView(); gtBar();
      const sb = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Tìm kiếm' && x.offsetParent); if (sb) sb.click();
      gt.ptUsers = []; if (gt.barSel) gt.barSel.clear(); try { localStorage.removeItem('tk_pt_users'); localStorage.removeItem('tk_pt_user'); } catch (er) {} // gắn xong → xóa user đã chọn
      T('— Xong lúc ' + new Date().toLocaleTimeString('vi-VN') + ', đã về Hiện toàn bộ · đã xóa user đã chọn');
      setTimeout(() => { const tt = document.getElementById('tkpt-toast'); if (tt && /Xong lúc/.test(tt.textContent)) tt.remove(); }, 4000); // gán xong: thông báo tự tắt sau 4 giây
    } catch (e) { T('⛔ ' + esc(e.message || String(e))); const tt = toast; setTimeout(() => { if (tt && tt.isConnected && /⛔/.test(tt.textContent)) tt.remove(); }, 2500);
      // gán lỗi: đóng khung Phân tuyến (nếu còn mở) và trở lại màn hình chính (Hiện toàn bộ)
      const md = [...document.querySelectorAll('.ant-drawer-content, .ant-modal')].find((x) => ckVis(x) && /Phân tuyến điều phối/.test(x.textContent)); if (md) { const x = md.querySelector('.ant-drawer-close, .ant-modal-close'); x && x.click(); }
      if (gt.barSel) gt.barSel.clear(); if (gt.scan) { gt.route = '*'; gtApplyView(); gtBar(); } } // gán lỗi: thông báo tự tắt sau 2,5 giây
    finally { gt.running = false; }
  }
  // Thanh lọc tuyến nổi trên trang TMS (anh xử lý đơn ngay trên trang)
  // bấm ra ngoài ô chọn user → tự đóng danh sách user
  document.addEventListener('mousedown', (e) => { if (!gt.barPop) return; const pop = document.getElementById('tkgt-upop'), ub = document.getElementById('tkgt-ubtn'); if ((pop && pop.contains(e.target)) || (ub && ub.contains(e.target))) return; gt.barPop = false; if (pop) pop.style.display = 'none'; }, true);
  function gtBar() {
    let bar = document.getElementById('tkgt-bar'); const S = gt.scan;
    if (!S) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'tkgt-bar'; document.body.appendChild(bar); }
    if (!gt.barSel) gt.barSel = new Set();
    bar.style.cssText = 'position:fixed;left:16px;bottom:8px;z-index:2147482000;background:#fff;border:2px solid #7c3aed;border-radius:12px;box-shadow:0 6px 18px rgba(76,29,149,.22);padding:5px 8px;display:flex;gap:4px;align-items:center;flex-wrap:nowrap;width:max-content;box-sizing:border-box;font:600 11.5px Roboto,system-ui,sans-serif;color:#4c1d95';
    const ab = (r) => r.normalize('NFC').split(/\s+/).map((w) => w[0].toUpperCase()).join('');
    const tip = (v) => (v === '*' ? 'Hiện toàn bộ' : v === GT_KHAC ? 'Đơn không thuộc tuyến nào' : GT_KHO[v] ? 'Chỉ đơn có Kho gửi ' + GT_KHO[v] : gtCombo(v) ? 'Gộp tuyến ' + gtCombo(v).join(' + ') : 'Tuyến ' + v);
    const on = (v) => gt.route === v || (gt.route === '#sel' && gt.barSel.has(v));
    const b = (v, t, n, ck) => '<span data-v="' + esc(v) + '" title="' + esc(tip(v)) + (ck ? ' — tick ô để chọn tuyến cần gắn user' : '') + '" style="display:inline-flex;align-items:center;gap:4px;border:1px solid #c4b5fd;border-radius:6px;padding:2px 6px;cursor:pointer;font:600 11.5px Roboto,system-ui,sans-serif;line-height:16px;white-space:nowrap;' + (on(v) ? 'background:#7c3aed;color:#fff' : 'background:#f5f3ff;color:#4c1d95') + '">' + (ck ? '<input type="checkbox" data-ck="' + esc(v) + '"' + (gt.barSel.has(v) ? ' checked' : '') + ' style="margin:0;width:12px;height:12px;accent-color:#ea580c;cursor:pointer">' : '') + t + ' <b>' + n + '</b></span>';
    const nu = (gt.ptUsers || []).length;
    const ready = nu && !gt.running; // có user là bấm Gắn được (tuyến đã tick hoặc đơn anh tự tick)
    bar.innerHTML = GT_ROUTES.map(([r]) => b(r, ab(r), S.by[r].length, 1)).join('') + GT_COMBOS.map(([c]) => b(c, c, gtCnt(S, c), 1)).join('') + b(GT_KHAC, 'Khác', gtCnt(S, GT_KHAC), 1) + Object.keys(GT_KHO).map((k) => b(k, GT_KHO[k], gtCnt(S, k), 1)).join('') + b('*', 'Hiện toàn bộ', S.rows.length, 0) +
      '<span style="position:relative;display:inline-flex"><span id="tkgt-ubtn" title="Chọn user (Nhân viên thực hiện), chọn được nhiều" style="display:inline-flex;align-items:center;gap:4px;border:1px solid #fdba74;border-radius:6px;padding:2px 7px;cursor:pointer;white-space:nowrap;background:#fff7ed;color:#9a3412;max-width:240px;line-height:16px;overflow:hidden;text-overflow:ellipsis">👤 ' + (nu ? esc(gt.ptUsers.map((u) => u.split(' - ')[1] || u).join(', ')) : 'User') + ' ▾</span>' +
      '<div id="tkgt-upop" style="display:' + (gt.barPop ? 'block' : 'none') + ';position:absolute;bottom:100%;left:0;margin-bottom:6px;width:300px;background:#fff;border:1px solid #cfd5dd;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:6px;color:#111827;font-weight:400"><input id="tkgt-uq" placeholder="Gõ mã hoặc tên user…" value="' + esc(gt.barQ || '') + '" style="width:100%;box-sizing:border-box;height:30px;border:1px solid #cfd5dd;border-radius:5px;padding:0 8px;font-size:13px;margin-bottom:4px"><div id="tkgt-ulist" style="max-height:260px;overflow:auto">' +
      GT_USERS.map((u) => '<label class="tkgt-u" style="display:' + (!gt.barQ || u.toLowerCase().includes(gt.barQ.toLowerCase()) ? 'flex' : 'none') + ';gap:6px;align-items:center;padding:3px 4px;font-size:13px;cursor:pointer;margin:0"><input type="checkbox" value="' + esc(u) + '"' + ((gt.ptUsers || []).includes(u) ? ' checked' : '') + '>' + esc(u) + '</label>').join('') + '</div></div></span>' +
      '<button id="tkgt-go" title="Gắn: tuyến đã tick (hoặc các đơn anh tự tick trên trang) → Phân tuyến giao hàng → Xe máy → user → Cập nhật"' + (ready ? '' : ' disabled') + ' style="border:0;border-radius:6px;padding:3px 10px;cursor:' + (ready ? 'pointer' : 'default') + ';font:700 11.5px Roboto,system-ui,sans-serif;white-space:nowrap;background:' + (ready ? '#ea580c' : '#fed7aa') + ';color:#fff">🚀 Gắn</button>' +
      '<button data-x="1" title="Tắt lọc tuyến" style="border:0;background:none;color:#6b7280;font-size:15px;cursor:pointer;padding:0 4px">✕</button>';
    // vừa 1 hàng thì để 1 hàng; dài quá thì chia 2 hàng đều nhau, khung chỉ rộng bằng 1 hàng
    bar.style.width = 'max-content'; bar.style.flexWrap = 'nowrap';
    const full = bar.scrollWidth, cap = window.innerWidth - 130;
    bar.style.zoom = ''; if (full > cap) bar.style.zoom = String(Math.max(0.6, cap / full)); // luôn 1 dòng: hẹp thì thu nhỏ cả thanh
    bar.querySelectorAll('[data-v]').forEach((x) => (x.onclick = (e) => { if (e.target.matches('input[data-ck]')) return; gt.route = x.dataset.v; if (gt.route === '*') gt.barSel.clear(); gtApplyView(); gtBar(); renderGT(); }));
    bar.querySelectorAll('input[data-ck]').forEach((c) => (c.onchange = () => { c.checked ? gt.barSel.add(c.dataset.ck) : gt.barSel.delete(c.dataset.ck); gt.route = gt.barSel.size ? '#sel' : '*'; gtApplyView(); gtBar(); }));
    bar.querySelector('#tkgt-ubtn').onclick = () => { gt.barPop = !gt.barPop; gtBar(); if (gt.barPop) { const q = document.getElementById('tkgt-uq'); q && q.focus(); } };
    const uq = bar.querySelector('#tkgt-uq');
    uq.oninput = () => { gt.barQ = uq.value; const q = uq.value.toLowerCase(); bar.querySelectorAll('.tkgt-u').forEach((l) => (l.style.display = l.textContent.toLowerCase().includes(q) ? 'flex' : 'none')); };
    uq.onkeydown = (e) => { if (e.key === 'Enter') { const vis = [...bar.querySelectorAll('.tkgt-u')].filter((l) => l.style.display !== 'none'); if (vis.length === 1) { const c = vis[0].querySelector('input'); c.checked = !c.checked; c.dispatchEvent(new Event('change')); } } };
    bar.querySelectorAll('.tkgt-u input').forEach((c) => (c.onchange = () => { const v = c.value; gt.ptUsers = c.checked ? (gt.ptUsers || []).concat([v]).filter((x, k, a) => a.indexOf(x) === k) : (gt.ptUsers || []).filter((x) => x !== v); try { localStorage.setItem('tk_pt_users', JSON.stringify(gt.ptUsers)); } catch (er) {} const st = bar.querySelector('#tkgt-ulist').scrollTop; gtBar(); const l2 = document.getElementById('tkgt-ulist'); if (l2) l2.scrollTop = st; const q2 = document.getElementById('tkgt-uq'); if (q2) { q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); } renderGT(); }));
    bar.querySelector('#tkgt-go').onclick = () => { if (!ready) return; gt.barPop = false;
      if (!gt.barSel.size) { const n = document.querySelectorAll('tr.ant-table-row.mso-row td.mso-act input.ant-checkbox-input:checked').length; if (!n) return alert('Anh tick tuyến ở thanh này, hoặc tick đơn trên trang trước nhé.'); return runPT('#manual', gt.ptUsers, { skip: true, manual: true, rname: n + ' đơn anh đã tick' }); }
      const names = [...gt.barSel].map((v) => (v === GT_KHAC ? 'Khác' : GT_KHO[v] ? 'Kho gửi ' + GT_KHO[v] : 'Tuyến ' + v)).join(' + '); gt.route = '#sel'; gtApplyView(); runPT('#sel', gt.ptUsers, { skip: true, rname: names }); };
    bar.querySelector('[data-x]').onclick = () => { gt.scan = null; gt.barSel.clear(); gt.barPop = false; gtShowAll(); gtBar(); renderGT(); };
  }

  // Làm nổi bật "Kho gửi" của MỌI đơn (kiểu B anh chọn): chữ xanh TMS đậm + vạch cam nhỏ bên trái tên kho
  function gtUnKho() { return; // giữ màu Kho gửi cho mọi đơn
  }
  function gtUnKhoOld() { document.querySelectorAll('[data-tkgt-kho]').forEach((e) => { e.style.cssText = e.getAttribute('data-tkgt-kho'); e.removeAttribute('data-tkgt-kho'); }); }
  // Kho gửi: mặc định kiểu B (chữ xanh TMS + vạch cam); riêng các kho trong GT_KHO_C dùng kiểu C (bút dạ quang vàng nhạt)
  const GT_KHO_C = ['5888'];
  function gtKho(tr) {
    const lb = [...tr.querySelectorAll('.sr-kv > span')].find((e) => e.textContent.trim() === 'Kho gửi'); if (!lb) return;
    const val = lb.nextElementSibling, code = val ? (val.textContent.trim().match(/^\d+/) || [''])[0] : '', kind = GT_KHO_C.includes(code) ? 'C' : 'B';
    if (lb.dataset.tkgtK === kind + code) return;
    [lb, val].forEach((e, i) => {
      if (!e) return; if (!e.hasAttribute('data-tkgt-kho')) e.setAttribute('data-tkgt-kho', e.style.cssText);
      e.style.cssText = kind === 'C'
        ? 'color:#111827;font-weight:700;justify-self:start;width:fit-content' + (i ? ';background:#fef9c3;border-radius:3px;padding:0 5px;margin-left:-5px' : '')
        : 'color:#24398a;font-weight:700;justify-self:start;width:fit-content' + (i ? ';border-left:3px solid #f59e0b;padding-left:6px;margin-left:-9px' : '');
    });
    lb.dataset.tkgtK = kind + code;
  }
  function gtTag() { document.querySelectorAll('.tkgt-tag').forEach((t) => t.remove()); } // đã bỏ nhãn "Tuyến …" theo yêu cầu anh

  // Ô "Tất cả" ở đầu cột tick (ô số 1): tick hết các đơn đang hiện của 1 tuyến đã lọc
  const gtVisRows = () => [...document.querySelectorAll('tr.ant-table-row.mso-row')].filter((tr) => tr.style.display !== 'none').map((tr) => tr.querySelector('td.mso-act input.ant-checkbox-input')).filter((c) => c && !c.disabled);
  let gtTicking = false;
  function gtHeadCk() {
    const th = document.querySelector('.ant-table-thead tr > th:first-child');
    let w = document.getElementById('tkgt-all');
    if (!gt.scan || !th) { if (w) w.remove(); return; }
    const one = gt.route && gt.route !== '*';
    if (!w || w.parentElement !== th) {
      if (w) w.remove();
      w = document.createElement('label'); w.id = 'tkgt-all';
      w.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;cursor:pointer;font:700 10.5px Roboto,system-ui,sans-serif;color:#4c1d95;user-select:none';
      w.innerHTML = '<input type="checkbox" style="width:17px;height:17px;accent-color:#7c3aed;cursor:pointer;margin:0"><span>Tất cả</span>';
      th.appendChild(w);
      const ck = w.querySelector('input');
      ck.onchange = async () => {
        if (gtTicking) return;
        if (!(gt.route && gt.route !== '*')) { ck.checked = false; alert('Anh chọn 1 tuyến trên thanh “🚚 Lọc tuyến” trước, rồi mới tick Tất cả.'); return; }
        gtTicking = true; const want = ck.checked;
        for (const c of gtVisRows()) { if (c.checked !== want) { c.click(); await gtSleep(120); } }
        gtTicking = false; gtHeadCk();
      };
    }
    const ck = w.querySelector('input'), rows = gtVisRows();
    if (!gtTicking) ck.checked = !!one && rows.length > 0 && rows.every((c) => c.checked);
    w.title = one ? 'Tick / bỏ tick tất cả đơn ' + (GT_KHO[gt.route] ? 'Kho gửi ' + GT_KHO[gt.route] : gt.route === GT_KHAC ? 'mục Khác' : 'tuyến ' + gt.route) + ' đang hiện' : 'Chọn 1 tuyến trên thanh Lọc tuyến để dùng';
    w.style.opacity = one ? '1' : '.45';
  }
  const gtBtn = (root, re) => [...root.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()) && b.offsetParent && !b.disabled);
  async function gtWait(fn, ms) { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await gtSleep(200); } return null; }
  const gtOpen = (sel) => { const x = sel.querySelector('.ant-select-selector'); x.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); };
  const gtDrop = () => [...document.querySelectorAll('.ant-select-dropdown')].filter((d) => !d.classList.contains('ant-select-dropdown-hidden') && d.offsetParent).pop();
  const gtType = (sel, v) => { const i = sel.querySelector('input'); if (!i) return; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })); };
  const gtCloseDrop = () => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  // Trang TMS chỉ hiện 20 đơn/lần: bấm "Tải thêm dữ liệu" đến khi hiện đủ số đơn
  const gtMoreBtn = () => [...document.querySelectorAll('button')].find((b) => /Tải thêm dữ liệu/.test(b.textContent) && b.offsetParent && !b.disabled);
  async function gtLoadAll(L) {
    for (let k = 0; k < 100; k++) {
      const b = gtMoreBtn(); if (!b) return true;
      const n = document.querySelectorAll('tr.ant-table-row.mso-row').length; L && L('Đang tải thêm đơn… (' + n + ' đơn)');
      b.click();
      const ok = await gtWait(() => document.querySelectorAll('tr.ant-table-row.mso-row').length > n || !gtMoreBtn(), 20000);
      if (!ok) return false; await gtSleep(400);
    }
    return !gtMoreBtn();
  }
  async function runGT(route) {
    if (gt.running) return; gt.running = true; gt.log = []; const L = (t) => { gt.log = [t]; renderGT(); const bq = document.getElementById('tkgt-open-btn'); if (bq) bq.textContent = /^✔|^⛔/.test(t) ? '🚚 Ghép tuyến' : '⏳ ' + String(t).replace(/<[^>]+>/g, '').slice(0, 28); };
    try {
      gtShowAll();
      // 0) Từ ngày / Đến ngày = ngày anh chọn
      const fv = (d) => d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4), dF = fv(gt.from || ymd(today())), dT = fv(gt.to || gt.from || ymd(today()));
      L('Đang chọn ngày ' + dF + ' → ' + dT + '…');
      const pk = [...document.querySelectorAll('.ant-picker input')].filter((i) => i.offsetParent && /Từ ngày|Đến ngày/.test(i.placeholder));
      if (pk.length < 2) throw new Error('Không thấy ô Từ ngày / Đến ngày');
      const pf = pk.find((i) => /Từ ngày/.test(i.placeholder)), pt = pk.find((i) => /Đến ngày/.test(i.placeholder));
      for (const [inp, dv] of [[pf, dF], [pt, dT]]) {
        if (inp.value === dv) continue;
        inp.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); inp.focus(); inp.click(); await gtSleep(300);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, dv); inp.dispatchEvent(new Event('input', { bubbles: true })); await gtSleep(300);
        inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })); await gtSleep(400);
        inp.blur(); gtCloseDrop(); await gtSleep(300);
        if (inp.value !== dv) throw new Error('Không đặt được ngày ' + dv);
      }
      // 1) Trạng thái điều phối = "Chưa điều phối"
      L('Đang chọn Chưa điều phối…');
      const st = [...document.querySelectorAll('.ant-select.ant-select-single')].find((s) => s.offsetParent && /điều phối/i.test(s.textContent) && !s.closest('.tb-adv-pop'));
      if (!st) throw new Error('Không thấy ô trạng thái điều phối trên trang');
      if (st.querySelector('.ant-select-selection-item') ? st.querySelector('.ant-select-selection-item').textContent.trim() !== 'Chưa điều phối' : true) {
        gtOpen(st); const dd = await gtWait(gtDrop, 3000);
        const op = dd && [...dd.querySelectorAll('.ant-select-item-option')].find((o) => o.textContent.trim() === 'Chưa điều phối');
        if (!op) throw new Error('Không thấy lựa chọn "Chưa điều phối"'); op.click(); await gtSleep(500);
      }
      // 2) Bộ lọc nâng cao → Tỉnh/thành phố 1015 - Tỉnh Thanh Hóa, Phường/Xã để trống → Áp dụng
      L('Đang mở Bộ lọc nâng cao…');
      const ab = gtBtn(document, /^Bộ lọc nâng cao/); if (!ab) throw new Error('Không thấy nút Bộ lọc nâng cao');
      let pop = document.querySelector('.tb-adv-pop:not(.ant-popover-hidden)'); if (!pop) { ab.click(); pop = await gtWait(() => document.querySelector('.tb-adv-pop:not(.ant-popover-hidden)'), 4000); }
      if (!pop) throw new Error('Bộ lọc nâng cao không mở');
      await gtSleep(400);
      const field = (lbl) => { const el = [...pop.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === lbl); let n = el; while (n && n !== pop) { const s = n.querySelector && n.querySelector('.ant-select'); if (s) return s; n = n.parentElement; } return null; };
      const tinh = field('Tỉnh/thành phố') || pop.querySelectorAll('.ant-select')[0], xa = field('Phường/Xã') || pop.querySelectorAll('.ant-select')[1];
      L('Đang chọn 1015 - Tỉnh Thanh Hóa…');
      gtOpen(tinh); await gtSleep(500); gtType(tinh, '1015');
      const node = await gtWait(() => { const d = gtDrop(); return d && [...d.querySelectorAll('.ant-select-tree-treenode')].find((o) => /1015\s*-\s*Tỉnh Thanh H/i.test(o.textContent)); }, 5000);
      if (!node) throw new Error('Không thấy "1015 - Tỉnh Thanh Hóa" trong ô Tỉnh/thành phố');
      if (!/checkbox-checked/.test(node.className)) { (node.querySelector('.ant-select-tree-checkbox') || node.querySelector('.ant-select-tree-node-content-wrapper')).click(); await gtSleep(400); }
      gtType(tinh, ''); gtCloseDrop(); await gtSleep(300);
      if (xa) { const c = xa.querySelector('.ant-select-clear'); if (c) { c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); c.click(); await gtSleep(300); } }
      // (không bấm Áp dụng — anh dặn bỏ bước này; TMS vẫn lọc theo Tỉnh đã chọn khi Tìm kiếm)
      // 3) Tìm kiếm
      L('Đang tìm kiếm…');
      const tk = gtBtn(document, /^Tìm kiếm$/); if (tk) tk.click();
      await gtSleep(1000); await gtWait(() => !document.querySelector('.ant-table .ant-spin-spinning, .ant-spin-spinning'), 20000); await gtSleep(800);
      // đóng khung Bộ lọc nâng cao còn mở
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      const hd = document.querySelector('.ant-table-thead') || document.body; ['mousedown', 'mouseup', 'click'].forEach((t) => hd.dispatchEvent(new MouseEvent(t, { bubbles: true }))); await gtSleep(300);
      // 3b) Tải hết các trang (Tải thêm dữ liệu)
      if (!(await gtLoadAll(L))) throw new Error('Tải thêm dữ liệu chưa xong (TMS phản hồi chậm), anh bấm lại giúp em');
      // 4) Lọc đơn theo xã/phường
      gt.scan = gtScan(); gt.route = route || '*'; gtApplyView(); // bấm "Tất cả tuyến" → lọc xong về Hiện toàn bộ
      const sum = route ? gtCnt(gt.scan, route) : GT_ROUTES.reduce((a, [r]) => a + gt.scan.by[r].length, 0);
      gt.log = ['✔ Đã lọc lúc ' + new Date().toLocaleTimeString('vi-VN') + ': ' + sum + ' đơn ' + (GT_KHO[route] ? 'có Kho gửi ' + GT_KHO[route] : route === GT_KHAC ? 'không thuộc tuyến nào' : route ? 'tuyến ' + esc(route) : 'thuộc các tuyến')];
      gtTag(); gtBar();
      if (gtRoot) gtRoot.innerHTML = ''; // đóng khung Ghép tuyến để anh xử lý đơn ngay trên trang TMS
    } catch (e) { gt.log = ['⛔ ' + esc(e.message || String(e)) + ' — anh làm tay bước này rồi bấm lại giúp em.']; }
    finally { gt.running = false; renderGT(); }
  }

  // 📤 Chia sẻ: xuất bảng Tổng quan đang xem thành 1 file HTML độc lập (mở bằng trình duyệt, không cần đăng nhập TMS)
  async function shareTQ() {
    const out = tqRoot && tqRoot.querySelector('#out');
    if (!tq.data || !out || !out.querySelector('.top3')) { tqMsg('Chưa có số liệu để chia sẻ — đợi tải xong rồi bấm lại.', true); return; }
    const m = tq.data.month, thang = Number(m.slice(5, 7)) + '/' + m.slice(0, 4);
    const kho = tq.kho ? 'Kho ' + tq.kho : 'Kho Thanh Hóa + Kho Thọ Xuân';
    const now = new Date(), stamp = now.toLocaleString('vi-VN');
    const css = TQ_CSS.split('\n').filter((l) => !/^'?:host|^\.ov|^\.dr|^\.hd|^\.x\{|^\.bd|^label|^select|^\.btn|^\.msg/.test(l.replace(/^'/, ''))).join('\n');
    const html = '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Tổng quan ' + esc(kho) + ' – tháng ' + thang + '</title><style>body{margin:0;background:#f8fafc;color:#1f2937;font-size:12px}' + css +
      '.wrap{max-width:1100px;margin:0 auto;padding:14px 16px 24px}.head{background:#7c3aed;color:#fff;padding:14px 16px}.head b{font-size:16px}.head div{font-size:12px;opacity:.9;margin-top:2px}' +
      '@media (max-width:760px){.wk{grid-template-columns:repeat(2,minmax(0,1fr))!important}}</style></head><body>' +
      '<div class="head"><b>🎯 Tổng quan – ' + esc(kho) + ' – tháng ' + thang + '</b><div>Số liệu chốt lúc ' + esc(stamp) + ' (ảnh chụp tại thời điểm này, không tự cập nhật)</div></div>' +
      '<div class="wrap">' + out.innerHTML + '</div></body></html>';
    const name = 'TongQuan_' + (tq.kho ? tq.kho.replace(/\s+/g, '') : 'ThanhHoa_ThoXuan') + '_T' + m.slice(5, 7) + '_' + String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + '.html';
    const file = new File([html], name, { type: 'text/html' });
    // Điện thoại: mở bảng chia sẻ của máy (Zalo, Messenger…); máy tính: tải file về
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Tổng quan ' + kho + ' – tháng ' + thang }); tqMsg('✔ Đã mở bảng chia sẻ.'); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    tqMsg('✔ Đã tải file ' + name + ' — gửi file này qua Zalo / email, người nhận mở bằng trình duyệt là xem được.');
  }
  // Bắt lúc anh bấm "Cập nhật" trong cửa sổ Phân tuyến → khi cửa sổ đóng / TMS báo thành công thì về "Hiện toàn bộ"
  const gtPtModal = () => [...document.querySelectorAll('.ant-modal')].find((m) => m.offsetParent && /Phân tuyến/i.test(m.textContent));
  let gtPtPending = false;
  // Anh tự bấm "Tìm kiếm" trên TMS → về "Hiện toàn bộ" (lúc em đang chạy lọc thì bỏ qua)
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b && /^Tìm kiếm$/.test(b.textContent.trim()) && !gt.running && gt.scan && gt.route !== '*') { gt.route = '*'; gtApplyView(); gtBar(); } }, true);
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b && /^Cập nhật$/.test(b.textContent.trim()) && b.closest('.ant-modal') && /Phân tuyến/i.test(b.closest('.ant-modal').textContent)) gtPtPending = true; }, true);
  // Trang TMS tải lại danh sách (sau khi anh phân tuyến / Tìm kiếm) → tự lọc lại theo tuyến đang chọn
  let gtSig = '';
  setInterval(() => {
    if (!gt.scan || gt.running) return;
    // phân tuyến xong (TMS báo cập nhật điều phối thành công) → tự chuyển về "Hiện toàn bộ"
    const ok = [...document.querySelectorAll('.ant-message-notice, .ant-notification-notice, .ant-message, .ant-notification, [role="alert"]')].find((n) => !n.dataset.tkgtSeen && /điều phối/i.test(n.textContent) && /thành công/i.test(n.textContent));
    if (ok) ok.dataset.tkgtSeen = '1';
    const modalOpen = !!gtPtModal();
    if (ok || (gtPtPending && !modalOpen)) { gtPtPending = false; if (gt.route !== '*') { gt.route = '*'; gtApplyView(); gtBar(); } }
    const mb = gtMoreBtn(); if (mb) { gt.running = true; gtLoadAll().finally(() => { gt.running = false; }); return; }
    const S = gtScan(), sig = S.rows.map((o) => o.id).join(',');
    gt.scan = S; gtApplyView();
    if (sig !== gtSig) { gtSig = sig; gtBar(); }
    gtHeadCk();
  }, 1500);
  // Nút & khung riêng "🚚 Ghép tuyến" (nằm cạnh 📋 Thống kê Đơn Hàng)
  let gtHost, gtRoot;
  function openGT() {
    if (!gtHost) { gtHost = document.createElement('div'); gtHost.id = 'tkgt-host'; gtRoot = gtHost.attachShadow({ mode: 'open' }); document.body.appendChild(gtHost); }
    const css = TQ_CSS.replace('.hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#7c3aed}', '.hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#ea580c}').replace('.dr{position:fixed;top:0;right:0;height:100vh;width:min(1100px,100vw)', '.dr{position:fixed;top:0;right:0;height:100vh;width:min(760px,100vw)');
    gtRoot.innerHTML = '<style>' + css + '</style><div class="ov"></div><div class="dr"><div class="hd"><b>🚚 Ghép tuyến</b><button class="x" title="Đóng">✕</button></div><div class="bd"><div id="gt"></div></div></div>';
    const close = () => { gtRoot.innerHTML = ''; };
    gtRoot.querySelector('.x').onclick = close; gtRoot.querySelector('.ov').onclick = close;
    renderGT();
  }
  // Bấm nút 🚚 Ghép tuyến: chạy ngay trên trang TMS (không mở khung), lấy ngày đang chọn ở ô Từ ngày / Đến ngày của TMS
  async function quickGT() {
    if (gt.running) return;
    const iso = (v) => { const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };
    const pk = [...document.querySelectorAll('.ant-picker input')].filter((i) => i.offsetParent);
    const f = iso((pk.find((i) => /Từ ngày/.test(i.placeholder)) || {}).value), t = iso((pk.find((i) => /Đến ngày/.test(i.placeholder)) || {}).value);
    if (f) gt.from = f; if (t) gt.to = t;
    try { await runGT(''); } finally { const bq = document.getElementById('tkgt-open-btn'); if (bq) bq.textContent = '🚚 Ghép tuyến'; }
    if (/⛔/.test(gt.log.join(''))) alert(gt.log.join(' ').replace(/<[^>]+>/g, ''));
    gt.route = '*'; gtApplyView(); gtBar();
  }
  function ensureGTButton() {
    if (!PAGE_RE.test(location.pathname)) { const o = document.getElementById('tkgt-open-btn'); if (o) o.remove(); return; }
    const slot = topSlot(); let btn = document.getElementById('tkgt-open-btn');
    if (!btn) { btn = document.createElement('button'); btn.id = 'tkgt-open-btn'; btn.textContent = '🚚 Ghép tuyến'; btn.title = 'Bấm là lọc ngay: lấy Từ ngày / Đến ngày đang chọn trên trang TMS → Chưa điều phối → 1015 Thanh Hóa → Tìm kiếm → tải hết đơn → hiện thanh tuyến'; btn.onclick = quickGT; }
    const css = 'background:#ea580c;color:#fff;border:0;border-radius:8px;padding:0 14px;font:600 13px Roboto,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(234,88,12,.35);height:32px;white-space:nowrap;order:3';
    if (slot) { if (btn.parentElement !== slot) { btn.style.cssText = css; slot.appendChild(btn); } return; }
    const a = document.getElementById('tkdh-open-btn');
    if (a && btn.previousElementSibling !== a) { btn.style.cssText = css + ';margin-left:8px'; a.after(btn); }
  }
  setInterval(() => { if (!PAGE_RE.test(location.pathname)) return; document.querySelectorAll('tr.ant-table-row.mso-row').forEach((tr) => { const lb = [...tr.querySelectorAll('.sr-kv > span')].find((e) => e.textContent.trim() === 'Kho gửi'); if (lb) gtKho(tr); }); }, 1000);
  setInterval(ensureGTButton, 1000);
  ensureGTButton();
  // ======================= 🔁 CHUYỂN KHO (nút riêng cạnh 🚚 Ghép tuyến) =======================
  // Phần 1 (trang Phân tuyến): tick đúng các đơn → Chuyển kho điều phối → Kho điều phối / Kho vật lý / Ghi chú → Cập nhật
  // Phần 2 (trang duyệt chuyển kho, mở trong khung): + Tạo biên bản → nhóm kho → tick đúng các đơn → Tạo phiếu chuyển kho
  const CK_KHO = [['33162', 'Bỉm Sơn'], ['33139', 'Thọ Xuân'], ['33386', 'Thanh Hóa'], ['33095', 'Hoàng Mai']];
  const CK_KVL = CK_KHO.concat([['33469', 'Ngọc Lặc'], ['33605', 'Yên Trường'], ['33440', 'Nghi Sơn']]); // kho vật lý: thêm các kho chỉ dùng làm kho vật lý
  const ck = { so: '', kdp: '', kvl: '', note: '', running: false, log: [] };
  try { const sv = JSON.parse(localStorage.getItem('tk_ck_last') || '{}'); Object.assign(ck, { kdp: sv.kdp || '', kvl: sv.kvl || '', note: sv.note || '' }); } catch (e) {}
  let ckHost, ckRoot;
  const ckSleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function ckWait(fn, ms) { const t = Date.now(); while (Date.now() - t < ms) { let v; try { v = fn(); } catch (e) { v = null; } if (v) return v; await ckSleep(250); } return null; }
  const ckSet = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const ckSel = () => { const e = [...document.querySelectorAll('.mso-total')].find((x) => /Đơn đã chọn/.test(x.innerText)); return e ? Number((e.innerText.match(/\d+/) || [0])[0]) : null; };
  const CK_NOTE_SEL = '.ant-notification-notice, .ant-message-notice, [role="alert"]';
  const ckMarkOld = (doc) => doc.querySelectorAll(CK_NOTE_SEL).forEach((n) => (n.dataset.tkckOld = '1'));
  const ckToast = (doc, re) => [...doc.querySelectorAll(CK_NOTE_SEL)].filter((n) => !n.dataset.tkckOld).map((n) => n.textContent.replace(/\s+/g, ' ').trim()).find((t) => re.test(t));
  const ckVis = (el) => !!el && el.getClientRects().length > 0;
  // TMS báo lỗi / cảnh báo (vd "không có khung tải 12h, 14h…"): dò cả thông báo góc màn hình lẫn hộp thoại xác nhận
  const CK_BAD = /khung tải|không có khung|lỗi|thất bại|không thể|không hợp lệ|error/i;
  const ckAlert = (doc) => {
    const t = ckToast(doc, CK_BAD); if (t) return t;
    const m = [...doc.querySelectorAll('.ant-modal-confirm, .ant-modal')].find((x) => ckVis(x) && !x.dataset.tkckOld && /khung tải|không có khung/i.test(x.textContent));
    return m ? m.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : null;
  };
  const ckCloseAlert = (doc) => { [...doc.querySelectorAll('.ant-modal-confirm, .ant-modal')].filter((x) => ckVis(x) && /khung tải|không có khung/i.test(x.textContent)).forEach((x) => { const c = x.querySelector('.ant-modal-close') || [...x.querySelectorAll('button')].find((b) => /Đóng|Hủy|Huỷ|Cancel/i.test(b.textContent)); c && c.click(); }); };
  function openCK() {
    if (!ckHost) { ckHost = document.createElement('div'); ckHost.id = 'tkck-host'; ckRoot = ckHost.attachShadow({ mode: 'open' }); document.body.appendChild(ckHost); }
    const css = TQ_CSS.replace('.hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#7c3aed}', '.hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0d9488}').replace('.dr{position:fixed;top:0;right:0;height:100vh;width:min(1100px,100vw)', '.dr{position:fixed;top:0;right:0;height:100vh;width:min(1100px,100vw)');
    ckRoot.innerHTML = '<style>' + css + '.f label{display:block;font-size:12.5px;color:#374151;margin:8px 0 3px;font-weight:600}.f input,.f textarea{width:100%;box-sizing:border-box;border:1px solid #cfd5dd;border-radius:6px;padding:6px 8px;font:13px Roboto,system-ui,sans-serif}.g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}</style><div class="ov"></div><div class="dr"><div class="hd"><b>🔁 Chuyển kho</b><button class="x" title="Đóng">✕</button></div><div class="bd"><div id="ck"></div><div id="ckfr" style="margin-top:10px"></div></div></div>';
    const close = () => { if (ck.running) return; ckRoot.innerHTML = ''; };
    ckRoot.querySelector('.x').onclick = close; ckRoot.querySelector('.ov').onclick = close;
    renderCK();
  }
  function renderCK() {
    const box = ckRoot && ckRoot.querySelector('#ck'); if (!box) return;
    const dis = ck.running ? ' disabled' : '';
    box.innerHTML = '<div class="box f">' +
      '<div style="color:#374151;margin-bottom:4px">Anh dán mã đơn hàng (mã có chữ SO, mỗi mã 1 dòng hoặc cách nhau dấu phẩy), nhập mã kho rồi bấm <b>Chuyển kho</b>. Em làm lần lượt từng đơn: tìm đơn → mở chi tiết vận đơn → <b>Chuyển kho điều phối</b> (kho điều phối, kho vật lý, nội dung) → Cập nhật. Làm hết các đơn rồi mới vào trang duyệt chuyển kho: <b>Tạo biên bản</b> → mở nhóm → chọn tất cả → <b>Tạo phiếu chuyển kho</b>.</div>' +
      '<label>Mã đơn hàng</label><textarea id="ckso" rows="4" placeholder="00006SO26111139685&#10;01852SO26110735327"' + dis + '>' + esc(ck.so) + '</textarea>' +
      '<div class="g"><div><label>Mã kho điều phối</label><select id="ckkdp" style="width:100%;box-sizing:border-box;border:1px solid #cfd5dd;border-radius:6px;padding:6px 8px;font:13px Roboto,system-ui,sans-serif;background:#fff"' + dis + '><option value="">— Chọn kho —</option>' + CK_KHO.map(([c, t]) => '<option value="' + c + '"' + (ck.kdp === c ? ' selected' : '') + '>' + c + ' - ' + esc(t) + '</option>').join('') + '</select></div><div><label>Mã kho vật lý <span style="font-weight:400;color:#6b7280">(tự theo kho điều phối, chọn lại được)</span></label><select id="ckkvlsel" style="width:100%;box-sizing:border-box;border:1px solid #cfd5dd;border-radius:6px;padding:6px 8px;font:13px Roboto,system-ui,sans-serif;background:#fff"' + dis + '><option value="">— Chọn kho —</option>' + CK_KVL.map(([c, t]) => '<option value="' + c + '"' + (ck.kvl === c ? ' selected' : '') + '>' + c + ' - ' + esc(t) + '</option>').join('') + '<option value="#other"' + (ck.kvl && !CK_KVL.some((k) => k[0] === ck.kvl) ? ' selected' : '') + '>✎ Mã khác…</option></select><input id="ckkvl" placeholder="Nhập mã kho vật lý khác" value="' + esc(ck.kvl) + '" style="margin-top:4px;display:' + (ck.kvl && !CK_KVL.some((k) => k[0] === ck.kvl) ? 'block' : 'none') + '"' + dis + '></div><div><label>Ghi chú</label><input id="cknote" placeholder="vd hà trung" value="' + esc(ck.note) + '"' + dis + '></div></div>' +
      '<div style="margin-top:12px;display:flex;gap:8px;align-items:center"><button class="btn" id="ckgo" style="background:#0d9488;border-color:#0d9488;color:#fff;height:36px;font-size:13.5px;padding:0 18px"' + dis + '>🔁 Chuyển kho</button>' + (ck.running ? '<span style="color:#0f766e">Đang chạy… anh đừng thao tác trên trang TMS</span>' : '') + '</div>' +
      (ck.log.length ? '<div style="margin-top:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;line-height:1.6">' + ck.log.join('<br>') + '</div>' : '') +
      '</div>';
    const $ = (s) => box.querySelector(s);
    const sync = () => { ck.so = $('#ckso').value; ck.kdp = $('#ckkdp').value.trim(); ck.kvl = $('#ckkvl').value.trim(); ck.note = $('#cknote').value; };
    ['#ckso', '#ckkvl', '#cknote'].forEach((s) => ($(s).oninput = sync));
    const kvlSel = $('#ckkvlsel'), kvlIn = $('#ckkvl');
    const setKvl = (c) => { const known = CK_KVL.some((k) => k[0] === c); kvlSel.value = c ? (known ? c : '#other') : ''; kvlIn.value = c; kvlIn.style.display = c && !known ? 'block' : 'none'; };
    $('#ckkdp').onchange = () => { setKvl($('#ckkdp').value); sync(); }; // chọn kho điều phối → kho vật lý theo cùng mã
    kvlSel.onchange = () => { if (kvlSel.value === '#other') { kvlIn.value = ''; kvlIn.style.display = 'block'; kvlIn.focus(); } else { kvlIn.value = kvlSel.value; kvlIn.style.display = 'none'; } sync(); };
    $('#ckgo').onclick = () => { sync(); runCK(); };
  }
  async function runCK() {
    if (ck.running) return;
    const sos = [...new Set((ck.so.toUpperCase().match(/\d+SO\d+/g) || []))], kdp = (ck.kdp.match(/\d+/) || [''])[0], kvl = (ck.kvl.match(/\d+/) || [''])[0], note = ck.note.trim();
    if (!sos.length) { ck.log = ['⛔ Anh chưa nhập mã đơn hàng (dạng ...SO...).']; return renderCK(); }
    if (!kdp || !kvl) { ck.log = ['⛔ Anh nhập giúp em mã kho điều phối và mã kho vật lý.']; return renderCK(); }
    try { localStorage.setItem('tk_ck_last', JSON.stringify({ kdp, kvl, note })); } catch (e) {}
    ck.running = true; ck.log = []; const L = (t) => { ck.log.push(t); renderCK(); };
    try {
      // ---------- Phần 1: từng đơn → trang chi tiết → Chuyển kho điều phối (như video anh gửi) ----------
      const holder = ckRoot.querySelector('#ckfr');
      const kw = document.querySelector('.mso-kw');
      if (!kw) throw new Error('Không thấy ô tìm nhanh (Từ khóa + Mã vận đơn) trên trang Phân tuyến');
      const kwInp = kw.querySelector('input.ant-input'), kwSel = kw.querySelector('.ant-select'), kwBtn = kw.querySelector('button.ant-btn-icon-only');
      // chọn loại tìm "Mã yêu cầu xuất của đối tác"
      if (!/Mã yêu cầu xuất/.test((kwSel.querySelector('.ant-select-selection-item') || {}).textContent || '')) {
        kwSel.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        const op = await ckWait(() => { const i = kwSel.querySelector('input'), l = i && document.getElementById(i.id + '_list'), d = l && l.closest('.ant-select-dropdown'); return d && [...d.querySelectorAll('.ant-select-item-option')].find((o) => /Mã yêu cầu xuất/.test(o.textContent)); }, 5000);
        if (!op) throw new Error('Không chọn được kiểu tìm "Mã yêu cầu xuất của đối tác"');
        op.click(); await ckSleep(400);
      }
      const done1 = [], fail1 = [];
      for (let k = 0; k < sos.length; k++) {
        const so = sos[k], P = '[' + (k + 1) + '/' + sos.length + '] ' + so + ': ';
        try {
          L('① ' + P + 'tìm đơn…');
          ckSet(kwInp, so); await ckSleep(300); kwBtn.click();
          const rows = await ckWait(() => { const r = [...document.querySelectorAll('tr.ant-table-row.mso-row')].filter((tr) => ((tr.querySelector('.mso-code') || {}).textContent || '').trim().toUpperCase() === so); return r.length ? r : null; }, 12000);
          if (!rows) throw new Error('không tìm thấy đơn trên TMS');
          const links = [...new Set(rows.map((tr) => { const a = [...tr.querySelectorAll('a[href*="/ShipmentOrder/Detail/"]')][0]; return a ? a.getAttribute('href') : ''; }).filter(Boolean))];
          if (!links.length) throw new Error('không lấy được link vận đơn');
          for (const href of links) {
            const vd = (href.match(/ShipmentOrder=(\d+)/) || [])[1] || '';
            holder.innerHTML = '<div style="font-size:12px;color:#0f766e;margin-bottom:4px">Đang mở vận đơn ' + esc(vd) + '…</div><iframe src="' + esc(href) + '" style="width:100%;height:420px;border:1px solid #99f6e4;border-radius:8px;background:#fff"></iframe>';
            const fr = holder.querySelector('iframe');
            const btn = await ckWait(() => [...fr.contentDocument.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Chuyển kho điều phối' && !x.disabled), 30000);
            if (!btn) throw new Error('vận đơn ' + vd + ' không có nút Chuyển kho điều phối');
            const fd = fr.contentDocument, FW = fr.contentWindow;
            // Mở khung Chuyển kho điều phối. TMS chỉ mở ô Kho Vật lý khi đã tải xong cấu hình trang,
            // nên nếu mở sớm quá (ô Kho Vật lý bị khóa) em đóng lại, chờ rồi mở lại.
            const openDr = async () => { btn.click(); return ckWait(() => [...fd.querySelectorAll('.ant-drawer-content')].find((x) => ckVis(x) && /Chuyển kho điều phối/.test(x.textContent) && x.querySelectorAll('.ant-select').length >= 4 && x.querySelector('textarea')), 8000); };
            const visOf = (d0) => { const el = d0.querySelector('.ant-select'), k = Object.keys(el).find((x) => x.startsWith('__reactFiber')); let fb = el[k]; for (let i = 0; i < 40 && fb; i++) { const p = fb.memoizedProps; if (p && 'IsVisiablePhysisStoreID' in p) return !!p.IsVisiablePhysisStoreID; fb = fb.return; } return null; };
            await ckSleep(2500);
            let dr = null;
            for (let t = 0; t < 8; t++) {
              dr = await openDr();
              if (!dr) break;
              await ckSleep(500);
              if (visOf(dr) !== false) break;
              const x = dr.querySelector('.ant-drawer-close'); x && x.click(); dr = null; await ckSleep(2000);
            }
            if (!dr) throw new Error('khung Chuyển kho điều phối không mở được hoặc ô Kho Vật lý vẫn bị khóa');
            const closeDr = () => { const x = dr.querySelector('.ant-drawer-close'); x && x.click(); };
            const fk = Object.keys(dr.querySelector('.ant-select')).find((x) => x.startsWith('__reactFiber'));
            const cust = (el) => { let fb = el && el[fk]; for (let i = 0; i < 12 && fb; i++) { const p = fb.memoizedProps; if (p && p.options && p.onChange && Object.keys(p).length <= 10) return p; fb = fb.return; } return null; };
            const selOf = (txt) => { const lb = [...dr.querySelectorAll('label')].find((x) => x.textContent.trim() === txt); let n = lb; for (let i = 0; i < 6 && n; i++) { n = n.parentElement; const sl = n && n.querySelector('.ant-select'); if (sl) return sl; } return null; };
            const setKho = async (label, code) => {
              const p = await ckWait(() => { const q = cust(selOf(label)); return q && !q.disabled && q.options.some((o) => String(o.value) === code) ? q : null; }, 10000);
              if (!p) throw new Error('ô ' + label + ' không có mã ' + code);
              const o = p.options.find((x) => String(x.value) === code); p.onChange(o.value, o); await ckSleep(800);
              const now = cust(selOf(label)); if (!now || String(now.value) !== code) throw new Error('chọn ' + label + ' ' + code + ' chưa được');
              return o.label;
            };
            let t1, t2;
            try { t1 = await setKho('Kho điều phối', kdp); t2 = await setKho('Kho Vật lý', kvl); }
            catch (e) { closeDr(); throw new Error(e.message + ' — đã đóng, không cập nhật'); }
            const ta = dr.querySelector('textarea');
            if (ta && note) { Object.getOwnPropertyDescriptor(FW.HTMLTextAreaElement.prototype, 'value').set.call(ta, note); ta.dispatchEvent(new FW.Event('input', { bubbles: true })); await ckSleep(300); }
            if (window.__tkckDry) { closeDr(); done1.push(so + ' (' + vd + ')'); L('🧪 ' + P + 'THỬ (không cập nhật): vận đơn ' + esc(vd) + ' → ' + esc(t1) + ' · kho vật lý ' + esc(t2)); continue; }
            const up = [...dr.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cập nhật');
            if (!up) { closeDr(); throw new Error('không thấy nút Cập nhật'); }
            ckMarkOld(fd); fd.querySelectorAll('.ant-modal').forEach((x) => (x.dataset.tkckOld = '1'));
            up.click();
            const r = await ckWait(() => (ckAlert(fd) ? 'ERR:' + ckAlert(fd) : null) || ckToast(fd, /chuyển kho điều phối thành công/i), 15000);
            if (!r || /^ERR:/.test(r)) { if (r) ckCloseAlert(fd); throw new Error('TMS báo: ' + (r ? r.slice(4) : 'không thấy thông báo')); }
            done1.push(so + ' (' + vd + ')');
            L('✅ ' + P + 'vận đơn ' + esc(vd) + ' → ' + esc(t1) + ' · kho vật lý ' + esc(t2));
          }
        } catch (e) { fail1.push(so); L('⛔ ' + P + esc(e.message || String(e)) + ' — bỏ qua đơn này'); }
      }
      holder.innerHTML = '';
      ckSet(kwInp, ''); await ckSleep(200);
      if (!done1.length) throw new Error('Không chuyển được đơn nào — em không làm Tạo biên bản');
      L('✔ Phần 1 xong: ' + done1.length + '/' + sos.length + ' đơn' + (fail1.length ? ' · lỗi: ' + fail1.join(', ') : ''));
      const hit = done1, ids = done1.map((x) => (x.match(/\((\d+)\)/) || [])[1]);
      if (window.__tkckDry) { L('🧪 Chế độ thử: dừng trước Tạo biên bản'); return; }
      // ---------- Phần 2 ----------
      L('② Mở trang duyệt chuyển kho…');
      holder.innerHTML = '<iframe src="/v2/OffRouteShipping" style="width:100%;height:520px;border:1px solid #99f6e4;border-radius:8px;background:#fff"></iframe>';
      const fr = holder.querySelector('iframe');
      const fd = () => fr.contentDocument;
      const tbb = await ckWait(() => [...fd().querySelectorAll('button')].find((b) => /Tạo biên bản/.test(b.textContent) && b.offsetParent), 30000);
      if (!tbb) throw new Error('Trang duyệt chuyển kho không tải được');
      await ckSleep(800); tbb.click();
      // Tạo phiếu cho từng nhóm kho có kho nhận = mã kho điều phối anh chọn (đơn từ nhiều kho gửi → nhiều nhóm)
      const tfrs = [];
      for (let round = 0; round < 8; round++) {
        const md = await ckWait(() => [...fd().querySelectorAll('.ant-modal')].find((m) => ckVis(m) && /Tạo biên bản/.test(m.textContent)), 15000);
        if (!md) throw new Error('Cửa sổ Tạo biên bản không mở');
        await ckWait(() => md.querySelector('.ant-collapse-item') || /Không có dữ liệu/.test(md.textContent), 10000); await ckSleep(600);
        const items = [...md.querySelectorAll('.ant-collapse-item')].filter((g) => { const bs = [...g.querySelectorAll('.ant-collapse-header-text b')].map((e) => e.textContent.trim()); return bs.length >= 2 && bs[bs.length - 1].startsWith(kdp + ' - '); });
        if (!items.length) { if (!round) throw new Error('Không thấy nhóm kho chuyển đến ' + kdp + ' trong Tạo biên bản'); break; }
        const g = items[0], b = [...g.querySelectorAll('button')].find((x) => /Tạo phiếu chuyển kho/.test(x.textContent));
        const gname = [...g.querySelectorAll('.ant-collapse-header-text b')].map((e) => e.textContent.trim().split(' - ')[0]).join(' → ');
        const rowCbs = () => [...g.querySelectorAll('tr.ant-table-row input[type=checkbox]')];
        if (!rowCbs().length) {
          for (const h of [...g.querySelectorAll('.ant-collapse-expand-icon, .ant-collapse-header-text')]) { (h.closest('[role=button]') || h).click(); await ckSleep(800); if (rowCbs().length) break; }
          await ckWait(() => rowCbs().length, 8000);
        }
        if (!rowCbs().length) throw new Error('Mở nhóm ' + gname + ' nhưng không thấy vận đơn — dừng, chưa tạo phiếu');
        const head = g.querySelector('thead input[type=checkbox], .ant-table-selection input[type=checkbox]');
        if (head && !head.checked) { head.click(); await ckSleep(500); }
        for (const c of rowCbs()) { if (!c.checked && !c.disabled) { c.click(); await ckSleep(120); } }
        await ckSleep(400);
        const all = rowCbs(), on = all.filter((c) => c.checked).length;
        if (!on) throw new Error('Không tick được vận đơn trong nhóm ' + gname);
        L('✔ Tạo biên bản nhóm ' + gname + ': chọn tất cả ' + on + ' vận đơn');
        ckMarkOld(fd()); fd().querySelectorAll('.ant-modal').forEach((x) => { if (x !== md) x.dataset.tkckOld = '1'; });
        b.click();
        const done = await ckWait(() => (ckAlert(fd()) ? 'ERR:' + ckAlert(fd()) : null) || ckToast(fd(), /Tạo phiếu chuyển kho thành công/i), 15000);
        if (!done || /^ERR:/.test(done)) { if (done) ckCloseAlert(fd()); throw new Error('Tạo phiếu nhóm ' + gname + ' dừng lại, TMS báo: ' + (done ? done.slice(4) : 'không thấy thông báo')); }
        const tfr = (done.match(/TFR\d+/) || [''])[0]; tfrs.push(tfr);
        L('✅ Tạo phiếu chuyển kho thành công' + (tfr ? ': <b>' + tfr + '</b>' : '') + ' (nhóm ' + gname + ')');
        await ckSleep(1500);
      }
      L('✅ Phần 2 xong: ' + tfrs.length + ' phiếu → kho ' + kdp);
      await ckSleep(1000); holder.innerHTML = '';
      const sb = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Tìm kiếm' && x.offsetParent); if (sb) sb.click();
      L('— Xong lúc ' + new Date().toLocaleTimeString('vi-VN'));
    } catch (e) { L('⛔ ' + esc(e.message || String(e))); }
    finally { ck.running = false; renderCK(); }
  }
  function ensureCKButton() {
    if (!PAGE_RE.test(location.pathname)) { const o = document.getElementById('tkck-open-btn'); if (o) o.remove(); return; }
    const slot = topSlot(); let btn = document.getElementById('tkck-open-btn');
    if (!btn) { btn = document.createElement('button'); btn.id = 'tkck-open-btn'; btn.textContent = '🔁 Chuyển kho'; btn.title = 'Chuyển kho điều phối + tạo phiếu chuyển kho'; btn.onclick = openCK; }
    const css = 'background:#0d9488;color:#fff;border:0;border-radius:8px;padding:0 14px;font:600 13px Roboto,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(13,148,136,.35);height:32px;white-space:nowrap;order:4';
    if (slot) { if (btn.parentElement !== slot) { btn.style.cssText = css; slot.appendChild(btn); } return; }
    const a = document.getElementById('tkgt-open-btn');
    if (a && btn.previousElementSibling !== a) { btn.style.cssText = css + ';margin-left:8px'; a.after(btn); }
  }
  setInterval(ensureCKButton, 1000);
  ensureCKButton();
  setInterval(ensureTQButton, 1000);
  ensureTQButton();

})();