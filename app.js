/* =========================================================
   Catatan Katering: pencatat snack & lunch sekolah (offline)
   Data tersimpan di localStorage perangkat ini.
   ========================================================= */

'use strict';

/* ---------- Data & penyimpanan ---------- */
const STORE_PREFIX = 'catatan_katering_';
const DB_KEY = STORE_PREFIX + 'data_v1';
const UNDO_KEY = STORE_PREFIX + 'undo_v1';
const REDO_KEY = STORE_PREFIX + 'redo_v1';

/* Kunci penyimpanan memakai nama proyek sebelum diganti. Sekali dibaca lalu dipindah,
   supaya data pemilik tetap ada setelah proyek berganti nama. */
const LEGACY_PREFIX = 'lovely_kitchen_';
function migrateStoreKeys() {
  try {
    ['data_v1', 'ui_v1', 'backups_v1', 'undo_v1', 'redo_v1'].forEach(suffix => {
      const from = LEGACY_PREFIX + suffix, to = STORE_PREFIX + suffix;
      const oldVal = localStorage.getItem(from);
      if (oldVal === null) return;
      const newVal = localStorage.getItem(to);
      /* kunci lama hanya dibuang kalau isinya sudah aman tersalin (atau memang sama);
         kalau beda, biarkan. Jangan musnahkan data yang tidak bisa dibalik lagi */
      if (newVal === null) localStorage.setItem(to, oldVal);
      if (newVal === null || newVal === oldVal) localStorage.removeItem(from);
    });
  } catch (e) { /* localStorage tidak bisa dipakai */ }
}
migrateStoreKeys();
const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

/* Pilihan font untuk stiker: key => stack CSS */
const STK_FONTS = {
  sans: '"Segoe UI",system-ui,sans-serif',
  serif: 'Georgia,"Times New Roman",serif',
  mono: 'Consolas,"Courier New",monospace',
  round: '"Trebuchet MS",Verdana,sans-serif',
  narrow: '"Arial Narrow",Arial,Helvetica,sans-serif'
};
function clampScale(v, lo, hi, fb) { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : (fb === undefined ? 100 : fb); }
/* Penanda alergi di stiker. Lingkaran merah bertanda "!" terbaca seperti rambu bahaya,
   jadi bentuk dan warnanya bisa dipilih owner. */
const STK_MARKS = {
  dot: 'Titik kecil di pojok kanan bawah',
  letter: 'Lingkaran huruf A di pojok',
  bar: 'Garis pendek di bawah nama',
  word: 'Tulisan kecil "ALERGI" di bawah nama',
  none: 'Tanpa penanda'
};
const STK_TONES = {
  soft: { fg: '#7A6A5B', label: 'Cokelat kalem' },
  gold: { fg: '#B8862F', label: 'Kuning kayu' },
  red: { fg: '#C0272D', label: 'Merah' }
};
/* Pilihan font untuk seluruh aplikasi: key => stack CSS ('default' = ikut styles.css) */
const UI_FONTS = {
  default: '',
  sans: '"Segoe UI",system-ui,sans-serif',
  serif: 'Georgia,"Times New Roman",serif',
  mono: 'Consolas,"Courier New",monospace',
  round: '"Trebuchet MS",Verdana,sans-serif',
  narrow: '"Arial Narrow",Arial,Helvetica,sans-serif'
};
const UI_ZOOM_MIN = 85, UI_ZOOM_MAX = 130;
/* Status pelanggan: aktif = ikut pesanan berikutnya; sekali = satu tanggal saja; selesai = sudah tamat (catatan tetap ada); berhenti = nonaktif */
const CUST_STATUS = ['aktif', 'sekali', 'selesai', 'berhenti'];
const STATUS_LABEL = { aktif: 'Aktif', sekali: 'Beli Sekali', selesai: 'Selesai', berhenti: 'Berhenti' };
const STATUS_BADGE = { aktif: 'green', sekali: 'orange', selesai: 'gold', berhenti: 'red' };
const STATUS_HINT = {
  aktif: 'masih berlangganan, akan ikut terisi pada pesanan berikutnya',
  sekali: 'hanya beli satu kali pada tanggal yang dipilih. Setelah hari itu lewat ia keluar dari daftar "yang berjalan"',
  selesai: 'sudah tamat / pindah (mis. lulus). Riwayat tagihan tetap disimpan, tidak ikut pesanan berikutnya',
  berhenti: 'berhenti sementara, bisa diaktifkan lagi kapan saja'
};
/* Anak yang masih "berjalan": langganan aktif, atau beli sekali yang tanggalnya belum lewat */
function oncePassed(c) { return !!c && c.status === 'sekali' && !!c.onceDate && c.onceDate < todayStr(); }
function custJalan(c) { return c.status === 'aktif' || (c.status === 'sekali' && !oncePassed(c)); }
function custActive(c) { return c.status === 'aktif' || c.status === 'sekali'; }
const LETTERS = 'ABCDEFGH';
/* Jenis baris menu. "spesial" tetap snack/lunch (kolom, stiker, laporan sama) tapi harganya diketik sendiri. */
const MENU_TYPES = ['snack', 'snack-spesial', 'lunch', 'lunch-spesial', 'po'];
const MENU_TYPE_LABEL = { snack: 'Snack', 'snack-spesial': 'Snack Spesial', lunch: 'Lunch', 'lunch-spesial': 'Lunch Spesial', po: 'PO' };
const RECIPE_TYPE_LABEL = { snack: 'Snack', lunch: 'Lunch', po: 'PO' };
const RECIPE_UNITS = ['kg', 'gram', 'liter', 'ml', 'butir', 'ikat', 'bungkus', 'botol', 'kaleng', 'sachet', 'porsi', 'buah'];
const STOCK_KIND_LABEL = { bahan: 'Bahan', wadah: 'Tempat Makan' };
const STOCK_UNITS = RECIPE_UNITS.concat(['pcs', 'lusin', 'pack', 'box', 'lembar', 'roll']);
const EXPENSE_CATEGORIES = ['Belanja pasar', 'Gas & energi', 'Kemasan', 'Transport', 'Gaji', 'Sewa', 'Listrik & air', 'Lainnya'];
const NAV_DEFAULT_ORDER = ['dashboard', 'hari', 'print', 'custom', 'dapur', 'stok', 'report', 'expenses', 'pengingat', 'po', 'customers', 'log', 'settings'];
const NAV_GROUPS = [
  { label: 'Hari ini', keys: ['dashboard', 'hari', 'print', 'custom', 'dapur', 'stok'] },
  { label: 'Penjualan', keys: ['report', 'expenses', 'pengingat', 'po'] },
  { label: 'Data & pengaturan', keys: ['customers', 'log', 'settings'] }
];
function shortTxt(s, n) { const t = String(s || ''); return t.length > n ? t.slice(0, n - 1).trim() + '…' : t; }

function defaultData() {
  return {
    settings: {
      businessName: 'Nama Usaha',
      tagline: 'Catatan Snack & Lunch',
      priceSnack: 5000,
      priceLunch: 15000,
      packages: [], // { id, type:'snack'|'lunch', name, price }: paket = tingkatan harga; makanannya dari menu harian
      defaultPeriod: 'weekly',
      bankName: '', bankNumber: '', bankHolder: '', // rekening usaha: dicetak di invoice
      logo: '', // logo usaha sebagai data URL, kosong = tidak ada
      logoOpts: { stiker: true, konfirmasi: true, laporan: true, invoice: true, headMm: 14 }, // pilihan cetak logo
      invSeq: 0, // penghitung nomor invoice yang sudah terbit
      waCountry: '62',
      waTemplate: 'Halo {orang}, berikut tagihan {usaha} yang belum dibayar:\n{rincian}\nTotal sisa: {sisa}\nMohon konfirmasi setelah transfer. Terima kasih.',
      sticker: { nameFont: 'sans', clsFont: 'sans', brandFont: 'sans', lineW: 2, nameScale: 100, clsScale: 100, brandScale: 100, padV: 2.6, tight: 100, mark: 'bar', tone: 'soft' },
      uiFont: 'default', // jenis huruf seluruh aplikasi (key UI_FONTS)
      uiZoom: 100,       // skala teks seluruh aplikasi, 85–130 %
      customDisplay: 'both', // tampilan sel Kustomisasi: 'both' | 'name' | 'price'
      navOrder: NAV_DEFAULT_ORDER.slice(), // urutan tombol halaman di sidebar
      navHidden: [], // halaman yang disembunyikan dari sidebar; Pengaturan selalu tampil
      paymentMethods: ['Tunai', 'Transfer', 'QRIS', 'Gratis'],
      menuSnack: ['Roti & Buah', 'Nasi Goreng', 'Lontong'],
      menuLunch: ['Ayam Geprek + Nasi', 'Nasi Uduk + Ayam', 'Soto + Nasi']
    },
    customers: [],
    snack: {},   // { 'YYYY-MM-DD': { customerId: {ordered,paid,method,note,pkg} } }
    lunch: {},
    menu: { snack: {}, lunch: {} },   // { 'YYYY-MM-DD': 'nama menu' }
    menuPlan: {}, // { 'YYYY-MM-DD': [{name,type,pkg}] }: menu mingguan per hari; name boleh multiline (isi paket)
    holidays: [], // { id, date, scope:'all'|'class'|'cohort'|'person', value, note }
    reminders: [], // { id, date, time, text, repeat:'once'|'weekly'|'monthly', doneOn }
    poMenus: [], // { id, date, item, price, note }: menu PO beserta tanggal
    po: [],      // { id, menuId?, date, name, item, qty, price, method, paid, note }
    recipes: [], // { id, name, type:'snack'|'lunch'|'po', ingredients:[{name,qty,unit}], note } bahan per menu
    stock: { bahan: [], wadah: [] }, // { id, name, unit, qty, min, note } stok bahan dan tempat makan
    expenses: [], // { id, date, category, note, amount } pengeluaran operasional
    log: []      // { id, ts, action, detail }
  };
}

function normalize(d) {
  const def = defaultData();
  if (!d || typeof d !== 'object') d = {};
  d.settings = Object.assign({}, def.settings, d.settings || {});
  if (!Array.isArray(d.settings.paymentMethods)) d.settings.paymentMethods = def.settings.paymentMethods;
  if (!d.settings.paymentMethods.includes('Gratis')) d.settings.paymentMethods.push('Gratis');
  const sk = Object.assign({}, def.settings.sticker, d.settings.sticker || {});
  sk.nameFont = STK_FONTS[sk.nameFont] ? sk.nameFont : 'sans';
  sk.clsFont = STK_FONTS[sk.clsFont] ? sk.clsFont : 'sans';
  sk.brandFont = STK_FONTS[sk.brandFont] ? sk.brandFont : 'sans';
  sk.lineW = Math.max(0.5, Math.min(6, +sk.lineW || 2));
  sk.nameScale = clampScale(sk.nameScale, 70, 140);
  sk.clsScale = clampScale(sk.clsScale, 40, 160);
  sk.brandScale = clampScale(sk.brandScale, 40, 200);
  /* padV = jarak atas-bawah isi dalam satu sel stiker (mm); gantikan rowH lama */
  const pv = +sk.padV;
  sk.padV = Number.isFinite(pv) ? Math.min(10, Math.max(0, pv)) : 2.6;
  /* tight = persen tinggi sel terhadap tinggi otomatis, memperkecil kotak tanpa mengubah font manual */
  const tg = +sk.tight;
  sk.tight = Number.isFinite(tg) ? Math.min(100, Math.max(50, tg)) : 100;
  sk.mark = STK_MARKS[sk.mark] ? sk.mark : 'bar';
  sk.tone = STK_TONES[sk.tone] ? sk.tone : 'soft';
  d.settings.sticker = sk;
  d.settings.uiFont = UI_FONTS[d.settings.uiFont] ? d.settings.uiFont : 'default';
  d.settings.uiZoom = clampScale(d.settings.uiZoom, UI_ZOOM_MIN, UI_ZOOM_MAX);
  d.settings.waCountry = String(d.settings.waCountry || '').replace(/\D/g, '') || '62';
  if (typeof d.settings.waTemplate !== 'string' || !d.settings.waTemplate.trim()) d.settings.waTemplate = def.settings.waTemplate;
  if (!Array.isArray(d.settings.menuSnack)) d.settings.menuSnack = def.settings.menuSnack.slice();
  if (!Array.isArray(d.settings.menuLunch)) d.settings.menuLunch = def.settings.menuLunch.slice();
  if (!Array.isArray(d.settings.packages)) d.settings.packages = [];
  d.settings.packages = d.settings.packages
    .filter(p => p && (p.type === 'snack' || p.type === 'lunch'))
    .map(p => ({ id: p.id || uid(), type: p.type, name: String(p.name || '').trim(), price: +p.price || 0 }))
    .filter(p => p.name);
  if (!Array.isArray(d.customers)) d.customers = [];
  if (!d.snack || typeof d.snack !== 'object') d.snack = {};
  if (!d.lunch || typeof d.lunch !== 'object') d.lunch = {};
  if (!d.menu || typeof d.menu !== 'object') d.menu = { snack: {}, lunch: {} };
  if (!d.menu.snack || typeof d.menu.snack !== 'object') d.menu.snack = {};
  if (!d.menu.lunch || typeof d.menu.lunch !== 'object') d.menu.lunch = {};
  /* Baris biasa tidak punya harga lagi, harganya ikut paket anak. Harga di baris = hari spesial. */
  const normMenu = arr => (Array.isArray(arr) ? arr : []).map(it => {
    if (typeof it === 'string') return { name: it, type: 'snack', price: '' };
    let t = MENU_TYPES.includes(it && it.type) ? it.type : 'snack';
    const price = (it && +it.price > 0) ? +it.price : '';
    if (price !== '' && (t === 'snack' || t === 'lunch')) t += '-spesial';
    const harga = (t === 'po' || t === 'snack-spesial' || t === 'lunch-spesial') ? price : '';
    return { name: String((it && it.name) || '').trim(), type: t, pkg: (it && it.pkg) || '', price: harga };
  }).filter(it => it.name);
  if (!d.menuPlan || typeof d.menuPlan !== 'object') d.menuPlan = {};
  for (const date in d.menuPlan) {
    d.menuPlan[date] = normMenu(d.menuPlan[date]);
    if (!d.menuPlan[date].length) delete d.menuPlan[date];
  }
  const snackPkgIds = new Set((d.settings.packages || []).filter(p => p.type === 'snack').map(p => p.id));
  for (const date in d.menuPlan) d.menuPlan[date] = d.menuPlan[date].map(it => {
    if (it.pkg && !snackPkgIds.has(it.pkg)) it.pkg = '';
    return it;
  });
  delete d.menuDaily;
  d.customers.forEach(c => {
    c.snackPkg = c.snackPkg || ''; c.lunchPkg = c.lunchPkg || ''; c.parent = c.parent || '';
    c.phone = String(c.phone || '').trim(); c.allergy = String(c.allergy || '').trim().slice(0, 80);
    /* status = satu-satunya sumber; c.active dibiarkan tetap terisi supaya logika lama tidak berubah */
    c.status = CUST_STATUS.indexOf(c.status) >= 0 ? c.status : (c.active === false ? 'berhenti' : 'aktif');
    c.onceDate = /^\d{4}-\d{2}-\d{2}$/.test(c.onceDate || '') ? c.onceDate : '';
    c.active = custActive(c);
  });
  ['snack', 'lunch'].forEach(t => {
    for (const date in d[t]) {
      const n = (d.menuPlan[date] || []).filter(it => menuTypeOf(it) === t).length;
      for (const id in d[t][date]) {
        const r = d[t][date][id];
        const max = t === 'snack' ? Infinity : 1;
        let list = (Array.isArray(r.mis) ? r.mis.map(Number) : [])
          .filter(x => Number.isInteger(x) && x >= 0 && x < n);
        if (!list.length && Number.isInteger(r.mi) && r.mi >= 0 && r.mi < n) list = [r.mi];
        list = [...new Set(list)].sort((a, b) => a - b).slice(0, max);
        if (list.length) { r.mis = list; r.mi = list[0]; } else { delete r.mis; delete r.mi; }
      }
    }
  });
  if (!Array.isArray(d.holidays)) d.holidays = [];
  /* tanggal + lingkup libur dibatasi: berkas cadangan hasil suntingan bisa membuat
     render agenda gagal sebelum halaman sempat tampil */
  d.holidays = d.holidays.filter(h => h && /^\d{4}-\d{2}-\d{2}$/.test(h.date || '')).map(h => ({
    id: h.id || uid(),
    date: h.date,
    scope: ['all', 'cohort', 'class', 'person'].includes(h.scope) ? h.scope : 'all',
    value: String(h.value || '').slice(0, 60),
    note: String(h.note || '').slice(0, 120)
  }));
  if (!Array.isArray(d.reminders)) d.reminders = [];
  d.reminders = d.reminders.map(r => ({
    id: r.id || uid(),
    date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : todayStr(),
    time: /^\d{1,2}:\d{2}$/.test(r.time || '') ? r.time : '',
    text: String(r.text || '').trim().slice(0, 120),
    repeat: ['once', 'weekly', 'monthly'].includes(r.repeat) ? r.repeat : 'once',
    doneOn: /^\d{4}-\d{2}-\d{2}$/.test(r.doneOn || '') ? r.doneOn : '',
    ref: String(r.ref || '').slice(0, 40)
  })).filter(r => r.text);
  if (!Array.isArray(d.log)) d.log = [];
  if (!Array.isArray(d.po)) d.po = [];
  d.po.forEach(p => { p.status = p.status === 'siap' || p.status === 'kirim' ? p.status : ''; });
  d.po.forEach(p => { p.due = /^\d{4}-\d{2}-\d{2}$/.test(p.due || '') ? p.due : ''; p.invNo = String(p.invNo || '').slice(0, 24); });
  d.settings.bankName = String(d.settings.bankName || '').trim().slice(0, 30);
  d.settings.bankNumber = String(d.settings.bankNumber || '').replace(/[^\d-]/g, '').slice(0, 30);
  d.settings.bankHolder = String(d.settings.bankHolder || '').trim().slice(0, 40);
  /* logo hanya diterima sebagai data URL gambar; berkas lain dibuang supaya cadangan tetap aman */
  d.settings.logo = (typeof d.settings.logo === 'string' && d.settings.logo.length < 1200000 &&
    /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(d.settings.logo)) ? d.settings.logo : '';
  const lo = Object.assign({}, def.settings.logoOpts, d.settings.logoOpts || {});
  ['stiker', 'konfirmasi', 'laporan', 'invoice'].forEach(k => { lo[k] = !!lo[k]; });
  lo.headMm = Math.min(30, Math.max(8, Math.round(+lo.headMm || 14)));
  d.settings.logoOpts = lo;
  d.settings.invSeq = Math.max(0, Math.min(999999, Math.round(+d.settings.invSeq || 0)));
  if (!Array.isArray(d.poMenus)) d.poMenus = [];
  if (!Array.isArray(d.recipes)) d.recipes = [];
  const recipeKeys = new Set();
  d.recipes = d.recipes.map(r => ({
    id: r.id || uid(),
    name: String(r.name || '').trim().slice(0, 220),
    type: r.type === 'lunch' || r.type === 'po' ? r.type : 'snack',
    note: String(r.note || '').trim().slice(0, 160),
    steps: String(r.steps || '').trim().slice(0, 2000),
    ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map(g => ({
      name: String(g && g.name || '').trim().slice(0, 60),
      qty: +(g && g.qty) > 0 ? +(g && g.qty) : '',
      unit: String(g && g.unit || '').trim().slice(0, 16)
    })).filter(g => g.name)
  })).filter(r => {
    if (!r.name) return false;
    const k = r.type + '|' + flatName(r.name).toLowerCase().replace(/\s+/g, ' ').trim();
    if (recipeKeys.has(k)) return false;
    recipeKeys.add(k);
    return true;
  });
  if (!d.stock || typeof d.stock !== 'object') d.stock = {};
  ['bahan', 'wadah'].forEach(kind => {
    const keys = new Set();
    d.stock[kind] = (Array.isArray(d.stock[kind]) ? d.stock[kind] : []).map(x => ({
      id: x && x.id || uid(),
      name: String(x && x.name || '').trim().slice(0, 80),
      unit: String(x && x.unit || '').trim().slice(0, 16) || (kind === 'wadah' ? 'pcs' : ''),
      qty: Math.max(0, Math.min(999999, +x.qty || 0)),
      min: Math.max(0, Math.min(999999, +x.min || 0)),
      note: String(x && x.note || '').trim().slice(0, 160)
    })).filter(x => {
      if (!x.name) return false;
      const k = x.name.toLowerCase() + '|' + x.unit.toLowerCase();
      if (keys.has(k)) return false;
      keys.add(k);
      return true;
    });
  });
  if (!Array.isArray(d.expenses)) d.expenses = [];
  d.expenses = d.expenses.map(e => ({
    id: e && e.id || uid(),
    date: e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') ? e.date : todayStr(),
    category: String(e && e.category || '').trim().slice(0, 40) || 'Lainnya',
    note: String(e && e.note || '').trim().slice(0, 160),
    amount: Math.max(0, Math.min(999999999999, Math.round(+e.amount || 0)))
  })).filter(e => e.amount > 0);
  const navKeys = new Set(NAV_DEFAULT_ORDER);
  if (!Array.isArray(d.settings.navOrder)) d.settings.navOrder = NAV_DEFAULT_ORDER.slice();
  d.settings.navOrder = d.settings.navOrder.filter((k, i, a) => navKeys.has(k) && a.indexOf(k) === i);
  NAV_DEFAULT_ORDER.forEach(k => { if (!d.settings.navOrder.includes(k)) d.settings.navOrder.push(k); });
  if (!Array.isArray(d.settings.navHidden)) d.settings.navHidden = [];
  d.settings.navHidden = d.settings.navHidden.filter((k, i, a) => navKeys.has(k) && k !== 'settings' && a.indexOf(k) === i);
  return d;
}

/* ---------- Data contoh (demo) ---------- */
/* Nama usaha contoh, dipilih acak tiap kali data contoh dimuat */
const BRAND_NAMES = [
  ['Dapur Nusantara', 'Katering & snack sekolah'],
  ['Dapur Mbak Yuni', 'Masakan rumahan harian'],
  ['Rasa Bunda Kitchen', 'Katering anak sekolah'],
  ['Dapur Segar', 'Snack box & nasi kotak'],
  ['Sedap Jaya Catering', 'Katering sekolah & acara'],
  ['Dapur Ceria', 'Snack & lunch harian sekolah'],
  ['Keuken Ria', 'Catering rumahan'],
  ['Warung Dapur Tiga Rasa', 'Nasi kotak & snack'],
  ['Dapur Melati', 'Katering harian & langganan'],
  ['Rasa Rumah Catering', 'Masakan rumahan untuk sekolah']
];
function makeDemoData() {
  const d = defaultData();
  const brand = BRAND_NAMES[Math.floor(Math.random() * BRAND_NAMES.length)];
  d.settings.businessName = brand[0];
  d.settings.tagline = brand[1];
  d.settings.bankHolder = brand[0];
  const pk = (type, name, price) => ({ id: uid(), type, name, price });
  const sMini = pk('snack', 'Snack Mini', 4500);
  const sSedang = pk('snack', 'Snack Sedang', 7000);
  const sKomplit = pk('snack', 'Snack Komplit', 9500);
  const lStandar = pk('lunch', 'Nasi Kotak Standar', 16000);
  const lBesar = pk('lunch', 'Nasi Kotak Besar', 20000);
  const lPrem = pk('lunch', 'Nasi Kotak Premium', 24000);
  d.settings.packages = [sMini, sSedang, sKomplit, lStandar, lBesar, lPrem];
  d.settings.bankName = 'Mandiri';
  d.settings.bankNumber = '1390022114455';
  d.settings.invSeq = 24;

  const mk = (name, className, parent, period, days, snack, lunch, extra) =>
    Object.assign({ id: uid(), name, className, parent: parent || '', period, days: days || [], snackDefault: !!snack, lunchDefault: !!lunch, snackPkg: '', lunchPkg: '', allergy: '', active: true, status: 'aktif' }, extra || {});
  const kids = [
    mk('Alya Ramadhani', '1B', 'Ibu Sari', 'weekly', [], true, true, { snackPkg: sMini.id, lunchPkg: lStandar.id, phone: '0812-3400-1122', allergy: 'Alergi kacang: tanpa kue kacang' }),
    mk('Bagas Nugraha', '1B', 'Bpk. Hendra', 'weekly', [], true, false, { snackPkg: sSedang.id }),
    mk('Cahaya Illaika', '2A', 'Ibu Sari', 'monthly', [], true, true, { lunchPkg: lBesar.id, phone: '0812-3400-1122' }),
    mk('Dimas Aryo', '2A', 'Bpk. Yusuf', 'daily', [1, 2, 3], true, true, { snackPkg: sMini.id, phone: '0857-2200-3311' }),
    mk('Elora Suci', '3C', 'Ibu Marni', 'weekly', [], false, true, { lunchPkg: lPrem.id, allergy: 'Intoleransi susu: tanpa keju' }),
    mk('Farhan Maulana', '3C', 'Bpk. Hendra', 'weekly', [], true, true, { snackPkg: sKomplit.id, phone: '0857-2200-3311' }),
    mk('Gadis Puspita', '4A', 'Ibu Endah', 'semester', [], true, true, { snackPkg: sSedang.id, allergy: 'Tidak makan pedas' }),
    mk('Hafiz Ramadhan', '4A', 'Bpk. Yusuf', 'weekly', [], true, false, { snackPkg: sMini.id, phone: '0821-7788-9001' }),
    mk('Indira Kayana', '5B', 'Ibu Marni', 'monthly', [], true, true, { lunchPkg: lBesar.id }),
    mk('Jibril Anwar', '5B', 'Ibu Endah', 'weekly', [], false, true, { lunchPkg: lStandar.id, status: 'berhenti' }),
    mk('Kiran Maheswari', '6A', 'Bpk. Hendra', 'weekly', [], true, true, { snackPkg: sSedang.id, phone: '0821-7788-9001', allergy: 'Alergi seafood' }),
    mk('Luthfi Hakim', '6A', 'Ibu Sari', 'daily', [1, 3, 5], true, true, { lunchPkg: lStandar.id }),
    mk('Mutiara Zahra', '7C', 'Bpk. Yusuf', 'weekly', [], true, true, { snackPkg: sMini.id, allergy: 'Vegetarian, lauk tahu/tempe' }),
    mk('Nabil Prakoso', '8A', 'Ibu Marni', 'weekly', [], true, true, { lunchPkg: lPrem.id, phone: '0813-9900-2244' }),
    mk('Oka Sriwibowo', '8A', 'Bpk. Hendra', 'monthly', [], false, true, { lunchPkg: lBesar.id, status: 'selesai' }),
    mk('Puput Arumbani', '9B', 'Ibu Endah', 'weekly', [], true, true, { snackPkg: sKomplit.id }),
    mk('Qori Amelia', '10A', 'Ibu Sari', 'semester', [], true, true, { lunchPkg: lPrem.id, phone: '0813-9900-2244', allergy: 'Maag: hindari asam & pedas' }),
    mk('Rafan Syahputra', '10A', 'Bpk. Yusuf', 'weekly', [], true, false, { snackPkg: sSedang.id }),
    mk('Salsabila Azzahra', '11C', 'Ibu Marni', 'weekly', [], true, true, { snackPkg: sMini.id, lunchPkg: lStandar.id }),
    mk('Taufik Hidayat', '11C', 'Ibu Endah', 'weekly', [], false, true, { lunchPkg: lBesar.id, phone: '0857-2200-3311' }),
    mk('Ulva Hanum', '12A', 'Bpk. Hendra', 'monthly', [], true, true, { allergy: 'Alergi telur' }),
    mk('Wira Santoso', '12A', 'Ibu Sari', 'weekly', [], true, true, { snackPkg: sKomplit.id, lunchPkg: lPrem.id, phone: '0821-7788-9001' }),
    mk('Yolanda Putri', '12B', 'Ibu Marni', 'daily', [2, 4, 6], true, false, { snackPkg: sSedang.id }),
    /* nama kembar sengaja ada dua, memperlihatkan daftar pelanggan dengan nama sama tetap dibedakan kelasnya */
    mk('Zaki Maulana', '2A', 'Bpk. Yusuf', 'weekly', [], true, true, {}),
    mk('Zaki Maulana', '9B', 'Ibu Endah', 'weekly', [], false, true, { lunchPkg: lStandar.id })
  ];
  d.customers = kids;

  const today = todayStr();
  /* contoh libur sengaja berada di luar minggu berjalan, minggu ini tetap penuh pesanan
      supaya halaman pertama tidak kosong (dan penanda libur tidak menghapus isi minggu ini) */
  const sen = mondayOf(today);
  const offAll = shiftDate(sen, -10);      // Jumat dua minggu lalu
  const offClass = shiftDate(sen, -4);     // Kamis minggu lalu
  const leaveCohort = shiftDate(sen, 11);  // Jumat minggu depan
  const leavePerson = shiftDate(sen, 8);   // Selasa minggu depan
  const methods = ['Tunai', 'Transfer', 'QRIS'];

  /* tiga rotasi menu mingguan: paket sama, makanan berbeda; dua hari berisi menu spesial dengan harganya sendiri */
  const mi = (name, type, pkg, price) => ({ name, type, pkg: '', price: /-spesial$/.test(type) ? (price || '') : '' });
  const W1 = [
    [mi('Roti Sari Gandum\nSelai Nanas\nPisang', 'snack', sMini.id), mi('Susu Cokelat\nBiskuit', 'snack', sSedang.id)],
    [mi('Nasi Goreng Jawa\nAyam Suwir\nSayur\nPuding', 'lunch', lStandar.id), mi('Risoles Mayo\nMelon', 'snack', sSedang.id)],
    [mi('Bubur Merah\nKacang\nRoti', 'snack', sSedang.id), mi('Kue Lumpur\nKelapa', 'snack', sMini.id),
      mi('Nasi Uduk\nAyam Bakar\nTahu\nBuah', 'lunch', lPrem.id)],
    [mi('Perkedel Jagung\nSayur', 'snack', sMini.id), mi('Es Jeruk\nNata', 'snack', sSedang.id),
      mi('Mie Ayam Spesial\nBakso\nSawi', 'lunch-spesial', '', 22000), mi('Nasi Ayam Kalio\nSayur', 'lunch', lStandar.id)],
    [mi('Kue Putu\nBulan', 'snack', sMini.id), mi('Nasi Kuning\nAyam\nAbon\nPuding', 'lunch', lStandar.id)],
    [mi('Sandwich Telur\nKeju', 'snack', sSedang.id), mi('Kue Tart Ulang Tahun', 'po')],
    []
  ];
  const W2 = [
    [mi('Donat Kampung\nGula Halus', 'snack', sMini.id), mi('Puding Roti\nSaus Vanila', 'snack', sSedang.id),
      mi('Abon Daging\nNasi', 'snack', sKomplit.id)],
    [mi('Nasi Ayam Bakar\nSayur\nBuah', 'lunch', lStandar.id), mi('Lontong Sayur\nTelur Balado', 'lunch', lPrem.id),
      mi('Lapis Legit\nTeh', 'snack', sSedang.id)],
    [mi('Bola Tahu\nSayur', 'snack', sMini.id), mi('Cemilan Manis\nPuding Cokelat', 'snack', sSedang.id)],
    [mi('Soto Ayam\nNasi\nPerkedel', 'lunch', lStandar.id), mi('Tahu Isi\nSayur', 'snack', sMini.id),
      mi('Es Teh Manis\nJeruk', 'snack-spesial', '', 5000)],
    [mi('Nasi Uduk Betawi\nAyam Goreng\nTempe\nBuah', 'lunch', lPrem.id)],
    [mi('Roti Bakar Keju\nSusu', 'snack', sSedang.id), mi('Nasi Box Pengajian', 'po')],
    []
  ];
  const W3 = [
    [mi('Klepon\nUnu', 'snack', sMini.id), mi('Susu Stroberi\nRoti', 'snack', sSedang.id)],
    [mi('Nasi Goreng Kampung\nTelur\nSayur', 'lunch', lStandar.id), mi('Pastel Isi\nSayur', 'snack', sSedang.id)],
    [mi('Pisang Rebus\nKaramel', 'snack', sMini.id), mi('Nasi Ayam Woku\nSayur\nPuding', 'lunch', lBesar.id)],
    [mi('Tahu Bulat\nBakso', 'snack', sKomplit.id), mi('Es Buah\nSemangka', 'snack', sSedang.id),
      mi('Nasi Rendang\nSayur\nBuah', 'lunch', lPrem.id)],
    [mi('Getuk Singkong\nKelapa', 'snack', sMini.id), mi('Nasi Pecel\nAyam Goreng', 'lunch', lStandar.id)],
    [mi('Martabak Mini\nCokelat', 'snack', sSedang.id), mi('Tumpeng Mini', 'po')],
    []
  ];
  const mon = mondayOf(today);
  for (let w = -3; w <= 1; w++) {
    const tpl = [W1, W2, W3][((w % 3) + 3) % 3];
    for (let i = 0; i < 7; i++) {
      const date = shiftDate(mon, w * 7 + i);
      if (tpl[i].length) d.menuPlan[date] = tpl[i].map(x => Object.assign({}, x));
    }
  }
  /* tanggal libur semua orang dibiarkan hanya berisi baris PO, sama seperti hasil menandai libur di Beranda */
  if (d.menuPlan[offAll]) {
    const poOnly = d.menuPlan[offAll].filter(x => x.type === 'po');
    if (poOnly.length) d.menuPlan[offAll] = poOnly; else delete d.menuPlan[offAll];
  }

  const pickOf = (type, date, c, i) => {
    const items = (d.menuPlan[date] || []).filter(x => menuTypeOf(x) === type);
    if (!items.length) return { items: [], mis: [] };
    const first = (i * 3 + c.name.length + (type === 'lunch' ? 2 : 0)) % items.length;
    const mis = [first];
    if (type === 'snack' && items.length > 1 && (i + c.name.length) % 4 === 0) {
      mis.push((first + 1) % items.length);
      mis.sort((a, b) => a - b);
    }
    return { items, mis };
  };
  /* dua anak cukup beli sekali: satu tanggal pilihan, bukan rangkaian hari */
  const hariKerja = (dari, langkah) => { let x = shiftDate(dari, langkah); while (weekdayOf(x) > 5) x = shiftDate(x, langkah); return x; };
  const sekali = [
    { c: kids[7], type: 'snack', date: hariKerja(today, -2) },  // tanggalnya sudah lewat → tidak muncul di "yang berjalan"
    { c: kids[15], type: 'lunch', date: hariKerja(today, 2) }   // masih berjalan
  ];
  sekali.forEach(x => { x.c.status = 'sekali'; x.c.onceDate = x.date; x.c.active = true; });
  /* 42 hari ke belakang + seminggu ke depan, langganan asli juga sudah terisi ke depan,
     jadi akhir pekan pun halaman Cetak / Pesanan Mingguan tidak kosong */
  for (let i = 41; i >= -7; i--) {
    const date = shiftDate(today, -i);
    if (weekdayOf(date) === 7) continue;              // Minggu diliburkan
    if (date === offAll) continue;                    // libur nasional (contoh)
    for (const type of ['snack', 'lunch']) {
      for (const c of kids) {
        if (!c.active) continue;
        if (date === offClass && c.className === '11C') continue;
        if (c.period === 'daily' && !(c.days || []).includes(weekdayOf(date))) continue;
        if (c.status !== 'aktif') continue;
        if (!c[type === 'snack' ? 'snackDefault' : 'lunchDefault']) continue;
        if (!d[type][date]) d[type][date] = {};
        const gratis = (type === 'lunch' && c.name === 'Dimas Aryo' && i % 9 === 0) || (type === 'snack' && c.name === 'Elora Suci' && i % 13 === 0);
        /* tunggakan menumpuk di hari-hari terakhir supaya daftar tagihan dan grafik punya isi */
        const unpaid = (i * 5 + c.name.length + (type === 'lunch' ? 3 : 0)) % 11 === 0 || (i < 8 && (i + c.name.length) % 3 === 0);
        const pick = pickOf(type, date, c, i);
        const rec = {
          ordered: true, paid: gratis || !unpaid,
          method: gratis ? 'Gratis' : methods[(i + c.name.length + (type === 'lunch' ? 1 : 0)) % 3],
          note: i === 4 && c.name === 'Alya Ramadhani' ? 'Tanpa selai (alergi)' : (i === 2 && c.name === 'Wira Santoso' ? 'Bawa kotak sendiri' : ''),
          pkg: c[type === 'snack' ? 'snackPkg' : 'lunchPkg'] || ''
        };
        if (pick.mis.length) { rec.mis = pick.mis; rec.mi = pick.mis[0]; }
        d[type][date][c.id] = rec;
      }
    }
  }

  /* pesanan tunggal mereka dibuat terpisah, persis pada tanggal pilihan */
  sekali.forEach(x => {
    const items = (d.menuPlan[x.date] || []).filter(y => menuTypeOf(y) === x.type);
    const r = {
      ordered: true, paid: false, method: methods[1], note: '',
      pkg: x.c[x.type === 'snack' ? 'snackPkg' : 'lunchPkg'] || (x.type === 'snack' ? sMini.id : lStandar.id)
    };
    if (items.length === 1) { r.mis = [0]; r.mi = 0; }
    (d[x.type][x.date] = d[x.type][x.date] || {})[x.c.id] = r;
  });

  const pm = (date, item, price) => ({ id: uid(), date, item, price, note: '' });
  const m1 = pm(shiftDate(today, -4), 'Rice Bowl Rapat Guru', 18000);
  const m2 = pm(shiftDate(today, -21), 'Snack Box Seminar Sekolah', 12000);
  const m3 = pm(shiftDate(today, 4), 'Tumpeng Ulang Tahun Sekolah', 250000);
  const m4 = pm(today.slice(0, 8) + '20', 'Nasi Kotak Pengajian', 22000);
  const m5 = pm('2025-12-20', 'Hampers Akhir Tahun', 165000);
  const m6 = pm('2026-08-17', 'Nasi Box HUT RI', 20000);
  d.poMenus = [m1, m2, m3, m4, m5, m6];
  const buyer = (m, name, qty, method, paid, note, status) =>
    ({ id: uid(), menuId: m.id, date: m.date, item: m.item, name, qty, price: method === 'Gratis' ? 0 : m.price, method, paid: method === 'Gratis' ? true : !!paid, note: note || '', status: status || '' });
  d.po = [
    buyer(m1, 'Bpk. Hendra', 12, 'Transfer', true, '', 'kirim'),
    buyer(m1, 'Ibu Sari', 6, 'Tunai', false, '', 'siap'),
    buyer(m2, 'Komite Sekolah', 40, 'Transfer', true, 'sudah dibayar penuh', 'kirim'),
    buyer(m2, 'Ibu Marni', 3, 'QRIS', true),
    buyer(m3, 'Panitia Kelas 6', 1, 'Transfer', false, 'DP 40%', 'siap'),
    buyer(m4, 'Bpk. Yusuf', 8, 'Tunai', false),
    buyer(m4, 'Ibu Endah', 4, 'Gratis', true, 'kompensasi kegiatan'),
    buyer(m5, 'Yayasan Citra Bangsa', 10, 'Transfer', true, '', 'kirim'),
    buyer(m6, 'Bpk. Surya', 4, 'Tunai', true, '', 'kirim'),
    buyer(m6, 'Qori Amelia', 1, 'QRIS', false, 'DP 50%', 'siap')
  ];

  /* contoh pesanan kelompok (lembaga pesan banyak porsi, beberapa tanggal ambil) */
  const groupOrder = (org, pic, contact, item, price, note, pairs, dp, due, statuses) => {
    const gid = uid();
    let cover = dp;
    pairs.forEach((pair, n) => {
      const v = pair[1] * price;
      const lunas = cover >= v;
      if (lunas) cover -= v;
      d.po.push({
        id: uid(), groupId: gid, menuId: '', org: org, pic: pic, contact: contact,
        date: pair[0], item: item, name: org, qty: pair[1], price: price,
        method: 'Transfer', paid: lunas, status: statuses && statuses[n] ? statuses[n] : '',
        note: note, due: due
      });
    });
    return { gid: gid, left: cover };
  };
  const gTrip = groupOrder('Panitia Study Tour Kelas 6', 'Ibu Marni', '0813-9900-2244', 'Nasi Kotak Siswa', 20000,
    'Tanpa pedas, antar pukul 06.30 (contoh)', [[shiftDate(today, 3), 48], [shiftDate(today, 10), 52]], 960000,
    shiftDate(today, 14), ['siap', '']);
  const gDesa = groupOrder('Kantor Desa Sukamaju', 'Bpk. Yusuf', '0821-7788-9001', 'Rapat Bulanan (Nasi Kotak)', 24000,
    'Tambahan 2 porsi untuk panitia (contoh)', [[shiftDate(today, -6), 26], [shiftDate(today, 8), 34]], 600000,
    shiftDate(today, -2), ['kirim', '']);
  const gYayasan = groupOrder('Yayasan Citra Bangsa', 'Ibu Endah', '0857-2200-3311', 'Baksos Snack Box', 9500,
    'Kemas per 50 kotak (contoh)', [[shiftDate(today, 12), 120], [shiftDate(today, 13), 80]], 500000,
    shiftDate(today, 15), ['', '']);
  /* satu kelompok sudah diterbitkan invoice-nya, dua lainnya belum, untuk memperlihatkan dua keadaan nomor invoice */
  d.po.forEach(p => { if (p.groupId === gDesa.gid) p.invNo = 'INV/' + today.slice(0, 4) + '/' + today.slice(5, 7) + '/023'; });

  d.holidays = [
    { id: uid(), date: offAll, scope: 'all', value: '', note: 'Libur nasional (contoh)' },
    { id: uid(), date: offClass, scope: 'class', value: '11C', note: 'Kelas 11C outing (contoh)' },
    { id: uid(), date: leaveCohort, scope: 'cohort', value: '12', note: 'Wisuda kelas 12 (contoh)' },
    { id: uid(), date: leavePerson, scope: 'person', value: kids[5].id, note: 'Sakit (contoh)' }
  ];

  d.reminders = [
    { id: uid(), date: shiftDate(today, -3), time: '', text: 'Ambil kotak snack yang tertinggal di sekolah', repeat: 'once', doneOn: '', ref: '' },
    { id: uid(), date: today, time: '06:30', text: 'Belanja bahan untuk besok', repeat: 'weekly', doneOn: '', ref: '' },
    { id: uid(), date: shiftDate(today, 1), time: '', text: 'Cek pesanan PO yang diambil minggu ini', repeat: 'once', doneOn: '', ref: '' },
    { id: uid(), date: today.slice(0, 8) + '05', time: '', text: 'Tagih langganan bulanan', repeat: 'monthly', doneOn: '', ref: '' },
    { id: uid(), date: shiftDate(today, 2), time: '13:30', text: 'Kirim invoice Panitia Study Tour Kelas 6', repeat: 'once', doneOn: '', ref: gTrip.gid },
    { id: uid(), date: shiftDate(today, 5), time: '09:00', text: 'Masak 120 snack box baksos', repeat: 'once', doneOn: '', ref: gYayasan.gid },
    { id: uid(), date: shiftDate(today, -1), time: '', text: 'Bungkus 26 porsi rapat desa', repeat: 'once', doneOn: shiftDate(today, -1), ref: '' },
    { id: uid(), date: shiftDate(today, -2), time: '', text: 'Tagih Kantor Desa Sukamaju, jatuh tempo terlewat', repeat: 'once', doneOn: '', ref: gDesa.gid }
  ];

  const rc = (name, type, items, note) => ({ id: uid(), name, type, ingredients: items.map(([n, qty, unit]) => ({ name: n, qty, unit })), note: note || '' });
  d.recipes = [
    rc('Roti Sari Gandum\nSelai Nanas\nPisang', 'snack', [['Roti gandum', 3, 'bungkus'], ['Selai nanas', 1, 'botol'], ['Pisang', 2, 'sisir']]),
    rc('Susu Cokelat\nBiskuit', 'snack', [['Susu UHT', 2, 'liter'], ['Bubuk cokelat', 0.5, 'kg'], ['Biskuit', 2, 'kaleng']]),
    rc('Nasi Goreng Jawa\nAyam Suwir\nSayur\nPuding', 'lunch', [['Beras', 5, 'kg'], ['Ayam', 3, 'kg'], ['Bumbu nasi goreng', 2, 'bungkus'], ['Sayur', 3, 'kg'], ['Puding', 2, 'bungkus']]),
    rc('Nasi Uduk\nAyam Bakar\nTahu\nBuah', 'lunch', [['Beras', 4, 'kg'], ['Santan', 2, 'liter'], ['Ayam', 3, 'kg'], ['Tahu', 2, 'kg'], ['Buah', 2, 'kg']]),
    rc('Nasi Kuning\nAyam\nAbon\nPuding', 'lunch', [['Beras', 4, 'kg'], ['Ayam', 3, 'kg'], ['Abon', 1, 'kg'], ['Puding', 2, 'bungkus']]),
    rc('Nasi Goreng Kampung\nTelur\nSayur', 'snack', [['Beras', 3, 'kg'], ['Telur', 1, 'kg'], ['Minyak goreng', 1, 'liter'], ['Bawang merah', 0.5, 'kg'], ['Kecap manis', 1, 'botol'], ['Sayur', 2, 'kg']], 'Bumbu dasar sudah ada di dapur'),
    rc('Roti Bakar Keju\nSusu', 'snack', [['Roti tawar', 4, 'bungkus'], ['Keju cheddar', 1, 'kg'], ['Susu UHT', 2, 'liter'], ['Mentega', 0.5, 'kg']]),
    rc('Nasi Ayam Bakar\nSayur\nBuah', 'lunch', [['Beras', 5, 'kg'], ['Ayam', 4, 'kg'], ['Bumbu bakar', 2, 'bungkus'], ['Sayur', 3, 'kg'], ['Buah', 3, 'kg']]),
    rc('Soto Ayam\nNasi\nPerkedel', 'lunch', [['Ayam', 3, 'kg'], ['Beras', 4, 'kg'], ['Bumbu soto', 2, 'bungkus'], ['Kentang', 2, 'kg'], ['Daun bawang', 1, 'ikat']]),
    rc('Nasi Uduk Betawi\nAyam Goreng\nTempe\nBuah', 'lunch', [['Beras', 4, 'kg'], ['Santan', 2, 'liter'], ['Ayam', 3, 'kg'], ['Tempe', 2, 'kg'], ['Buah', 2, 'kg']])
  ];

  const st = (kind, name, unit, qty, min, note) => ({ id: uid(), name, unit, qty, min, note: note || '' });
  d.stock = {
    bahan: [
      st('bahan', 'Beras', 'kg', 20, 5),
      st('bahan', 'Ayam', 'kg', 4, 2),
      st('bahan', 'Telur', 'kg', 2, 1),
      st('bahan', 'Minyak goreng', 'liter', 2, 2),
      st('bahan', 'Biskuit', 'kaleng', 1, 2),
      st('bahan', 'Susu UHT', 'liter', 3, 2),
      st('bahan', 'Puding', 'bungkus', 2, 2),
      st('bahan', 'Santan', 'liter', 1, 1),
      st('bahan', 'Sayur', 'kg', 1, 1),
      st('bahan', 'Tepung', 'kg', 2, 1),
      st('bahan', 'Buah', 'kg', 0, 2, 'Perlu dibeli')
    ],
    wadah: [
      st('wadah', 'Kotak snack', 'pcs', 180, 50),
      st('wadah', 'Nasi kotak', 'pcs', 90, 40),
      st('wadah', 'Sendok plastik', 'pcs', 240, 60),
      st('wadah', 'Kantong kresek', 'pcs', 150, 50),
      st('wadah', 'Gelas cup', 'pcs', 40, 50, 'Tinggal sedikit')
    ]
  };

  d.expenses = [
    { date: shiftDate(today, -1), category: 'Belanja pasar', note: 'Beras, ayam, dan sayur', amount: 850000 },
    { date: shiftDate(today, -3), category: 'Gas & energi', note: 'Gas elpiji 3 kg x 6', amount: 180000 },
    { date: shiftDate(today, -5), category: 'Kemasan', note: 'Kotak snack dan sendok', amount: 320000 },
    { date: shiftDate(today, -8), category: 'Transport', note: 'Antar pesanan pagi', amount: 120000 },
    { date: shiftDate(today, -25), category: 'Gaji', note: 'Bantu dapur minggu ke-2', amount: 450000 },
    { date: shiftDate(today, -40), category: 'Belanja pasar', note: 'Belanja bulan lalu', amount: 790000 },
    { date: shiftDate(today, -45), category: 'Listrik & air', note: 'Tagihan bulan lalu', amount: 260000 }
  ].map(e => Object.assign({ id: uid() }, e));

  d.log = [
    { id: uid(), ts: new Date().toISOString(), action: 'default', detail: 'Data contoh dimuat untuk demo' },
    { id: uid(), ts: new Date(Date.now() - 2400e3).toISOString(), action: 'menu', detail: 'Harga Mie Ayam hari ini diubah ke Rp 22.000' },
    { id: uid(), ts: new Date(Date.now() - 6600e3).toISOString(), action: 'kustomisasi', detail: 'Pilih snack Alya Ramadhani · menu A+B' },
    { id: uid(), ts: new Date(Date.now() - 15000e3).toISOString(), action: 'po', detail: 'Tambah pesanan kelompok Yayasan Citra Bangsa' },
    { id: uid(), ts: new Date(Date.now() - 132000e3).toISOString(), action: 'pelanggan', detail: 'Catatan alergi Qori Amelia diperbarui' }
  ];
  return d;
}
function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return normalize(makeDemoData());
    return normalize(JSON.parse(raw));
  } catch (e) { return normalize(defaultData()); }
}

function clockedTime(d) {
  return (d || new Date()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
/* Kaki sidebar: jam simpan terakhir, saat baru dibuka memakai waktu aksi terakhir di Log */
function setSaveStatus(txt) {
  const st = document.getElementById('saveStatus');
  if (!st) return;
  if (!txt) {
    const last = (db.log && db.log[0] && db.log[0].ts) ? new Date(db.log[0].ts) : null;
    txt = last ? 'Tersimpan ' + clockedTime(last) : 'Tersimpan otomatis';
  }
  st.textContent = txt;
  st.title = 'Perubahan tersimpan otomatis di browser ini';
}

function save(opts) {
  const quiet = !!(opts && opts.noUndo); // perubahan tampilan saja: tidak masuk antrean urungkan
  const json = JSON.stringify(db);
  if (!quiet && lastSaved !== null && json !== lastSaved) pushUndo();
  try { localStorage.setItem(DB_KEY, json); }
  catch (e) { toast('Gagal menyimpan: penyimpanan penuh?'); return; }
  lastSaved = json;
  setSaveStatus('Tersimpan ' + clockedTime());
  updateReminderBadge();
  renderNotif();
  if (!quiet) autoBackup();
  updateUndoBtn();
}

/* ---------- Urungkan / Ulangi: snapshot disimpan terpisah agar bisa dipakai dari Log Aktivitas ---------- */
const UNDO_MAX = 12;
const UNDO_BUDGET = 900000; // maksimum karakter JSON untuk satu tumpukan snapshot
const undoStack = [];
const redoStack = [];
let lastSaved = null;
let undoing = false;
function persistStack(key, stack) {
  for (;;) {
    const json = JSON.stringify(stack.map(s => ({ label: s.label, refLog: s.refLog, json: s.json })));
    if (json.length <= UNDO_BUDGET || stack.length <= 1) {
      try { localStorage.setItem(key, json); } catch (e) { /* penyimpanan penuh: cukup di memori */ }
      return;
    }
    stack.shift(); // buang snapshot paling tua sampai muat
  }
}
function loadStack(key, stack) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) arr.filter(s => s && typeof s.json === 'string').slice(-UNDO_MAX).forEach(s => stack.push(s));
  } catch (e) { /* tumpukan lama / rusak: abaikan */ }
}
const persistUndo = () => persistStack(UNDO_KEY, undoStack);
function loadUndo() {
  loadStack(UNDO_KEY, undoStack);
  loadStack(REDO_KEY, redoStack);
}
function pushUndo() {
  if (undoing || !lastSaved || lastSaved === JSON.stringify(db)) return;
  undoStack.push({ label: lastActionLabel || 'Perubahan', refLog: (db.log[0] && db.log[0].id) || '', json: lastSaved });
  if (undoStack.length > UNDO_MAX) undoStack.shift();
  if (redoStack.length) { redoStack.length = 0; try { localStorage.removeItem(REDO_KEY); } catch (e) { /* abaikan */ } }
  persistUndo();
}
function restoreSnapshot(s) {
  try { db = normalize(JSON.parse(s.json)); }
  catch (e) { toast('Gagal membatalkan perubahan'); return false; }
  undoing = true; save(); undoing = false;
  loadLogoImage();
  applyBrand(); applyUiStyle(); applyNavSettings();
  showPage(navHidden().includes(state.page) ? firstVisibleNav() : state.page);
  return true;
}
function undoLast() {
  const s = undoStack.pop();
  if (!s) { toast('Belum ada yang bisa diurutkan balik'); return; }
  redoStack.push({ label: s.label, refLog: s.refLog, json: lastSaved });
  if (redoStack.length > UNDO_MAX) redoStack.shift();
  persistUndo(); persistStack(REDO_KEY, redoStack);
  if (restoreSnapshot(s)) toast('Dibatalkan: ' + s.label, { redo: true });
}
/* Urungkan kembali sampai satu entri log, perubahan yang lebih baru ikut dibatalkan */
function undoToLog(logId) {
  const idx = undoStack.findIndex(s => s.refLog === logId);
  if (idx < 0) { toast('Langkah itu tidak ada di daftar urungkan, terlalu lama atau sudah pernah dibatalkan'); return; }
  const steps = undoStack.length - idx, s = undoStack[idx];
  if (!confirm('Urungkan "' + s.label + '"?' + (steps > 1 ? '\n\n' + steps + ' perubahan yang lebih baru juga ikut dibatalkan.' : ''))) return;
  redoStack.push({ label: s.label, refLog: s.refLog, json: lastSaved });
  if (redoStack.length > UNDO_MAX) redoStack.shift();
  undoStack.length = idx;
  persistUndo(); persistStack(REDO_KEY, redoStack);
  if (restoreSnapshot(s)) toast('Dibatalkan: ' + s.label + (steps > 1 ? ' · ' + steps + ' langkah' : ''), { redo: true });
}
function redoLast() {
  const s = redoStack.pop();
  if (!s) { toast('Tidak ada langkah yang bisa diulang'); return; }
  undoStack.push({ label: 'Ulangi: ' + s.label, refLog: '', json: lastSaved });
  if (undoStack.length > UNDO_MAX) undoStack.shift();
  persistUndo(); persistStack(REDO_KEY, redoStack);
  if (restoreSnapshot(s)) toast('Diulang: ' + s.label);
}
function undoableLogIds() {
  const out = new Set();
  undoStack.forEach(s => { if (s.refLog) out.add(s.refLog); });
  return out;
}
function updateUndoBtn() {
  const b = document.getElementById('undoBtn');
  if (b) {
    const top = undoStack[undoStack.length - 1];
    b.disabled = !top;
    b.title = top ? ('Urungkan: ' + top.label) : 'Belum ada yang bisa diurutkan balik';
    b.classList.toggle('is-ready', !!top);
  }
  const r = document.getElementById('redoBtn');
  if (r) {
    const top = redoStack[redoStack.length - 1];
    r.disabled = !top;
    r.title = top ? ('Ulangi: ' + top.label) : 'Tidak ada yang bisa diulang';
    r.classList.toggle('is-ready', !!top);
  }
}

let db = load();
lastSaved = JSON.stringify(db);
loadUndo();

/* ---------- State ---------- */
const state = {
  page: 'dashboard',
  printMode: 'stiker',
  currentDate: todayStr(),
  unpaidAll: false,      // "Buka semua" pada daftar Belum Lunas
  unpaidOpen: null,      // null = otomatis (hanya minggu terbaru), selain itu Set tanggal Senin yang dibuka
  report: null,
  satpamDate: todayStr(),
  poMonth: monthKey(todayStr()),
  rptMonth: monthKey(todayStr()),
  stickerDate: todayStr(),
  stickerType: 'snack', // filter daftar anak di kartu stiker: snack | lunch
  satpamType: 'snack',  // jenis kertas konfirmasi yang dibuat: snack | lunch
  menuDate: todayStr(),
  menuMonth: monthKey(todayStr()),
  dapurWeek: '',        // Senin minggu yang dibuka di halaman Dapur
  dapurQ: '',           // pencarian di Daftar Resep
  stockKind: 'bahan',   // tab halaman Stok: bahan | wadah
  expMonth: monthKey(todayStr()), // bulan yang dibuka di halaman Pengeluaran
  daily: { hari: { level: '', cohort: '', cls: '', q: '' } },
  billSel: new Set(), // anak yang dicentang untuk cek tagihan
  debtors: [],       // hasil perhitungan penunggak pada halaman Pengingat
  preview: null,     // { url, file, title } gambar yang sedang dipratinjau sebelum dibagikan
  printLogo: { stiker: null, konfirmasi: null, laporan: null, invoice: null }, // pilihan logo khusus cetakan berikutnya; null = ikut Pengaturan
  cust: { q: '', level: '', cohort: '', cls: '', status: 'jalan' }, // 'jalan' = aktif + beli sekali yang belum lewat
  custSel: new Set(), // pelanggan terpilih untuk aksi massal
  menuTab: 'week', // tab kartu Menu di Beranda: 'week' | 'daily'
  menuDay: 0, // hari terpilih (0=Senin..6=Minggu) saat tab Menu Harian aktif
  custom: { type: 'snack', weekStart: '', level: '', cohort: '', cls: '', q: '', hideWeekend: true }
};

/* ---------- Helper umum ---------- */
function pad(n) { return String(n).padStart(2, '0'); }
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function monthKey(dateStr) { return dateStr.slice(0, 7); }
function toMonthKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }

function shiftDate(dateStr, delta) {
  const p = dateStr.split('-').map(Number);
  return toDateStr(new Date(p[0], p[1] - 1, p[2] + delta));
}
function lastMonths(n) {
  const arr = [], d = new Date();
  for (let i = n - 1; i >= 0; i--) arr.push(new Date(d.getFullYear(), d.getMonth() - i, 1));
  return arr;
}
function lastNDates(n) {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); arr.push(toDateStr(d)); }
  return arr;
}

function fmtIDR(n) { return 'Rp ' + (+n || 0).toLocaleString('id-ID'); }
function mmLabel(v) { return (+v || 0).toFixed(1).replace('.', ','); }
function fmtShort(n) {
  n = +n || 0;
  if (n >= 1e9) return trim1(n / 1e9) + 'M';
  if (n >= 1e6) return trim1(n / 1e6) + 'jt';
  if (n >= 1e3) return trim1(n / 1e3) + 'rb';
  return '' + n;
}
function trim1(x) { return (Math.round(x * 10) / 10).toString().replace('.0', ''); }
function fmtShortDate(dateStr) {
  const p = dateStr.split('-').map(Number);
  return p[2] + ' ' + MONTHS_ID[p[1] - 1] + ' ' + p[0];
}
function fmtLong(dateStr) {
  const p = dateStr.split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function periodLabel(p) { return p === 'daily' ? 'Harian' : p === 'semester' ? 'Semester' : p === 'monthly' ? 'Bulanan' : 'Mingguan'; }
/* Nama menu bisa multiline (1 baris = 1 komponen); versi satu baris untuk label/log */
function menuLines(name) { return String(name || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean); }
function flatName(name) { return menuLines(name).join(', '); }
function daysSummary(days) { return (days || []).slice().sort((a, b) => a - b).map(d => WEEKDAYS[d - 1]).join(' '); }
function uid() { return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)); }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function sortCustomers(a, b) {
  return (a.className || '').localeCompare(b.className || '') || (a.name || '').localeCompare(b.name || '');
}

/* ---------- Helper: paket & harga efektif ---------- */
function basePrice(type) { return +db.settings[type === 'snack' ? 'priceSnack' : 'priceLunch'] || 0; }
function pkgList(type) { return (db.settings.packages || []).filter(p => p.type === type); }
function pkgById(id) { return id ? (db.settings.packages || []).find(p => p.id === id) || null : null; }
function firstPkgId(type) { const p = pkgList(type)[0]; return p ? p.id : ''; }
function pkgFor(type, rec, cust) {
  const own = pkgById(rec && rec.pkg ? rec.pkg : '');
  if (own && own.type === type) return own;
  const def = pkgById(cust ? cust[type + 'Pkg'] : '');
  if (def && def.type === type) return def;
  return pkgList(type)[0] || null;
}
/* Menu snack bisa ditandai untuk satu paket. Tanpa tanda = berlaku untuk semua paket. */
function menuItemPkg(it) {
  const id = it && it.pkg;
  if (!id) return null;
  const p = pkgById(id);
  return p && p.type === menuTypeOf(it) ? p : null;
}
function itemAllowedFor(type, it, rec, cust) {
  const p = menuItemPkg(it);
  if (!p) return true;
  const own = pkgFor(type, rec, cust);
  return !!own && own.id === p.id;
}
/* Harga satu porsi: menu spesial memakai harga yang diketik di barisnya (sama untuk semua anak),
   menu biasa memakai harga paket anak itu, porsinya yang menentukan, bukan makanannya. */
function effPrice(type, rec, cust, date) {
  const p = pkgFor(type, rec, cust);
  const base = p ? +p.price || 0 : basePrice(type);
  if (!date) return base;
  const items = menuItemsFor(type, date);
  if (!items.length) return base;
  const picks = rec && rec.ordered ? customPicks(type, rec) : [];
  if (!picks.length) return base;
  return spesialPrice(items[picks[0]]) || base;
}
function pkgLabel(p) { return p.name + ' (Rp ' + (+p.price || 0).toLocaleString('id-ID') + ')'; }
function defaultMethod() {
  const ms = db.settings.paymentMethods || [];
  return ms.includes('Transfer') ? 'Transfer' : (ms[0] || '');
}
function customerById(id) { return db.customers.find(c => c.id === id); }

/* ---------- Helper: hari, angkatan, libur, log ---------- */
function weekdayOf(ymd) { const p = ymd.split('-').map(Number); return (new Date(p[0], p[1] - 1, p[2]).getDay() + 6) % 7 + 1; } // 1=Senin..7=Minggu
/* Angkatan: kata pertama nama kelas; kalau diawali angka ("11B") ambil angkanya saja */
function cohortOf(className) {
  const token = (className || '').trim().split(/\s+/)[0] || '';
  const m = /^(\d+)[A-Za-z]/.exec(token);
  return m ? m[1] : token;
}
/* Jenjang diambil dari huruf di awal angkatan: P1 -> P (Primary), JH2 -> JH, SH1 -> SH.
   Kelas berawalan angka (11B, 12a) dikelompokkan sebagai "Angkatan angka". */
const LEVEL_NAMES = {
  P: 'SD', PR: 'SD', PRE: 'SD', SD: 'SD',
  JH: 'SMP', J: 'SMP', SMP: 'SMP',
  SH: 'SMA', S: 'SMA', SMA: 'SMA',
  TK: 'TK', PAUD: 'PAUD', NUM: 'Lainnya'
};
/* Jenjang: huruf di awal nama kelas (P1 -> SD, JH2 -> SMP, SH1 -> SMA);
   kelas bernomor dipetakan 1-6 SD, 7-9 SMP, 10-13 SMA. */
function levelKeyOf(className) {
  const token = (className || '').trim().split(/\s+/)[0] || '';
  const num = /^(\d+)/.exec(token);
  if (num) {
    const n = +num[1];
    return n <= 6 ? 'SD' : n <= 9 ? 'SMP' : n <= 13 ? 'SMA' : 'NUM';
  }
  const m = /^[A-Za-z]+/.exec(token);
  return m ? m[0].toUpperCase() : '';
}
function levelName(key) { return LEVEL_NAMES[key] || key; }
function holidayMatch(h, c, date) {
  if (h.date !== date) return false;
  if (h.scope === 'all') return true;
  if (h.scope === 'class') return !!c && (c.className || '').trim() === h.value;
  if (h.scope === 'cohort') return !!c && cohortOf(c.className) === h.value;
  if (h.scope === 'person') return !!c && c.id === h.value;
  return false;
}
function isOnLeave(c, date) { return db.holidays.some(h => holidayMatch(h, c, date)); }
function endOfMonth(ymd) {
  const p = ymd.split('-').map(Number);
  return p[0] + '-' + pad(p[1]) + '-' + pad(new Date(p[0], p[1], 0).getDate());
}
/* "Beli sekali": satu pesanan pada satu tanggal pilihan, bukan rangkaian hari. */
function fillOnceOrder(c) {
  const d = c.onceDate;
  if (!d) return 0;
  let n = 0;
  ['snack', 'lunch'].forEach(t => {
    if (!c[t === 'snack' ? 'snackDefault' : 'lunchDefault']) return;
    const lama = (db[t][d] || {})[c.id];
    if (lama && lama.ordered) return;
    if (isOnLeave(c, d)) return;
    const r = ensureRecord(t, d, c.id);
    r.ordered = true; r.paid = false;
    if (!r.method) r.method = defaultMethod();
    if (!r.pkg) { const p = pkgFor(t, r, c); if (p) r.pkg = p.id; }
    n++;
  });
  autoPickSingles([d], c.id);
  return n;
}
/* Mingguan: 7 hari berikutnya. Bulanan: besok s/d akhir bulan. Hanya Senin–Jumat. */
function autoFillPeriod(c) {
  if (!c || c.active === false) return 0;
  if (c.status === 'sekali') return fillOnceOrder(c);
  if (c.period === 'semester' || c.period === 'daily') return 0;
  const today = todayStr();
  const last = c.period === 'weekly' ? shiftDate(today, 7) : endOfMonth(today);
  let n = 0;
  for (let d = shiftDate(today, 1); d <= last; d = shiftDate(d, 1)) {
    if (weekdayOf(d) > 5) continue;
    for (const type of ['snack', 'lunch']) {
      if (!c[type === 'snack' ? 'snackDefault' : 'lunchDefault']) continue;
      if (isOnLeave(c, d)) continue;
      const existing = db[type][d] && db[type][d][c.id];
      if (existing && existing.ordered) continue;
      const r = ensureRecord(type, d, c.id);
      r.ordered = true; r.paid = false;
      if (!r.method) r.method = defaultMethod();
      if (!r.pkg) { const p = pkgFor(type, r, c); if (p) r.pkg = p.id; }
      n++;
    }
  }
  return n;
}
let lastActionLabel = '';
function logAction(action, detail) {
  db.log.unshift({ id: uid(), ts: new Date().toISOString(), action: action, detail: detail || '' });
  if (db.log.length > 1000) db.log.length = 1000;
  lastActionLabel = (detail ? action + ': ' + detail : action);
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const d = v / p;
  let m;
  if (d <= 1) m = 1; else if (d <= 2) m = 2; else if (d <= 5) m = 5; else m = 10;
  return m * p;
}

/* ---------- Ikon ---------- */
const ICO_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const ICO_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const ICO_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
const ICO_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
const ICO_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>';
const ICO_PRINT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V4h12v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M8 16h8v4H8z"/></svg>';
const ICO_BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 7.5-2.5 7.5h17S18 15 18 8.5"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/></svg>';
const ICO_CHART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V11M12 19V5M19 19v-5"/><path d="M3 19h18"/></svg>';

/* ---------- Toast & modal ---------- */
let toastTimer;
function toast(msg, opts) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  if (opts && opts.undo && undoStack.length) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-undo';
    b.textContent = 'Urungkan';
    b.title = 'Batalkan: ' + undoStack[undoStack.length - 1].label;
    b.addEventListener('click', undoLast);
    el.appendChild(b);
  }
  if (opts && opts.redo && redoStack.length) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-undo';
    b.textContent = 'Ulangi';
    b.title = 'Kembalikan lagi: ' + redoStack[redoStack.length - 1].label;
    b.addEventListener('click', redoLast);
    el.appendChild(b);
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, opts && (opts.undo || opts.redo) ? 5000 : 2200);
}
function openModal(html, wide) {
  const b = document.getElementById('modalBackdrop');
  b.innerHTML = '<div class="modal' + (wide ? ' modal-wide' : '') + '" role="dialog">' + html + '</div>';
  b.hidden = false;
}
function closeModal() {
  const b = document.getElementById('modalBackdrop');
  b.hidden = true;
  b.innerHTML = '';
}

/* ---------- Perhitungan data ---------- */
function ensureRecord(type, date, id) {
  if (!db[type][date]) db[type][date] = {};
  if (!db[type][date][id]) db[type][date][id] = { ordered: false, paid: false, method: '', note: '', pkg: '' };
  return db[type][date][id];
}
function countOrdered(type, date) {
  const recs = db[type][date] || {};
  let n = 0;
  for (const id in recs) if (recs[id].ordered) n++;
  return n;
}
function countOrderedInMonth(type, m) {
  let n = 0;
  for (const date in db[type]) {
    if (monthKey(date) !== m) continue;
    for (const id in db[type][date]) if (db[type][date][id].ordered) n++;
  }
  return n;
}
function dailyIncome(type, date) {
  const recs = db[type][date] || {};
  let paid = 0;
  for (const id in recs) {
    const r = recs[id];
    if (r.ordered && r.paid && r.method !== 'Gratis') paid += effPrice(type, r, customerById(id), date);
  }
  return paid;
}
function poIncomeOn(date) {
  return db.po.filter(p => p.paid && p.date === date).reduce((s, p) => s + (+p.qty * +p.price || 0), 0);
}
function incomeByDate(date) { return dailyIncome('snack', date) + dailyIncome('lunch', date) + poIncomeOn(date); }
/* Nilai uang per jenis. paidOnly=true → hanya yang sudah dibayar (omset) */
function nominalByType(m, paidOnly) {
  const out = { snack: 0, lunch: 0, po: 0 };
  for (const type of ['snack', 'lunch']) {
    for (const date in db[type]) {
      if (m && monthKey(date) !== m) continue;
      for (const id in db[type][date]) {
        const r = db[type][date][id];
        if (!r.ordered || r.method === 'Gratis') continue;
        if (paidOnly && !r.paid) continue;
        out[type] += effPrice(type, r, customerById(id), date);
      }
    }
  }
  for (const p of db.po) {
    if (m && monthKey(p.date) !== m) continue;
    if (p.method === 'Gratis') continue;
    if (paidOnly && !p.paid) continue;
    out.po += (+p.qty * +p.price || 0);
  }
  return out;
}
function incomeByMonth() {
  const map = {};
  for (const date in db.snack) map[monthKey(date)] = (map[monthKey(date)] || 0) + dailyIncome('snack', date);
  for (const date in db.lunch) map[monthKey(date)] = (map[monthKey(date)] || 0) + dailyIncome('lunch', date);
  for (const p of db.po) if (p.paid) map[monthKey(p.date)] = (map[monthKey(p.date)] || 0) + (+p.qty * +p.price || 0);
  return map;
}
function poByYear() {
  const map = {};
  for (const p of db.po) {
    const y = (p.date || '').slice(0, 4);
    if (y) map[y] = (map[y] || 0) + (+p.qty * +p.price || 0);
  }
  return map;
}
function poByMonth() {
  const map = {};
  for (const p of db.po) {
    const m = monthKey(p.date || '');
    if (m) map[m] = (map[m] || 0) + (+p.qty * +p.price || 0);
  }
  return map;
}
function paymentStatusThisMonth() {
  const m = monthKey(todayStr());
  let lunas = 0, belum = 0, gratis = 0, nilaiLunas = 0, nilaiBelum = 0;
  for (const type of ['snack', 'lunch']) {
    for (const date in db[type]) {
      if (monthKey(date) !== m) continue;
      for (const id in db[type][date]) {
        const r = db[type][date][id];
        if (!r.ordered) continue;
        if (r.method === 'Gratis') { gratis++; continue; }
        const v = effPrice(type, r, customerById(id), date);
        if (r.paid) { lunas++; nilaiLunas += v; } else { belum++; nilaiBelum += v; }
      }
    }
  }
  for (const p of db.po) {
    if (monthKey(p.date) !== m) continue;
    if (p.method === 'Gratis') { gratis++; continue; }
    const v = (+p.qty * +p.price || 0);
    if (p.paid) { lunas++; nilaiLunas += v; } else { belum++; nilaiBelum += v; }
  }
  return { lunas, belum, gratis, nilaiLunas, nilaiBelum };
}
function unpaidEntries() {
  const out = [];
  for (const type of ['snack', 'lunch']) {
    for (const date in db[type]) {
      for (const id in db[type][date]) {
        const r = db[type][date][id];
        if (r.ordered && !r.paid) {
          const c = customerById(id);
          out.push({ name: c ? c.name : '(dihapus)', cls: c ? c.className : '', type: type === 'snack' ? 'Snack' : 'Lunch', date, amount: effPrice(type, r, c, date) });
        }
      }
    }
  }
  for (const p of db.po) if (!p.paid) out.push({ name: p.name, cls: '', type: 'PO', date: p.date, amount: +p.qty * +p.price || 0 });
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/* ---------- Grafik (canvas, tanpa dependensi) ---------- */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  /* lebar = 100% ruang, kecuali kanvas berkotak kecil menyetel data-w sendiri */
  const lebar = canvas.dataset.w ? canvas.dataset.w + 'px' : '100%';
  canvas.style.width = lebar;
  /* tinggi asli disimpan sekali: setelah canvas.width diisi dpr, atribut height
     bukan lagi nilai desain dan rasio intrinsik kanvas membuat tingginya membesar */
  if (!canvas.dataset.h) canvas.dataset.h = canvas.getAttribute('height') || 220;
  const h = +canvas.dataset.h;
  const w = Math.round(canvas.clientWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 0) || 400);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = lebar;
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Palet grafik mengikuti tema aktif */
function chartPalette() {
  const dark = document.body.classList.contains('theme-dark');
  return dark
    ? { grid: 'rgba(255,255,255,.08)', axis: '#8A90A8', label: '#E9ECFF', primary: '#FF4D5A', accent: '#38D39F', orange: '#FF8A5C', gold: '#F5C451' }
    : { grid: 'rgba(24,20,40,.10)', axis: '#6F7590', label: '#23263A', primary: '#D8262F', accent: '#1F9D74', orange: '#E06A3B', gold: '#B88A2A' };
}
function mapChartColor(c) {
  const p = chartPalette();
  const m = { '#C0272D': p.primary, '#DC4F55': p.primary, '#7A9E7E': p.accent, '#5E8C6E': p.accent, '#7FB393': p.accent, '#C0564A': p.orange, '#DFBB69': p.gold, '#F5C451': p.gold };
  return m[c] || c;
}
function colorAlpha(hex, a) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
}

function drawBar(canvas, labels, values, opts) {
  opts = opts || {};
  const pal = chartPalette();
  const { ctx, w, h } = setupCanvas(canvas);
  const color = mapChartColor(opts.color || '#C0272D');
  const colors = opts.colors ? opts.colors.map(mapChartColor) : null;
  const padL = 46, padR = 10, padT = 22, padB = 28;
  const cw = w - padL - padR, ch = h - padT - padB;
  ctx.clearRect(0, 0, w, h);
  const max = niceMax(Math.max(1, ...values.map(v => +v || 0)));
  ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.font = '10.5px Segoe UI, sans-serif';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = max * i / steps;
    const y = padT + ch - ch * i / steps;
    ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
    ctx.setLineDash(i === 0 ? [] : [3, 4]);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = pal.axis; ctx.fillText(fmtShort(val), padL - 7, y);
  }
  const n = labels.length;
  const step = Math.max(1, cw / n);
  const dual = !!opts.series2;
  const bw = Math.max(1, Math.min(dual ? 24 : 42, step * (dual ? 0.35 : 0.6)));
  labels.forEach((lb, i) => {
    const v = +values[i] || 0;
    const x = padL + step * i + step / 2;
    const bh = Math.max(0, (v / max) * ch);
    const c1 = colors ? (colors[i % colors.length] || color) : color;
    if (bh > 0) {
      const grad = ctx.createLinearGradient(0, padT + ch - bh, 0, padT + ch);
      grad.addColorStop(0, colorAlpha(c1, 1));
      grad.addColorStop(1, colorAlpha(c1, 0.22));
      if (!dual) { ctx.save(); ctx.shadowColor = colorAlpha(c1, 0.35); ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
      roundRect(ctx, dual ? x - bw - 1 : x - bw / 2, padT + ch - bh, bw, bh, Math.min(5, bw / 2));
      ctx.fillStyle = grad; ctx.fill();
      if (!dual) ctx.restore();
    }
    if (dual) {
      const s2 = +opts.series2.values[i] || 0;
      const bh2 = Math.max(0, (s2 / max) * ch);
      const c2 = mapChartColor(opts.series2.color || '#7A9E7E');
      if (bh2 > 0) {
        const grad2 = ctx.createLinearGradient(0, padT + ch - bh2, 0, padT + ch);
        grad2.addColorStop(0, colorAlpha(c2, 1));
        grad2.addColorStop(1, colorAlpha(c2, 0.22));
        roundRect(ctx, x + 1, padT + ch - bh2, bw, bh2, Math.min(5, bw / 2));
        ctx.fillStyle = grad2; ctx.fill();
      }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = pal.label; ctx.font = '600 10.5px Segoe UI';
    if (n <= 14 && (!dual || step > 62)) ctx.fillText(fmtShort(v), x, padT + ch - bh - 4);
    ctx.textBaseline = 'top'; ctx.fillStyle = pal.axis; ctx.font = '10.5px Segoe UI';
    if (n <= 16 || i % Math.ceil(n / 16) === 0) {
      const maxW = Math.max(10, step - 4);
      let txt = String(lb);
      if (ctx.measureText(txt).width > maxW) {
        while (txt.length > 1 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1);
        txt += '…';
      }
      ctx.fillText(txt, x, padT + ch + 7);
    }
  });
}

function drawLine(canvas, labels, series) {
  const pal = chartPalette();
  const { ctx, w, h } = setupCanvas(canvas);
  const padL = 46, padR = 12, padT = 30, padB = 26;
  const cw = w - padL - padR, ch = h - padT - padB;
  ctx.clearRect(0, 0, w, h);
  const all = series.flatMap(s => s.data).map(v => +v || 0);
  const max = niceMax(Math.max(1, ...all));
  ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.font = '10.5px Segoe UI, sans-serif';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = max * i / steps;
    const y = padT + ch - ch * i / steps;
    ctx.strokeStyle = pal.grid; ctx.lineWidth = 1;
    ctx.setLineDash(i === 0 ? [] : [3, 4]);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = pal.axis; ctx.fillText(fmtShort(val), padL - 7, y);
  }
  const n = labels.length;
  const step = cw / Math.max(1, n - 1);
  series.forEach(s => {
    const sc = mapChartColor(s.color);
    const pts = s.data.map((v, i) => ({ x: padL + step * i, y: padT + ch - ((+v || 0) / max) * ch }));
    if (!pts.length) return;
    const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
    grad.addColorStop(0, colorAlpha(sc, 0.30));
    grad.addColorStop(1, colorAlpha(sc, 0));
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, padT + ch);
    ctx.lineTo(pts[0].x, padT + ch);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.save();
    ctx.shadowColor = colorAlpha(sc, 0.55); ctx.shadowBlur = 10;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = sc; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = sc; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    pts.forEach(p => {
      ctx.fillStyle = colorAlpha(sc, 0.26); ctx.beginPath(); ctx.arc(p.x, p.y, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(p.x, p.y, 2.3, 0, Math.PI * 2); ctx.fill();
    });
  });
  ctx.textBaseline = 'top'; ctx.font = '10.5px Segoe UI';
  const skipEvery = Math.ceil(n / 12);
  labels.forEach((lb, i) => {
    if (i % skipEvery !== 0 && i !== n - 1) return;
    const x = padL + step * i;
    if (i === n - 1) { ctx.textAlign = 'right'; ctx.fillStyle = pal.axis; ctx.fillText(lb, w - 2, padT + ch + 7); }
    else if (i === 0) { ctx.textAlign = 'left'; ctx.fillStyle = pal.axis; ctx.fillText(lb, padL - 4, padT + ch + 7); }
    else { ctx.textAlign = 'center'; ctx.fillStyle = pal.axis; ctx.fillText(lb, x, padT + ch + 7); }
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let lx = padL;
  series.forEach(s => {
    const sc = mapChartColor(s.color);
    ctx.fillStyle = sc; roundRect(ctx, lx, 8, 10, 10, 3); ctx.fill();
    ctx.fillStyle = pal.label; ctx.font = '11px Segoe UI'; ctx.fillText(s.label, lx + 14, 13);
    lx += 14 + ctx.measureText(s.label).width + 18;
  });
}

function drawDonut(canvas, segments, centerLabel, fmtVal) {
  const pal = chartPalette();
  const { ctx, w, h } = setupCanvas(canvas);
  const total = segments.reduce((s, g) => s + (+g.value || 0), 0);
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) / 2 - 6, r = R * 0.64;
  ctx.clearRect(0, 0, w, h);
  const legend = [];
  ctx.beginPath(); ctx.arc(cx, cy, (R + r) / 2, 0, Math.PI * 2);
  ctx.strokeStyle = pal.grid; ctx.lineWidth = R - r; ctx.stroke();
  if (total > 0) {
    const gap = segments.filter(g => +g.value > 0).length > 1 ? 0.035 : 0;
    let a = -Math.PI / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    segments.forEach(g => {
      const ang = (g.value / total) * Math.PI * 2;
      const sc = mapChartColor(g.color);
      if (ang > gap * 2) {
        ctx.beginPath();
        ctx.arc(cx, cy, R, a + gap / 2, a + ang - gap / 2);
        ctx.arc(cx, cy, r, a + ang - gap / 2, a + gap / 2, true);
        ctx.closePath();
        ctx.fillStyle = sc; ctx.fill();
      }
      legend.push('<div class="lg"><span class="dot" style="background:' + sc + '"></span>' + escapeHtml(g.label) + ': ' +
        (fmtVal ? fmtVal(g.value) : g.value) + ' <em>' + (total > 0 ? Math.round((+g.value || 0) / total * 100) : 0) + '%</em></div>');
      a += ang;
    });
    ctx.restore();
  } else {
    segments.forEach(g => {
      legend.push('<div class="lg"><span class="dot" style="background:' + mapChartColor(g.color) + '"></span>' + escapeHtml(g.label) + ': ' +
        (fmtVal ? fmtVal(g.value) : g.value) + ' <em>0%</em></div>');
    });
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = pal.label; ctx.font = '700 18px Segoe UI'; ctx.fillText(fmtShort(total), cx, cy - 8);
  ctx.fillStyle = pal.axis; ctx.font = '11px Segoe UI'; ctx.fillText(centerLabel || '', cx, cy + 12);
  return legend.join('');
}

/* ---------- Render: navigasi ---------- */
const TITLES = { dashboard: 'Beranda', hari: 'Hari Ini', custom: 'Pesanan Mingguan', dapur: 'Dapur', stok: 'Stok', print: 'Cetak', report: 'Laporan', expenses: 'Pengeluaran', pengingat: 'Pengingat & Tagihan', po: 'Pre-Order (PO)', customers: 'Pelanggan', log: 'Log Aktivitas', settings: 'Pengaturan' };

function navOrder() { return (db.settings.navOrder || NAV_DEFAULT_ORDER).slice(); }
function navHidden() { return (db.settings.navHidden || []).slice(); }
function firstVisibleNav() { return navOrder().find(k => !navHidden().includes(k)) || 'settings'; }
function navLabel(key) {
  const el = document.querySelector('.nav-item[data-nav="' + key + '"] span');
  return el ? el.textContent : (TITLES[key] || key);
}
function navGroupsMeta() {
  const nav = document.getElementById('nav');
  const groups = [];
  let cur = null;
  if (!nav) return groups;
  [...nav.children].forEach(el => {
    if (el.classList.contains('nav-group')) {
      cur = { label: el.textContent.trim(), heading: el, items: [] };
      groups.push(cur);
    } else if (cur && el.classList.contains('nav-item')) cur.items.push(el);
  });
  return groups;
}
/* Geser tombol halaman sesuai pengaturan, lalu sembunyikan yang dimatikan. */
function applyNavSettings() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const order = navOrder(), hidden = navHidden();
  navGroupsMeta().forEach(g => {
    nav.appendChild(g.heading);
    g.items.slice().sort((a, b) => order.indexOf(a.dataset.nav) - order.indexOf(b.dataset.nav)).forEach(it => {
      it.hidden = hidden.includes(it.dataset.nav);
      nav.appendChild(it);
    });
    g.heading.hidden = g.items.every(it => it.hidden);
  });
}
function renderNavCfg() {
  const el = document.getElementById('navCfg');
  if (!el) return;
  const order = navOrder(), hidden = navHidden();
  el.innerHTML = NAV_GROUPS.map(g => {
    const keys = g.keys.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return '<div class="nav-cfg-group"><div class="cat-title">' + escapeHtml(g.label) + '</div>' +
      keys.map((k, i) => '<div class="nav-cfg-row">' +
        '<label class="check"><input type="checkbox" class="nav-toggle" data-key="' + escapeHtml(k) + '"' +
          (hidden.includes(k) ? '' : ' checked') +
          (k === 'settings' ? ' disabled title="Pengaturan selalu tampil"' : '') + '> ' + escapeHtml(navLabel(k)) + '</label>' +
        '<span class="nav-cfg-move">' +
          '<button type="button" class="icon-act" data-act="nav-up" data-id="' + escapeHtml(k) + '"' + (i === 0 ? ' disabled' : '') + ' title="Naikkan">↑</button>' +
          '<button type="button" class="icon-act" data-act="nav-down" data-id="' + escapeHtml(k) + '"' + (i === keys.length - 1 ? ' disabled' : '') + ' title="Turunkan">↓</button>' +
        '</span></div>').join('') + '</div>';
  }).join('');
}
function moveNav(key, delta) {
  const g = NAV_GROUPS.find(x => x.keys.includes(key));
  if (!g) return;
  const order = navOrder();
  const keys = g.keys.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const i = keys.indexOf(key), j = i + delta;
  if (i < 0 || j < 0 || j >= keys.length) return;
  const a = keys[i], b = keys[j];
  const ia = order.indexOf(a), ib = order.indexOf(b);
  [order[ia], order[ib]] = [order[ib], order[ia]];
  db.settings.navOrder = order;
  save({ noUndo: true });
  applyNavSettings();
  renderNavCfg();
}
function setNavHidden(key, on) {
  if (key === 'settings') return;
  const hidden = navHidden().filter(k => k !== key);
  if (on) hidden.push(key);
  db.settings.navHidden = hidden;
  save({ noUndo: true });
  applyNavSettings();
  renderNavCfg();
  if (on && state.page === key) showPage(firstVisibleNav());
}

function showPage(name) {
  state.page = name;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.nav === name));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('is-active', p.id === 'page-' + name));
  document.getElementById('topbarTitle').textContent = TITLES[name];
  closeSidebar();
  if (name === 'print') autoPrintDates();
  renderPage(name);
}
function renderPage(name) {
  if (name === 'dashboard') renderDashboard();
  else if (name === 'hari') renderDailyMerged();
  else if (name === 'custom') renderCustom();
  else if (name === 'dapur') renderDapur();
  else if (name === 'stok') renderStok();
  else if (name === 'expenses') renderExpenses();
  else if (name === 'po') renderPO();
  else if (name === 'report') renderReport();
  else if (name === 'pengingat') renderPengingat();
  else if (name === 'print') renderPrint();
  else if (name === 'customers') renderCustomers();
  else if (name === 'log') renderLog();
  else if (name === 'settings') renderSettings();
}
/* Tanggal berikutnya yang punya pesanan (dipakai saat membuka halaman Cetak) */
function nextOrderDate(from) {
  let d = from || todayStr();
  for (let i = 0; i < 60; i++) {
    if (Object.keys(stickerOrdersOn(d)).length) return d;
    d = shiftDate(d, 1);
  }
  return '';
}
/* Membuka halaman Cetak di tanggal tanpa pelanggan hanya menampilkan daftar kosong,
   jadi tanggal stiker & konfirmasi dimajukan ke hari berikutnya yang ada pesanan. */
function autoPrintDates() {
  const s = nextOrderDate(state.stickerDate || todayStr());
  if (s && s !== state.stickerDate) state.stickerDate = s;
  const k = nextOrderDate(state.satpamDate || todayStr());
  if (k && k !== state.satpamDate) state.satpamDate = k;
}
/* Halaman Cetak: stiker & kertas konfirmasi berbagi satu tempat, mode dipilih lewat toggle */
function renderPrint() {  const mode = state.printMode === 'konfirmasi' ? 'konfirmasi' : 'stiker';
  document.querySelectorAll('#page-print .print-mode').forEach(el => { el.hidden = el.dataset.mode !== mode; });
  document.querySelectorAll('#page-print .print-seg .seg-btn').forEach(b => b.classList.toggle('is-on', b.dataset.mode === mode));
  syncTypeSeg('sticker-type', state.stickerType);
  syncTypeSeg('satpam-type', state.satpamType);
  syncPrintStyleControls();
  if (mode === 'stiker') { renderStickerDate(); renderStickerCustomers(); stickerPreview(); }
  else satpamPreview();
}
/* Tombol Snack | Lunch berdampingan (stiker & konfirmasi), sama seperti pemilih jenis lain */
function syncTypeSeg(act, type) {
  document.querySelectorAll('[data-act="' + act + '"]').forEach(b => b.classList.toggle('is-on', b.dataset.type === type));
}
function typeSeg(act, el) {
  const t = el.dataset.type === 'lunch' ? 'lunch' : 'snack';
  if (act === 'sticker-type') { state.stickerType = t; renderStickerCustomers(); stickerPreview(); }
  else { state.satpamType = t; satpamPreview(); }
  syncTypeSeg(act, t);
}

/* ---------- Render: Beranda ---------- */
function statCard(label, value, sub, accent) {
  return '<div class="stat-card ' + (accent || '') + '"><span class="stat-label">' + escapeHtml(label) + '</span><span class="stat-value">' + value + '</span>' + (sub ? '<span class="stat-sub">' + escapeHtml(sub) + '</span>' : '') + '</div>';
}
/* Donut + legenda (persentase tiap segmen) */
function paintDonut(id, segments, centerLabel, fmtVal) {
  const cv = document.getElementById(id);
  if (!cv) return;
  const html = drawDonut(cv, segments, centerLabel, fmtVal);
  let lg = cv.parentElement.querySelector('.donut-legend');
  if (!lg) { lg = document.createElement('div'); lg.className = 'donut-legend'; cv.parentElement.appendChild(lg); }
  lg.innerHTML = html;
}
function pct(x, total) { return total > 0 ? Math.round(x / total * 100) + '%' : '0%'; }

/* ---------- Pusat cetak & bagikan (Beranda) ---------- */
const PRINT_HUB = [
  { t: 'Foto Menu Mingguan', k: 'Foto', h: 'gambar siap dikirim ke grup sekolah', act: 'menu-share' },
  { t: 'Stiker Nama', k: 'A4', h: 'cetak sesuai centangan terakhir di halaman Stiker', act: 'sticker-print' },
  { t: 'Kertas Konfirmasi', k: 'A4', h: 'daftar porsi hari terpilih untuk dapur', act: 'satpam-print' },
  { t: 'Rekap PO per Bulan', k: 'PDF', h: 'bulan terpilih di halaman Pre-Order', act: 'po-print-month' },
  { t: 'Cetak Laporan', k: 'PDF', h: 'rekap semua anak, bulan berjalan', act: 'hub-print-report' },
  { t: 'CSV Rekap Pelanggan', k: 'CSV', h: 'tagihan / dibayar / sisa tiap anak, dibuka di Excel', act: 'hub-csv-report' },
  { t: 'Invoice Kelompok', k: 'Buka', h: 'pilih kelompoknya dulu, lalu PDF atau foto', nav: 'po' },
  { t: 'Kirim Tagihan', k: 'Buka', h: 'daftar penunggak + template pesan WhatsApp', nav: 'pengingat' },
  { t: 'Cadangan JSON', k: 'Simpan', h: 'unduh semua data sebagai berkas cadangan', act: 'export' }
];
function renderHub() {
  const el = document.getElementById('hubGrid');
  if (!el) return;
  el.innerHTML = PRINT_HUB.map(x =>
    '<button type="button" class="hub-item" data-act="' + (x.act ? x.act : 'hub-nav') + '"' +
    (x.nav ? ' data-page="' + x.nav + '"' : '') + ' data-t="' + escapeHtml(x.t) + '" data-h="' + escapeHtml(x.h) + '">' +
      '<span class="hub-kind">' + x.k + '</span>' +
      '<span class="hub-txt"><strong>' + escapeHtml(x.t) + '</strong><span>' + escapeHtml(x.h) + '</span></span>' +
    '</button>').join('');
}

function renderDashboard() {
  const today = todayStr();
  const thisMonth = monthKey(today);
  const active = db.customers.filter(c => c.active).length;
  const snackToday = countOrdered('snack', today);
  const lunchToday = countOrdered('lunch', today);
  const byMonth = incomeByMonth();
  const incomeThis = byMonth[thisMonth] || 0;
  const ps = paymentStatusThisMonth();
  const poUnpaid = db.po.filter(p => !p.paid).length;

  const nom = nominalByType(thisMonth, true);
  const nomAll = nom.snack + nom.lunch + nom.po;
  const share = 'Snack ' + pct(nom.snack, nomAll) + ' · Lunch ' + pct(nom.lunch, nomAll) + ' · PO ' + pct(nom.po, nomAll);

  document.getElementById('statGrid').innerHTML =
    statCard('Pelanggan Aktif', active, 'total terdaftar') +
    statCard('Snack Hari Ini', snackToday, 'porsi', 'primary') +
    statCard('Lunch Hari Ini', lunchToday, 'porsi', 'accent') +
    statCard('Omset Bulan Ini', fmtIDR(incomeThis), share, 'gold') +
    statCard('Belum Lunas (bulan ini)', ps.belum, 'transaksi', 'danger') +
    statCard('PO Belum Lunas', poUnpaid, 'pre-order');

  renderHomeCalendar();
  renderWeekMenu();
  renderPkgShowcase();
  renderRemStrip();
  renderHomeHoliday();
  renderHub();

  const months = lastMonths(6);
  drawLine(document.getElementById('chartMonthly'),
    months.map(d => MONTHS_ID[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2)),
    [{ label: 'Omset', color: '#C0272D', data: months.map(d => byMonth[toMonthKey(d)] || 0) }]);

  const days = lastNDates(14);
  drawBar(document.getElementById('chartDaily'),
    days.map(d => { const p = d.split('-'); return p[2] + '/' + p[1]; }),
    days.map(d => incomeByDate(d)), { color: '#7A9E7E' });

  paintDonut('chartSplit', [
    { label: 'Snack', value: nom.snack, color: '#C0272D' },
    { label: 'Lunch', value: nom.lunch, color: '#1F9D74' },
    { label: 'PO', value: nom.po, color: '#DFBB69' }
  ], 'omset', fmtIDR);
  setText('splitNote', monthTitle(thisMonth) + ' · sudah dibayar · ' + fmtIDR(nomAll));

  paintDonut('chartDonut', [
    { label: 'Snack', value: countOrderedInMonth('snack', thisMonth), color: '#C0272D' },
    { label: 'Lunch', value: countOrderedInMonth('lunch', thisMonth), color: '#7A9E7E' }
  ], 'porsi');

  const psTotal = ps.lunas + ps.belum + ps.gratis;
  paintDonut('chartPaid', [
    { label: 'Lunas', value: ps.lunas, color: '#7A9E7E' },
    { label: 'Belum', value: ps.belum, color: '#C0564A' },
    { label: 'Gratis', value: ps.gratis, color: '#DFBB69' }
  ], 'transaksi');
  setText('paidNote', 'lunas ' + fmtIDR(ps.nilaiLunas) + ' · belum ' + fmtIDR(ps.nilaiBelum) + ' · gratis ' + ps.gratis);

  const entries = unpaidEntries();
  const groups = groupByWeek(entries);
  document.getElementById('unpaidList').innerHTML = groups.map(gr => {
    const open = unpaidIsOpen(gr.monday, groups);
    const head = '<tr class="wk-head' + (open ? ' is-open' : '') + '" data-act="unpaid-week" data-wk="' + gr.monday + '">' +
      '<td colspan="5"><div class="wk-inner"><span class="wk-caret">▸</span>' +
        '<span class="wk-title">Minggu ' + weekRangeLabel(gr.monday) + '</span>' +
        '<span class="badge orange">' + gr.lines.length + ' transaksi</span>' +
        '<span class="wk-total">' + fmtIDR(gr.total) + '</span></div></td></tr>';
    const rows = gr.lines.map(en =>
      '<tr class="wk-detail"' + (open ? '' : ' hidden') + '>' +
        '<td>' + escapeHtml(en.name) + '</td>' +
        '<td class="muted">' + escapeHtml(en.cls) + '</td>' +
        '<td class="c"><span class="badge ' + (en.type === 'PO' ? 'gold' : 'orange') + '">' + en.type + '</span></td>' +
        '<td>' + fmtShortDate(en.date) + ' <span class="muted tiny">' + WEEKDAYS[weekdayOf(en.date) - 1] + '</span></td>' +
        '<td class="num">' + fmtIDR(en.amount) + '</td>' +
      '</tr>').join('');
    return head + rows;
  }).join('');
  document.getElementById('unpaidEmpty').hidden = entries.length > 0;
  const grand = entries.reduce((s, e) => s + e.amount, 0);
  setText('unpaidNote', groups.length ? groups.length + ' minggu · ' + fmtIDR(grand) : '');
  const seeAll = document.getElementById('unpaidSeeAll');
  seeAll.hidden = groups.length < 2;
  const allOpen = groups.every(gr => unpaidIsOpen(gr.monday, groups));
  seeAll.textContent = allOpen ? 'Tutup semua' : 'Buka semua';
}

/* Buka/tutup kelompok minggu pada daftar Belum Lunas */
function unpaidIsOpen(mon, groups) {
  if (state.unpaidAll) return true;
  if (state.unpaidOpen === null) return mon === groups[groups.length - 1].monday;
  return state.unpaidOpen.has(mon);
}
function unpaidOpenMap(groups) {
  const set = new Set(groups.filter(gr => unpaidIsOpen(gr.monday, groups)).map(gr => gr.monday));
  state.unpaidAll = false;
  state.unpaidOpen = set;
  return set;
}

/* ---------- Beranda: kalender, menu mingguan, daftar buat ---------- */
function mondayOf(ymd) {
  const d = new Date(ymd.split('-')[0], ymd.split('-')[1] - 1, ymd.split('-')[2]);
  return shiftDate(ymd, -((d.getDay() + 6) % 7));
}
function homeDayDot(ymd) { return dayDots(ymd, true); }
function renderHomeCalendar() {
  const el = document.getElementById('homeCal');
  if (!el) return;
  const p = (state.menuMonth || monthKey(state.menuDate)).split('-').map(Number);
  const y = p[0], mo = p[1];
  el.innerHTML =
    '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-act="home-cal-prev" aria-label="Bulan sebelumnya">' + ICO_PREV + '</button>' +
      '<div class="cal-title">' + MONTHS_FULL[mo - 1] + ' ' + y + '</div>' +
      '<button type="button" class="cal-nav" data-act="home-cal-next" aria-label="Bulan berikutnya">' + ICO_NEXT + '</button>' +
    '</div>' +
    '<div class="cal-week">' + CAL_WEEKDAYS.map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + buildDayGrid(y, mo, state.menuDate || '', todayStr(), homeDayDot, 'home-day', '', isFullHoliday) + '</div>';
}
const WEEK_MENU_MAX = 6;
function menuPlanItems(date) { return db.menuPlan[date] || []; }
function writeMenuPlan(date, items) {
  if (items.length) db.menuPlan[date] = items; else delete db.menuPlan[date];
}
/* Menu yang tampil untuk sebuah tanggal (menu mingguan) */
function menuFor(date) { return db.menuPlan[date] || []; }
function menuTypeOf(it) {
  const t = it && it.type;
  return t === 'lunch' || t === 'lunch-spesial' ? 'lunch' : t === 'po' ? 'po' : 'snack';
}
function recipeBaseType(type) {
  return type === 'lunch' || type === 'lunch-spesial' ? 'lunch' : type === 'po' ? 'po' : 'snack';
}
function recipeKey(type, name) {
  return recipeBaseType(type) + '|' + flatName(name).toLowerCase().replace(/\s+/g, ' ').trim();
}
function recipeFor(type, name) {
  const k = recipeKey(type, name);
  return db.recipes.find(r => recipeKey(r.type, r.name) === k) || null;
}
function recipeForItem(it) { return recipeFor(it && it.type, it && it.name); }
function isSpesial(it) { return !!(it && /-spesial$/.test(String(it.type))); }
/* Harga yang diketik di baris spesial; 0 berarti belum diisi (belum ditagih sebagai spesial) */
function spesialPrice(it) { return isSpesial(it) && +it.price > 0 ? +it.price : 0; }
function menuItemsFor(type, date) {
  return menuFor(date).filter(it => menuTypeOf(it) === type);
}
/* Menu PO dicatat dua kali (nama di rencana menu, harga di db.poMenus), dicari atas nama yang sama */
function poMenuFor(date, name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return null;
  return db.poMenus.find(m => m.date === date && String(m.item || '').trim().toLowerCase() === n) || null;
}
function poPrice(it, date) {
  if (+it.price > 0) return +it.price;
  const m = poMenuFor(date, it.name);
  return m ? +m.price || 0 : 0;
}
function menuItemsHtml(date) {
  const items = menuPlanItems(date);
  return items.map((it, idx) => {
    const raw = MENU_TYPES.includes(it.type) ? it.type : 'snack';
    let harga;
    if (raw === 'po') {
      const m = poMenuFor(date, it.name);
      const def = m ? +m.price || 0 : 0;
      const shown = (+it.price > 0) ? +it.price : (def || '');
      harga = '<input type="number" class="input input-sm wm-price" min="0" step="500" data-date="' + date + '" data-idx="' + idx +
        '" value="' + shown + '" placeholder="harga" title="Harga per porsi PO ini' +
        (m ? ' · terbawa dari menu PO ' + escapeHtml(m.item) + ' di halaman Pre-Order (' + fmtIDR(def) + ')' : ' · belum ada menu PO dengan nama ini di halaman Pre-Order, isi sendiri') +
        '.">';
    } else if (raw === 'snack-spesial' || raw === 'lunch-spesial') {
      harga = '<input type="number" class="input input-sm wm-price" min="0" step="500" data-date="' + date + '" data-idx="' + idx +
        '" value="' + (it.price || '') + '" placeholder="harga" title="Harga menu spesial hari ini. Semua anak yang memilih makanan ini membayar harga ini, berapa pun paketnya.">';
    } else if (raw === 'snack') {
      harga = '<select class="input input-sm wm-pkg" data-date="' + date + '" data-idx="' + idx +
        '" title="Pilih paket snack yang mendapat menu ini. Semua paket = menu umum. Harga tetap mengikuti paket anak.">' +
        '<option value="">Semua paket</option>' +
        pkgList('snack').map(p => '<option value="' + escapeHtml(p.id) + '"' + (it.pkg === p.id ? ' selected' : '') + '>' + escapeHtml(p.name) + '</option>').join('') +
      '</select>';
    } else {
      harga = '<span class="wm-noprice" title="Baris biasa tidak punya harga: tiap anak membayar sesuai paket porsinya sendiri, diatur di Pesanan Mingguan">paket anak</span>';
    }
    return '<div class="wm-item">' +
      '<select class="input input-sm wm-type" data-date="' + date + '" data-idx="' + idx + '" title="Jenis makanan pada hari ini">' +
        MENU_TYPES.map(t => '<option value="' + t + '"' + (t === raw ? ' selected' : '') + '>' + MENU_TYPE_LABEL[t] + '</option>').join('') +
      '</select>' + harga +
      '<textarea class="input input-sm wm-name" rows="1" data-date="' + date + '" data-idx="' + idx + '" placeholder="Nama menu / isi paket. Tekan Enter untuk baris baru">' + escapeHtml(it.name) + '</textarea>' +
      '<button type="button" class="icon-act danger" data-act="week-menu-del" data-date="' + date + '" data-idx="' + idx + '" title="Hapus pilihan">×</button>' +
    '</div>';
  }).join('');
}
function menuDayIndex() {
  if (Number.isInteger(state.menuDay) && state.menuDay >= 0 && state.menuDay <= 6) return state.menuDay;
  return weekdayOf(state.menuDate || todayStr()) - 1;
}
function growMenuNames(scope) {
  (scope || document).querySelectorAll('.wm-name').forEach(el => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight + 2, 170) + 'px';
  });
}
/* Paket berpindah: menempel di bawah kalender saat Menu Mingguan,
   jadi blok melebar di bawah menu (sebelum grafik) saat Menu Harian */
function layoutPkgBlock(daily) {
  const block = document.getElementById('pkgBlock');
  const slot = document.getElementById('pkgSlot');
  if (!block || !slot) return;
  if (!block.dataset.home) { block.dataset.home = '1'; block._home = block.parentElement; }
  const home = block._home;
  block.classList.toggle('is-wide', !!daily);
  if (daily) { if (block.parentElement !== slot) slot.appendChild(block); }
  else if (home && block.parentElement !== home) home.appendChild(block);
}
function renderWeekMenu() {
  const el = document.getElementById('weekMenuEditor');
  if (!el) return;
  const tab = state.menuTab === 'daily' ? 'daily' : 'week';
  document.querySelectorAll('[data-act="menu-tab"]').forEach(b => b.classList.toggle('is-on', b.dataset.tab === tab));
  const hint = document.getElementById('menuTabHint');
  const addBtn = key => menuPlanItems(key).length < WEEK_MENU_MAX
    ? '<button type="button" class="btn btn-ghost btn-sm" data-act="week-menu-add" data-date="' + key + '">+ Pilihan</button>' : '';

  if (tab === 'daily') {
    const mon = mondayOf(state.menuDate || todayStr());
    const idx = menuDayIndex();
    const date = shiftDate(mon, idx);
    setText('menuWeekLabel', 'harian · ' + fmtShortDate(date));
    if (hint) hint.textContent = 'Filter menu mingguan per hari. Pilih hari untuk melihat atau mengubah menu tanggal itu.';
    el.innerHTML = '<div class="wm-days">' + WEEKDAYS.map((w, i) => {
      const d = shiftDate(mon, i);
      return '<button type="button" class="day-chip' + (i === idx ? ' is-on' : '') + '" data-act="menu-day" data-ymd="' + d + '">' +
        w + '<small>' + d.slice(8) + '/' + d.slice(5, 7) + '</small></button>';
    }).join('') + '</div>' +
      '<div class="wm-row">' +
        '<button type="button" class="wm-day" data-act="goto-day" data-date="' + date + '" title="Lihat pesanannya di halaman Hari Ini">' +
          WEEKDAYS[idx] + '<small>' + date.slice(8) + '/' + date.slice(5, 7) + '</small></button>' +
        '<div class="wm-items">' +
          (menuItemsHtml(date) || '<p class="muted tiny">Belum ada menu. Tekan + Pilihan.</p>') +
          addBtn(date) +
        '</div>' +
      '</div>';
    growMenuNames(el);
    layoutPkgBlock(true);
    return;
  }

  const mon = mondayOf(state.menuDate || todayStr());
  setText('menuWeekLabel', fmtShortDate(mon) + ' – ' + fmtShortDate(shiftDate(mon, 6)));
  if (hint) hint.textContent = 'Menu per tanggal. Isi paket ditulis satu baris per komponen (Enter untuk baris baru).';
  el.innerHTML = WEEKDAYS.map((w, i) => {
    const date = shiftDate(mon, i);
    return '<div class="wm-row">' +
      '<button type="button" class="wm-day" data-act="goto-day" data-date="' + date + '" title="Lihat pesanannya di halaman Hari Ini">' +
        w + '<small>' + date.slice(8) + '/' + date.slice(5, 7) + '</small></button>' +
      '<div class="wm-items">' +
        (menuItemsHtml(date) || '<p class="muted tiny">Belum ada menu. Tekan + Pilihan.</p>') +
        addBtn(date) +
      '</div>' +
    '</div>';
  }).join('');
  growMenuNames(el);
  layoutPkgBlock(false);
}
function applyMenuEdit(t, quiet) {
  const date = t.dataset.date, idx = +t.dataset.idx;
  const items = menuPlanItems(date).map(it => Object.assign({}, it));
  if (!items[idx]) return;
  let poSync = 0;
  const isName = t.classList.contains('wm-name');
  if (isName) {
    items[idx].name = (t.value || '').trim();
    if (!items[idx].name) {
      const ty = menuTypeOf(items[idx]);
      if (ty !== 'po') shiftPicksAfterDelete(date, ty, items.filter(x => menuTypeOf(x) === ty).indexOf(items[idx]));
      items.splice(idx, 1);
    }
  } else if (t.classList.contains('wm-type')) {
    const lama = MENU_TYPES.includes(items[idx].type) ? items[idx].type : 'snack';
    items[idx].type = MENU_TYPES.includes(t.value) ? t.value : 'snack';
    const baru = items[idx].type;
    if (baru !== 'snack') items[idx].pkg = '';
    if (baru === 'po') { items[idx].pkg = ''; items[idx].price = ''; }
    else if (baru === 'snack-spesial' || baru === 'lunch-spesial') {
      if (lama !== baru && !(+items[idx].price > 0)) {
        const p = pkgById(firstPkgId(menuTypeOf(items[idx])));
        items[idx].price = p ? +p.price || 0 : '';
      }
    } else items[idx].price = '';
  } else if (t.classList.contains('wm-pkg')) {
    const p = pkgById(t.value);
    items[idx].pkg = p && p.type === 'snack' ? p.id : '';
  } else if (t.classList.contains('wm-price')) {
    const v = t.value === '' ? null : Math.max(0, +t.value || 0);
    if (items[idx].type === 'po') {
      items[idx].price = v === null ? '' : v;
      if (v !== null) {
        const m = poMenuFor(date, items[idx].name);
        if (m && +m.price !== v) { m.price = v; poSync = v; }
      }
    } else if (v === null || v <= 0) {
      /* tanpa harga, barisnya kembali jadi menu biasa */
      items[idx].price = '';
      if (isSpesial(items[idx])) items[idx].type = menuTypeOf(items[idx]);
    } else items[idx].price = v;
  }
  writeMenuPlan(date, items);
  const terisi = autoPickSingles([date]);
  save();
  if (!quiet) logAction('menu', 'Menu ' + date + ': ' + (menuPlanItems(date).map(i => flatName(i.name)).join(', ') || '(kosong)'));
  if (poSync) logAction('po', 'Harga menu PO ' + flatName(items[idx].name) + ' @ ' + date + ' jadi ' + fmtIDR(poSync));
  const row = menuPlanItems(date)[idx];
  if (!isName || !row || (isName && !row.name)) renderWeekMenu();
  renderHomeCalendar();
  if (t.classList.contains('wm-pkg')) { renderDailyMerged(); renderCustom(); }
  if (terisi) { renderDailyMerged(); renderCustom(); }
}

/* ---------- Bagikan menu sebagai foto ---------- */
function wrapText(g, txt, maxW, font) {
  g.font = font;
  const words = String(txt).split(/\s+/).filter(Boolean);
  const out = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (line && g.measureText(t).width > maxW) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}
function menuShareImage() {
  const weekly = state.menuTab !== 'daily';
  const base = state.menuDate || todayStr();
  const dates = [];
  if (weekly) { const mon = mondayOf(base); for (let i = 0; i < 7; i++) dates.push(shiftDate(mon, i)); }
  else dates.push(base);

  const model = dates.map(d => ({
    date: d,
    items: menuFor(d).map(it => {
      const parts = menuLines(it.name);
      const sp = spesialPrice(it);
      const po = it.type === 'po' ? poPrice(it, d) : 0;
      const pj = menuItemPkg(it);
      return {
        type: menuTypeOf(it),
        title: parts[0] || it.name,
        comps: parts.slice(1).join(' · '),
        pkg: [
          sp ? 'Spesial · ' + fmtIDR(sp) : (it.type === 'po' ? 'Pre-Order' + (po ? ' · ' + fmtIDR(po) : '') : ''),
          pj ? 'Paket ' + pj.name : ''
        ].filter(Boolean).join(' · ')
      };
    })
  }));
  if (!model.some(m => m.items.length)) {
    toast(weekly ? 'Belum ada menu pada minggu ini' : 'Belum ada menu pada tanggal ini');
    return;
  }

  const dark = document.body.classList.contains('theme-dark');
  const th = dark
    ? { bg: '#0E1017', card: '#171A25', text: '#E9ECFF', muted: '#9AA0BA', line: 'rgba(255,255,255,.09)' }
    : { bg: '#FFFFFF', card: '#F6F7FD', text: '#1A1D2B', muted: '#6F7590', line: '#E6E8F2' };
  const TYPE = {
    snack: { tag: 'SNACK', color: dark ? '#FF4D5A' : '#D8262F' },
    lunch: { tag: 'LUNCH', color: dark ? '#38D39F' : '#1F9D74' },
    po: { tag: 'PO', color: dark ? '#F0C05A' : '#B88A2A' }
  };
  const W = weekly ? 760 : 560, pad = 26, scale = 2;
  const heroH = 96, cardPadY = 13, dayGap = 11, footH = 56;
  const titleFont = '700 15.5px "Segoe UI",sans-serif';
  const compFont = '12.5px "Segoe UI",sans-serif';
  const pkgFont = '600 11.5px "Segoe UI",sans-serif';
  const rightX = W - pad - 16, titleX = pad + 108;
  const contentW = rightX - titleX;

  const boxH = (g, m) => {
    const minBody = 42;
    if (!m.items.length) return minBody + cardPadY * 2;
    let h = 0;
    m.items.forEach(it => { h += 19 + (it.comps ? wrapText(g, it.comps, contentW, compFont).length * 16 : 0) + 8; });
    return Math.max(minBody, h - 8) + cardPadY * 2;
  };

  const cv = document.createElement('canvas');
  cv.width = W * scale; cv.height = 600 * scale;
  const m0 = cv.getContext('2d'); m0.scale(scale, scale);
  let H = pad + heroH + dayGap;
  model.forEach(m => { H += boxH(m0, m) + dayGap; });
  H += footH + dayGap + pad;

  cv.width = W * scale; cv.height = H * scale;
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  g.textBaseline = 'alphabetic';
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);

  /* hero gradient */
  const hg = g.createLinearGradient(pad, 0, W - pad, heroH);
  hg.addColorStop(0, dark ? '#FF4D5A' : '#D8262F');
  hg.addColorStop(1, dark ? '#FF3D8B' : '#FF3D6E');
  roundRect(g, pad, pad, W - pad * 2, heroH, 18);
  g.fillStyle = hg; g.fill();
  g.save();
  roundRect(g, pad, pad, W - pad * 2, heroH, 18); g.clip();
  g.fillStyle = 'rgba(255,255,255,.13)';
  g.beginPath(); g.arc(W - pad - 30, pad + 4, 66, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)';
  g.beginPath(); g.arc(W - pad - 132, pad + heroH, 46, 0, 7); g.fill();
  g.restore();

  const brand = db.settings.businessName;
  g.fillStyle = '#FFFFFF'; g.font = '800 21px "Segoe UI",sans-serif';
  g.fillText(clipText(g, brand, W - pad * 2 - 200), pad + 18, pad + 33);
  g.font = '600 11.5px "Segoe UI",sans-serif'; g.fillStyle = 'rgba(255,255,255,.88)';
  g.fillText(db.settings.tagline || 'Catering & Snack', pad + 18, pad + 51);
  try { g.letterSpacing = '1.6px'; } catch (e) { /* browser lama */ }
  g.font = '700 11px "Segoe UI",sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)';
  g.fillText(weekly ? 'MENU MINGGUAN' : 'MENU HARIAN', pad + 18, pad + 74);
  try { g.letterSpacing = '0px'; } catch (e) { /* abaikan */ }
  const range = weekly
    ? fmtShortDate(dates[0]) + ' – ' + fmtShortDate(dates[6])
    : fmtLong(dates[0]);
  g.textAlign = 'right';
  g.fillStyle = '#FFFFFF'; g.font = '800 17px "Segoe UI",sans-serif';
  g.fillText(range, W - pad - 18, pad + 40);
  g.font = '600 11.5px "Segoe UI",sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
  g.fillText(weekly ? '7 hari' : WEEKDAYS[weekdayOf(dates[0]) - 1], W - pad - 18, pad + 58);
  g.textAlign = 'left';

  /* kartu per hari */
  let y = pad + heroH + dayGap;
  model.forEach((m, i) => {
    const ch = boxH(g, m);
    const isToday = m.date === todayStr();
    roundRect(g, pad, y, W - pad * 2, ch, 14);
    g.fillStyle = th.card; g.fill();
    g.strokeStyle = isToday ? TYPE.snack.color : th.line;
    g.lineWidth = isToday ? 1.8 : 1;
    g.stroke();
    const dom = m.items.length ? m.items[0].type : 'snack';
    g.save();
    roundRect(g, pad, y, W - pad * 2, ch, 14); g.clip();
    g.fillStyle = TYPE[dom].color; g.fillRect(pad, y, 5, ch);
    g.restore();

    const bx = pad + 18;
    g.fillStyle = th.muted; g.font = '700 10.5px "Segoe UI",sans-serif';
    g.fillText(WEEKDAYS[weekdayOf(m.date) - 1].toUpperCase(), bx, y + cardPadY + 12);
    g.fillStyle = th.text; g.font = '800 23px "Segoe UI",sans-serif';
    g.fillText(String(+m.date.slice(8)), bx, y + cardPadY + 36);
    g.fillStyle = th.muted; g.font = '600 10.5px "Segoe UI",sans-serif';
    g.fillText(MONTHS_ID[+m.date.slice(5, 7) - 1], bx, y + cardPadY + 50);

    if (!m.items.length) {
      g.fillStyle = th.muted; g.font = 'italic 12.5px "Segoe UI",sans-serif';
      g.fillText('Belum ada menu', titleX, y + cardPadY + 20);
    }
    let iy = y + cardPadY + 15;
    m.items.forEach(it => {
      g.font = titleFont; g.fillStyle = th.text;
      g.font = pkgFont;
      const pkgW = it.pkg ? g.measureText(it.pkg).width : 0;
      g.font = titleFont; g.fillStyle = th.text;
      g.fillText(clipText(g, it.title, contentW - pkgW - 12), titleX, iy);
      g.fillStyle = TYPE[it.type].color;
      g.beginPath(); g.arc(titleX - 11, iy - 4.5, 3.4, 0, 7); g.fill();
      if (it.pkg) {
        g.textAlign = 'right'; g.font = pkgFont; g.fillStyle = th.muted;
        g.fillText(it.pkg, rightX, iy);
        g.textAlign = 'left';
      }
      iy += 19;
      if (it.comps) {
        g.font = compFont; g.fillStyle = th.muted;
        wrapText(g, it.comps, contentW, compFont).forEach(ln => { g.fillText(ln, titleX, iy); iy += 16; });
      }
      iy += 8;
    });
    y += ch + dayGap;
  });

  /* kaki: ringkasan jumlah pilihan */
  const cnt = { snack: 0, lunch: 0, po: 0 };
  model.forEach(m => m.items.forEach(it => { cnt[it.type]++; }));
  roundRect(g, pad, y, W - pad * 2, footH, 14);
  g.fillStyle = th.card; g.fill();
  g.strokeStyle = th.line; g.lineWidth = 1; g.stroke();
  let cx = pad + 18;
  ['snack', 'lunch', 'po'].forEach(k => {
    if (!cnt[k]) return;
    g.fillStyle = TYPE[k].color;
    g.beginPath(); g.arc(cx + 4, y + footH / 2, 4, 0, 7); g.fill();
    g.fillStyle = th.text; g.font = '700 12.5px "Segoe UI",sans-serif';
    g.fillText(TYPE[k].tag + ' ' + cnt[k], cx + 15, y + footH / 2 + 4);
    cx += 15 + g.measureText(TYPE[k].tag + ' ' + cnt[k]).width + 24;
  });
  g.textAlign = 'right';
  g.fillStyle = th.muted; g.font = '11px "Segoe UI",sans-serif';
  g.fillText(brand + ' · dibuat ' + fmtShortDate(todayStr()), W - pad - 18, y + footH / 2 + 4);
  g.textAlign = 'left';

  const file = 'menu-mingguan-' + (weekly ? dates[0] : 'harian-' + dates[0]) + '.png';
  openImagePreview(cv, file, 'Menu ' + (weekly ? 'mingguan ' : '') + range);
}
/* Pratinjau gambar sebelum dibagikan / diunduh */
function openImagePreview(cv, filename, title) {
  const url = cv.toDataURL('image/png');
  state.preview = { url: url, file: filename, title: title };
  openModal(
    '<h3>' + escapeHtml(title) + '</h3>' +
    '<p class="muted tiny">Pratinjau foto. Bagikan langsung ke aplikasi lain, atau unduh sebagai PNG.</p>' +
    '<div class="img-preview"><img src="' + url + '" alt="Pratinjau ' + escapeHtml(title) + '"></div>' +
    '<div class="modal-actions">' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close">Tutup</button>' +
      '<button type="button" class="btn btn-ghost" data-act="img-download">Unduh PNG</button>' +
      '<button type="button" class="btn btn-accent" data-act="img-share">Bagikan</button>' +
    '</div>'
  );
  const box = document.querySelector('#modalBackdrop .modal');
  if (box) box.classList.add('modal-wide');
}
function downloadPreview() {
  const p = state.preview;
  if (!p) return;
  const a = document.createElement('a');
  a.href = p.url; a.download = p.file;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Foto diunduh, tinggal dibagikan');
}
function sharePreview() {
  const p = state.preview;
  if (!p) return;
  const use = blob => {
    const file = new File([blob], p.file, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: p.title }).catch(err => {
        if (!err || err.name !== 'AbortError') downloadPreview();
      });
      return;
    }
    downloadPreview();
  };
  try {
    const bin = atob(p.url.slice(p.url.indexOf(',') + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    use(new Blob([bytes], { type: 'image/png' }));
  } catch (e) { downloadPreview(); }
}
/* Ringkasan "berapa orang memilih paket apa" untuk satu tanggal */
function pkgCounts(type, date) {
  const recs = db[type][date] || {};
  const map = {};
  let base = 0;
  for (const id in recs) {
    const r = recs[id];
    if (!r.ordered) continue;
    const c = customerById(id);
    const p = pkgFor(type, r, c);
    if (p) map[p.id] = (map[p.id] || 0) + 1;
    else base++;
  }
  return { map: map, base: base };
}
function pkgBreakdown(type, date) {
  const c = pkgCounts(type, date);
  const parts = Object.keys(c.map).sort((a, b) => c.map[b] - c.map[a]).map(id => {
    const p = pkgById(id);
    return (p ? p.name : 'paket') + ' ' + c.map[id] + ' orang';
  });
  if (c.base) parts.push('paket lain ' + c.base + ' orang');
  return parts.join(' · ');
}
function renderPkgShowcase() {
  const el = document.getElementById('pkgShowcase');
  if (!el) return;
  const date = state.menuDate || todayStr();
  setText('pkgShowcaseDate', fmtShortDate(date));
  el.innerHTML = ['snack', 'lunch'].map(type => {
    const counts = pkgCounts(type, date).map;
    const total = countOrdered(type, date);
    const plan = menuItemsFor(type, date);
    const chips = pkgList(type).map(p =>
      '<div class="pkg-chip"><span class="pkg-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="pkg-price">' + fmtIDR(p.price) + '</span>' +
      '<span class="pkg-use">' + (counts[p.id] || 0) + ' orang pesan</span></div>').join('');
    const menu = plan.map(it => {
      const parts = menuLines(it.name);
      const sp = spesialPrice(it);
      return '<div class="pm"><b>' + escapeHtml(parts[0] || it.name) + '</b>' +
        (sp ? '<span class="pm-spesial">Spesial ' + fmtIDR(sp) + '</span>' : '') +
        (parts.length > 1 ? '<span>' + parts.slice(1).map(escapeHtml).join(' · ') + '</span>' : '') + '</div>';
    }).join('');
    return '<div class="pkg-group"><div class="pkg-group-title">' + (type === 'snack' ? 'Snack' : 'Lunch') +
      '<span class="muted tiny"> · ' + total + ' porsi</span></div>' +
      '<div class="pkg-chips">' + (chips || '<span class="muted small">Belum ada paket. Tambah di Pengaturan.</span>') + '</div>' +
      '<p class="muted tiny pkg-note">Makanan di bawah berlaku untuk semua paket. Tiap anak bayar sesuai paketnya sendiri, kecuali yang bertanda Spesial.</p>' +
      '<div class="pkg-menu">' + (menu || '<span class="pm-none">belum ada menu pada tanggal ini</span>') + '</div></div>';
  }).join('');
}
function pkgUsage(p) {
  const kids = db.customers.filter(c => c[p.type + 'Pkg'] === p.id).length;
  let portions = 0;
  for (const date in db[p.type]) for (const id in db[p.type][date]) {
    const r = db[p.type][date][id];
    if (r.ordered && r.pkg === p.id) portions++;
  }
  return { kids, portions };
}
function shiftHomeMonth(delta) {
  const p = (state.menuMonth || monthKey(state.menuDate)).split('-').map(Number);
  let y = p[0], mo = p[1] + delta;
  if (mo < 1) { mo = 12; y--; } else if (mo > 12) { mo = 1; y++; }
  state.menuMonth = y + '-' + pad(mo);
  renderHomeCalendar();
}

/* ---------- Render: Hari Ini (absensi snack + lunch dalam satu tabel) ---------- */
const DAY_TYPES = ['snack', 'lunch'];
const TYPE_LABEL = { snack: 'Snack', lunch: 'Lunch' };

function buildDailyMergedPage() {
  const el = document.getElementById('page-hari');
  if (!el) return;
  el.innerHTML =
    '<div class="date-nav">' +
      '<button class="nav-arrow" data-act="day-prev" title="Hari sebelumnya">' + ICO_PREV + '</button>' +
      '<button type="button" class="date-field" id="hariDateBtn" data-act="open-cal" data-field="hari">' + ICO_CAL + '<span id="hariDateText"></span></button>' +
      '<button class="nav-arrow" data-act="day-next" title="Hari berikutnya">' + ICO_NEXT + '</button>' +
      '<div class="dn-filters">' +
        '<label class="ctl"><span>Jenjang</span><select id="hariLevelFilter" class="input input-sm"></select></label>' +
        '<label class="ctl"><span>Angkatan</span><select id="hariCohortFilter" class="input input-sm"></select></label>' +
        '<label class="ctl ctl-wide"><span>Kelas</span><select id="hariClassFilter" class="input input-sm"></select></label>' +
        '<label class="ctl ctl-wide"><span>Cari</span><input type="text" id="hariSearch" class="input input-sm" placeholder="Nama / kelas…"></label>' +
        '<button class="btn btn-ghost btn-sm" data-act="daily-filter-reset">Reset</button>' +
        '<span class="menu-note" id="hariFilterNote"></span>' +
      '</div>' +
    '</div>' +
    '<div class="quick-strip" id="hariQuick" hidden></div>' +
    '<div class="card">' +
      '<div class="card-head"><h3>Absensi Hari Ini</h3><span class="muted tiny" id="hariCount"></span></div>' +
      '<p class="muted tiny" id="hariPkgSummary"></p>' +
      '<div class="table-wrap"><table class="table table-daily">' +
        '<thead>' +
          '<tr><th class="sticky-col" rowspan="2">Nama · kelas</th>' +
            '<th class="grp grp-snack">Snack</th>' +
            '<th class="grp grp-lunch">Lunch</th>' +
            '<th colspan="2" class="grp grp-day">Hari ini</th></tr>' +
          '<tr><th>Makanan &amp; paket</th>' +
            '<th>Makanan &amp; paket</th>' +
            '<th>Catatan</th><th class="num">Total &amp; bayar</th></tr>' +
        '</thead>' +
        '<tbody id="hariList"></tbody>' +
      '</table></div>' +
      '<p class="empty" id="hariEmpty" hidden>Belum ada pelanggan aktif.</p>' +
    '</div>';
}

function dailyMatch(c, f) {
  if (f.level && levelKeyOf(c.className) !== f.level) return false;
  if (f.cohort && cohortOf(c.className) !== f.cohort) return false;
  if (f.cls && (c.className || '').trim() !== f.cls) return false;
  return true;
}
/* Chip makanan anak pada tanggal tsb. Dengan cid → jadi tombol pilihan (halaman harian & Pesanan Mingguan).
   data-tip = isi lengkap menu, ditampilkan sebagai dialog kecil saat chip disorot/difokus. */
function foodTip(k, it, extra) {
  const lines = menuLines(it.name);
  return escapeHtml(LETTERS[k] + ' · ' + (lines[0] || it.name) + '\n' + lines.slice(1).join('\n') + (extra ? '\n' + extra : ''));
}
function foodChips(type, date, rec, cid) {
  const items = menuItemsFor(type, date);
  if (!items.length) return '<span class="muted tiny" title="Belum ada menu ' + type + ' pada tanggal ini. Atur di Beranda › Menu Mingguan">tidak ada menu</span>';
  const picks = rec && rec.ordered ? customPicks(type, rec).filter(k => k < items.length) : [];
  const label = it => shortTxt(menuLines(it.name)[0] || it.name, 16);
  if (!cid) {
    if (!picks.length) return '<span class="muted tiny">' + (rec && rec.ordered ? 'belum dipilih' : '—') + '</span>';
    return picks.map(k => '<span class="food-chip is-on" data-tip="' + foodTip(k, items[k]) + '"><b>' + LETTERS[k] + '</b>' + escapeHtml(label(items[k])) + '</span>').join('');
  }
  const cust = customerById(cid);
  return items.slice(0, LETTERS.length).map((it, k) => {
    const on = picks.indexOf(k) >= 0;
    const sp = spesialPrice(it);
    const pj = menuItemPkg(it);
    const allowed = !cust || itemAllowedFor(type, it, rec, cust);
    const extra = [sp ? 'Spesial · ' + fmtIDR(sp) : '', pj ? (allowed ? 'Paket ' : 'Khusus paket ') + pj.name : ''].filter(Boolean).join('\n');
    return '<button type="button" class="food-chip ' + (on ? 'is-on' : 'is-off') + (allowed ? '' : ' is-locked') + '" data-act="daily-food" data-type="' + type +
      '" data-cid="' + escapeHtml(cid) + '" data-date="' + date + '" data-mi="' + k + '"' +
      (!allowed && pj ? ' title="Khusus paket ' + escapeHtml(pj.name) + '"' : '') +
      ' data-tip="' + foodTip(k, it, extra) + '">' +
      '<b>' + LETTERS[k] + '</b>' + escapeHtml(label(it)) + '</button>';
  }).join('');
}

/* Dialog kecil saat chip makanan disorot/difokus: baris pertama = nama makanan, sisanya isi paket */
let foodTipEl = null;
function showFoodTip(chip) {
  const lines = String(chip.dataset.tip || '').split('\n').filter(Boolean);
  if (!lines.length) return;
  if (!foodTipEl) {
    foodTipEl = document.createElement('div');
    foodTipEl.className = 'food-tip';
    document.body.appendChild(foodTipEl);
  }
  foodTipEl.innerHTML = '<strong>' + escapeHtml(lines[0]) + '</strong>' +
    (lines.length > 1 ? '<span>' + lines.slice(1).map(escapeHtml).join('<br>') + '</span>' : '');
  const r = chip.getBoundingClientRect();
  const w = foodTipEl.offsetWidth, h = foodTipEl.offsetHeight;
  const viewW = document.documentElement.clientWidth;
  let x = r.left + window.scrollX + r.width / 2 - w / 2;
  x = Math.max(window.scrollX + 8, Math.min(x, window.scrollX + viewW - w - 8));
  const below = r.bottom + h + 10 <= window.innerHeight;
  const y = (below ? r.bottom + 6 : r.top - h - 6) + window.scrollY;
  foodTipEl.style.left = Math.round(x) + 'px';
  foodTipEl.style.top = Math.round(y) + 'px';
  foodTipEl.classList.add('is-on');
}
function hideFoodTip() { if (foodTipEl) foodTipEl.classList.remove('is-on'); }
function chipFromEvent(e) {
  const el = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
  if (!el) return null;
  const to = e.relatedTarget;
  if (to && el.contains && to.nodeType === 1 && el.contains(to)) return null;
  return el;
}

function fillFilterSelect(id, pairs, allLabel, cur) {
  const el = document.getElementById(id);
  if (!el) return '';
  const keep = pairs.some(p => p[0] === cur) ? cur : '';
  el.innerHTML = '<option value="">' + allLabel + '</option>' +
    pairs.map(p => '<option value="' + escapeHtml(p[0]) + '"' + (p[0] === keep ? ' selected' : '') + '>' + escapeHtml(p[1]) + '</option>').join('');
  return keep;
}

/* Isi 3 dropdown bertingkat: Jenjang -> Angkatan -> Kelas */
function fillCascadeFilters(store, prefix, customers, includeInactive) {
  const act = includeInactive ? customers : customers.filter(c => c.active);
  const uniq = arr => [...new Set(arr.filter(Boolean))].sort();
  const inLevel = act.filter(c => !store.level || levelKeyOf(c.className) === store.level);
  const inCohort = inLevel.filter(c => !store.cohort || cohortOf(c.className) === store.cohort);

  const levelPairs = uniq(act.map(c => levelKeyOf(c.className))).map(k =>
    [k, levelName(k) + ' (' + act.filter(c => levelKeyOf(c.className) === k).length + ')']);
  const cohortPairs = uniq(inLevel.map(c => cohortOf(c.className))).map(k =>
    [k, k + ' (' + inLevel.filter(c => cohortOf(c.className) === k).length + ')']);
  const classPairs = uniq(inCohort.map(c => (c.className || '').trim())).map(k => [k, k]);

  store.level = fillFilterSelect(prefix + 'LevelFilter', levelPairs, 'Semua jenjang', store.level);
  store.cohort = fillFilterSelect(prefix + 'CohortFilter', cohortPairs, 'Semua angkatan', store.cohort);
  store.cls = fillFilterSelect(prefix + 'ClassFilter', classPairs, 'Semua kelas', store.cls);
}
/* Catatan: satu baris = satu anak = satu hari; snack dan lunch berdampingan. */
function dayRecords(cid, date) {
  const out = {};
  DAY_TYPES.forEach(t => { out[t] = (db[t][date] || {})[cid] || { ordered: false, paid: false, method: '', note: '', pkg: '' }; });
  return out;
}
function daySummary(cid, date) {
  const recs = dayRecords(cid, date);
  const c = customerById(cid);
  let value = 0, unpaid = 0, ordered = 0, gratis = 0, method = '', note = '';
  DAY_TYPES.forEach(t => {
    const r = recs[t];
    if (!r.ordered) { if (r.method) method = method || r.method; if (r.note) note = note || r.note; return; }
    ordered++;
    const free = r.method === 'Gratis';
    if (free) gratis++;
    const v = effPrice(t, r, c, date);
    value += v;
    if (!(r.paid || free)) unpaid += v;
    if (!method && r.method) method = r.method;
    if (!note && r.note) note = r.note;
  });
  return { name: c ? c.name : '', recs: recs, value: value, unpaid: unpaid, ordered: ordered, gratis: gratis, method: method, note: note };
}
/* Sel makanan: chip pilihan (hover = isi lengkap) + nama paket di bawahnya.
   Ganti paket dilakukan di Pesanan Mingguan, bukan di tabel harian. */
function dailyFoodCell(type, date, c, r) {
  const items = menuItemsFor(type, date);
  const picks = r.ordered ? customPicks(type, r).filter(k => k < items.length) : [];
  const chips = items.length ? foodChips(type, date, r, c.id) : '';
  const leave = isOnLeave(c, date);
  const showBtn = !items.length || (r.ordered && !picks.length);
  const btn = showBtn
    ? '<button type="button" class="cs-plain' + (r.ordered ? ' is-on' : '') + (leave && !r.ordered ? ' is-blocked' : '') +
      '" data-act="daily-plain" data-type="' + type + '" data-cid="' + escapeHtml(c.id) + '" title="' +
      (r.ordered ? 'Batalkan pesanan ' + type + ' hari ini' : leave ? 'Libur: lepas dulu tanda liburnya untuk memesan' : 'Tandai pesan ' + type + ' hari ini · paket mengikuti default pelanggan') + '">' +
      (r.ordered ? '✓ pesan' : 'pesan') + '</button>'
    : '';
  const pk = r.ordered ? pkgFor(type, r, c) : null;
  const sp = picks.length ? spesialPrice(items[picks[0]]) : 0;
  const pkgLine = !r.ordered ? '' : (sp
    ? '<span class="pkg-under is-spesial">Spesial · ' + fmtIDR(sp) + '</span>'
    : (pk ? '<span class="pkg-under">' + escapeHtml(pk.name) + ' · ' + fmtIDR(effPrice(type, r, c, date)) + '</span>' : ''));
  return '<td class="food-cell' + (items.length ? '' : ' food-none') + (leave ? ' is-leave' : '') + '" data-type="' + type + '">' + chips + btn + pkgLine + '</td>';
}
function dayTotalHTML(s) {
  return '<button type="button" class="pay-total" data-act="daily-pay-cfg" title="Atur metode pembayaran dan lunasi ' + escapeHtml(s.name) + '">' + fmtIDR(s.value) + '</button>';
}

/* Pembayaran satu anak satu hari, kolom lunas/metode tidak lagi di tabel */
function openDayPayModal(cid, date) {
  const c = customerById(cid);
  const s = daySummary(cid, date);
  if (!c || !s.ordered) { toast('Anak ini belum memesan apa-apa pada tanggal itu'); return; }
  const msel = '<select id="dpmMethod" class="input"><option value="">belum dipilih</option>' +
    db.settings.paymentMethods.map(m => '<option value="' + escapeHtml(m) + '"' + (s.method === m ? ' selected' : '') + '>' + escapeHtml(m) + '</option>').join('') + '</select>';
  const line = (t, id) => {
    const r = s.recs[t];
    if (!r.ordered) return '<p class="muted tiny">' + TYPE_LABEL[t] + ': tidak pesan</p>';
    return '<label class="check"><input type="checkbox" id="' + id + '"' + ((r.paid || r.method === 'Gratis') ? ' checked' : '') + '> ' +
      TYPE_LABEL[t] + ' · <strong>' + fmtIDR(effPrice(t, r, c, date)) + '</strong> ' +
      (r.method === 'Gratis' ? '<span class="badge gold">Gratis</span>' : '<span class="muted tiny">sudah lunas</span>') + '</label>';
  };
  openModal('<h3>Pembayaran · ' + escapeHtml(c.name) + '</h3>' +
    '<p class="muted small">' + escapeHtml(fmtLong(date)) + ' · total ' + fmtIDR(s.value) +
      (s.unpaid > 0 ? ' · sisa ' + fmtIDR(s.unpaid) : ' · semua sudah lunas') + '</p>' +
    '<label class="field"><span>Metode (berlaku untuk snack &amp; lunch hari ini)</span>' + msel + '</label>' +
    line('snack', 'dpmSnack') + line('lunch', 'dpmLunch') +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">Tutup</button>' +
    '<button type="button" class="btn btn-primary" data-act="daily-pay-save" data-cid="' + escapeHtml(cid) + '" data-date="' + date + '">Simpan</button></div>');
}
function saveDayPay(cid, date) {
  const c = customerById(cid);
  if (!c) return;
  const meth = (document.getElementById('dpmMethod') || {}).value || '';
  const want = { snack: !!(document.getElementById('dpmSnack') || {}).checked, lunch: !!(document.getElementById('dpmLunch') || {}).checked };
  DAY_TYPES.forEach(t => {
    const r = (db[t][date] || {})[cid];
    if (!r || !r.ordered) return;
    if (meth) r.method = meth;
    r.paid = meth === 'Gratis' ? true : !!want[t];
  });
  logAction('bayar', 'Atur pembayaran ' + c.name + ' @ ' + date + ' · ' + (meth || 'metode tetap'));
  save();
  closeModal();
  syncMergedRow(document.querySelector('#hariList tr[data-cid="' + cid + '"]'));
  renderDailyStats();
  toast('Pembayaran ' + c.name + ' disimpan');
}

function renderDailyMerged() {
  const date = state.currentDate;
  const f = state.daily.hari;
  fillCascadeFilters(f, 'hari', db.customers);
  const filtered = !!(f.level || f.cohort || f.cls || f.q);
  const totalActive = db.customers.filter(c => c.active).length;
  const customers = db.customers.filter(c => c.active && dailyMatch(c, f))
    .filter(c => !f.q || ((c.name || '') + ' ' + (c.className || '') + ' ' + (c.parent || '')).toLowerCase().includes(f.q))
    .sort(sortCustomers);
  const search = document.getElementById('hariSearch');
  if (search && search.value !== f.q) search.value = f.q || '';
  setText('hariDateText', fmtLong(date));
  setText('hariFilterNote', customers.length === totalActive ? totalActive + ' anak aktif' : customers.length + ' dari ' + totalActive + ' anak');
  const tbody = document.getElementById('hariList');
  const empty = document.getElementById('hariEmpty');
  if (!customers.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    empty.textContent = filtered ? 'Tidak ada pelanggan aktif yang cocok dengan filter ini.' : 'Belum ada pelanggan aktif.';
  } else {
    empty.hidden = true;
    tbody.innerHTML = customers.map(c => {
      const s = daySummary(c.id, date);
      const leave = isOnLeave(c, date);
      const clsCell = escapeHtml(c.className) + (leave ? ' <span class="badge red" title="Sedang libur">Libur</span>' : '');
      return '<tr data-cid="' + c.id + '">' +
        '<td class="sticky-col">' + escapeHtml(c.name) + ' <span class="d-cls">' + clsCell + '</span>' + allergyBadge(c) +
        ' <button type="button" class="row-jump" data-act="goto-orders" data-cid="' + escapeHtml(c.id) +
        '" title="Koreksi 7 hari anak ini di Pesanan Mingguan">7 hari</button></td>' +
        DAY_TYPES.map(t => dailyFoodCell(t, date, c, s.recs[t])).join('') +
        '<td><input type="text" class="inp-note input input-sm" value="' + escapeHtml(s.note) + '" placeholder="' + (s.ordered ? 'Catatan hari ini…' : '—') + '"></td>' +
        '<td class="num day-total">' + dayTotalHTML(s) + '</td>' +
        '</tr>';
    }).join('');
  }
  renderDailyStats();
  renderDailyQuick(date, customers.length);
}

/* Perbarui baris tanpa render ulang, fokus input catatan tidak hilang */
function syncMergedRow(tr) {
  if (!tr) return;
  const cid = tr.dataset.cid, date = state.currentDate;
  const s = daySummary(cid, date);
  DAY_TYPES.forEach(t => {
    const r = s.recs[t];
    const fc = tr.querySelector('.food-cell[data-type="' + t + '"]');
    if (fc) fc.outerHTML = dailyFoodCell(t, date, customerById(cid), r);
  });
  const tot = tr.querySelector('.day-total');
  if (tot) tot.innerHTML = dayTotalHTML(s);
}

/* Ringkasan kecil di judul tabel, kartu statistikanya sendiri sudah dihapus dari halaman Hari Ini */
function renderDailyStats() {
  const date = state.currentDate;
  const f = state.daily.hari;
  const filtered = !!(f.level || f.cohort || f.cls);
  let pesan = 0, lunas = 0, gratis = 0;
  DAY_TYPES.forEach(type => {
    const recs = db[type][date] || {};
    for (const id in recs) {
      const r = recs[id];
      if (!r.ordered) continue;
      const c = customerById(id);
      if (filtered && (!c || !dailyMatch(c, f))) continue;
      pesan++;
      if (r.method === 'Gratis') { gratis++; lunas++; continue; }
      if (r.paid) lunas++;
    }
  });
  setText('hariCount', pesan + ' pesanan • ' + lunas + ' lunas' + (gratis ? ' • ' + gratis + ' gratis' : ''));
  const br = DAY_TYPES.map(t => pkgBreakdown(t, date)).filter(Boolean).join('  ·  ');
  const sum = document.getElementById('hariPkgSummary');
  if (sum) { sum.textContent = br ? 'Pilihan paket hari ini: ' + br : ''; sum.hidden = !br; }
}
/* Pintasan saat hari itu belum bisa dikerjakan: menu belum dibuat / tidak ada pelanggan */
function renderDailyQuick(date, shown) {
  const box = document.getElementById('hariQuick');
  if (!box) return;
  const missing = DAY_TYPES.filter(t => !menuItemsFor(t, date).length);
  const go = '<button type="button" class="btn btn-ghost btn-sm" data-act="goto-menu" data-date="' + date + '">' +
    'Buat menu di Beranda › Menu Harian</button>';
  const btn = '<button type="button" class="btn btn-ghost btn-sm" data-nav="customers">Tambah pelanggan</button>';
  let msg = '';
  if (isFullHoliday(date)) msg = '<span>Tanggal ini libur untuk semua orang. Tidak ada snack &amp; lunch, dan menusinya sudah dikosongkan.</span>' +
    '<button type="button" class="btn btn-ghost btn-sm" data-nav="dashboard">Ubah libur di Beranda</button>';
  else if (!shown) msg = '<span>Belum ada pelanggan aktif untuk hari ini.</span>' + btn;
  else if (missing.length) msg = '<span>Menu ' + missing.join(' & ') + ' belum dibuat untuk tanggal ini. Pilihannya masih kosong di semua halaman.</span>' + go;
  box.innerHTML = msg;
  box.hidden = !msg;
}
/* Pintasan dari halaman lain: buka Beranda › Menu Harian untuk satu tanggal.
   withPo menyiapkan satu baris PO kosong supaya tinggal ditulis. */
function openDailyMenu(date, withPo, tab) {
  const d = date || todayStr();
  state.menuDate = d;
  state.menuMonth = monthKey(d);
  state.menuDay = weekdayOf(d) - 1;
  state.menuTab = tab === 'week' ? 'week' : 'daily';
  showPage('dashboard');
  if (withPo && !menuItemsFor('po', d).length) {
    const items = menuPlanItems(d).map(it => Object.assign({}, it));
    if (items.length >= WEEK_MENU_MAX) toast('Maksimal ' + WEEK_MENU_MAX + ' pilihan per hari');
    else {
      items.push({ name: '', type: 'po', pkg: '', price: '' });
      writeMenuPlan(d, items);
      save();
      renderWeekMenu();
    }
  }
  const ed = document.getElementById('weekMenuEditor');
  if (ed) ed.scrollIntoView({ block: 'center' });
  if (withPo) {
    const inputs = document.querySelectorAll('.wm-name[data-date="' + d + '"]');
    const el = inputs[inputs.length - 1];
    if (el) el.focus();
  }
}

/* Lunasi seluruh pesanan hari ini (satu klik untuk semua anak) */
/* ---------- Render: Kustomisasi (edit pesanan seminggu) ---------- */
function buildCustomPage() {
  document.getElementById('page-custom').innerHTML =
    '<div class="date-nav">' +
      '<button class="nav-arrow" data-act="custom-prev" title="Minggu sebelumnya">' + ICO_PREV + '</button>' +
      '<div class="date-field" style="cursor:default">' + ICO_CAL + '<span id="customWeekText"></span></div>' +
      '<button class="nav-arrow" data-act="custom-next" title="Minggu berikutnya">' + ICO_NEXT + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="custom-today">Minggu ini</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="goto-menu" data-week="1" data-tab="week" title="Tulis / ubah makanan minggu ini di Beranda › Menu Mingguan">Atur menu</button>' +
      '<div class="seg">' +
        '<button class="seg-btn" data-act="custom-type" data-type="snack">Snack</button>' +
        '<button class="seg-btn" data-act="custom-type" data-type="lunch">Lunch</button>' +
      '</div>' +
      '<div class="dn-filters">' +
        '<label class="ctl"><span>Jenjang</span><select id="customLevelFilter" class="input input-sm"></select></label>' +
        '<label class="ctl"><span>Angkatan</span><select id="customCohortFilter" class="input input-sm"></select></label>' +
        '<label class="ctl ctl-wide"><span>Kelas</span><select id="customClassFilter" class="input input-sm"></select></label>' +
        '<label class="ctl ctl-wide"><span>Cari nama</span><input type="text" id="customSearch" class="input input-sm" placeholder="Nama…"></label>' +
        '<label class="check" title="Kolom Sabtu & Minggu tidak ditampilkan kalau hariannya belum ada menu dan belum ada yang pesan"><input type="checkbox" id="customWeekend" checked> Sembunyikan akhir pekan kosong</label>' +
        '<button class="btn btn-ghost btn-sm" data-act="custom-reset">Reset</button>' +
        '<span class="menu-note" id="customNote"></span>' +
      '</div>' +
    '</div>' +
    '<div class="stat-grid" id="customStats"></div>' +
    '<div class="card">' +
      '<div class="card-head">' +
        '<div><h3>Tabel Pesanan Mingguan</h3><span class="muted tiny" id="customCount"></span></div>' +
        '<div class="head-tools">' +
          '<button class="btn btn-ghost btn-sm" data-act="custom-print" title="Atur tampilan lalu cetak tabel pilihan minggu ini">Cetak tabel</button>' +
          '<span class="muted tiny">tampilkan</span>' +
          '<div class="seg seg-xs" id="customDisplaySeg">' +
            '<button class="seg-btn" data-act="custom-display" data-mode="name" title="Hanya nama paket">Nama paket</button>' +
            '<button class="seg-btn" data-act="custom-display" data-mode="price" title="Hanya harga">Harga</button>' +
            '<button class="seg-btn" data-act="custom-display" data-mode="both" title="Nama paket + harga">Keduanya</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="muted tiny">Klik huruf makanan (A, B, C…) untuk menandai pesanan, klik lagi untuk membatalkan. Arahkan kursor ke huruf itu untuk melihat <strong>isi lengkapnya</strong>. <strong>Snack boleh pilih lebih dari satu makanan</strong> (harga mengikuti pilihan pertama: paket anak itu, atau harga barisnya kalau menunya <em>Spesial</em>). Baris di bawah huruf menunjukkan paket/harga. Hari yang belum punya menu cukup ditandai <em>pesan</em>. Paketnya mengikuti default pelanggan. <span id="customHiddenNote"></span></p>' +
      '<div class="table-wrap custom-wrap"><table class="table custom-table">' +
        '<thead><tr id="customHead"></tr></thead><tbody id="customList"></tbody>' +
      '</table></div>' +
      '<p class="empty" id="customEmpty" hidden>Tidak ada pelanggan yang cocok dengan filter.</p>' +
    '</div>' +
    '<iframe class="offscreen" id="customFrame" title="Pratinjau cetak tabel mingguan"></iframe>';
}
function customDates() {
  const start = state.custom.weekStart || mondayOf(todayStr());
  const out = [];
  for (let i = 0; i < 7; i++) out.push(shiftDate(start, i));
  return out;
}
function customPkgNote(type, rec, c, chosen) {
  const mode = db.settings.customDisplay === 'name' ? 'name' : db.settings.customDisplay === 'price' ? 'price' : 'both';
  const sp = spesialPrice(chosen);
  if (sp) return mode === 'name' ? 'Spesial' : mode === 'price' ? fmtIDR(sp) : 'Spesial · ' + fmtIDR(sp);
  const p = pkgFor(type, rec, c);
  if (!p) return mode === 'price' ? '—' : 'tanpa paket';
  if (mode === 'name') return p.name;
  if (mode === 'price') return fmtIDR(p.price);
  return p.name + ' · ' + fmtIDR(p.price);
}
function customPicks(type, rec) {
  const max = type === 'snack' ? Infinity : 1;
  let list = Array.isArray(rec && rec.mis) ? rec.mis.filter(n => Number.isInteger(n) && n >= 0) : [];
  if (!list.length && rec && Number.isInteger(rec.mi)) list = [rec.mi];
  if (list.length > max) list = list.slice(0, max);
  return [...new Set(list)].sort((a, b) => a - b);
}
/* Hari yang pilihan makanannya cuma satu: pesanan yang sudah ada langsung memakai pilihan itu,
   sehingga tombol "pesan" tidak perlu diklik lagi. Sekalian merapikan indeks pilihan yang
   hangus karena baris menu dihapus atau digeser. onlyId membatasi perbaikan ke satu anak. */
function autoPickSingles(dates, onlyId) {
  let berubah = 0;
  (dates || Object.keys(db.menuPlan)).forEach(d => {
    ['snack', 'lunch'].forEach(t => {
      const recs = db[t][d];
      if (!recs) return;
      const items = menuItemsFor(t, d);
      const bernama = items.filter(it => String(it.name || '').trim());
      const single = bernama.length === 1 ? bernama[0] : null;
      const satu = single ? items.indexOf(single) : -1;
      Object.keys(recs).forEach(id => {
        if (onlyId && id !== onlyId) return;
        const r = recs[id];
        if (!r || !r.ordered) return;
        const semua = customPicks(t, r);
        const sah = semua.filter(k => k < items.length);
        if (semua.length && semua.length !== sah.length) {
          if (sah.length) { r.mis = sah; r.mi = sah[0]; } else { delete r.mis; delete r.mi; }
          berubah++;
          return;
        }
        if (semua.length || satu < 0) return;
        if (single && !itemAllowedFor(t, single, r, customerById(id))) return;
        r.mis = [satu]; r.mi = satu;
        if (!r.pkg) { const p = pkgFor(t, r, customerById(id)); if (p) r.pkg = p.id; }
        if (!r.method) r.method = defaultMethod();
        berubah++;
      });
    });
  });
  return berubah;
}
/* Pilihan makanan disimpan sebagai nomor urut baris, jadi baris yang dihapus harus
   menggeser nomor di bawahnya supaya pesanan anak lain tidak menunjuk makanan lain. */
function shiftPicksAfterDelete(date, type, pos) {
  if (pos < 0) return;
  const recs = db[type][date];
  if (!recs) return;
  Object.keys(recs).forEach(id => {
    const r = recs[id];
    if (!r || !r.ordered) return;
    const list = customPicks(type, r);
    if (!list.length) return;
    const geser = [...new Set(list.map(k => k === pos ? -1 : k > pos ? k - 1 : k).filter(k => k >= 0))].sort((a, b) => a - b);
    if (geser.length === list.length && geser.every((k, i) => k === list[i])) return;
    if (geser.length) { r.mis = geser; r.mi = geser[0]; } else { delete r.mis; delete r.mi; }
  });
}

/* ---------- Pesan saat tanggal libur ----------
   Yang sudah dipesan boleh dibatalkan; yang belum, ditanya dulu lewat dialog. */
let pendingAfterUnblock = null;
function leaveHolidayFor(c, date) { return db.holidays.find(h => holidayMatch(h, c, date)) || null; }
function askUnblockLeave(c, date, retry) {
  const h = leaveHolidayFor(c, date);
  if (!h) return false;
  const siapa = h.scope === 'person' ? (((customerById(h.value) || {}).name) || h.value) : h.value;
  pendingAfterUnblock = retry;
  openModal('<h3>Tanggal itu libur</h3>' +
    '<p class="muted small">' + escapeHtml(fmtLong(date)) + ' ditandai libur untuk <strong>' + escapeHtml(SCOPE_LABEL[h.scope] || h.scope) +
    (siapa ? ' · ' + escapeHtml(siapa) : '') + (h.note ? ' · ' + escapeHtml(h.note) : '') + '.</p>' +
    '<p class="muted small">Pesanan snack/lunch ' + escapeHtml(c.name) + ' tidak bisa dinyalakan pada hari libur. <strong>Pre-order (PO) tetap boleh</strong>. ' +
    'Menandai libur menghapus pesanan hari itu, jadi menyalakannya lagi berarti memesan ulang dari awal.</p>' +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
    '<button type="button" class="btn btn-danger" data-act="holiday-unblock" data-id="' + escapeHtml(h.id) + '">Lepas libur lalu pesan</button></div>');
  return true;
}
function setCustomFood(cid, date, mi, typeIn) {
  const type = typeIn === 'lunch' || typeIn === 'snack' ? typeIn : (state.custom.type === 'lunch' ? 'lunch' : 'snack');
  const c = customerById(cid);
  if (!c) return;
  const items = menuItemsFor(type, date);
  const it = items[mi];
  if (!it) return;
  const lama = (db[type][date] || {})[cid];
  const had = !!lama && customPicks(type, lama).indexOf(mi) >= 0;
  const itemPkg = menuItemPkg(it);
  if (!had && itemPkg && !itemAllowedFor(type, it, lama, c)) {
    toast('Menu ' + LETTERS[mi] + ' khusus paket ' + itemPkg.name);
    return;
  }
  if (!had && askUnblockLeave(c, date, () => setCustomFood(cid, date, mi, typeIn))) return;
  const rec = ensureRecord(type, date, cid);
  let picks = customPicks(type, rec);
  if (had) picks = picks.filter(x => x !== mi);
  else if (type === 'snack') {
    picks = picks.concat(mi).sort((a, b) => a - b);
    if (picks.length > 1) toast('Snack: ' + picks.map(k => LETTERS[k]).join(' + ') + ' · harga mengikuti pilihan ' + LETTERS[picks[0]]);
  } else picks = [mi];
  rec.mis = picks;
  rec.mi = picks.length ? picks[0] : undefined;
  if (!picks.length) delete rec.mi;
  if (picks.length) {
    rec.ordered = true;
    const primary = items[picks[0]];
    if (!rec.pkg) { const p = pkgFor(type, rec, c); if (p) rec.pkg = p.id; }
    if (!rec.method) rec.method = defaultMethod();
    logAction('kustomisasi', 'Pilih ' + type + ' ' + c.name + ' @ ' + date + ' menu ' + picks.map(k => LETTERS[k]).join('+') + ' · ' + (menuLines(primary.name)[0] || ''));
  } else {
    rec.ordered = false; rec.paid = false;
    logAction('kustomisasi', 'Batalkan ' + type + ' ' + c.name + ' @ ' + date + ' (menu ' + LETTERS[mi] + ')');
  }
  save();
  renderCustom();
  renderDailyMerged(); renderDashboard();
}
function customType() { return state.custom.type === 'lunch' ? 'lunch' : 'snack'; }
/* Hari yang belum punya menu: satu tombol "pesan" saja, paket mengikuti default pelanggan */
function togglePlainOrder(cid, date, typeIn) {
  const type = typeIn === 'snack' || typeIn === 'lunch' ? typeIn : customType();
  const c = customerById(cid);
  if (!c) return;
  const ada = (db[type][date] || {})[cid];
  if ((!ada || !ada.ordered) && askUnblockLeave(c, date, () => togglePlainOrder(cid, date, typeIn))) return;
  const rec = ensureRecord(type, date, cid);
  rec.ordered = !rec.ordered;
  if (rec.ordered) {
    delete rec.mis; delete rec.mi;
    const p = pkgFor(type, rec, c) || pkgById(rec.pkg) || pkgList(type)[0];
    rec.pkg = p ? p.id : (rec.pkg || '');
    if (!rec.method) rec.method = defaultMethod();
    logAction('pesanan', 'Pesan ' + type + ' ' + c.name + ' @ ' + date + ' (hari tanpa menu)');
  } else {
    rec.paid = false;
    logAction('pesanan', 'Batalkan ' + type + ' ' + c.name + ' @ ' + date);
  }
  save();
  renderCustom(); renderDailyMerged(); renderDashboard();
}
function customWeekCols(type) {
  const hideWe = state.custom.hideWeekend !== false;
  const cols = [];
  customDates().forEach((d, i) => {
    const items = menuItemsFor(type, d);
    const anyOrder = Object.keys(db[type][d] || {}).some(id => (db[type][d][id] || {}).ordered);
    if (i >= 5 && hideWe && !items.length && !anyOrder) return;
    cols.push({ date: d, dow: i, items: items });
  });
  return cols;
}
function customCustomers() {
  const st = state.custom;
  return db.customers.filter(c => c.active && dailyMatch(c, st))
    .filter(c => !st.q || ((c.name || '') + ' ' + (c.className || '') + ' ' + (c.allergy || '')).toLowerCase().includes(st.q))
    .sort(sortCustomers);
}
function renderCustom() {
  const st = state.custom;
  if (!st.weekStart) st.weekStart = mondayOf(todayStr());
  const type = st.type === 'lunch' ? 'lunch' : 'snack';
  fillCascadeFilters(st, 'custom', db.customers);
  const search = document.getElementById('customSearch');
  if (search && search.value !== st.q) search.value = st.q;
  document.querySelectorAll('[data-act="custom-type"]').forEach(b => b.classList.toggle('is-on', b.dataset.type === type));
  const cdm = db.settings.customDisplay === 'name' || db.settings.customDisplay === 'price' ? db.settings.customDisplay : 'both';
  document.querySelectorAll('[data-act="custom-display"]').forEach(b => b.classList.toggle('is-on', b.dataset.mode === cdm));
  const allDates = customDates();
  setText('customWeekText', fmtShortDate(allDates[0]) + ' – ' + fmtShortDate(allDates[6]));
  const cols = customWeekCols(type);
  const weHidden = allDates.length - cols.length;
  const weBox = document.getElementById('customWeekend');
  if (weBox) weBox.checked = st.hideWeekend !== false;
  setText('customHiddenNote', weHidden ? weHidden + ' hari akhir pekan disembunyikan (tidak ada menu & tidak ada pesanan)' : '');

  document.getElementById('customHead').innerHTML =
    '<th class="sticky-col">Nama</th><th>Kelas</th>' +
    cols.map(col => {
      const items = col.items;
      const legend = items.length ? '' : '<button type="button" class="cs-legend cs-none cs-make" data-act="goto-menu" data-date="' + col.date + '" data-tab="daily" title="Buat menu snack/lunch tanggal ini di Beranda › Menu Harian">+ buat menu</button>';
      return '<th class="day">' + WEEKDAYS[col.dow] +
        '<button type="button" class="day-jump" data-act="goto-day" data-date="' + col.date + '" title="Buka halaman Hari Ini pada tanggal ini">' +
        col.date.slice(8) + '/' + col.date.slice(5, 7) + '</button>' + legend + '</th>';
    }).join('') +
    '<th class="num">Total mingguan</th>';

  const customers = customCustomers();
  const totalActive = db.customers.filter(c => c.active).length;
  state.customVisible = customers.map(c => c.id);
  setText('customNote', customers.length === totalActive ? totalActive + ' anak aktif' : customers.length + ' dari ' + totalActive + ' anak');

  let portions = 0, value = 0, unpaid = 0;
  document.getElementById('customList').innerHTML = customers.map(c => {
    let n = 0, rowValue = 0;
    const cells = cols.map(col => {
      const d = col.date, items = col.items;
      const rec = (db[type][d] || {})[c.id];
      const ordered = !!(rec && rec.ordered);
      if (ordered) { n++; const p = effPrice(type, rec, c, d); rowValue += p; portions++; value += p; if (!rec.paid && rec.method !== 'Gratis') unpaid++; }
      const leave = isOnLeave(c, d);
      if (!items.length) {
        return '<td class="cell' + (leave ? ' is-leave' : '') + '"' + (leave ? ' title="Sedang libur"' : '') + '>' +
          '<button type="button" class="cs-plain' + (ordered ? ' is-on' : '') + (leave && !ordered ? ' is-blocked' : '') + '" data-act="custom-plain" data-cid="' + escapeHtml(c.id) + '" data-date="' + d + '" title="' +
          (ordered ? 'Batalkan pesanan hari ini' : leave ? 'Libur: lepas dulu tanda liburnya untuk memesan' : 'Tandai pesan hari ini · paket mengikuti default pelanggan, ubah paketnya di sel ini') + '">' +
          (ordered ? '✓ pesan' : 'pesan') + '</button>' +
          '<div class="cs-pkg' + (ordered ? ' is-manual' : ' is-off') + '">' + escapeHtml(ordered ? customPkgNote(type, rec, c) : 'belum pesan') + '</div></td>';
      }
      const picks = ordered ? customPicks(type, rec).filter(k => k < items.length) : [];
      return '<td class="cell' + (leave ? ' is-leave' : '') + '"' + (leave ? ' title="Sedang libur"' : '') + '>' +
        '<div class="cs-food">' + items.slice(0, LETTERS.length).map((it, k) => {
          const pj = menuItemPkg(it);
          const allowed = itemAllowedFor(type, it, rec, c);
          const extra = [
            spesialPrice(it) ? 'Harga spesial ' + fmtIDR(spesialPrice(it)) + ', berlaku untuk semua yang memilih' : 'Harga mengikuti paket anak ini',
            pj ? (allowed ? 'Paket ' : 'Khusus paket ') + pj.name : ''
          ].filter(Boolean).join('\n');
          return '<button type="button" class="cs-letter' + (picks.indexOf(k) >= 0 ? ' is-on' : '') + (allowed ? '' : ' is-locked') +
            '" data-act="custom-food" data-cid="' + escapeHtml(c.id) + '" data-date="' + d + '" data-mi="' + k + '"' +
            (!allowed && pj ? ' title="Khusus paket ' + escapeHtml(pj.name) + '"' : '') +
            ' data-tip="' + foodTip(k, it, extra) + '">' + LETTERS[k] + '</button>';
        }).join('') + '</div>' +
        '<div class="cs-pkg' + (picks.length ? '' : (ordered ? ' is-manual' : ' is-off')) + '" title="' +
        escapeHtml(picks.length > 1 ? (picks.length + ' pilihan · harga mengikuti pilihan ' + LETTERS[picks[0]]) : (picks.length === 0 && ordered ? 'Pesanan tercatat tanpa pilihan menu, harga mengikuti paket pelanggan' : (type === 'snack' ? 'Boleh pilih lebih dari satu makanan' : 'Satu pilihan per hari'))) + '">' +
        escapeHtml(picks.length || ordered ? customPkgNote(type, rec, c, picks.length ? items[picks[0]] : null) : 'belum pesan') + '</div>' +
        '</td>';
    }).join('');
    return '<tr data-cid="' + c.id + '">' +
      '<td class="sticky-col"><strong>' + escapeHtml(c.name) + '</strong>' + (c.allergy ? '<span class="alg-dot" title="' + escapeHtml(c.allergy) + '">&#9888;</span>' : '') + '</td>' +
      '<td class="muted">' + escapeHtml(c.className || '—') + '</td>' + cells +
      '<td class="num"><strong>' + n + '</strong><br><span class="muted tiny">' + fmtIDR(rowValue) + '</span></td></tr>';
  }).join('');
  document.getElementById('customEmpty').hidden = customers.length > 0;
  document.getElementById('customCount').textContent = customers.length + ' anak • ' + portions + ' porsi ' + type + ' • ' + fmtIDR(value);
  document.getElementById('customStats').innerHTML =
    statCard('Anak Tampil', customers.length) +
    statCard('Porsi ' + (type === 'snack' ? 'Snack' : 'Lunch'), portions) +
    statCard('Nilai Minggu Ini', fmtIDR(value), '', 'gold') +
    statCard('Belum Lunas', unpaid, '', 'danger');
}

/* ---------- Cetak tabel pilihan mingguan ---------- */
const CUSTOM_PRINT_COLORS = [
  ['dark', '#222222', 'Hitam'],
  ['blue', '#1F3A5F', 'Biru tua'],
  ['red', '#7A1F1F', 'Merah tua'],
  ['green', '#1F4D36', 'Hijau tua'],
  ['gray', '#444444', 'Abu-abu']
];
const CUSTOM_PRINT_SIZES = [8, 9, 10, 11, 12, 13, 14];
const CUSTOM_PRINT_ZOOMS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];
const CUSTOM_PRINT_ZOOM_FIT = 1;
const CUSTOM_PRINT_ZOOM_DEFAULT = 3;
const CUSTOM_PRINT_STRIPE_DEFAULT = ['#dbeafe', '#fdf1d8'];
let cprintZoomIdx = CUSTOM_PRINT_ZOOM_DEFAULT;
function normHex(v, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : fallback;
}
function mixHex(hex, ratio) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return '#' + ch.map(c => Math.round(c + (255 - c) * ratio).toString(16).padStart(2, '0')).join('');
}
function avgHex(a, b) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  return '#' + [16, 8, 0].map(s =>
    Math.round((((na >> s) & 255) + ((nb >> s) & 255)) / 2).toString(16).padStart(2, '0')).join('');
}
function customPrintOptions() {
  const raw = uiPrefs().customPrint || {};
  return {
    checks: raw.checks !== false,
    legend: raw.legend !== false,
    color: CUSTOM_PRINT_COLORS.some(c => c[0] === raw.color) ? raw.color : 'dark',
    size: CUSTOM_PRINT_SIZES.includes(+raw.size) ? +raw.size : 10,
    table: raw.table === 'pick' ? 'pick' : (raw.table === 'stripe' ? 'stripe' : 'day'),
    color1: normHex(raw.color1, CUSTOM_PRINT_STRIPE_DEFAULT[0]),
    color2: normHex(raw.color2, CUSTOM_PRINT_STRIPE_DEFAULT[1])
  };
}
function saveCustomPrintOptions(o) {
  const p = uiPrefs();
  p.customPrint = {
    checks: o.checks !== false,
    legend: o.legend !== false,
    color: CUSTOM_PRINT_COLORS.some(c => c[0] === o.color) ? o.color : 'dark',
    size: CUSTOM_PRINT_SIZES.includes(+o.size) ? +o.size : 10,
    table: o.table === 'pick' ? 'pick' : (o.table === 'stripe' ? 'stripe' : 'day'),
    color1: normHex(o.color1, CUSTOM_PRINT_STRIPE_DEFAULT[0]),
    color2: normHex(o.color2, CUSTOM_PRINT_STRIPE_DEFAULT[1])
  };
  try { localStorage.setItem(UI_KEY, JSON.stringify(p)); } catch (e) { /* penyimpanan penuh */ }
}
function openCustomPrintModal() {
  const o = customPrintOptions();
  cprintZoomIdx = CUSTOM_PRINT_ZOOM_DEFAULT;
  openModal(
    '<h3>Cetak Tabel Mingguan</h3>' +
    '<div class="cprint-layout">' +
      '<div class="cprint-opts">' +
        '<label class="check" style="margin:0 0 8px"><input type="checkbox" id="cprintChecks"' + (o.checks ? ' checked' : '') + '> Tampilkan centang pilihan makanan</label>' +
        '<label class="check" style="margin:0 0 12px"><input type="checkbox" id="cprintLegend"' + (o.legend ? ' checked' : '') + '> Tampilkan hari, tanggal, dan makanan di atas tabel</label>' +
        '<label class="field"><span>Warna font</span><select id="cprintColor" class="input">' +
          CUSTOM_PRINT_COLORS.map(c => '<option value="' + c[0] + '"' + (o.color === c[0] ? ' selected' : '') + '>' + c[2] + '</option>').join('') +
        '</select></label>' +
        '<label class="field"><span>Ukuran font</span><select id="cprintSize" class="input">' +
          CUSTOM_PRINT_SIZES.map(s => '<option value="' + s + '"' + (o.size === s ? ' selected' : '') + '>' + s + ' px</option>').join('') +
        '</select></label>' +
        '<label class="field"><span>Warna tabel</span><select id="cprintTable" class="input">' +
          '<option value="day"' + (o.table === 'day' ? ' selected' : '') + '>Warna per hari</option>' +
          '<option value="stripe"' + (o.table === 'stripe' ? ' selected' : '') + '>Selang-seling per hari</option>' +
          '<option value="pick"' + (o.table === 'pick' ? ' selected' : '') + '>Selang-seling per pilihan</option>' +
        '</select></label>' +
        '<div class="cprint-colors" id="cprintStripeBox"' + (o.table === 'day' ? ' hidden' : '') + '>' +
          '<div class="cprint-hint muted tiny" id="cprintStripeHint">' + (o.table === 'pick' ? 'Pilihan A, B, dan C bergantian memakai Warna 1 dan Warna 2.' : 'Kolom hari bergantian memakai Warna 1 dan Warna 2.') + '</div>' +
          '<label class="field"><span>Warna 1</span><input type="color" class="input" id="cprintColor1" value="' + o.color1 + '"></label>' +
          '<label class="field"><span>Warna 2</span><input type="color" class="input" id="cprintColor2" value="' + o.color2 + '"></label>' +
        '</div>' +
      '</div>' +
      '<div class="cprint-preview-col">' +
        '<div class="cprint-zoombar">' +
          '<span class="muted tiny">Pratinjau A4</span>' +
          '<div class="cprint-zoomctl">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="cprint-zoom-out" title="Perkecil pratinjau">&minus;</button>' +
            '<span class="cprint-zoom-label" id="cprintZoomLabel">150%</span>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="cprint-zoom-in" title="Perbesar pratinjau">+</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="cprint-zoom-fit" title="Kembalikan ke ukuran pas">Pas</button>' +
          '</div>' +
        '</div>' +
        '<div class="cprint-preview" id="cprintPreviewWrap">' +
          '<div class="cprint-sizer" id="cprintSizer">' +
            '<div class="cprint-page" id="cprintPreviewPage"><iframe id="cprintPreview" title="Pratinjau tabel mingguan"></iframe></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
    '<button type="button" class="btn btn-primary" data-act="custom-print-go">Cetak</button></div>',
    true
  );
  const box = document.querySelector('#modalBackdrop .modal');
  if (box) box.classList.add('modal-print');
  setTimeout(() => {
    const frame = document.getElementById('cprintPreview');
    if (!frame) return;
    refreshCustomPrintPreview();
    ['cprintChecks', 'cprintLegend', 'cprintColor', 'cprintSize', 'cprintColor1', 'cprintColor2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', refreshCustomPrintPreview);
    });
    const tableSel = document.getElementById('cprintTable');
    if (tableSel) tableSel.addEventListener('change', () => {
      syncCustomPrintColorFields();
      refreshCustomPrintPreview();
    });
    requestAnimationFrame(fitCustomPrintPreview);
  }, 30);
}
function syncCustomPrintColorFields() {
  const tableSel = document.getElementById('cprintTable');
  const box = document.getElementById('cprintStripeBox');
  const hint = document.getElementById('cprintStripeHint');
  const mode = tableSel ? tableSel.value : 'day';
  if (box) box.hidden = mode === 'day';
  if (hint) hint.textContent = mode === 'pick'
    ? 'Pilihan A, B, dan C bergantian memakai Warna 1 dan Warna 2.'
    : 'Kolom hari bergantian memakai Warna 1 dan Warna 2.';
}
function customPrintFormOptions() {
  const checks = document.getElementById('cprintChecks');
  const legend = document.getElementById('cprintLegend');
  const color = document.getElementById('cprintColor');
  const size = document.getElementById('cprintSize');
  const tableSel = document.getElementById('cprintTable');
  const color1 = document.getElementById('cprintColor1');
  const color2 = document.getElementById('cprintColor2');
  return {
    checks: !checks || checks.checked,
    legend: !legend || legend.checked,
    color: color ? color.value : 'dark',
    size: size ? +size.value : 10,
    table: tableSel && (tableSel.value === 'stripe' || tableSel.value === 'pick') ? tableSel.value : 'day',
    color1: color1 ? color1.value : CUSTOM_PRINT_STRIPE_DEFAULT[0],
    color2: color2 ? color2.value : CUSTOM_PRINT_STRIPE_DEFAULT[1]
  };
}
function fitCustomPrintPreview() {
  const wrap = document.getElementById('cprintPreviewWrap');
  const sizer = document.getElementById('cprintSizer');
  const page = document.getElementById('cprintPreviewPage');
  if (!wrap || !sizer || !page) return;
  const avail = Math.max(200, wrap.clientWidth - 16);
  const maxH = Math.max(320, Math.min(620, window.innerHeight * 0.63));
  const baseScale = Math.min(avail / 794, maxH / 1123);
  const zoom = CUSTOM_PRINT_ZOOMS[cprintZoomIdx] || 1;
  const scale = baseScale * zoom;
  const w = 794 * scale;
  const h = 1123 * scale;
  const fitH = 1123 * baseScale;
  sizer.style.width = w + 'px';
  sizer.style.height = h + 'px';
  page.style.transform = 'scale(' + scale + ')';
  const zoomed = h > fitH + 1 || w > avail + 1;
  wrap.style.height = Math.ceil(Math.min(h, fitH) + 16) + 'px';
  wrap.style.overflow = zoomed ? 'auto' : 'hidden';
  const label = document.getElementById('cprintZoomLabel');
  if (label) label.textContent = Math.round(zoom * 100) + '%';
  const zin = document.querySelector('[data-act="cprint-zoom-in"]');
  const zout = document.querySelector('[data-act="cprint-zoom-out"]');
  if (zin) zin.disabled = cprintZoomIdx >= CUSTOM_PRINT_ZOOMS.length - 1;
  if (zout) zout.disabled = cprintZoomIdx <= 0;
}
function setCustomPrintZoom(idx) {
  cprintZoomIdx = Math.max(0, Math.min(CUSTOM_PRINT_ZOOMS.length - 1, idx));
  fitCustomPrintPreview();
  if (cprintZoomIdx === CUSTOM_PRINT_ZOOM_FIT) {
    const wrap = document.getElementById('cprintPreviewWrap');
    if (wrap) { wrap.scrollTop = 0; wrap.scrollLeft = 0; }
  }
}
function refreshCustomPrintPreview() {
  const frame = document.getElementById('cprintPreview');
  if (!frame) return;
  frame.style.visibility = 'hidden';
  frame.onload = () => {
    frame.onload = null;
    frame.style.visibility = 'visible';
    fitCustomPrintPreview();
  };
  frame.srcdoc = customWeekPrintHTML(customPrintFormOptions());
  fitCustomPrintPreview();
}
function customPrintFromModal() {
  const o = customPrintFormOptions();
  saveCustomPrintOptions(o);
  closeModal();
  printCustomWeek(o);
}
function customWeekPrintHTML(opts) {
  const opt = Object.assign(customPrintOptions(), opts || {});
  const fontColor = (CUSTOM_PRINT_COLORS.find(c => c[0] === opt.color) || CUSTOM_PRINT_COLORS[0])[1];
  const fontSize = Math.min(16, Math.max(8, +opt.size || 10));
  const showChecks = opt.checks !== false;
  const showLegend = opt.legend !== false;
  const type = customType();
  const typeLabel = type === 'snack' ? 'Snack' : 'Lunch';
  const start = state.custom.weekStart || mondayOf(todayStr());
  const range = fmtShortDate(start) + ' – ' + fmtShortDate(shiftDate(start, 6));
  const cols = customWeekCols(type);
  const customers = customCustomers();
  const tableMode = opt.table === 'pick' ? 'pick' : (opt.table === 'stripe' ? 'stripe' : 'day');
  const stripes = [
    normHex(opt.color1, CUSTOM_PRINT_STRIPE_DEFAULT[0]),
    normHex(opt.color2, CUSTOM_PRINT_STRIPE_DEFAULT[1])
  ];
  const neutral = mixHex(avgHex(stripes[0], stripes[1]), .35);
  const tints = [
    ['#cfe2f5', '#e4effa', '#f5faff'],
    ['#d4ead9', '#e8f5eb', '#f6fbf7'],
    ['#f6e3b8', '#fbf0d6', '#fffaf0'],
    ['#f6d4dd', '#fbe7ec', '#fff7f9'],
    ['#ddd3f2', '#eee8f8', '#f8f6fd'],
    ['#cfe8e6', '#e5f4f2', '#f5fbfa'],
    ['#dcdcdc', '#ececec', '#f7f7f7']
  ];
  const colTints = cols.map((col, i) => tableMode === 'stripe' ? i % 2 : (col.items.length ? col.dow : 6));
  let pickSeq = 0;
  const pickTints = cols.map((col, ci) => {
    if (!col.items.length) return [tableMode === 'pick' ? 'dn' : 'd' + colTints[ci]];
    return col.items.map(() =>
      tableMode === 'pick' ? 'd' + (pickSeq++ % 2) : 'd' + colTints[ci]);
  });
  const dayTint = ci => tableMode === 'pick' ? 'dn' : 'd' + colTints[ci];
  const tintCss = (tableMode === 'day'
    ? tints.map((t, i) =>
        'th.day.d' + i + '{background:' + t[0] + '}' +
        'th.pick.d' + i + '{background:' + t[1] + '}' +
        'td.cell.d' + i + '{background:' + t[2] + '}' +
        '.daytag.d' + i + '{background:' + t[0] + '}'
      ).join('')
    : tableMode === 'stripe'
      ? stripes.map((c, i) =>
          'th.day.d' + i + '{background:' + c + '}' +
          'th.pick.d' + i + '{background:' + mixHex(c, .5) + '}' +
          'td.cell.d' + i + '{background:' + mixHex(c, .74) + '}' +
          '.daytag.d' + i + '{background:' + c + '}'
        ).join('')
      : 'th.day.dn{background:' + neutral + '}' +
        'th.pick.dn{background:' + neutral + '}' +
        'td.cell.dn{background:' + mixHex(neutral, .55) + '}' +
        '.daytag.dn{background:' + neutral + '}' +
        stripes.map((c, i) =>
          'th.pick.d' + i + '{background:' + c + '}' +
          'td.cell.d' + i + '{background:' + mixHex(c, .74) + '}'
        ).join('')
  ) +
    'th.day{border-left:1.6px solid #555}' +
    'th.pick.first,td.cell.first{border-left:1.6px solid #555}';
  const head = cols.map((col, ci) => {
    const span = Math.max(1, col.items.length);
    return '<th class="day ' + dayTint(ci) + '" colspan="' + span + '">' + WEEKDAYS[col.dow] +
      '<span class="dt">' + col.date.slice(8) + '/' + col.date.slice(5, 7) + '</span></th>';
  }).join('');
  const pickHead = cols.map((col, ci) => {
    if (!col.items.length) return '<th class="pick ' + pickTints[ci][0] + ' first none">&ndash;</th>';
    return col.items.slice(0, LETTERS.length).map((it, k) =>
      '<th class="pick ' + pickTints[ci][k] + (k === 0 ? ' first' : '') + '">' + LETTERS[k] + '</th>').join('');
  }).join('');
  const rows = customers.map((c, i) => {
    const cells = cols.map((col, ci) => {
      const rec = (db[type][col.date] || {})[c.id];
      const ordered = !!(rec && rec.ordered);
      const leave = isOnLeave(c, col.date);
      const picks = ordered ? customPicks(type, rec).filter(k => k < col.items.length) : [];
      if (!col.items.length) return '<td class="cell ' + pickTints[ci][0] + ' first' + (leave ? ' leave' : '') + '"></td>';
      return col.items.map((it, k) => {
        const on = showChecks && picks.indexOf(k) >= 0;
        return '<td class="cell ' + pickTints[ci][k] + (k === 0 ? ' first' : '') + (on ? ' on' : '') + (leave ? ' leave' : '') + '">' + (on ? '&#10003;' : '') + '</td>';
      }).join('');
    }).join('');
    return '<tr><td class="no">' + (i + 1) + '</td><td class="nm">' + escapeHtml(c.name) +
      '</td><td class="cls">' + escapeHtml(c.className || '') + '</td>' + cells + '</tr>';
  }).join('');
  const legend = cols.map((col, ci) => {
    const menu = col.items.length
      ? col.items.slice(0, LETTERS.length).map((it, k) => {
          const pj = menuItemPkg(it);
          return '<span class="lo"><b>' + LETTERS[k] + '</b> ' + escapeHtml(shortTxt(menuLines(it.name).join(' · '), 56)) +
            (pj ? ' <i class="pk">' + escapeHtml(pj.name) + '</i>' : '') + '</span>';
        }).join(' ')
      : '<span class="none">belum ada menu</span>';
    return '<div class="lg-day"><b class="daytag ' + dayTint(ci) + '">' + WEEKDAYS[col.dow] + '</b> ' + col.date.slice(8) + '/' + col.date.slice(5, 7) + ' · ' + menu + '</div>';
  }).join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + DOC_CSP + '<style>' +
    '@page{size:A4 portrait;margin:10mm}' +
    'html{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:' + fontColor + ';font-size:' + fontSize + 'px}' +
    '@media screen{body{margin:0;padding:10mm}}' +
    'h1{font-size:' + (fontSize + 6) + 'px;margin:0 0 1.2mm;letter-spacing:.2px}' +
    '.head{text-align:center;margin-bottom:3mm}' +
    '.head .sub{font-size:' + Math.max(8, fontSize - 0.5) + 'px;color:' + fontColor + ';opacity:.72}' +
    '.legend{font-size:' + Math.max(6.5, fontSize - 2.4) + 'px;line-height:1.3;margin:0 0 2.5mm}' +
    '.legend .lg-day{margin-bottom:.7mm}' +
    '.legend b{font-weight:800}' +
    '.legend .lo{white-space:nowrap;margin-right:2mm}' +
    '.legend .pk{font-style:normal;font-weight:700;opacity:.62}' +
    '.legend .none{color:' + fontColor + ';opacity:.6;font-style:italic}' +
    '.daytag{display:inline-block;padding:0 .9mm;border-radius:1mm}' +
    'table{width:100%;border-collapse:collapse;table-layout:fixed}' +
    'thead{display:table-header-group}' +
    'tr{break-inside:avoid;page-break-inside:avoid}' +
    'th,td{border:1px solid #666;padding:1mm .5mm;vertical-align:middle}' +
    'th.no,td.no{width:7mm;text-align:center}' +
    'th.nm,td.nm{width:36mm}' +
    'th.cls,td.cls{width:11mm;text-align:center}' +
    'th.day{text-align:center;font-size:' + Math.max(7, fontSize - 2) + 'px;padding:1mm .4mm}' +
    'th.day .dt{display:block;font-size:' + Math.max(6, fontSize - 3) + 'px;font-weight:400;color:' + fontColor + ';opacity:.7}' +
    'th.pick{text-align:center;font-size:' + Math.max(7, fontSize - 1.5) + 'px;padding:.8mm .3mm}' +
    'th.pick.none{color:' + fontColor + ';opacity:.6;font-weight:400}' +
    'td.cell{text-align:center;font-size:' + Math.max(7, fontSize - 1) + 'px;font-weight:800;height:' + (fontSize * 0.6).toFixed(1) + 'mm;padding:.6mm .2mm}' +
    'td.cell.on{color:' + fontColor + '}' +
    tintCss +
    'td.cell.leave{background:#d9d9d9}' +
    '.doc-logo{display:block;margin:0 auto 2mm;max-width:50mm;object-fit:contain}' +
    '</style></head><body>' +
    '<div class="head">' + logoFor('laporan') + '<h1>' + escapeHtml(db.settings.businessName) + '</h1>' +
    '<div class="sub">Tabel Pilihan Menu Mingguan · ' + typeLabel + '</div>' +
    '<div class="sub">' + range + ' · ' + customers.length + ' anak</div></div>' +
    (showLegend ? '<div class="legend">' + legend + '</div>' : '') +
    '<table><thead><tr><th class="no" rowspan="2">No</th><th class="nm" rowspan="2">Nama</th><th class="cls" rowspan="2">Kelas</th>' + head + '</tr>' +
    '<tr>' + pickHead + '</tr></thead>' +
    '<tbody>' + (rows || '<tr><td colspan="' + (3 + cols.reduce((s, c) => s + Math.max(1, c.items.length), 0)) + '" style="text-align:center;color:#777">Tidak ada pelanggan yang cocok dengan filter.</td></tr>') + '</tbody></table>' +
    '</body></html>';
}
function printCustomWeek(opts) {
  const fr = document.getElementById('customFrame');
  if (!fr) return;
  if (!customCustomers().length) { toast('Tidak ada pelanggan untuk dicetak.'); return; }
  fr.srcdoc = customWeekPrintHTML(opts);
  setTimeout(() => printFrame(fr), 300);
}

/* ---------- Render: PO (Pre-Order) ---------- */
function renderPO() {
  const month = state.poMonth;
  setText('poMonthText', monthTitle(month));
  const filter = document.getElementById('poFilter').value;
  const procEl = document.getElementById('poProcess');
  const proc = procEl ? procEl.value : 'all';
  const q = (document.getElementById('poSearch').value || '').trim().toLowerCase();

  /* --- Menu PO --- */
  const menus = db.poMenus
    .filter(m => !month || (m.date || '').slice(0, 7) === month)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.item || '').localeCompare(b.item || ''));
  document.getElementById('poMenuList').innerHTML = menus.map(m => {
    const buyers = db.po.filter(p => p.menuId === m.id);
    const total = buyers.reduce((s, p) => s + (+p.qty * +p.price || 0), 0);
    return '<tr>' +
      '<td>' + fmtShortDate(m.date) + '</td>' +
      '<td>' + escapeHtml(m.item) + '</td>' +
      '<td class="num">' + fmtIDR(m.price) + '</td>' +
      '<td class="num">' + buyers.length + '</td>' +
      '<td class="num"><strong>' + fmtIDR(total) + '</strong></td>' +
      '<td class="end"><div class="row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-act="po-buyer-add" data-id="' + m.id + '">+ Pembeli</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="goto-menu" data-date="' + escapeHtml(m.date) + '" data-po="1" title="Buka Beranda › Menu Harian tanggal ' + escapeHtml(fmtShortDate(m.date)) + ' untuk menuliskan menu ini">Beranda</button>' +
        '<button class="icon-act" data-act="po-menu-edit" data-id="' + m.id + '" title="Ubah menu">' + ICO_EDIT + '</button>' +
        '<button class="icon-act danger" data-act="po-menu-delete" data-id="' + m.id + '" title="Hapus menu">' + ICO_TRASH + '</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
  document.getElementById('poMenuEmpty').hidden = menus.length > 0;
  document.getElementById('poMenuCount').textContent = menus.length + ' menu';
  const homeBtn = document.getElementById('poMenuHome');
  if (homeBtn) {
    const t = todayStr();
    const d = menus.map(m => m.date).filter(x => x >= t).sort()[0] ||
      (state.poMonth === monthKey(t) ? t : state.poMonth + '-01');
    homeBtn.dataset.date = d;
    homeBtn.title = 'Buka Beranda › Menu Harian ' + fmtShortDate(d) + ' dan siapkan baris menu PO';
  }

  /* --- Pembeli PO --- */
  const monthList = db.po.filter(p => month ? (p.date || '').slice(0, 7) === month : true);
  let list = monthList.slice();
  if (filter === 'paid') list = list.filter(p => p.paid);
  else if (filter === 'unpaid') list = list.filter(p => !p.paid);
  if (proc === 'belum') list = list.filter(p => !p.status);
  else if (proc === 'siap') list = list.filter(p => p.status === 'siap');
  else if (proc === 'kirim') list = list.filter(p => p.status === 'kirim');
  if (q) list = list.filter(p => ((p.name || '') + ' ' + (p.item || '')).toLowerCase().includes(q));
  list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.name || '').localeCompare(b.name || ''));

  const totalNilai = monthList.reduce((s, p) => s + (+p.qty * +p.price || 0), 0);
  const totalLunas = monthList.filter(p => p.paid).reduce((s, p) => s + (+p.qty * +p.price || 0), 0);
  const nSiap = monthList.filter(p => p.status === 'siap').length;
  const nKirim = monthList.filter(p => p.status === 'kirim').length;
  const nQty = monthList.reduce((s, p) => s + (+p.qty || 0), 0);

  const nGroups = poGroups();
  document.getElementById('poStats').innerHTML =
    statCard('Jumlah Pembeli', monthList.length, month ? ('bulan ' + month) : 'semua') +
    statCard('Total Porsi', nQty, 'dipesan') +
    statCard('Kelompok', nGroups.length, nGroups.length ? (nGroups.reduce((s, g) => s + g.qty, 0) + ' porsi') : 'lembaga / organisasi') +
    statCard('Nilai PO', fmtIDR(totalNilai), '', 'primary') +
    statCard('Lunas', fmtIDR(totalLunas), '', 'accent') +
    statCard('Belum Lunas', fmtIDR(totalNilai - totalLunas), '', 'danger') +
    statCard('Siap / Dikirim', nSiap + ' / ' + nKirim, 'status proses');

  document.getElementById('poList').innerHTML = list.map(p =>
    '<tr>' +
      '<td>' + fmtShortDate(p.date) + '</td>' +
      '<td>' + escapeHtml(p.name) + '</td>' +
      '<td>' + escapeHtml(p.item) + '</td>' +
      '<td class="num">' + p.qty + '</td>' +
      '<td class="num">' + fmtIDR(p.price) + '</td>' +
      '<td class="num"><strong>' + fmtIDR((+p.qty * +p.price) || 0) + '</strong></td>' +
      '<td class="c"><button class="badge ' + (p.method === 'Gratis' ? 'gold' : (p.paid ? 'green' : 'red')) + '" data-act="po-toggle-paid" data-id="' + p.id + '">' + (p.method === 'Gratis' ? 'Gratis' : (p.paid ? 'Lunas' : 'Belum')) + '</button></td>' +
      '<td class="c"><button class="badge ' + poStatusClass(p) + '" data-act="po-toggle-status" data-id="' + p.id + '" title="Klik untuk ubah status ambil">' + poStatusLabel(p) + '</button></td>' +
      '<td class="end"><div class="row-actions">' +
        '<button class="icon-act" data-act="po-resi" data-id="' + p.id + '" title="Cetak resi pembeli ini">' + ICO_PRINT + '</button>' +
        '<button class="icon-act" data-act="po-edit" data-id="' + p.id + '" title="Ubah">' + ICO_EDIT + '</button>' +
        '<button class="icon-act danger" data-act="po-delete" data-id="' + p.id + '" title="Hapus">' + ICO_TRASH + '</button>' +
      '</div></td>' +
    '</tr>'
  ).join('');
  document.getElementById('poEmpty').hidden = list.length > 0;
  document.getElementById('poCount').textContent = list.length + ' ditampilkan • ' + nQty + ' porsi bulan ini';
  renderPoGroups();

  /* --- Grafik nilai PO per bulan (12 bulan terakhir), lalu per tahun --- */
  const m12 = lastMonths(12);
  const poM = poByMonth();
  drawBar(document.getElementById('chartPOMonth'),
    m12.map(d => MONTHS_ID[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2)),
    m12.map(d => poM[toMonthKey(d)] || 0), { color: '#1F9D74' });

  const curY = new Date().getFullYear();
  const years = [];
  for (let i = 4; i >= 0; i--) years.push(curY - i);
  const poMap = poByYear();
  drawBar(document.getElementById('chartPO'),
    years.map(String),
    years.map(y => poMap[y] || 0), { color: '#C0272D' });
}

function poStatusLabel(p) { return p.status === 'siap' ? 'Siap diambil' : p.status === 'kirim' ? 'Dikirim' : 'Belum siap'; }
function poStatusClass(p) { return p.status === 'siap' ? 'gold' : p.status === 'kirim' ? 'green' : 'orange'; }
function poNextStatus(p) { p.status = p.status === '' ? 'siap' : p.status === 'siap' ? 'kirim' : ''; }
function poResiBoxHTML(p, i) {
  const total = (+p.qty * +p.price) || 0;
  return '<div class="lbl">' +
    '<div class="lbl-top">' + (i == null ? '' : (i + 1) + ' · ') + escapeHtml(fmtShortDate(p.date)) + '</div>' +
    '<div class="lbl-item">' + escapeHtml(p.item) + '</div>' +
    '<div class="lbl-qty">× ' + (+p.qty || 0) + '</div>' +
    '<div class="lbl-name">' + escapeHtml(p.name) + '</div>' +
    '<div class="lbl-meta">' + escapeHtml(p.method === 'Gratis' ? 'GRATIS' : (p.paid ? 'Lunas' : 'Belum bayar')) + ' · ' + fmtIDR(total) +
      ' · ' + escapeHtml(poStatusLabel(p)) + '</div>' +
    (p.note ? '<div class="lbl-note">' + escapeHtml(p.note) + '</div>' : '') +
  '</div>';
}
function printPoDoc(html) {
  const f = document.getElementById('poFrame');
  if (!f) { toast('Pratinjau cetak tidak ditemukan'); return; }
  f.srcdoc = html;
  setTimeout(() => printFrame(f), 320);
}
function buildPoResiHTML(p) {
  const total = (+p.qty * +p.price) || 0;
  return printableDoc('Resi Pre-Order', fmtShortDate(p.date) + ' · ' + p.item,
    poResiBoxHTML(p, null) +
    '<h4>Rincian pesanan</h4>' +
    '<table><tbody>' +
      '<tr><th>Nama</th><td>' + escapeHtml(p.name) + '</td></tr>' +
      '<tr><th>Menu</th><td>' + escapeHtml(p.item) + '</td></tr>' +
      '<tr><th>Tanggal ambil</th><td>' + fmtLong(p.date) + '</td></tr>' +
      '<tr><th>Jumlah</th><td>' + (+p.qty || 0) + ' × ' + fmtIDR(p.price) + '</td></tr>' +
      '<tr><th>Metode</th><td>' + escapeHtml(p.method || '—') + '</td></tr>' +
      '<tr><th>Pembayaran</th><td>' + (p.method === 'Gratis' ? 'GRATIS (kompensasi)' : (p.paid ? 'Lunas' : 'Belum dibayar')) + '</td></tr>' +
      '<tr><th>Status ambil</th><td>' + escapeHtml(poStatusLabel(p)) + '</td></tr>' +
      (p.note ? '<tr><th>Catatan</th><td>' + escapeHtml(p.note) + '</td></tr>' : '') +
      '<tr><th>Total</th><td class="r"><strong>' + fmtIDR(total) + '</strong></td></tr>' +
    '</tbody></table>' +
    '<div class="sign"><div class="col">Penerima<div class="line">( ___________________ )</div></div><div class="col">' +
      escapeHtml(db.settings.businessName) + '<div class="line">( ___________________ )</div></div></div>', 'invoice');
}
function buildPoMonthHTML(month) {
  const list = db.po.filter(p => !month || monthKey(p.date) === month)
    .slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.name || '').localeCompare(b.name || ''));
  const need = {};
  list.forEach(p => {
    const k = p.date + '|' + p.item;
    const n = need[k] || (need[k] = { date: p.date, item: p.item, qty: 0, nilai: 0, orang: 0 });
    n.qty += +p.qty || 0; n.nilai += (+p.qty * +p.price) || 0; n.orang++;
  });
  const needRows = Object.values(need).sort((a, b) => a.date.localeCompare(b.date)).map(n =>
    '<tr><td>' + fmtShortDate(n.date) + '</td><td>' + escapeHtml(n.item) + '</td><td class="r">' + n.qty + '</td><td class="r">' + n.orang + '</td><td class="r">' + fmtIDR(n.nilai) + '</td></tr>').join('');
  const buyRows = list.map(p =>
    '<tr><td>' + fmtShortDate(p.date) + '</td><td>' + escapeHtml(p.name) + '</td><td>' + escapeHtml(p.item) + '</td>' +
    '<td class="r">' + (+p.qty || 0) + '</td><td class="r">' + fmtIDR((+p.qty * +p.price) || 0) + '</td>' +
    '<td class="c">' + (p.method === 'Gratis' ? 'GRATIS' : (p.paid ? 'lunas' : 'BELUM')) + '</td>' +
    '<td class="c">' + escapeHtml(poStatusLabel(p)) + '</td></tr>').join('');
  const totQty = list.reduce((s, p) => s + (+p.qty || 0), 0);
  const totNilai = list.reduce((s, p) => s + ((+p.qty * +p.price) || 0), 0);
  const totBelum = list.filter(p => !p.paid && p.method !== 'Gratis').reduce((s, p) => s + ((+p.qty * +p.price) || 0), 0);
  return printableDoc('Rekap Pre-Order', month ? monthTitle(month) : 'Semua waktu',
    '<h4>Kebutuhan produksi</h4>' +
    '<table><thead><tr><th>Tanggal</th><th>Menu</th><th class="r">Porsi</th><th class="r">Pembeli</th><th class="r">Nilai</th></tr></thead>' +
    '<tbody>' + (needRows || '<tr><td colspan="5" class="c">Belum ada PO pada periode ini.</td></tr>') + '</tbody></table>' +
    '<h4>Daftar pembeli</h4>' +
    '<table><thead><tr><th>Tanggal</th><th>Nama</th><th>Menu</th><th class="r">Jumlah</th><th class="r">Nilai</th><th class="c">Lunas</th><th class="c">Status ambil</th></tr></thead>' +
    '<tbody>' + (buyRows || '<tr><td colspan="7" class="c">Belum ada PO pada periode ini.</td></tr>') + '</tbody>' +
    '<tfoot><tr><td colspan="3">Total</td><td class="r">' + totQty + '</td><td class="r">' + fmtIDR(totNilai) + '</td><td class="c" colspan="2">Belum dibayar: ' + fmtIDR(totBelum) + '</td></tr></tfoot></table>', 'invoice');
}

function openPoMenuModal(menu) {
  const isEdit = !!menu;
  const m = menu || { date: state.currentDate, item: '', price: 0, note: '' };
  openModal(
    '<h3>' + (isEdit ? 'Ubah' : 'Tambah') + ' Menu PO</h3>' +
    '<form id="poMenuForm">' +
      '<label class="field"><span>Tanggal</span><input type="date" name="date" class="input" value="' + m.date + '" required></label>' +
      '<label class="field"><span>Menu / item</span><input type="text" name="item" class="input" value="' + escapeHtml(m.item) + '" required></label>' +
      '<label class="field"><span>Harga satuan (Rp)</span><input type="number" name="price" class="input" min="0" value="' + m.price + '" required></label>' +
      '<label class="field"><span>Catatan</span><input type="text" name="note" class="input" value="' + escapeHtml(m.note || '') + '"></label>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
        '<button type="submit" class="btn btn-primary">Simpan</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('poMenuForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      date: f.get('date'), item: f.get('item').trim(),
      price: +f.get('price') || 0, note: (f.get('note') || '').trim()
    };
    if (isEdit) {
      Object.assign(menu, data);
      db.po.forEach(p => {
        if (p.menuId === menu.id) { p.date = data.date; p.item = data.item; if (p.method !== 'Gratis') p.price = data.price; }
      });
      logAction('po', 'Ubah menu PO ' + data.item + ' @ ' + data.date);
    } else {
      data.id = uid(); db.poMenus.push(data);
      logAction('po', 'Tambah menu PO ' + data.item + ' @ ' + data.date);
    }
    save(); closeModal(); renderPO(); toast(isEdit ? 'Menu PO diperbarui' : 'Menu PO ditambahkan');
  });
}

function openPoBuyerModal(menu, po) {
  const isEdit = !!po;
  const m = po || { name: '', qty: 1, method: '', paid: false, note: '' };
  openModal(
    '<h3>' + (isEdit ? 'Ubah' : 'Tambah') + ' Pembeli PO</h3>' +
    '<div class="po-menu-info">' +
      '<div><span class="po-info-label">Menu</span><strong>' + escapeHtml(menu.item) + '</strong></div>' +
      '<div><span class="po-info-label">Tanggal</span><strong>' + fmtShortDate(menu.date) + '</strong></div>' +
      '<div><span class="po-info-label">Harga</span><strong>' + fmtIDR(menu.price) + '</strong></div>' +
    '</div>' +
    '<form id="poBuyerForm">' +
      '<label class="field"><span>Nama pelanggan</span><input type="text" name="name" class="input" value="' + escapeHtml(m.name) + '" required></label>' +
      '<label class="field"><span>Jumlah</span><input type="number" name="qty" class="input" min="1" value="' + m.qty + '" required></label>' +
      '<label class="field"><span>Metode pembayaran</span><select name="method" class="input"><option value="">—</option>' +
        db.settings.paymentMethods.map(mm => '<option value="' + escapeHtml(mm) + '"' + (m.method === mm ? ' selected' : '') + '>' + escapeHtml(mm) + '</option>').join('') +
      '</select></label>' +
      '<label class="check"><input type="checkbox" name="paid" ' + (m.paid ? 'checked' : '') + '> Sudah lunas</label>' +
      '<label class="field"><span>Status proses</span><select name="status" class="input">' +
        ['', 'siap', 'kirim'].map(v => '<option value="' + v + '"' + ((m.status || '') === v ? ' selected' : '') + '>' +
          (v === '' ? 'Belum diproses' : v === 'siap' ? 'Siap diambil' : 'Sudah dikirim') + '</option>').join('') +
      '</select></label>' +
      '<label class="field"><span>Catatan</span><input type="text" name="note" class="input" value="' + escapeHtml(m.note || '') + '"></label>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
        '<button type="submit" class="btn btn-primary">Simpan</button>' +
      '</div>' +
    '</form>'
  );
  const methodSel = document.querySelector('#poBuyerForm [name="method"]');
  const paidInput = document.querySelector('#poBuyerForm [name="paid"]');
  function syncFree() {
    const free = methodSel.value === 'Gratis';
    if (free) { paidInput.checked = true; paidInput.disabled = true; } else paidInput.disabled = false;
  }
  methodSel.addEventListener('change', syncFree);
  syncFree();

  document.getElementById('poBuyerForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const method = f.get('method');
    const data = {
      menuId: menu.id, date: menu.date, item: menu.item,
      name: f.get('name').trim(), qty: +f.get('qty') || 1,
      price: method === 'Gratis' ? 0 : (+menu.price || 0),
      method: method, paid: method === 'Gratis' ? true : !!f.get('paid'),
      status: f.get('status') === 'siap' || f.get('status') === 'kirim' ? f.get('status') : '',
      note: (f.get('note') || '').trim()
    };
    if (isEdit) { Object.assign(po, data); logAction('po', 'Ubah pembeli PO ' + data.name + ' · ' + data.item); }
    else { data.id = uid(); db.po.push(data); logAction('po', 'Tambah pembeli PO ' + data.name + ' · ' + data.item); }
    save(); closeModal(); renderPO(); toast(isEdit ? 'Pembeli diperbarui' : 'Pembeli ditambahkan');
  });
}

function openPoModal(po) {
  const isEdit = !!po;
  const m = po || { date: state.currentDate, name: '', item: '', qty: 1, price: 0, method: '', paid: false, note: '' };
  openModal(
    '<h3>' + (isEdit ? 'Ubah' : 'Tambah') + ' Pre-Order</h3>' +
    '<form id="poForm">' +
      '<label class="field"><span>Tanggal</span><input type="date" name="date" class="input" value="' + m.date + '" required></label>' +
      '<label class="field"><span>Nama pelanggan</span><input type="text" name="name" class="input" value="' + escapeHtml(m.name) + '" required></label>' +
      '<label class="field"><span>Menu / item</span><input type="text" name="item" class="input" value="' + escapeHtml(m.item) + '" required></label>' +
      '<div style="display:flex;gap:10px">' +
        '<label class="field" style="flex:1"><span>Jumlah</span><input type="number" name="qty" class="input" min="1" value="' + m.qty + '" required></label>' +
        '<label class="field" style="flex:1"><span>Harga satuan (Rp)</span><input type="number" name="price" class="input" min="0" value="' + m.price + '" required></label>' +
      '</div>' +
      '<label class="field"><span>Metode pembayaran</span><select name="method" class="input"><option value="">—</option>' +
        db.settings.paymentMethods.map(mm => '<option value="' + escapeHtml(mm) + '"' + (m.method === mm ? ' selected' : '') + '>' + escapeHtml(mm) + '</option>').join('') +
      '</select></label>' +
      '<label class="check"><input type="checkbox" name="paid" ' + (m.paid ? 'checked' : '') + '> Sudah lunas</label>' +
      '<label class="field"><span>Catatan</span><input type="text" name="note" class="input" value="' + escapeHtml(m.note) + '"></label>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
        '<button type="submit" class="btn btn-primary">Simpan</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('poForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      date: f.get('date'), name: f.get('name').trim(), item: f.get('item').trim(),
      qty: +f.get('qty') || 1, price: +f.get('price') || 0,
      method: f.get('method'), paid: !!f.get('paid'), note: (f.get('note') || '').trim()
    };
    if (data.method === 'Gratis') { data.price = 0; data.paid = true; }
    if (isEdit) { Object.assign(po, data); logAction('po', 'Ubah PO ' + data.name + ' · ' + data.item); }
    else { data.id = uid(); db.po.push(data); logAction('po', 'Tambah PO ' + data.name + ' · ' + data.item); }
    save(); closeModal(); renderPO(); toast(isEdit ? 'PO diperbarui' : 'PO ditambahkan');
  });
  const methodSel = document.querySelector('#poForm [name="method"]');
  const priceInput = document.querySelector('#poForm [name="price"]');
  const paidInput = document.querySelector('#poForm [name="paid"]');
  function syncFree() {
    const free = methodSel.value === 'Gratis';
    if (free) { priceInput.value = '0'; priceInput.disabled = true; paidInput.checked = true; paidInput.disabled = true; }
    else { priceInput.disabled = false; paidInput.disabled = false; }
  }
  methodSel.addEventListener('change', syncFree);
  syncFree();
}

/* ---------- Pesanan kelompok (lembaga / organisasi) ---------- */
function poGroups() {
  const map = {};
  db.po.forEach(p => {
    if (!p.groupId) return;
    if (!map[p.groupId]) map[p.groupId] = {
      id: p.groupId, org: p.org || p.name, pic: p.pic || '', contact: p.contact || '',
      item: p.item, unit: +p.price || 0, note: p.note || '', due: p.due || '', invNo: p.invNo || '',
      rows: [], dates: [], qty: 0, nilai: 0, bayar: 0, belum: 0
    };
    const g = map[p.groupId];
    g.rows.push(p);
    if (g.dates.indexOf(p.date) < 0) g.dates.push(p.date);
    const v = (+p.qty * +p.price) || 0;
    g.qty += +p.qty || 0; g.nilai += v;
    if (p.paid || p.method === 'Gratis') g.bayar += v;
    if (!p.status) g.belum++;
  });
  return Object.values(map).map(g => {
    g.rows.sort((a, b) => a.date.localeCompare(b.date));
    g.dates.sort();
    g.sisa = g.nilai - g.bayar;
    return g;
  }).sort((a, b) => b.dates[0].localeCompare(a.dates[0]) || a.org.localeCompare(b.org));
}
function renderPoGroups() {
  const el = document.getElementById('poGroupList');
  if (!el) return;
  const gs = poGroups();
  const today = todayStr();
  el.innerHTML = gs.map(g => {
    const late = g.due && g.sisa > 0 && g.due < today;
    return '<tr>' +
      '<td><strong>' + escapeHtml(g.org) + '</strong>' +
        (g.pic ? '<div class="muted tiny">PIC: ' + escapeHtml(g.pic) + (g.contact ? ' · ' + escapeHtml(g.contact) : '') + '</div>' : '') +
        '<div class="muted tiny">' + escapeHtml(g.item) + ' · ' + fmtIDR(g.unit) + ' / porsi' + (g.note ? ' · ' + escapeHtml(g.note) : '') + '</div>' +
        (g.due ? '<div class="muted tiny">' + (late ? '<span class="danger-text">terlambat ' : 'jatuh tempo ') + fmtShortDate(g.due) + '</span>' : '') +
        (g.invNo ? '<div class="muted tiny">no. ' + escapeHtml(g.invNo) + '</div>' : '') + '</td>' +
      '<td class="small">' + g.dates.map(d => '<div class="po-gd-date">' + fmtShortDate(d) + ' <span class="muted tiny">· ' +
        (g.rows.filter(p => p.date === d).reduce((s, p) => s + (+p.qty || 0), 0)) + ' porsi</span></div>').join('') + '</td>' +
      '<td class="num">' + g.qty + '</td>' +
      '<td class="num">' + fmtIDR(g.nilai) + (g.bayar > 0 && g.bayar < g.nilai ? '<div class="muted tiny">barunya ' + fmtIDR(g.bayar) + '</div>' : '') + '</td>' +
      '<td class="c"><button class="badge ' + (g.sisa > 0 ? 'red' : 'green') + '" data-act="po-group-paid" data-id="' + g.id + '" title="' +
        (g.sisa > 0 ? 'Tandai lunas · sisa ' + fmtIDR(g.sisa) : 'Batalkan penandaan lunas') + '">' +
        (g.sisa > 0 ? 'Belum' : 'Lunas') + '</button>' +
        (g.sisa > 0 ? '<div class="muted tiny danger-text po-gd-sisa">sisa ' + fmtIDR(g.sisa) + '</div>' : '') + '</td>' +
      '<td class="end"><div class="row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-act="po-group-invoice" data-id="' + g.id + '">Invoice</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="po-group-detail" data-id="' + g.id + '">Detail</button>' +
        '<button class="icon-act" data-act="po-group-edit" data-id="' + g.id + '" title="Ubah">' + ICO_EDIT + '</button>' +
        '<button class="icon-act danger" data-act="po-group-del" data-id="' + g.id + '" title="Hapus">' + ICO_TRASH + '</button>' +
        '<button class="icon-act bell" data-act="rem-prefill" data-id="' + g.id + '" title="Buat pengingat tagihan kelompok ini">' + ICO_BELL + '</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
  const empty = document.getElementById('poGroupEmpty');
  if (empty) empty.hidden = gs.length > 0;
  setText('poGroupCount', gs.length ? gs.length + ' kelompok · ' + gs.reduce((s, g) => s + g.qty, 0) + ' porsi · semua periode' : '');
}
function openPoGroupDetail(id) {
  const g = poGroups().find(x => x.id === id);
  if (!g) return;
  const rows = g.rows.map(p =>
    '<tr>' +
      '<td>' + fmtShortDate(p.date) + ' <span class="muted tiny">' + WEEKDAYS[weekdayOf(p.date) - 1] + '</span></td>' +
      '<td class="num">' + (+p.qty || 0) + '</td>' +
      '<td class="num">' + fmtIDR((+p.qty * +p.price) || 0) + '</td>' +
      '<td class="c"><span class="badge ' + (p.method === 'Gratis' ? 'gold' : (p.paid ? 'green' : 'red')) + '">' + (p.method === 'Gratis' ? 'Gratis' : (p.paid ? 'Lunas' : 'Belum')) + '</span></td>' +
      '<td class="c"><span class="badge ' + poStatusClass(p) + '">' + poStatusLabel(p) + '</span></td>' +
    '</tr>').join('');
  const late = g.due && g.sisa > 0 && g.due < todayStr();
  openModal(
    '<h3>' + escapeHtml(g.org) + '</h3>' +
    '<p class="muted small">' + (g.pic ? ('PIC: ' + escapeHtml(g.pic) + (g.contact ? ' · ' + escapeHtml(g.contact) : '') + ' · ') : '') +
      escapeHtml(g.item) + ' · ' + fmtIDR(g.unit) + ' / porsi' + (g.note ? ' · ' + escapeHtml(g.note) : '') +
      (g.invNo ? '<div class="muted tiny">nomor invoice ' + escapeHtml(g.invNo) + ' · ' : '') +
      (g.due ? '<br>Jatuh tempo ' + escapeHtml(fmtLong(g.due)) + (late ? ' · <span class="danger-text">sudah lewat, sisa masih ' + fmtIDR(g.sisa) + '</span>' : '') : '') + '</p>' +
    '<div class="table-wrap"><table class="table">' +
      '<thead><tr><th>Tanggal ambil</th><th class="num">Porsi</th><th class="num">Nilai</th><th class="c">Lunas</th><th class="c">Status</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
    '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin:16px 0 0">' +
      statCard('Nilai', fmtIDR(g.nilai), '', 'primary') +
      statCard('Dibayar', fmtIDR(g.bayar), '', 'accent') +
      statCard('Sisa', fmtIDR(g.sisa), '', 'danger') +
    '</div>' +
    '<div class="modal-actions">' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close">Tutup</button>' +
      '<button type="button" class="btn btn-ghost" data-act="po-group-invoice" data-id="' + g.id + '">Foto Invoice</button>' +
      '<button type="button" class="btn btn-accent" data-act="po-group-invoice-pdf" data-id="' + g.id + '">Cetak / Simpan PDF</button>' +
    '</div>'
  );
}
/* Nomor invoice terbit sekali dan dipakai ulang oleh semua baris kelompok yang sama */
function ensureInvoiceNo(g) {
  if (g.invNo) return g.invNo;
  const first = g.dates[0] || todayStr();
  db.settings.invSeq = (+db.settings.invSeq || 0) + 1;
  const no = 'INV/' + first.slice(0, 4) + '/' + first.slice(5, 7) + '/' + String(db.settings.invSeq).padStart(3, '0');
  db.po.forEach(p => { if (p.groupId === g.id) p.invNo = no; });
  logAction('invoice', 'Terbitkan ' + no + ' untuk ' + g.org);
  save();
  g.invNo = no;
  return no;
}
function poGroupInvoicePrint(id) {
  const g = poGroups().find(x => x.id === id);
  if (!g) { toast('Pesanan kelompok tidak ditemukan'); return; }
  const no = ensureInvoiceNo(g);
  const bank = bankText();
  const rows = g.rows.map((p, i) =>
    '<tr><td class="no">' + (i + 1) + '</td><td>' + fmtLong(p.date) + '</td><td class="c">' + (+p.qty || 0) + '</td>' +
    '<td class="r">' + fmtIDR(p.price) + '</td><td class="r">' + fmtIDR((+p.qty * +p.price) || 0) + '</td>' +
    '<td class="c">' + (p.method === 'Gratis' ? 'GRATIS' : p.paid ? 'LUNAS' : 'BELUM') + '</td></tr>').join('');
  const inner =
    '<table><tbody>' +
      '<tr><th>Ditagihkan kepada</th><td>' + escapeHtml(g.org) + '</td><th>PIC</th><td>' + escapeHtml(g.pic || '—') + '</td></tr>' +
      '<tr><th>No. HP / WA</th><td>' + escapeHtml(g.contact || '—') + '</td><th>Jatuh tempo</th><td>' + (g.due ? escapeHtml(fmtLong(g.due)) : 'belum diatur') + '</td></tr>' +
      '<tr><th>Menu</th><td colspan="3">' + escapeHtml(g.item) + ' · ' + fmtIDR(g.unit) + ' / porsi' + (g.note ? ' · ' + escapeHtml(g.note) : '') + '</td></tr>' +
    '</tbody></table>' +
    '<h4>Rincian tanggal ambil</h4>' +
    '<table><thead><tr><th class="no">No</th><th>Tanggal ambil</th><th class="c">Porsi</th><th class="r">Harga</th><th class="r">Jumlah</th><th class="c">Lunas</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr><td colspan="2">TOTAL</td><td class="c">' + g.qty + '</td><td></td><td class="r">' + fmtIDR(g.nilai) + '</td><td></td></tr></tfoot></table>' +
    '<h4>Ringkasan pembayaran</h4>' +
    '<table><tbody>' +
      '<tr><th>Nilai pesanan</th><td class="r">' + fmtIDR(g.nilai) + '</td></tr>' +
      '<tr><th>Dibayar / uang muka</th><td class="r">' + fmtIDR(g.bayar) + '</td></tr>' +
      '<tr><th>Sisa tagihan</th><td class="r"><strong>' + fmtIDR(g.sisa) + '</strong></td></tr>' +
      (bank ? '<tr><th>Transfer ke</th><td>' + escapeHtml(bank) + ', cantumkan nomor ' + escapeHtml(no) + '</td></tr>' : '') +
    '</tbody></table>' +
    '<div class="sign"><div class="col">Petugas<div class="line">( ___________________ )</div></div><div class="col">' +
      escapeHtml(db.settings.businessName) + '<div class="line">( ___________________ )</div></div></div>';
  printPoDoc(printableDoc('Invoice ' + no, 'Diterbitkan ' + fmtLong(todayStr()), inner, 'invoice'));
}
function poGroupInvoiceImage(id) {
  const g = poGroups().find(x => x.id === id);
  if (!g) { toast('Pesanan kelompok tidak ditemukan'); return; }
  const dark = document.body.classList.contains('theme-dark');
  const th = dark
    ? { bg: '#12141D', panel: '#171A25', text: '#E9ECFF', muted: '#8A90A8', danger: '#FF6B74', ok: '#38D39F', line: 'rgba(255,255,255,.10)', strip: ['#FF4D5A', '#FF3D8B'] }
    : { bg: '#FFFFFF', panel: '#F6F7FD', text: '#1A1D2B', muted: '#6F7590', danger: '#C4342B', ok: '#137B59', line: '#E6E8F2', strip: ['#D8262F', '#FF3D6E'] };
  const W = 620, pad = 26, scale = 2, rowH = 26;
  const bank = [db.settings.bankName, db.settings.bankNumber].filter(Boolean).join('  ');
  const holder = db.settings.bankHolder || db.settings.businessName;
  const headH = 156, sumH = 118;
  /* tinggi kanvas dihitung dari alur gambar yang sama, tidak ada ruang kosong di bawah ringkasan */
  const bodyY = headH + 24 + 16 + (g.note ? 12 : 0) + 12 + 7 + 17 + g.rows.length * rowH + 2 + 16 + 12 + 18 + 22 + 2 + 26;
  const payY = bodyY + 28;
  const h = payY + (bank ? 46 : 0) + 26;
  const cv = document.createElement('canvas');
  cv.width = W * scale; cv.height = h * scale;
  const c = cv.getContext('2d');
  c.scale(scale, scale);
  c.fillStyle = th.bg; c.fillRect(0, 0, W, h);
  const grad = c.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, th.strip[0]); grad.addColorStop(1, th.strip[1]);
  c.fillStyle = grad; c.fillRect(0, 0, W, 6);

  const no = ensureInvoiceNo(g);
  /* logo digambar di depan nama usaha; gambar sudah dimuat sebelumnya lewat loadLogoImage() */
  let nameX = pad;
  if (printLogoOn('invoice') && state.logoImg && state.logoImg.complete && state.logoImg.naturalWidth) {
    const lh = 34, lw = Math.min(76, lh * (state.logoImg.naturalWidth / state.logoImg.naturalHeight));
    c.save();
    c.drawImage(state.logoImg, pad, 20, lw, lh);
    c.restore();
    nameX = pad + lw + 12;
  }
  c.textAlign = 'left'; c.fillStyle = th.text; c.font = '800 21px Segoe UI, sans-serif';
  c.fillText(clipText(c, db.settings.businessName, W - nameX - 170), nameX, 44);
  if (db.settings.tagline) { c.fillStyle = th.muted; c.font = '11.5px Segoe UI, sans-serif'; c.fillText(clipText(c, db.settings.tagline, W - nameX - 170), nameX, 63); }
  c.textAlign = 'right';
  c.fillStyle = th.strip[0]; c.font = '800 17px Segoe UI, sans-serif';
  c.fillText('INVOICE', W - pad, 40);
  c.fillStyle = th.muted; c.font = '700 11.5px Segoe UI, sans-serif';
  c.fillText(no, W - pad, 58);
  c.font = '10.5px Segoe UI, sans-serif';
  c.fillText('Diterbitkan ' + fmtLong(todayStr()), W - pad, 74);
  c.textAlign = 'left';
  c.strokeStyle = th.line; c.beginPath(); c.moveTo(pad, 96); c.lineTo(W - pad, 96); c.stroke();

  roundRect(c, pad, 106, W - pad * 2, 50, 8);
  c.fillStyle = th.panel; c.fill();
  c.fillStyle = th.muted; c.font = '700 9.5px Segoe UI, sans-serif';
  c.fillText('DITAGIHKAN KEPADA', pad + 12, 121);
  c.fillStyle = th.text; c.font = '800 14px Segoe UI, sans-serif';
  c.fillText(clipText(c, g.org, W - pad * 2 - 220), pad + 12, 138);
  const pic = (g.pic ? 'PIC: ' + g.pic : '') + (g.pic && g.contact ? ' · ' : '') + (g.contact || '');
  c.fillStyle = th.muted; c.font = '11px Segoe UI, sans-serif';
  c.fillText(clipText(c, pic || 'PIC belum diisi', 250), pad + 12, 151);
  c.textAlign = 'right';
  c.fillStyle = th.muted; c.font = '700 9.5px Segoe UI, sans-serif';
  c.fillText('JATUH TEMPO', W - pad - 12, 121);
  const late = !!g.due && g.sisa > 0 && g.due < todayStr();
  c.fillStyle = g.due ? (late ? th.danger : th.text) : th.muted;
  c.font = '800 13px Segoe UI, sans-serif';
  c.fillText(clipText(c, g.due ? fmtShortDate(g.due) : 'belum diatur', 200), W - pad - 12, 138);
  if (late) { c.font = '700 9.5px Segoe UI, sans-serif'; c.fillStyle = th.danger; c.fillText('SUDAH LEWAT', W - pad - 12, 151); }
  c.textAlign = 'left';

  /* kolom tabel dihitung dari isi terlebar: tidak ada lubang besar sebelum STATUS, tidak ada yang bertabrakan */
  const statusOf = p => (p.method === 'Gratis' ? 'GRATIS' : (p.paid ? 'LUNAS' : 'BELUM')) +
    (p.status === 'kirim' ? ' · dikirim' : p.status === 'siap' ? ' · siap' : '');
  c.font = '700 11px Segoe UI, sans-serif';
  const statusW = g.rows.reduce((m, p) => Math.max(m, c.measureText(statusOf(p)).width), 0);
  const colStat = W - pad, colJumlah = colStat - statusW - 18, colHarga = colJumlah - 88, colPorsi = colHarga - 66;
  let y = headH + 24;
  c.fillStyle = th.text; c.font = '800 13px Segoe UI, sans-serif';
  c.fillText(clipText(c, g.item, W - pad * 2), pad, y);
  c.fillStyle = th.muted; c.font = '11.5px Segoe UI, sans-serif';
  c.textAlign = 'right';
  c.fillText(fmtIDR(g.unit) + ' per porsi', colStat, y);
  c.textAlign = 'left';
  y += 16;
  if (g.note) { c.fillStyle = th.muted; c.font = 'italic 11px Segoe UI, sans-serif'; c.fillText(clipText(c, 'Catatan: ' + g.note, W - pad * 2), pad, y); y += 12; }
  y += 12;

  c.font = '700 9.5px Segoe UI, sans-serif'; c.fillStyle = th.muted;
  c.fillText('TANGGAL AMBIL', pad, y);
  c.textAlign = 'right';
  c.fillText('PORSI', colPorsi, y); c.fillText('HARGA', colHarga, y); c.fillText('JUMLAH', colJumlah, y); c.fillText('STATUS', colStat, y);
  c.textAlign = 'left';
  y += 7;
  c.strokeStyle = th.line; c.beginPath(); c.moveTo(pad, y); c.lineTo(W - pad, y); c.stroke();
  y += 17;

  g.rows.forEach((p, i) => {
    const v = (+p.qty * +p.price) || 0;
    if (i % 2 === 1) { c.fillStyle = th.panel; c.fillRect(pad - 8, y - 12, W - pad * 2 + 16, rowH - 3); }
    c.font = '12.5px Segoe UI, sans-serif'; c.fillStyle = th.text;
    c.fillText(fmtShortDate(p.date) + '  ' + (WEEKDAYS[weekdayOf(p.date) - 1] || ''), pad, y);
    c.textAlign = 'right';
    c.fillText(String(+p.qty || 0), colPorsi, y);
    c.fillStyle = th.muted; c.font = '12.5px Segoe UI, sans-serif';
    c.fillText(fmtIDR(p.price), colHarga, y);
    c.fillStyle = th.text; c.font = '700 12.5px Segoe UI, sans-serif';
    c.fillText(fmtIDR(v), colJumlah, y);
    const free = p.method === 'Gratis';
    c.fillStyle = free ? th.muted : (p.paid ? th.ok : th.danger);
    c.font = '700 11px Segoe UI, sans-serif';
    c.fillText(statusOf(p), colStat, y);
    c.textAlign = 'left';
    y += rowH;
  });
  y += 2;
  c.strokeStyle = th.line; c.beginPath(); c.moveTo(pad, y); c.lineTo(W - pad, y); c.stroke();
  y += 16;
  c.font = '800 11.5px Segoe UI, sans-serif'; c.fillStyle = th.muted;
  c.fillText('TOTAL', pad, y);
  c.textAlign = 'right';
  c.font = '11.5px Segoe UI, sans-serif';
  c.fillText(g.qty + ' porsi', colPorsi, y);
  c.fillStyle = th.text; c.font = '800 13px Segoe UI, sans-serif';
  c.fillText(fmtIDR(g.nilai), colJumlah, y);
  c.textAlign = 'left';
  y += 12;

  const line = (label, val, color, big) => {
    c.fillStyle = th.muted; c.font = (big ? '800 13px ' : '12px ') + 'Segoe UI, sans-serif';
    c.fillText(label, pad + 12, y);
    c.textAlign = 'right'; c.fillStyle = color; c.font = (big ? '800 18px ' : '700 13px ') + 'Segoe UI, sans-serif';
    c.fillText(val, W - pad - 12, y);
    c.textAlign = 'left';
    y += big ? 26 : 22;
  };
  roundRect(c, pad, y - 4, W - pad * 2, sumH - 38, 12);
  c.fillStyle = th.panel; c.fill();
  c.strokeStyle = th.line; c.stroke();
  y += 18;
  line('Nilai pesanan (' + g.qty + ' porsi, ' + g.rows.length + ' tanggal)', fmtIDR(g.nilai), th.text, false);
  line('Dibayar / uang muka', fmtIDR(g.bayar), th.ok, false);
  y += 2;
  line('SISA TAGIHAN', fmtIDR(g.sisa), g.sisa > 0 ? th.danger : th.ok, true);

  if (bank) {
    const py = payY;
    roundRect(c, pad, py, W - pad * 2, 46, 10);
    c.fillStyle = th.panel; c.fill();
    c.strokeStyle = th.line; c.stroke();
    c.fillStyle = th.muted; c.font = '700 9.5px Segoe UI, sans-serif';
    c.fillText('TRANSFER PEMBAYARAN', pad + 12, py + 17);
    c.fillStyle = th.text; c.font = '800 14px Segoe UI, sans-serif';
    c.fillText(clipText(c, bank + '  ·  a.n. ' + holder, W - pad * 2 - 130), pad + 12, py + 35);
    c.textAlign = 'right'; c.fillStyle = th.muted; c.font = '11px Segoe UI, sans-serif';
    c.fillText('cantumkan ' + no, W - pad - 12, py + 35);
    c.textAlign = 'left';
  }
  c.fillStyle = th.muted; c.font = '10.5px Segoe UI, sans-serif';
  c.fillText('Terima kasih atas pesanan ' + shortTxt(g.org, 40) + ' · ' + db.settings.businessName + ' · ' + (g.contact || ''), pad, h - 16);

  openImagePreview(cv, no.replace(/\//g, '-') + '.png', 'Invoice ' + g.org);
}
function poSchedRow(date, qty) {  return '<div class="po-sched-row">' +
    '<input type="date" class="input input-sm ps-date" value="' + date + '">' +
    '<input type="number" class="input input-sm ps-qty" min="1" value="' + (+qty || 20) + '" title="jumlah porsi">' +
    '<button type="button" class="icon-act danger" data-act="po-sched-del" title="Hapus baris">×</button>' +
  '</div>';
}
function readPoSched() {
  const out = [];
  document.querySelectorAll('#poSched .po-sched-row').forEach(r => {
    const d = r.querySelector('.ps-date'), q = r.querySelector('.ps-qty');
    if (d && d.value) out.push({ date: d.value, qty: Math.max(1, +q.value || 0) });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function poAllocate(sched, price, dp, gratis) {
  let left = dp, lunas = 0, bayar = 0;
  if (gratis) return { lunas: sched.length, bayar: 0, left: 0 };
  sched.forEach(x => {
    const v = x.qty * price;
    if (v > 0 && left >= v) { left -= v; lunas++; bayar += v; }
  });
  return { lunas: lunas, bayar: bayar, left: left };
}
function updatePoGroupTotal() {
  const priceEl = document.querySelector('#poGroupForm [name="price"]');
  if (!priceEl) return;
  const sched = readPoSched();
  const portions = sched.reduce((s, x) => s + x.qty, 0);
  const methodEl = document.querySelector('#poGroupForm [name="method"]');
  const gratis = !!(methodEl && methodEl.value === 'Gratis');
  const price = gratis ? 0 : (+priceEl.value || 0);
  const total = sched.reduce((s, x) => s + x.qty * price, 0);
  const dpEl = document.querySelector('#poGroupForm [name="dp"]');
  const dp = Math.min(+((dpEl && dpEl.value) || 0), total);
  const a = poAllocate(sched, price, dp, gratis);
  let txt = sched.length + ' tanggal ambil · ' + portions + ' porsi · ' +
    (gratis ? 'GRATIS (kompensasi)' : 'total ' + fmtIDR(total) + ' · DP ' + fmtIDR(dp) + ' → ' + a.lunas + ' tanggal lunas · sisa ' + fmtIDR(total - a.bayar));
  if (!gratis && a.left > 0 && a.lunas < sched.length) txt += ' · DP ' + fmtIDR(a.left) + ' belum terpakai, kecilkan DP atau tandai manual nanti';
  setText('poGroupTotal', txt);
}
function openPoGroupModal(group) {
  const isEdit = !!group;
  const first = isEdit ? group.rows[0] : null;
  const g = isEdit ? {
    org: group.org, pic: group.pic, contact: group.contact, item: group.item,
    price: group.unit, method: first ? first.method : '', note: group.note, dp: group.bayar,
    menuId: first ? first.menuId : '', due: group.due || ''
  } : { org: '', pic: '', contact: '', item: '', price: 0, method: defaultMethod(), note: '', dp: 0, menuId: '', due: '' };
  const menuOpts = '<option value="">tulis sendiri</option>' +
    db.poMenus.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(m =>
      '<option value="' + escapeHtml(m.id) + '"' + (g.menuId === m.id ? ' selected' : '') + '>' +
      escapeHtml(m.item) + ' · ' + fmtIDR(m.price) + ' · ' + fmtShortDate(m.date) + '</option>').join('');
  const sched = isEdit ? group.rows.map(p => poSchedRow(p.date, p.qty)) : [poSchedRow(state.currentDate || todayStr(), 20)];

  openModal(
    '<h3>' + (isEdit ? 'Ubah' : 'Pesanan') + ' Kelompok / Lembaga</h3>' +
    '<form id="poGroupForm">' +
      '<label class="field"><span>Nama kelompok / lembaga / organisasi</span><input type="text" name="org" class="input" value="' + escapeHtml(g.org) + '" required placeholder="mis. Panitia HUT SDN 05"></label>' +
      '<div class="pkg-pair">' +
        '<label class="field"><span>PIC</span><input type="text" name="pic" class="input" value="' + escapeHtml(g.pic) + '" placeholder="penanggung jawab"></label>' +
        '<label class="field"><span>No. HP / WA</span><input type="text" name="contact" class="input" value="' + escapeHtml(g.contact) + '" placeholder="08…"></label>' +
      '</div>' +
      '<label class="field"><span>Ambil dari menu PO</span><select id="poGroupMenu" name="menuId" class="input">' + menuOpts + '</select></label>' +
      '<div class="pkg-pair">' +
        '<label class="field"><span>Item / menu</span><input type="text" name="item" class="input" value="' + escapeHtml(g.item) + '" required></label>' +
        '<label class="field"><span>Harga satuan (Rp)</span><input type="number" name="price" class="input" min="0" value="' + g.price + '" required></label>' +
      '</div>' +
      '<div class="field"><span>Jadwal ambil: tanggal + jumlah porsi</span>' +
        '<div class="po-sched" id="poSched">' + sched.join('') + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="po-sched-add">+ Tanggal ambil</button>' +
      '</div>' +
      '<div class="pkg-pair">' +
        '<label class="field"><span>Metode pembayaran</span><select name="method" class="input"><option value="">—</option>' +
          db.settings.paymentMethods.map(mm => '<option value="' + escapeHtml(mm) + '"' + (g.method === mm ? ' selected' : '') + '>' + escapeHtml(mm) + '</option>').join('') +
        '</select></label>' +
        '<label class="field"><span>Uang muka / DP (Rp)</span><input type="number" name="dp" class="input" min="0" value="' + g.dp + '"></label>' +
      '</div>' +
      '<div class="pkg-pair">' +
        '<label class="field"><span>Jatuh tempo pembayaran</span><input type="date" name="due" class="input" value="' + escapeHtml(g.due) + '"></label>' +
        '<div class="field"><span>&nbsp;</span><label class="check"><input type="checkbox" name="mkrem"' + (isEdit ? '' : ' checked') + '> Buatkan pengingat tagihan di halaman Pengingat</label>' +
          '<span class="muted tiny">Dibuat hanya jika jatuh tempo diisi dan masih ada sisa tagihan.</span></div>' +
      '</div>' +
      '<label class="field"><span>Catatan</span><input type="text" name="note" class="input" value="' + escapeHtml(g.note || '') + '" placeholder="mis. makan tanpa pedas, antar pukul 10"></label>' +
      '<p class="muted tiny" id="poGroupTotal"></p>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
        '<button type="submit" class="btn btn-primary">Simpan</button>' +
      '</div>' +
    '</form>'
  );
  updatePoGroupTotal();

  document.getElementById('poGroupForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const org = (f.get('org') || '').trim();
    const item = (f.get('item') || '').trim();
    const method = f.get('method');
    const price = method === 'Gratis' ? 0 : (+f.get('price') || 0);
    const note = (f.get('note') || '').trim();
    const list = readPoSched();
    if (!org || !item) { toast('Nama kelompok dan item wajib diisi'); return; }
    if (!list.length) { toast('Isi minimal satu tanggal ambil'); return; }
    const gid = isEdit ? group.id : uid();
    const keepStatus = {};
    if (isEdit) {
      group.rows.forEach(p => { keepStatus[p.date] = p.status || ''; });
      db.po = db.po.filter(p => p.groupId !== gid);
    }
    const total = list.reduce((s, x) => s + x.qty * price, 0);
    const due = /^\d{4}-\d{2}-\d{2}$/.test(String(f.get('due') || '')) ? String(f.get('due')) : '';
    let cover = Math.min(+f.get('dp') || 0, total);
    let paidSum = 0;
    list.forEach(x => {
      const v = x.qty * price;
      const paid = method === 'Gratis' ? true : (v > 0 && cover >= v);
      if (paid) { cover -= v; paidSum += v; }
      db.po.push({
        id: uid(), groupId: gid, menuId: f.get('menuId') || '',
        org: org, pic: (f.get('pic') || '').trim(), contact: (f.get('contact') || '').trim(),
        date: x.date, item: item, name: org, qty: x.qty, price: price,
        method: method, paid: paid, status: keepStatus[x.date] || '', note: note, due: due
      });
    });
    db.reminders = db.reminders.filter(r => r.ref !== gid);
    let remNote = '';
    if (due && f.get('mkrem') && total - paidSum > 0) {
      db.reminders.push({
        id: uid(), date: due, time: '', repeat: 'once', doneOn: '', ref: gid,
        text: 'Tagih ' + org + ' · sisa ' + fmtIDR(total - paidSum)
      });
      remNote = ' + pengingat tagihan ' + fmtShortDate(due);
    }
    logAction('po', (isEdit ? 'Ubah' : 'Tambah') + ' pesanan kelompok ' + org + ' · ' +
      list.reduce((s, x) => s + x.qty, 0) + ' porsi (' + list.length + ' tanggal)' + (due ? ' (jatuh tempo ' + due + ')' : ''));
    save(); closeModal(); renderPO(); toast('Pesanan kelompok disimpan' + remNote);
  });
}

/* ---------- Render: Laporan per Pelanggan ---------- */
function computeCustomerReport(c, mode) {
  let snackDays = 0, snackPaid = 0, snackFree = 0, snackValue = 0, snackPaidValue = 0;
  let lunchDays = 0, lunchPaid = 0, lunchFree = 0, lunchValue = 0, lunchPaidValue = 0;
  const inScope = date => mode.allTime || monthKey(date) === mode.month;
  for (const date in db.snack) {
    const r = db.snack[date][c.id];
    if (r && r.ordered && inScope(date)) {
      if (r.method === 'Gratis') snackFree++;
      else { const v = effPrice('snack', r, c, date); snackDays++; snackValue += v; if (r.paid) { snackPaid++; snackPaidValue += v; } }
    }
  }
  for (const date in db.lunch) {
    const r = db.lunch[date][c.id];
    if (r && r.ordered && inScope(date)) {
      if (r.method === 'Gratis') lunchFree++;
      else { const v = effPrice('lunch', r, c, date); lunchDays++; lunchValue += v; if (r.paid) { lunchPaid++; lunchPaidValue += v; } }
    }
  }
  const key = (c.name || '').trim().toLowerCase();
  let poCount = 0, poValue = 0, poPaid = 0, poFree = 0;
  if (key) for (const p of db.po) {
    if ((p.name || '').trim().toLowerCase() !== key) continue;
    if (!mode.allTime && monthKey(p.date) !== mode.month) continue;
    poCount++; const v = (+p.qty * +p.price) || 0;
    if (p.method === 'Gratis') { poFree++; continue; }
    poValue += v; if (p.paid) poPaid += v;
  }
  const tagihan = snackValue + lunchValue + poValue;
  const bayar = snackPaidValue + lunchPaidValue + poPaid;
  return { c, snackDays, snackPaid, snackFree, snackValue, lunchDays, lunchPaid, lunchFree, lunchValue, poCount, poValue, poFree, tagihan, bayar, sisa: tagihan - bayar };
}

/* Rincian tagihan yang BELUM dibayar untuk satu anak (tanggal + harga) */
function unpaidLines(c, mode) {
  const out = [];
  for (const type of ['snack', 'lunch']) {
    for (const date in db[type]) {
      const r = db[type][date][c.id];
      if (!r || !r.ordered || r.paid || r.method === 'Gratis') continue;
      if (!mode.allTime && monthKey(date) !== mode.month) continue;
      out.push({ date, type, label: type === 'snack' ? 'Snack' : 'Lunch', amount: effPrice(type, r, c, date) });
    }
  }
  poUnpaidFor(c.name, mode).forEach(l => out.push(l));
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function customerDetail(c, mode) {
  const dates = {};
  for (const type of ['snack', 'lunch']) {
    for (const date in db[type]) {
      const r = db[type][date][c.id];
      if (!r || !r.ordered) continue;
      if (!mode.allTime && monthKey(date) !== mode.month) continue;
      (dates[date] = dates[date] || {})[type] = r;
    }
  }
  const key = (c.name || '').trim().toLowerCase();
  const pos = db.po
    .filter(p => key && (p.name || '').trim().toLowerCase() === key && (mode.allTime || monthKey(p.date) === mode.month))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { dates, pos };
}

function renderReport() {
  const allTime = document.getElementById('rptAllTime').checked;
  document.getElementById('rptMonthBtn').disabled = allTime;
  const mode = { allTime, month: state.rptMonth || monthKey(todayStr()) };
  setText('rptMonthText', monthTitle(mode.month));

  const sel = document.getElementById('rptClass');
  const classes = [...new Set(db.customers.map(c => c.className).filter(Boolean))].sort();
  const cur = sel.value;
  sel.innerHTML = '<option value="">Semua kelas</option>' + classes.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
  if (cur && classes.includes(cur)) sel.value = cur;

  const cls = sel.value;
  const q = (document.getElementById('rptSearch').value || '').trim().toLowerCase();
  const sort = document.getElementById('rptSort').value;

  let rows = db.customers.map(c => computeCustomerReport(c, mode)).filter(r => r.snackDays || r.lunchDays || r.poCount || r.tagihan > 0);
  if (cls) rows = rows.filter(r => r.c.className === cls);
  if (q) rows = rows.filter(r => (r.c.name + ' ' + r.c.className).toLowerCase().includes(q));
  if (sort === 'sisa') rows.sort((a, b) => b.sisa - a.sisa || a.c.name.localeCompare(b.c.name));
  else if (sort === 'tagihan') rows.sort((a, b) => b.tagihan - a.tagihan);
  else rows.sort((a, b) => a.c.name.localeCompare(b.c.name));

  state.report = { rows, mode };

  const totTagihan = rows.reduce((s, r) => s + r.tagihan, 0);
  const totBayar = rows.reduce((s, r) => s + r.bayar, 0);
  document.getElementById('rptStats').innerHTML =
    statCard('Punya Pesanan', rows.length, allTime ? 'semua waktu' : 'periode terpilih') +
    statCard('Total Tagihan', fmtIDR(totTagihan), '', 'primary') +
    statCard('Dibayar', fmtIDR(totBayar), '', 'accent') +
    statCard('Sisa', fmtIDR(totTagihan - totBayar), '', 'danger');

  document.getElementById('rptScope').textContent = allTime ? 'Semua waktu' : fmtShortDate(mode.month + '-01');

  /* "Gratis" sengaja tidak ditampilkan di tabel rekap, hanya muncul di rincian */
  document.getElementById('rptList').innerHTML = rows.map(r =>
    '<tr>' +
      '<td><strong>' + escapeHtml(r.c.name) + '</strong></td>' +
      '<td class="muted">' + escapeHtml(r.c.className) + '</td>' +
      '<td class="num">' + r.snackDays + '</td>' +
      '<td class="num">' + r.lunchDays + '</td>' +
      '<td class="num">' + r.poCount + '</td>' +
      '<td class="num">' + fmtIDR(r.tagihan) + '</td>' +
      '<td class="num">' + fmtIDR(r.bayar) + '</td>' +
      '<td class="num"><span class="' + (r.sisa > 0 ? 'danger-text' : '') + '">' + fmtIDR(r.sisa) + '</span></td>' +
      '<td class="end"><button class="btn btn-ghost btn-sm" data-act="report-detail" data-id="' + r.c.id + '">Rinci</button></td>' +
    '</tr>'
  ).join('');
  document.getElementById('rptEmpty').hidden = rows.length > 0;

  /* --- Tagihan per orang tua / pengenal (+ centang anak untuk cek tagihan) --- */
  const groups = {};
  for (const r of rows) {
    const key = (r.c.parent || '').trim() || r.c.name;
    const g = groups[key] || (groups[key] = { parent: key, kids: [], tagihan: 0, bayar: 0, sisa: 0 });
    g.kids.push(r); g.tagihan += r.tagihan; g.bayar += r.bayar; g.sisa += r.sisa;
  }
  const plist = Object.values(groups).sort((a, b) => b.sisa - a.sisa || b.tagihan - a.tagihan);
  state.report.groups = plist;
  const validIds = new Set(rows.map(r => r.c.id));
  state.billSel = new Set([...state.billSel].filter(id => validIds.has(id)));
  document.getElementById('rptParentList').innerHTML = plist.map(g => {
    const ids = g.kids.map(k => k.c.id);
    const selCount = ids.filter(id => state.billSel.has(id)).length;
    return '<tr>' +
      '<td><label class="fam"><input type="checkbox" class="chk-family" data-ids="' + escapeHtml(ids.join(',')) + '"' + (ids.length && selCount === ids.length ? ' checked' : '') + '>' +
        '<span><strong>' + escapeHtml(g.parent) + '</strong>' + (g.kids.length > 1 ? ' <span class="badge orange" title="jumlah anak">' + g.kids.length + ' anak</span>' : '') + '</span></label></td>' +
      '<td class="muted small">' + g.kids.map(k =>
        '<label class="bill-kid"><input type="checkbox" class="chk-kid" data-cid="' + escapeHtml(k.c.id) + '"' + (state.billSel.has(k.c.id) ? ' checked' : '') + '>' +
        '<span>' + escapeHtml(k.c.name) + ' · ' + escapeHtml(k.c.className || '-') + ': ' + fmtIDR(k.tagihan) +
        (k.sisa > 0 ? ' <span class="danger-text">(sisa ' + fmtIDR(k.sisa) + ')</span>' : ' (lunas)') + '</span></label>'
      ).join('') + '</td>' +
      '<td class="num">' + fmtIDR(g.tagihan) + '</td>' +
      '<td class="num">' + fmtIDR(g.bayar) + '</td>' +
      '<td class="num"><span class="' + (g.sisa > 0 ? 'danger-text' : '') + '">' + fmtIDR(g.sisa) + '</span></td>' +
    '</tr>';
  }).join('');
  document.querySelectorAll('#rptParentList .chk-family').forEach(cb => {
    const ids = (cb.dataset.ids || '').split(',').filter(Boolean);
    const sel = ids.filter(id => state.billSel.has(id)).length;
    cb.checked = ids.length > 0 && sel === ids.length;
    cb.indeterminate = sel > 0 && sel < ids.length;
  });
  document.getElementById('rptParentEmpty').hidden = plist.length > 0;
  document.getElementById('rptParentCount').textContent = plist.length + ' pengenal';
  renderBillPanel();

  const top = plist.slice(0, 8);
  drawBar(document.getElementById('chartParent'),
    top.map(g => g.parent),
    top.map(g => g.tagihan),
    { color: '#C0272D', series2: { color: '#5E8C6E', values: top.map(g => g.bayar) } });
}

/* ---------- Cek tagihan: pilihan anak → teks & gambar ---------- */
function poLine(p) { return { date: p.date, type: 'po', label: 'PO ' + p.item + ' × ' + p.qty, amount: (+p.qty * +p.price) || 0 }; }
function poUnpaidFor(name, mode) {
  const key = (name || '').trim().toLowerCase();
  if (!key) return [];
  return db.po.filter(p => (p.name || '').trim().toLowerCase() === key && !p.paid && p.method !== 'Gratis' &&
    (mode.allTime || monthKey(p.date) === mode.month)).map(poLine);
}
function billSelection() {
  const mode = state.report ? state.report.mode : { allTime: true, month: monthKey(todayStr()) };
  const kids = [];
  for (const cid of state.billSel) {
    const c = customerById(cid);
    if (!c) continue;
    kids.push({ c: c, lines: unpaidLines(c, mode) });
  }
  /* PO yang dicatat atas nama orang tua dipakai sekali saja, pada anak pertama di grup yang sama */
  const claimed = new Set();
  kids.forEach(k => {
    const p = (k.c.parent || '').trim().toLowerCase();
    if (!p || claimed.has(p)) return;
    claimed.add(p);
    k.lines = k.lines.concat(poUnpaidFor(p, mode));
    k.lines.sort((a, b) => a.date.localeCompare(b.date));
  });
  kids.forEach(k => { k.total = k.lines.reduce((s, l) => s + l.amount, 0); });
  kids.sort((a, b) => (a.c.name || '').localeCompare(b.c.name || ''));
  return kids;
}
function renderBillPanel() {
  const el = document.getElementById('billPanel');
  if (!el) return;
  const kids = billSelection();
  if (!kids.length) {
    el.hidden = false;
    el.innerHTML = '<p class="muted small">Centang nama pengenal (atau anak tertentu) di tabel atas untuk melihat tagihan yang <strong>belum dibayar</strong> (tanggal + harga).</p>';
    return;
  }
  const grand = kids.reduce((s, k) => s + k.total, 0);
  el.innerHTML = kids.map(k =>
    '<div class="bill-card">' +
      '<div class="bill-head"><strong>' + escapeHtml(k.c.name) + '</strong>' +
        '<span class="muted tiny">' + escapeHtml(k.c.className || 'tanpa kelas') + (k.c.parent ? ' · ' + escapeHtml(k.c.parent) : '') + '</span>' +
        '<span class="danger-text">' + fmtIDR(k.total) + '</span></div>' +
      (k.lines.length
        ? '<ul class="bill-lines">' + groupByWeek(k.lines).map(g =>
            '<li class="wk"><span>Minggu ' + escapeHtml(weekRangeLabel(g.monday)) + '</span><span>' + fmtIDR(g.total) + '</span></li>' +
            g.lines.map(l => '<li><span>' + escapeHtml(fmtShortDate(l.date)) + ' · ' + escapeHtml(l.label) + '</span><span>' + fmtIDR(l.amount) + '</span></li>').join('')
          ).join('') + '</ul>'
        : '<p class="muted tiny">Tidak ada tagihan tertunda pada periode ini.</p>') +
    '</div>').join('') +
    '<div class="bill-foot"><span>Total terpilih <strong>' + fmtIDR(grand) + '</strong></span><span class="spacer"></span>' +
      '<button class="btn btn-ghost btn-sm" data-act="bill-clear">Bersihkan centang</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="bill-copy">Salin Teks</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="bill-csv">Simpan CSV</button>' +
      '<button class="btn btn-accent btn-sm" data-act="bill-image">Simpan Gambar</button>' +
    '</div>';
  el.hidden = false;
}
function billText() {
  const kids = billSelection();
  const out = [db.settings.businessName + ' · Tagihan Belum Dibayar', ''];
  let grand = 0;
  for (const k of kids) {
    out.push((k.c.parent ? k.c.parent + ' · ' : '') + k.c.name + (k.c.className ? ' (' + k.c.className + ')' : ''));
    if (!k.lines.length) out.push('  Tidak ada tagihan tertunda');
    groupByWeek(k.lines).forEach(g => {
      out.push('  Minggu ' + weekRangeLabel(g.monday));
      g.lines.forEach(l => out.push('    · ' + fmtShortDate(l.date) + ' ' + l.label + ' · ' + fmtIDR(l.amount)));
      out.push('    Subtotal minggu: ' + fmtIDR(g.total));
    });
    out.push('  Subtotal: ' + fmtIDR(k.total));
    out.push('');
    grand += k.total;
  }
  out.push('TOTAL: ' + fmtIDR(grand));
  return out.join('\n');
}
/* ---------- Ekspor CSV laporan ---------- */
function scopeTag(mode) { return mode && mode.allTime ? 'semua-waktu' : (mode ? mode.month : todayStr()); }
function exportReportCSV() {
  const rep = state.report;
  if (!rep || !rep.rows.length) { toast('Belum ada data untuk diekspor'); return; }
  const rows = [['Nama', 'Kelas', 'Orang tua / pengenal', 'Periode', 'Snack (hari)', 'Snack gratis', 'Lunch (hari)', 'Lunch gratis', 'PO (item)', 'Tagihan', 'Dibayar', 'Sisa']];
  const tot = { tagihan: 0, bayar: 0, sisa: 0 };
  rep.rows.forEach(r => {
    rows.push([r.c.name, r.c.className || '', r.c.parent || '', periodLabel(r.c.period),
      r.snackDays, r.snackFree, r.lunchDays, r.lunchFree, r.poCount, money(r.tagihan), money(r.bayar), money(r.sisa)]);
    tot.tagihan += r.tagihan; tot.bayar += r.bayar; tot.sisa += r.sisa;
  });
  rows.push(['TOTAL', '', '', '', '', '', '', '', '', money(tot.tagihan), money(tot.bayar), money(tot.sisa)]);
  downloadText('laporan-pelanggan-' + scopeTag(rep.mode) + '.csv', csvRows(rows), 'text/csv');
  toast('CSV rekap pelanggan diunduh');
}
function exportParentsCSV() {
  const groups = state.report && state.report.groups;
  if (!groups || !groups.length) { toast('Belum ada data untuk diekspor'); return; }
  const rows = [['Pengenal', 'Jumlah anak', 'Daftar anak', 'Tagihan', 'Dibayar', 'Sisa']];
  groups.forEach(g => rows.push([g.parent, g.kids.length,
    g.kids.map(k => k.c.name + ' (' + (k.c.className || '-') + ')').join(', '),
    money(g.tagihan), money(g.bayar), money(g.sisa)]));
  downloadText('tagihan-pengenal-' + scopeTag(state.report.mode) + '.csv', csvRows(rows), 'text/csv');
  toast('CSV tagihan pengenal diunduh');
}
function exportBillCSV() {
  const kids = billSelection();
  if (!kids.length) { toast('Centang anak dulu'); return; }
  const rows = [['Pengenal', 'Nama', 'Kelas', 'Minggu', 'Tanggal', 'Jenis', 'Nominal']];
  let grand = 0;
  kids.forEach(k => {
    if (!k.lines.length) { rows.push([k.c.parent || '', k.c.name, k.c.className || '', '', '', 'Tidak ada tagihan', '0']); return; }
    groupByWeek(k.lines).forEach(g => {
      const wk = weekRangeLabel(g.monday);
      g.lines.forEach(l => {
        rows.push([k.c.parent || '', k.c.name, k.c.className || '', wk, l.date, l.label, money(l.amount)]);
        grand += l.amount;
      });
    });
  });
  rows.push(['', '', '', '', '', 'TOTAL', money(grand)]);
  downloadText('tagihan-belum-dibayar-' + todayStr() + '.csv', csvRows(rows), 'text/csv');
  toast('CSV tagihan diunduh');
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('Teks disalin'), () => fallbackCopy(text));
  } else fallbackCopy(text);
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-10000px;top:0';
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  toast(ok ? 'Teks disalin' : 'Salin manual dari panel ya');
}
function clipText(g, txt, maxW) {
  let t = String(txt);
  if (g.measureText(t).width <= maxW) return t;
  while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
function billImage() {
  const kids = billSelection();
  if (!kids.length) { toast('Centang anak dulu'); return; }
  const dark = document.body.classList.contains('theme-dark');
  const th = dark
    ? { bg: '#12141D', panel: '#171A25', text: '#E9ECFF', muted: '#8A90A8', danger: '#FF6B74', line: 'rgba(255,255,255,.10)', strip: ['#FF4D5A', '#FF3D8B'] }
    : { bg: '#FFFFFF', panel: '#F6F7FD', text: '#1A1D2B', muted: '#6F7590', danger: '#C4342B', line: '#E6E8F2', strip: ['#D8262F', '#FF3D6E'] };
  const W = 560, pad = 24, lineH = 20, headH = 96, footH = 62, scale = 2;
  let h = headH + footH;
  for (const k of kids) {
    const groups = groupByWeek(k.lines);
    h += 50 + (groups.length ? groups.reduce((s, g) => s + 36 + g.lines.length * lineH, 0) : lineH);
  }
  const cv = document.createElement('canvas');
  cv.width = W * scale; cv.height = h * scale;
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  g.fillStyle = th.bg; g.fillRect(0, 0, W, h);
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, th.strip[0]); grad.addColorStop(1, th.strip[1]);
  g.fillStyle = grad; g.fillRect(0, 0, W, 5);
  g.fillStyle = th.text; g.font = '700 19px Segoe UI, sans-serif';
  g.fillText(db.settings.businessName, pad, 44);
  g.fillStyle = th.muted; g.font = '11.5px Segoe UI, sans-serif';
  g.fillText('Tagihan belum dibayar · ' + fmtLong(todayStr()), pad, 64);
  g.strokeStyle = th.line; g.beginPath(); g.moveTo(pad, 80); g.lineTo(W - pad, 80); g.stroke();

  let y = headH;
  let grand = 0;
  for (const k of kids) {
    g.font = '700 13.5px Segoe UI, sans-serif';
    g.textAlign = 'right'; g.fillStyle = th.danger;
    const kTotal = fmtIDR(k.total);
    const kTotalW = g.measureText(kTotal).width;
    g.textAlign = 'left'; g.fillStyle = th.text;
    const head = (k.c.parent ? k.c.parent + ' · ' : '') + k.c.name + (k.c.className ? ' (' + k.c.className + ')' : '');
    g.fillText(clipText(g, head, W - pad * 2 - kTotalW - 12), pad, y);
    g.textAlign = 'right';
    g.fillText(kTotal, W - pad, y);
    g.textAlign = 'left';
    y += 22;
    const weeks = groupByWeek(k.lines);
    if (!weeks.length) {
      g.fillStyle = th.muted; g.font = '11.5px Segoe UI, sans-serif';
      g.fillText('Tidak ada tagihan tertunda', pad + 6, y);
      y += lineH;
    } else weeks.forEach(wk => {
      g.fillStyle = th.muted; g.font = '700 11px Segoe UI, sans-serif';
      g.fillText('MINGGU ' + weekRangeLabel(wk.monday), pad + 6, y);
      g.textAlign = 'right';
      g.fillText(fmtIDR(wk.total), W - pad, y);
      g.textAlign = 'left';
      y += 18;
      wk.lines.forEach(l => {
        g.font = '11.5px Segoe UI, sans-serif';
        g.textAlign = 'right'; g.fillStyle = th.text;
        const amt = fmtIDR(l.amount);
        const amtW = g.measureText(amt).width;
        const txt = clipText(g, '· ' + fmtShortDate(l.date) + '  ' + l.label, W - pad * 2 - amtW - 16);
        g.textAlign = 'left'; g.fillStyle = th.muted;
        g.fillText(txt, pad + 12, y);
        g.textAlign = 'right'; g.fillStyle = th.text;
        g.fillText(amt, W - pad, y);
        g.textAlign = 'left';
        y += lineH;
      });
      y += 18;
    });
    grand += k.total;
    y += 4;
    g.strokeStyle = th.line; g.beginPath(); g.moveTo(pad, y); g.lineTo(W - pad, y); g.stroke();
    y += 24;
  }

  y += 4;
  roundRect(g, pad, y - 6, W - pad * 2, 38, 10);
  g.fillStyle = th.panel; g.fill();
  g.strokeStyle = th.line; g.stroke();
  const tAmt = fmtIDR(grand);
  g.font = '700 13px Segoe UI, sans-serif';
  const tLblW = g.measureText('TOTAL').width;
  g.font = '800 16px Segoe UI, sans-serif';
  const tAmtW = g.measureText(tAmt).width;
  const tGap = 12, tStart = pad + (W - pad * 2 - (tLblW + tGap + tAmtW)) / 2;
  /* kotak total punya tinggi 38 mulai y-6, pakai baseline tengah agar angkanya tidak naik sendiri */
  g.textBaseline = 'middle';
  g.textAlign = 'left'; g.fillStyle = th.muted; g.font = '700 13px Segoe UI, sans-serif';
  g.fillText('TOTAL', tStart, y + 13);
  g.fillStyle = th.danger; g.font = '800 16px Segoe UI, sans-serif';
  g.fillText(tAmt, tStart + tLblW + tGap, y + 13);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.fillStyle = th.muted; g.font = '10.5px Segoe UI, sans-serif';
  g.fillText('Dibuat otomatis oleh ' + db.settings.businessName, pad, y + 48);

  openImagePreview(cv, 'tagihan-' + todayStr() + '.png', 'Tagihan Belum Dibayar');
}

/* ---------- Kelompok mingguan untuk rincian tagihan ---------- */
function weekRangeLabel(mon) {
  const a = mon.split('-').map(Number);
  const bStr = shiftDate(mon, 6);
  const b = bStr.split('-').map(Number);
  if (a[1] === b[1]) return a[2] + '–' + b[2] + ' ' + MONTHS_ID[b[1] - 1] + ' ' + b[0];
  return a[2] + ' ' + MONTHS_ID[a[1] - 1] + ' – ' + b[2] + ' ' + MONTHS_ID[b[1] - 1] + ' ' + b[0];
}
function groupByWeek(lines) {
  const map = {};
  lines.forEach(l => { const k = mondayOf(l.date); (map[k] = map[k] || []).push(l); });
  return Object.keys(map).sort().map(k => ({
    monday: k,
    lines: map[k].slice().sort((a, b) => a.date.localeCompare(b.date)),
    total: map[k].reduce((s, l) => s + l.amount, 0)
  }));
}
function billLinesFor(c, mode) {
  const out = [];
  for (const type of ['snack', 'lunch']) {
    for (const date in db[type]) {
      const r = db[type][date][c.id];
      if (!r || !r.ordered) continue;
      if (!mode.allTime && monthKey(date) !== mode.month) continue;
      const free = r.method === 'Gratis';
      out.push({
        date: date, type: type, label: (type === 'snack' ? 'Snack' : 'Lunch') + (free ? ' (gratis)' : ''),
        amount: free ? 0 : effPrice(type, r, c, date), paid: free || !!r.paid
      });
    }
  }
  const key = (c.name || '').trim().toLowerCase();
  const parentKey = (c.parent || '').trim().toLowerCase();
  if (key || parentKey) for (const p of db.po) {
    const nm = (p.name || '').trim().toLowerCase();
    if (nm !== key && !(parentKey && nm === parentKey)) continue;
    if (!mode.allTime && monthKey(p.date) !== mode.month) continue;
    const free = p.method === 'Gratis';
    out.push({ date: p.date, type: 'po', label: 'PO ' + p.item + ' × ' + p.qty, amount: free ? 0 : ((+p.qty * +p.price) || 0), paid: free || !!p.paid });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
function customerRincianImage(cid) {
  const c = customerById(cid);
  if (!c) return;
  const mode = state.report ? state.report.mode : { allTime: true, month: monthKey(todayStr()) };
  const rep = computeCustomerReport(c, mode);
  const lines = billLinesFor(c, mode).filter(l => !l.paid);
  const groups = groupByWeek(lines);
  const dark = document.body.classList.contains('theme-dark');
  const th = dark
    ? { bg: '#12141D', panel: '#171A25', text: '#E9ECFF', muted: '#8A90A8', danger: '#FF6B74', ok: '#38D39F', line: 'rgba(255,255,255,.10)', strip: ['#FF4D5A', '#FF3D8B'] }
    : { bg: '#FFFFFF', panel: '#F6F7FD', text: '#1A1D2B', muted: '#6F7590', danger: '#C4342B', ok: '#1F9D74', line: '#E6E8F2', strip: ['#D8262F', '#FF3D6E'] };
  const W = 560, pad = 24, lineH = 19, headH = 104, footH = 92, scale = 2;
  let h = headH + footH + groups.reduce((s, g) => s + 22 + g.lines.length * lineH, 0);
  const cv = document.createElement('canvas');
  cv.width = W * scale; cv.height = h * scale;
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  g.fillStyle = th.bg; g.fillRect(0, 0, W, h);
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, th.strip[0]); grad.addColorStop(1, th.strip[1]);
  g.fillStyle = grad; g.fillRect(0, 0, W, 5);
  g.fillStyle = th.text; g.font = '700 18px Segoe UI, sans-serif';
  g.fillText(db.settings.businessName, pad, 38);
  g.font = '700 14px Segoe UI, sans-serif';
  g.fillText(c.name + (c.className ? ' (' + c.className + ')' : ''), pad, 60);
  g.fillStyle = th.muted; g.font = '11.5px Segoe UI, sans-serif';
  const sub = (c.parent ? c.parent + ' · ' : '') + 'Periode ' + (mode.allTime ? 'semua waktu' : monthTitle(mode.month)) + ' · ' + periodLabel(c.period) + ' · hanya yang belum dibayar';
  g.fillText(sub, pad, 78);
  g.strokeStyle = th.line; g.beginPath(); g.moveTo(pad, 90); g.lineTo(W - pad, 90); g.stroke();

  let y = headH;
  if (!groups.length) {
    g.fillStyle = th.ok; g.font = '700 12px Segoe UI, sans-serif';
    g.fillText('Tidak ada tagihan tertunda, semua sudah lunas.', pad, y);
    y += lineH;
  }
  groups.forEach(gr => {
    g.fillStyle = th.text; g.font = '700 12px Segoe UI, sans-serif';
    g.fillText(weekRangeLabel(gr.monday), pad, y);
    g.textAlign = 'right'; g.fillStyle = th.muted; g.font = '11px Segoe UI, sans-serif';
    g.fillText('subtotal ' + fmtIDR(gr.total), W - pad, y);
    g.textAlign = 'left';
    y += 17;
    gr.lines.forEach(l => {
      g.font = '11.5px Segoe UI, sans-serif';
      g.textAlign = 'right';
      const amt = l.amount ? fmtIDR(l.amount) : 'gratis';
      const amtW = g.measureText(amt).width;
      const status = l.paid ? 'lunas' : 'belum';
      const stW = g.measureText(status).width;
      g.textAlign = 'left';
      g.fillStyle = th.muted;
      const txt = clipText(g, '· ' + fmtShortDate(l.date) + '  ' + l.label, W - pad * 2 - amtW - stW - 24);
      g.fillText(txt, pad + 6, y);
      const sx = W - pad - amtW - 8 - stW;
      g.fillStyle = l.paid ? th.ok : th.danger;
      g.fillText(status, sx, y);
      g.fillStyle = th.text;
      g.textAlign = 'right';
      g.fillText(amt, W - pad, y);
      g.textAlign = 'left';
      y += lineH;
    });
    y += 5;
  });

  y += 6;
  roundRect(g, pad, y - 4, W - pad * 2, 62, 10);
  g.fillStyle = th.panel; g.fill();
  g.strokeStyle = th.line; g.stroke();
  const rows = [['Total tagihan', rep.tagihan, th.text], ['Sudah dibayar', rep.bayar, th.ok], ['Sisa tagihan', rep.sisa, rep.sisa > 0 ? th.danger : th.ok]];
  rows.forEach((r, i) => {
    g.font = '11.5px Segoe UI, sans-serif'; g.fillStyle = th.muted;
    g.fillText(r[0], pad + 14, y + 13 + i * 18);
    g.font = (i === 2 ? '700 ' : '') + '12.5px Segoe UI, sans-serif'; g.fillStyle = r[2];
    g.textAlign = 'right'; g.fillText(fmtIDR(r[1]), W - pad - 14, y + 13 + i * 18); g.textAlign = 'left';
  });
  g.fillStyle = th.muted; g.font = '10.5px Segoe UI, sans-serif';
  g.fillText('Dibuat otomatis oleh ' + db.settings.businessName + ' · ' + fmtLong(todayStr()), pad, y + 76);

  openImagePreview(cv, 'rincian-' + (c.name || 'pelanggan').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-' + todayStr() + '.png',
    'Rincian Tagihan · ' + c.name);
}

function openReportDetail(cid) {
  const c = customerById(cid);
  if (!c) return;
  const allTime = document.getElementById('rptAllTime').checked;
  const mode = { allTime, month: state.rptMonth || monthKey(todayStr()) };
  const rep = computeCustomerReport(c, mode);
  const det = customerDetail(c, mode);
  const scope = allTime ? 'Semua waktu' : fmtShortDate(mode.month + '-01');

  const dailyRows = Object.keys(det.dates).sort().map(date => {
    const d = det.dates[date];
    const cell = t => {
      const v = d[t];
      if (!v) return '<span class="muted">—</span>';
      if (v.method === 'Gratis') return '<span class="badge gold">Gratis</span>';
      return '<span class="badge ' + (v.paid ? 'green' : 'red') + '">' + (v.paid ? 'Lunas' : 'Belum') + '</span>';
    };
    return '<tr><td>' + fmtShortDate(date) + '</td><td class="c">' + cell('snack') + '</td><td class="c">' + cell('lunch') + '</td></tr>';
  }).join('') || '<tr><td colspan="3" class="empty">Tidak ada catatan harian.</td></tr>';

  const poRows = det.pos.map(p =>
    '<tr><td>' + fmtShortDate(p.date) + '</td><td>' + escapeHtml(p.item) + ' × ' + p.qty + '</td><td class="num">' + fmtIDR((+p.qty * +p.price) || 0) + '</td><td class="c"><span class="badge ' + (p.method === 'Gratis' ? 'gold' : (p.paid ? 'green' : 'red')) + '">' + (p.method === 'Gratis' ? 'Gratis' : (p.paid ? 'Lunas' : 'Belum')) + '</span></td></tr>'
  ).join('');

  openModal(
    '<h3>Rincian · ' + escapeHtml(c.name) + ' <span class="muted" style="font-weight:400">(' + escapeHtml(c.className) + ')</span></h3>' +
    '<p class="muted small">Periode: ' + escapeHtml(scope) + ' · Langganan ' + periodLabel(c.period) + '</p>' +
    '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">' +
      statCard('Tagihan', fmtIDR(rep.tagihan)) +
      statCard('Dibayar', fmtIDR(rep.bayar), '', 'accent') +
      statCard('Sisa', fmtIDR(rep.sisa), '', 'danger') +
    '</div>' +
    '<h4 style="margin-bottom:8px">Catatan harian</h4>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th class="c">Snack</th><th class="c">Lunch</th></tr></thead><tbody>' + dailyRows + '</tbody></table></div>' +
    (det.pos.length ? '<h4 style="margin:16px 0 8px">Pre-Order</h4><div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Menu</th><th class="num">Nilai</th><th class="c">Lunas</th></tr></thead><tbody>' + poRows + '</tbody></table></div>' : '') +
    '<div class="modal-actions">' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close">Tutup</button>' +
      '<button type="button" class="btn btn-accent" data-act="report-image" data-id="' + c.id + '">Simpan Gambar</button>' +
    '</div>'
  );
}

/* Dokumen cetak cukup butuh gaya: tanpa skrip dan tanpa permintaan jaringan apa pun. */
/* img-src data: hanya untuk logo yang disimpan sebagai data URL, tetap tanpa jaringan */
const DOC_CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">';
/* Logo untuk kop dokumen A4. `where` = kunci di settings.logoOpts. */
function printLogoOn(where) {
  if (!db.settings.logo) return false;
  const v = state.printLogo ? state.printLogo[where] : null;
  if (typeof v === 'boolean') return v;
  return !!(db.settings.logoOpts || {})[where];
}
function logoFor(where) {
  if (!printLogoOn(where)) return '';
  const o = db.settings.logoOpts || {};
  return '<img class="doc-logo" src="' + db.settings.logo + '" alt="" style="height:' + (+o.headMm || 14) + 'mm">';
}

function printableDoc(title, subtitle, inner, logoTarget) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + DOC_CSP + '<style>' +
    '@page{size:A4 portrait;margin:12mm}' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#222;font-size:12px}' +
    'h1{font-size:19px;margin:0 0 2mm;letter-spacing:.2px}' +
    '.head{text-align:center;margin-bottom:6mm}' +
    '.head .sub{font-size:11px;color:#555}' +
    'h4{margin:6mm 0 1mm;font-size:13px}' +
    'table{width:100%;border-collapse:collapse;margin-top:2mm}' +
    'th,td{border:1px solid #555;padding:2.2mm 2mm;text-align:left}' +
    'th{background:#f3efe8;font-size:11px}' +
    'td.no,th.no{width:8mm;text-align:center}' +
    'td.c,th.c{text-align:center}' +
    'td.r,th.r{text-align:right}' +
    'tfoot td{font-weight:700;background:#faf6ef}' +
    '.info{margin-bottom:2mm}' +
    '.lbl{border:1.4px solid #333;border-radius:3mm;padding:3mm;text-align:center;break-inside:avoid;page-break-inside:avoid}' +
    '.lbl-top{font-size:10.5px;color:#555;letter-spacing:.5px;text-transform:uppercase}' +
    '.lbl-item{font-size:19px;font-weight:800;margin:1.5mm 0}' +
    '.lbl-qty{font-size:25px;font-weight:800;line-height:1}' +
    '.lbl-name{font-size:15px;font-weight:700;margin-top:2mm}' +
    '.lbl-meta{font-size:11px;color:#444;margin-top:1mm}' +
    '.lbl-note{font-size:11px;font-style:italic;margin-top:1mm}' +
    '.sign{display:flex;justify-content:space-between;margin-top:14mm}' +
    '.sign .col{text-align:center;width:45%}' +
    '.sign .line{border-top:1px solid #555;margin-top:14mm;padding-top:2mm}' +
    '.doc-logo{display:block;margin:0 auto 2.5mm;max-width:60mm;object-fit:contain}' +
    '</style></head><body>' +
    '<div class="head">' + logoFor(logoTarget || 'laporan') + '<h1>' + escapeHtml(db.settings.businessName) + '</h1>' +
    '<div class="sub">' + escapeHtml(title) + '</div>' +
    (subtitle ? '<div class="sub">' + escapeHtml(subtitle) + '</div>' : '') +
    '</div>' + inner + '</body></html>';
}

function printRecap() {
  if (!state.report || !state.report.rows.length) { toast('Tidak ada data untuk dicetak.'); return; }
  const fr = document.getElementById('reportFrame');
  fr.srcdoc = buildRecapHTML(state.report.rows, state.report.mode);
  setTimeout(() => printFrame(fr), 300);
}
function buildRecapHTML(rows, mode) {
  const scope = mode.allTime ? 'Semua Waktu' : fmtShortDate(mode.month + '-01');
  const totTagihan = rows.reduce((s, r) => s + r.tagihan, 0);
  const totBayar = rows.reduce((s, r) => s + r.bayar, 0);
  const body = rows.map((r, i) =>
    '<tr><td class="no">' + (i + 1) + '</td><td>' + escapeHtml(r.c.name) + '</td><td>' + escapeHtml(r.c.className) + '</td>' +
    '<td class="c">' + r.snackDays + '</td><td class="c">' + r.lunchDays + '</td><td class="c">' + r.poCount + '</td>' +
    '<td class="r">' + fmtIDR(r.tagihan) + '</td><td class="r">' + fmtIDR(r.bayar) + '</td><td class="r">' + fmtIDR(r.sisa) + '</td></tr>'
  ).join('');
  const inner = '<table><thead><tr>' +
    '<th class="no">No</th><th>Nama</th><th>Kelas</th><th class="c">Snack</th><th class="c">Lunch</th><th class="c">PO</th>' +
    '<th class="r">Tagihan</th><th class="r">Dibayar</th><th class="r">Sisa</th></tr></thead>' +
    '<tbody>' + body + '</tbody>' +
    '<tfoot><tr><td colspan="6">TOTAL</td><td class="r">' + fmtIDR(totTagihan) + '</td><td class="r">' + fmtIDR(totBayar) + '</td><td class="r">' + fmtIDR(totTagihan - totBayar) + '</td></tr></tfoot>' +
    '</table>' +
    '<div class="sign"><div class="col">Mengetahui<div class="line">( ___________________ )</div></div><div class="col">' + escapeHtml(db.settings.businessName) + '<div class="line">( ___________________ )</div></div></div>';
  return printableDoc('Rekap Tagihan per Pelanggan', 'Periode: ' + scope, inner);
}

/* ---------- Opsi warna cetak stiker & kertas konfirmasi ---------- */
const PRINT_FONT_COLORS = [
  ['default', '', 'Bawaan'],
  ['dark', '#222222', 'Hitam'],
  ['blue', '#1F3A5F', 'Biru tua'],
  ['red', '#7A1F1F', 'Merah tua'],
  ['green', '#1F4D36', 'Hijau tua'],
  ['gray', '#444444', 'Abu-abu']
];
const PRINT_TABLE_TONES = [
  ['none', '', 'Tanpa warna'],
  ['cream', '#f7f1e6', 'Krem'],
  ['blue', '#e8f1fb', 'Biru muda'],
  ['green', '#e9f5ec', 'Hijau muda'],
  ['rose', '#fbeef1', 'Merah muda'],
  ['gray', '#f0f0f0', 'Abu-abu']
];
function printStyleOptions() {
  const raw = uiPrefs().printStyle || {};
  return {
    font: PRINT_FONT_COLORS.some(c => c[0] === raw.font) ? raw.font : 'default',
    tone: PRINT_TABLE_TONES.some(t => t[0] === raw.tone) ? raw.tone : 'none'
  };
}
function printStyleHex() {
  const o = printStyleOptions();
  return {
    font: (PRINT_FONT_COLORS.find(c => c[0] === o.font) || PRINT_FONT_COLORS[0])[1],
    tone: (PRINT_TABLE_TONES.find(t => t[0] === o.tone) || PRINT_TABLE_TONES[0])[1]
  };
}
function savePrintStyle() {
  const p = uiPrefs();
  const f = document.getElementById('printFontColor');
  const t = document.getElementById('printTableTone');
  p.printStyle = {
    font: f && PRINT_FONT_COLORS.some(c => c[0] === f.value) ? f.value : 'default',
    tone: t && PRINT_TABLE_TONES.some(x => x[0] === t.value) ? t.value : 'none'
  };
  try { localStorage.setItem(UI_KEY, JSON.stringify(p)); } catch (e) { /* penyimpanan penuh */ }
}
function syncPrintStyleControls() {
  const o = printStyleOptions();
  const f = document.getElementById('printFontColor');
  const t = document.getElementById('printTableTone');
  if (f && !f.options.length) f.innerHTML = PRINT_FONT_COLORS.map(c => '<option value="' + c[0] + '">' + c[2] + '</option>').join('');
  if (t && !t.options.length) t.innerHTML = PRINT_TABLE_TONES.map(x => '<option value="' + x[0] + '">' + x[2] + '</option>').join('');
  if (f) f.value = o.font;
  if (t) t.value = o.tone;
}

/* ---------- Render: Stiker ---------- */
function renderStickerDate() {
  setText('stickerDateText', fmtLong(state.stickerDate || todayStr()));
}
function stickerOrdersOn(date) {
  const s = db.snack[date] || {}, l = db.lunch[date] || {};
  const map = {};
  for (const id in s) if (s[id].ordered) map[id] = 'Snack';
  for (const id in l) if (l[id].ordered) map[id] = map[id] ? 'Snack + Lunch' : 'Lunch';
  return map;
}
function renderStickerCustomers() {
  const date = state.stickerDate || todayStr();
  const ordered = stickerOrdersOn(date);
  const want = state.stickerType === 'lunch' ? 'lunch' : 'snack';
  const label = want === 'snack' ? 'Snack' : 'Lunch';
  const match = c => {
    const o = ordered[c.id];
    if (!o) return false;
    return o.indexOf(label) >= 0;
  };
  const list = db.customers.filter(match).sort(sortCustomers);
  const wrap = document.getElementById('stickerCustomerList');
  if (!list.length) {
    wrap.innerHTML = '<p class="empty">Tidak ada pesanan ' + (want === 'snack' ? 'snack' : 'lunch') +
      ' pada ' + escapeHtml(fmtLong(date)) + '. Ganti filter atau pilih tanggal lain.</p>';
    return;
  }
  wrap.innerHTML = list.map(c =>
    '<label><input type="checkbox" class="sticker-cb" value="' + c.id + '" checked><span>' + escapeHtml(c.name) +
    (c.allergy ? '<span class="alg-dot" title="' + escapeHtml(c.allergy) + '">&#9888;</span>' : '') +
    '</span><span class="cls">' + escapeHtml(ordered[c.id]) + '</span></label>'
  ).join('');
}
/* Area cetak A4 setelah dikurangi margin @page 5mm/6mm */
const STICKER_SHEET_W = 198, STICKER_SHEET_H = 287;
function stickerOptions() {
  const parts = document.getElementById('stickerSize').value.split('x').map(Number);
  const style = db.settings.sticker;
  const per = Math.max(1, parts[1] || 10);
  /* tinggi baris otomatis = setinggi A4 dibagi jumlah baris, lalu dirapatkan menurut slider tight */
  const tight = Math.min(100, Math.max(50, +(style.tight || 100)));
  const rowH = +((STICKER_SHEET_H / per) * tight / 100).toFixed(2);
  return {
    cols: parts[0], rows: per, rowH: rowH,
    content: document.getElementById('stickerContent').value,
    brand: document.getElementById('stickerBrand').checked,
    lines: document.getElementById('stickerLines').checked,
    style: style
  };
}
function buildStickerHTML(customers, o) {
  const cols = o.cols, rows = o.rows, style = o.style || db.settings.sticker;
  const ps = printStyleHex();
  const ink = ps.font || '#2B2020';
  const clsInk = ps.font || '#5F564B';
  const brandInk = ps.font || '#C0272D';
  const tone = ps.tone;
  const rowH = o.rowH || +(STICKER_SHEET_H / rows).toFixed(2);
  const perPage = cols * rows;
  const pages = [];
  for (let i = 0; i < customers.length; i += perPage) pages.push(customers.slice(i, i + perPage));
  if (!pages.length) pages.push([]);
  const MM = 96 / 25.4;
  const cellWpx = (STICKER_SHEET_W / cols) * MM, cellHpx = rowH * MM;
  const padMm = Math.min(10, Math.max(0, +style.padV || 0));
  const padPx = padMm * MM;
  const innerW = Math.max(20, cellWpx - padPx * 2), innerH = Math.max(20, cellHpx - padPx * 2);
  const autoName = Math.max(12, Math.min(40, innerW / 4.2, innerH / 3.8));
  const autoCls = Math.max(10, Math.min(34, innerW / 3.6, innerH / 4.4));
  const logoSrc = printLogoOn('stiker') ? db.settings.logo : '';
  /* logo dapat slot lebih tinggi dari teks nama usaha supaya tetap terbaca di sel kecil */
  const logoSize = logoSrc ? Math.max(16, Math.min(38, innerH * 0.3 * (style.brandScale / 100))) : 0;
  const brandSize = Math.max(5, Math.min(30, autoName * 0.3 * (style.brandScale / 100)));
  const slotSize = logoSrc ? logoSize : brandSize;
  const brandSlot = !!(o.brand || logoSrc);
  let nameSize = autoName * (style.nameScale / 100);
  let clsSize = autoCls * (style.clsScale / 100);
  const stack = nameSize + clsSize + (brandSlot ? slotSize + 2 : 0);
  const budget = innerH * 0.92;
  if (stack > budget) { const k = budget / stack; nameSize *= k; clsSize *= k; }
  const nameFont = STK_FONTS[style.nameFont] || STK_FONTS.sans;
  const clsFont = STK_FONTS[style.clsFont] || STK_FONTS.sans;
  const brandFont = STK_FONTS[style.brandFont] || STK_FONTS.sans;
  const brandName = db.settings.businessName;
  const frame = document.getElementById('stickerFrame');
  const fit = frame && frame.clientWidth ? Math.min(1, (frame.clientWidth - 16) / 794).toFixed(3) : 1;
  const markKind = STK_MARKS[style.mark] ? style.mark : 'bar';
  const markFg = (STK_TONES[style.tone] || STK_TONES.soft).fg;
  const corner = markKind === 'dot' || markKind === 'letter';
  const markMm = Math.max(2.6, Math.min(8, (STICKER_SHEET_W / cols) * (markKind === 'letter' ? 0.15 : 0.06)));
  const markPx = markMm * MM * 0.6;
  const wordPx = Math.max(5, clsSize * 0.4);
  const rowHmm = rowH;
  const sheets = pages.map(page => {
    const items = page.map(c => {
      const marked = c.allergy && markKind !== 'none' && o.content === 'namamark';
      let cls = '';
      if (o.content === 'namealg' && c.allergy) {
        const len = Math.max(8, c.allergy.length);
        const availH = Math.max(14, innerH * 0.8 - nameSize - (brandSlot ? slotSize + 2 : 0));
        let best = { sz: 0, lines: 1 };
        for (let ln = 1; ln <= 5; ln++) {
          const s = Math.min(clsSize, ln * innerW / (0.72 * len), availH / (1.12 * ln));
          if (s > best.sz) best = { sz: s, lines: ln };
        }
        cls = '<div class="alg" style="color:' + markFg + ';font-size:' + best.sz.toFixed(1) + 'px;-webkit-line-clamp:' + best.lines + '">' +
          '<i class="alg-dot" style="background:' + markFg + '"></i>' + escapeHtml(c.allergy) + '</div>';
      } else if ((o.content === 'nameclass' || o.content === 'namamark') && c.className) {
        cls = '<div class="cls">' + escapeHtml(c.className) + '</div>';
      }
      const cornerMark = marked && corner
        ? (markKind === 'dot'
          ? '<span class="mk mk-dot" style="width:' + markMm.toFixed(1) + 'mm;height:' + markMm.toFixed(1) + 'mm;background:' + markFg + '" title="' + escapeHtml(c.allergy) + '"></span>'
          : '<span class="mk mk-letter" style="width:' + markMm.toFixed(1) + 'mm;height:' + markMm.toFixed(1) + 'mm;font-size:' + markPx.toFixed(1) + 'px;color:' + markFg + ';border-color:' + markFg + '" title="' + escapeHtml(c.allergy) + '">A</span>')
        : '';
      const underMark = marked && !corner
        ? (markKind === 'bar'
          ? '<span class="mk mk-bar" style="background:' + markFg + '" title="' + escapeHtml(c.allergy) + '"></span>'
          : '<span class="mk mk-word" style="color:' + markFg + ';font-size:' + wordPx.toFixed(1) + 'px">alergi</span>')
        : '';
      const br = logoSrc
        ? '<img class="brand-logo" src="' + logoSrc + '" alt="">'
        : (o.brand ? '<div class="brand">' + escapeHtml(brandName) + '</div>' : '');
      return '<div class="label' + (cornerMark ? ' has-mark' : '') + '">' + cornerMark + '<div class="name">' + escapeHtml(c.name) + '</div>' + underMark + cls + br + '</div>';
    }).join('');
    /* berhenti di baris terakhir yang terisi, tidak ada kotak kosong di bawahnya */
    const usedRows = Math.ceil(page.length / cols);
    return '<div class="sheet" style="grid-template-columns:repeat(' + cols + ',1fr);' +
      (usedRows ? 'grid-template-rows:repeat(' + usedRows + ',' + rowHmm.toFixed(2) + 'mm)' : '') + '">' + items + '</div>';
  }).join('');
  const edge = o.lines ? (+style.lineW || 2) + 'px solid #A9A092' : '0';
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + DOC_CSP + '<style>' +
    '@page{size:A4;margin:5mm 6mm}' +
    '*{box-sizing:border-box}' +
    'html,body{margin:0;padding:0;background:#fff}' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:' + ink + ';-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '@media screen{body{zoom:' + fit + '}}' +
    '.sheet{display:grid;gap:0;width:' + STICKER_SHEET_W + 'mm;margin:0 auto;border-top:' + edge + ';border-left:' + edge + ';page-break-inside:avoid}' +
    '.sheet + .sheet{margin-top:5mm;page-break-before:always}' +
    '.label{position:relative;border-right:' + edge + ';border-bottom:' + edge + ';background:' + (tone || '#fff') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:' + padMm.toFixed(2) + 'mm ' + (padMm * 0.45).toFixed(2) + 'mm;overflow:hidden;min-height:0;line-height:1.02;gap:.25mm}' +
    '.mk{position:absolute;bottom:.8mm;right:.8mm;display:block}' +
    '.mk-dot{border-radius:50%}' +
    '.mk-letter{border:1.1px solid ' + markFg + ';border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;line-height:1;background:' + (tone || '#fff') + '}' +
    '.mk-bar{position:static;width:34%;height:1.1mm;border-radius:1mm;margin:.9mm auto 0}' +
    '.mk-word{position:static;display:block;font-weight:800;letter-spacing:.5px;text-transform:uppercase;margin-top:.7mm;line-height:1}' +
    '.label.has-mark .brand,.label.has-mark .alg,.label.has-mark .cls{max-width:calc(100% - ' + (markMm + 1).toFixed(1) + 'mm)}' +
    '.name{flex:0 0 auto;font-family:' + nameFont + ';font-weight:700;font-size:' + nameSize.toFixed(1) + 'px;max-width:100%;overflow-wrap:anywhere}' +
    '.cls{flex:0 0 auto;font-family:' + clsFont + ';color:' + clsInk + ';font-weight:700;font-size:' + clsSize.toFixed(1) + 'px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.alg{font-family:' + clsFont + ';font-weight:700;font-size:' + clsSize.toFixed(1) + 'px;line-height:1.08;max-width:100%;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}' +
    '.alg-dot{display:inline-block;width:1.6mm;height:1.6mm;border-radius:50%;margin-right:1mm;vertical-align:middle}' +
    '.brand{flex:0 0 auto;font-family:' + brandFont + ';color:' + brandInk + ';font-size:' + brandSize.toFixed(1) + 'px;letter-spacing:.3px;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.brand-logo{height:' + slotSize.toFixed(1) + 'px;max-width:70%;object-fit:contain;display:block;flex:0 1 auto;min-height:0}' +
    '</style></head><body>' + sheets + '</body></html>';
}
function syncStickerControls() {
  const st = db.settings.sticker;
  const set = (id, v) => { const el = document.getElementById(id); if (el && el.value !== v) el.value = v; };
  set('stickerNameFont', st.nameFont);
  set('stickerClsFont', st.clsFont);
  set('stickerBrandFont', st.brandFont);
  set('stickerLineW', String(st.lineW));
  set('stickerNameScale', String(st.nameScale));
  set('stickerClsScale', String(st.clsScale));
  set('stickerBrandScale', String(st.brandScale));
  setText('stickerNameScaleVal', st.nameScale + '%');
  setText('stickerClsScaleVal', st.clsScale + '%');
  setText('stickerBrandScaleVal', st.brandScale + '%');
  setText('stickerLineVal', st.lineW + ' px');
  const o = stickerOptions();
  set('stickerCellPad', String(st.padV));
  setText('stickerCellPadVal', mmLabel(st.padV) + ' mm');
  set('stickerCellTight', String(st.tight));
  setText('stickerCellTightVal', st.tight + '%');
  const rowNote = document.getElementById('stickerCellPadNote');
  if (rowNote) {
    rowNote.textContent = 'Jarak atas-bawah isi dalam setiap sel; font menyesuaikan ruang yang tersisa · ' +
      o.rows + ' baris · ' + (o.cols * o.rows) + ' stiker per lembar';
  }
  const tightNote = document.getElementById('stickerCellTightNote');
  if (tightNote) {
    const full = +(STICKER_SHEET_H / o.rows).toFixed(1);
    tightNote.textContent = st.tight >= 100
      ? 'Sel memakai tinggi penuh ' + mmLabel(full) + ' mm. Kecilkan untuk mempertebal jarak antar stiker tanpa memperbesar tulisan.'
      : 'Tinggi sel ' + mmLabel(o.rowH) + ' mm dari ' + mmLabel(full) + ' mm. Sisa ruang jadi jarak antar stiker, tulisan ikut mengecil.';
  }
  set('stickerMark', st.mark);
  set('stickerTone', st.tone);
  const toneRow = document.getElementById('stickerToneRow');
  if (toneRow) toneRow.hidden = st.mark === 'none';
  const brandChk = document.getElementById('stickerBrand');
  const linesChk = document.getElementById('stickerLines');
  const brandRow = document.getElementById('stickerBrandRow');
  if (brandRow) brandRow.classList.toggle('is-dim', !(brandChk && brandChk.checked));
  const row = document.getElementById('stickerLineRow');
  if (row) row.classList.toggle('is-dim', !(linesChk && linesChk.checked));
  const markNote = document.getElementById('stickerMarkNote');
  if (markNote) {
    const content = document.getElementById('stickerContent').value;
    if (content !== 'namamark' && content !== 'namealg') {
      markNote.textContent = 'Penanda hanya muncul kalau konten stiker dipilih "Nama + Kelas + penanda alergi" atau "Nama + tulisan alergi".';
    } else if (content === 'namealg') {
      markNote.textContent = 'Isi alergi ditulis langsung di bawah nama; warnanya mengikuti warna penanda, bentuk penanda tidak dipakai di sini.';
    } else {
      markNote.textContent = st.mark === 'none'
        ? 'Anak dengan alergi tidak diberi tanda pada stiker, catatannya tetap ada di aplikasi.'
        : 'Penanda alergi: ' + STK_MARKS[st.mark] + '. Sengaja tanpa tanda seru agar tidak terbaca sebagai rambu bahaya.';
    }
  }
}
function saveStickerStyle() {
  const st = db.settings.sticker;
  const val = (id, fallback) => { const el = document.getElementById(id); return el ? el.value : fallback; };
  st.nameFont = val('stickerNameFont', 'sans');
  st.clsFont = val('stickerClsFont', 'sans');
  st.brandFont = STK_FONTS[val('stickerBrandFont', 'sans')] ? val('stickerBrandFont', 'sans') : 'sans';
  st.lineW = Math.max(0.5, Math.min(6, +val('stickerLineW', 2) || 2));
  st.nameScale = clampScale(val('stickerNameScale', 100), 70, 140);
  st.clsScale = clampScale(val('stickerClsScale', 100), 40, 160);
  st.brandScale = clampScale(val('stickerBrandScale', 100), 40, 200);
  st.padV = Math.min(10, Math.max(0, +val('stickerCellPad', 2.6) || 0));
  st.tight = Math.min(100, Math.max(50, +val('stickerCellTight', 100) || 100));
  st.mark = STK_MARKS[val('stickerMark', 'bar')] ? val('stickerMark', 'bar') : 'bar';
  st.tone = STK_TONES[val('stickerTone', 'soft')] ? val('stickerTone', 'soft') : 'soft';
  save({ noUndo: true });
}
function stickerPreview() {
  syncStickerControls();
  const ids = [...document.querySelectorAll('.sticker-cb:checked')].map(x => x.value);
  const selected = db.customers.filter(c => ids.includes(c.id)).sort(sortCustomers);
  const o = stickerOptions();
  document.getElementById('stickerFrame').srcdoc = buildStickerHTML(selected, o);
  const size = document.getElementById('stickerSize').value;
  document.getElementById('stickerCount').textContent = selected.length + ' stiker · ' + size.replace('x', ' × ') + ' per lembar';
  if (selected.length > o.cols * o.rows) toast('Jumlah melebihi 1 lembar, otomatis dibuat beberapa halaman.');
}

/* ---------- Render: Kertas Konfirmasi ---------- */
function satpamEntries(date, type) {
  const recs = db[type][date] || {};
  const items = menuItemsFor(type, date);
  const out = [];
  for (const id in recs) {
    if (!recs[id].ordered) continue;
    const c = customerById(id);
    const p = pkgFor(type, recs[id], c);
    out.push({
      id: id, name: c ? c.name : '(dihapus)', cls: c ? c.className : '',
      pkg: p ? p.name : '—',
      picks: items.length ? customPicks(type, recs[id]).filter(k => k < items.length) : []
    });
  }
  return out.sort((a, b) => (a.cls + a.name).localeCompare(b.cls + b.name));
}
function buildSatpamHTML(date, type, showClass) {
  const entries = satpamEntries(date, type);
  const ps = printStyleHex();
  const ink = ps.font || '#222';
  const subInk = ps.font || '#555';
  const emInk = ps.font || '#666';
  const tone = ps.tone;
  const rowCss = tone ? 'tbody tr:nth-child(even) td{background:' + mixHex(tone, .55) + '}' : '';
  const offBg = tone ? mixHex(tone, .3) : '#f1efe9';
  const typeLabel = type === 'snack' ? 'Snack' : 'Lunch';
  const menus = menuFor(date).filter(it => menuTypeOf(it) === type);
  const menuHtml = menus.length
    ? '<div class="menu"><strong>Pilihan ' + typeLabel + ':</strong>' + menus.map(m => {
        const parts = menuLines(m.name);
        const pj = menuItemPkg(m);
        return '<div class="mi"><strong>' + escapeHtml(parts[0] || m.name) + '</strong>' +
          (parts.length > 1 ? ' <span class="isi">' + parts.slice(1).map(escapeHtml).join(' · ') + '</span>' : '') +
          (pj ? ' <span class="isi">· ' + escapeHtml(pj.name) + '</span>' : '') + '</div>';
      }).join('') + '</div>'
    : '';
  const foods = menuItemsFor(type, date).slice(0, LETTERS.length);
  const useFoods = foods.length > 0;
  const rows = entries.length
    ? entries.map((e, i) =>
        '<tr><td class="no">' + (i + 1) + '</td><td>' + escapeHtml(e.name) + '</td>' +
        (showClass ? '<td>' + escapeHtml(e.cls) + '</td>' : '') +
        (useFoods
          ? foods.map((f, k) => '<td class="pick' + (e.picks.indexOf(k) >= 0 ? '' : ' off') + '">' + (e.picks.indexOf(k) >= 0 ? '' : '&ndash;') + '</td>').join('')
          : '<td>' + escapeHtml(e.pkg) + '<td class="box"></td>') +
        '</tr>'
      ).join('')
    : '<tr><td colspan="10" style="text-align:center;color:#777">Tidak ada pesanan pada tanggal ini.</td></tr>';
  const caption = useFoods
    ? '<div class="cap">Kolom <b>' + foods.map((f, k) => LETTERS[k]).join(' / ') + '</b> = pilihan makanan anak. Kotak kosong centang saat diserahkan, strip (&ndash;) berarti anak tersebut <b>tidak memilih</b> makanan itu.</div>'
    : '<div class="cap">Belum ada menu ' + typeLabel + ' pada tanggal ini &mdash; kolom Paket + Cek dipakai sementara.</div>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + DOC_CSP + '<style>' +
    '@page{size:A4 portrait;margin:12mm}' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:' + ink + ';font-size:12px}' +
    'h1{font-size:19px;margin:0 0 2mm;letter-spacing:.2px}' +
    '.head{text-align:center;margin-bottom:6mm}' +
    '.head .sub{font-size:11px;color:' + subInk + '}' +
    '.menu{margin:0 0 4mm;font-size:12px}' +
    '.menu .mi{margin:.6mm 0}' +
    '.menu .isi{color:' + subInk + ';font-size:11px}' +
    '.menu em{color:' + emInk + ';font-weight:400}' +
    'table{width:100%;border-collapse:collapse}' +
    'th,td{border:1px solid #555;padding:2.6mm 2mm;text-align:left}' +
    'th{background:' + (tone || '#f3efe8') + ';font-size:11px}' +
    rowCss +
    'td.r,th.r{text-align:right}' +
    'td.box{width:14mm}' +
    'td.no{width:9mm;text-align:center}' +
    '.cap{font-size:10.5px;color:' + subInk + ';margin:0 0 2mm}' +
    'th.pick,td.pick{width:13mm;text-align:center}' +
    'th.pick{font-size:14px;line-height:1.15}' +
    'th.pick small{display:block;font-size:8.5px;font-weight:600;color:' + subInk + ';line-height:1.2;letter-spacing:0;text-transform:none}' +
    'td.pick{font-size:14px;color:#777}' +
    'td.pick.off{background:' + offBg + '}' +
    '.doc-logo{display:block;margin:0 auto 2.5mm;max-width:60mm;object-fit:contain}' +
    '</style></head><body>' +
    '<div class="head">' + logoFor('konfirmasi') + '<h1>' + escapeHtml(db.settings.businessName) + '</h1>' +
    '<div class="sub">Lembar Konfirmasi / Penerimaan · ' + typeLabel + '</div>' +
    '<div class="sub">Tanggal: ' + fmtLong(date) + '</div></div>' +
    menuHtml +
    caption +
    '<table><thead><tr><th class="no">No</th><th>Nama</th>' +
    (showClass ? '<th>Kelas</th>' : '') +
    (useFoods
      ? foods.map((f, k) => {
          const pj = menuItemPkg(f);
          return '<th class="pick">' + LETTERS[k] + '<small>' + escapeHtml(shortTxt(menuLines(f.name)[0] || f.name, 16)) +
            (pj ? ' · ' + escapeHtml(shortTxt(pj.name, 12)) : '') + '</small></th>';
        }).join('')
      : '<th>Paket</th><th class="box">Cek ✓</th>') +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</body></html>';
}
function satpamPreview() {
  const date = state.satpamDate || todayStr();
  const type = state.satpamType;
  const showClass = document.getElementById('satpamShowClass').checked;
  document.getElementById('satpamFrame').srcdoc = buildSatpamHTML(date, type, showClass);
  document.getElementById('satpamCount').textContent = satpamEntries(date, type).length + ' nama';
  setText('satpamDateText', fmtLong(date));
}
function printFrame(frame) {
  /* judul dokumen ikut tercetak sebagai header browser, kosongkan selama dialog cetak terbuka */
  const prev = document.title;
  document.title = ' ';
  try { frame.contentWindow.focus(); frame.contentWindow.print(); }
  catch (e) { toast('Tidak bisa mencetak. Gunakan menu cetak browser.'); }
  document.title = prev;
}

/* ---------- Pengingat & tagihan WhatsApp ---------- */
function diffDays(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((new Date(pb[0], pb[1] - 1, pb[2]) - new Date(pa[0], pa[1] - 1, pa[2])) / 86400000);
}
function occurrenceDate(r, from) {
  if (r.repeat === 'once') return r.date;
  if (r.repeat === 'weekly') {
    if (r.date > from) return r.date;
    return shiftDate(r.date, Math.max(0, Math.floor(diffDays(r.date, from) / 7)) * 7);
  }
  const p = r.date.split('-').map(Number), t = from.split('-').map(Number);
  let y = p[0], m = p[1];
  if (y < t[0] || (y === t[0] && m < t[1])) { y = t[0]; m = t[1]; }
  const clamp = (yy, mm) => yy + '-' + pad(mm) + '-' + pad(Math.min(p[2], new Date(yy, mm, 0).getDate()));
  let d = clamp(y, m);
  if (d < from) { m++; if (m > 12) { m = 1; y++; } d = clamp(y, m); }
  return d;
}
function reminderView() {
  const today = todayStr();
  return db.reminders.map(r => {
    const cur = occurrenceDate(r, today);
    const done = r.doneOn === cur;
    return {
      r: r,
      date: done && r.repeat !== 'once' ? occurrenceDate(r, shiftDate(cur, 1)) : cur,
      done: done,
      overdue: !done && cur < today
    };
  }).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.date.localeCompare(b.date));
}
function reminderDue() {
  const today = todayStr();
  return reminderView().filter(v => !v.done && v.date <= today);
}
function updateReminderBadge() {
  const el = document.getElementById('navReminderBadge');
  if (!el) return;
  const n = reminderDue().length;
  el.hidden = !n;
  el.textContent = n > 9 ? '9+' : String(n);
}

/* ---------- Notifikasi top bar: rangkuman hal yang menunggu perhatian ---------- */
function notifItems() {
  const out = [];
  const today = todayStr();
  const due = reminderDue();
  if (due.length) {
    const late = due.filter(v => v.overdue).length;
    out.push({ nav: 'pengingat', tone: late ? 'red' : 'amber',
      title: due.length + ' pengingat jatuh tempo' + (late ? ' (' + late + ' terlambat)' : ''),
      sub: due.slice(0, 3).map(v => (v.overdue ? 'terlambat · ' : v.date === today ? 'hari ini · ' : fmtShortDate(v.date) + ' · ') + v.r.text).join(' · ') });
  }
  const ds = debtors();
  if (ds.length) {
    out.push({ nav: 'pengingat', tone: 'red', title: ds.length + ' penunggak tagihan',
      sub: 'total sisa ' + fmtIDR(ds.reduce((s, g) => s + g.total, 0)) });
  }
  let pending = 0;
  db.customers.filter(c => c.active).forEach(c => {
    DAY_TYPES.forEach(t => {
      const r = (db[t][today] || {})[c.id];
      if (r && r.ordered && !customPicks(t, r).length && menuItemsFor(t, today).length) pending++;
    });
  });
  if (pending) out.push({ nav: 'hari', tone: 'amber', title: pending + ' pesanan hari ini belum dipilih makanannya', sub: 'buka Hari Ini' });
  ['bahan', 'wadah'].forEach(kind => {
    const list = stockItems(kind);
    const empty = list.filter(x => +x.qty <= 0);
    const low = list.filter(x => +x.qty > 0 && +x.min > 0 && +x.qty <= +x.min);
    if (!empty.length && !low.length) return;
    const parts = [];
    if (empty.length) parts.push(empty.length + ' habis');
    if (low.length) parts.push(low.length + ' menipis');
    const names = empty.concat(low).slice(0, 3).map(x => x.name);
    const more = empty.length + low.length - names.length;
    out.push({ nav: 'stok', stockKind: kind, tone: empty.length ? 'red' : 'amber',
      title: 'Stok ' + STOCK_KIND_LABEL[kind].toLowerCase() + ': ' + parts.join(', '),
      sub: names.join(' · ') + (more > 0 ? ' +' + more + ' lagi' : '') + ' · buka Stok' });
  });
  DAY_TYPES.forEach(t => {
    if (isFullHoliday(today)) return;
    if (!menuItemsFor(t, today).length) out.push({ nav: 'dashboard', tone: 'gray', title: 'Menu ' + TYPE_LABEL[t] + ' hari ini belum diisi', sub: 'atur di kartu Menu pada Beranda' });
  });
  return out;
}
function renderNotif() {
  const items = notifItems();
  const badge = document.getElementById('notifBadge');
  if (badge) {
    badge.hidden = !items.length;
    badge.textContent = items.length > 9 ? '9+' : String(items.length);
  }
  const btn = document.getElementById('notifBtn');
  if (btn) btn.title = items.length ? items.length + ' hal perlu perhatian' : 'Tidak ada yang perlu perhatian';
  setText('notifCount', items.length ? items.length + ' hal' : 'semua beres');
  const list = document.getElementById('notifList');
  if (list) {
    list.innerHTML = items.length
      ? items.map(it => '<button type="button" class="notif-row is-' + it.tone + '" data-nav="' + it.nav + '"' +
          (it.stockKind ? ' data-stock-kind="' + it.stockKind + '"' : '') + '>' +
          '<span class="nr-dot" aria-hidden="true"></span><span class="nr-body"><span class="nr-title">' + escapeHtml(it.title) + '</span>' +
          (it.sub ? '<span class="nr-sub">' + escapeHtml(it.sub) + '</span>' : '') + '</span></button>').join('')
      : '<p class="notif-none">Semua beres: tidak ada pengingat, tagihan, pesanan, atau stok yang menunggu.</p>';
  }
  if (!items.length) closeNotif();
}
function openNotif() {
  const p = document.getElementById('notifPanel');
  if (!p) return;
  renderNotif();
  p.hidden = false;
  const btn = document.getElementById('notifBtn');
  if (btn) btn.setAttribute('aria-expanded', 'true');
}
function closeNotif() {
  const p = document.getElementById('notifPanel');
  if (p) p.hidden = true;
  const btn = document.getElementById('notifBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function toggleNotif() {
  const p = document.getElementById('notifPanel');
  if (p && p.hidden) openNotif(); else closeNotif();
}
function addReminder() {
  const text = (document.getElementById('remText').value || '').trim();
  const date = document.getElementById('remDate').value || todayStr();
  const time = document.getElementById('remTime').value || '';
  const repeat = document.getElementById('remRepeat').value;
  if (!text) { toast('Tulis isi pengingat dulu'); return; }
  db.reminders.push({
    id: uid(), date: date, time: /^\d{1,2}:\d{2}$/.test(time) ? time : '', text: text.slice(0, 120),
    repeat: ['once', 'weekly', 'monthly'].includes(repeat) ? repeat : 'once', doneOn: ''
  });
  logAction('pengingat', 'Tambah pengingat "' + text + '" @ ' + date);
  save(); renderPengingat();
  document.getElementById('remText').value = '';
  toast('Pengingat ditambahkan');
}
/* Pintasan: lompat ke halaman Pengingat dengan form sudah terisi (belum disimpan) */
function prefillReminder(text, date) {
  closeModal();
  showPage('pengingat');
  const t = document.getElementById('remText'), d = document.getElementById('remDate');
  if (t) t.value = String(text || '').slice(0, 120);
  if (d && date) d.value = date;
  const rp = document.getElementById('remRepeat'); if (rp) rp.value = 'once';
  if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
  toast('Tinggal tekan tombol Tambah');
}
function toggleReminder(id) {  const v = reminderView().find(x => x.r.id === id);
  if (!v) return;
  v.r.doneOn = v.done ? '' : v.date;
  logAction('pengingat', (v.r.doneOn ? 'Selesai: ' : 'Buka lagi: ') + v.r.text);
  save(); renderPengingat();
  toast('Pengingat dihapus', { undo: true });
}
function removeReminder(id) {
  const r = db.reminders.find(x => x.id === id);
  if (!r || !confirm('Hapus pengingat "' + r.text + '"?')) return;
  db.reminders = db.reminders.filter(x => x.id !== id);
  logAction('pengingat', 'Hapus pengingat "' + r.text + '"');
  save(); renderPengingat();
  toast('Pengingat dihapus', { undo: true });
}
function renderRemList() {
  const el = document.getElementById('remList');
  if (!el) return;
  const today = todayStr();
  const items = reminderView();
  el.innerHTML = items.map(v => {
    const r = v.r;
    const when = v.date === today ? 'hari ini' : fmtShortDate(v.date) + ' ' + WEEKDAYS[weekdayOf(v.date) - 1];
    return '<div class="rem-item' + (v.done ? ' is-done' : '') + (v.overdue ? ' is-late' : '') + '">' +
      '<button type="button" class="rem-check" data-act="rem-toggle" data-id="' + r.id + '" title="' + (v.done ? 'Buka lagi' : 'Tandai selesai') + '">' + (v.done ? '✓' : '') + '</button>' +
      '<div class="rem-body"><strong>' + escapeHtml(r.text) + '</strong>' +
        '<span class="rem-when">' + (v.overdue ? 'terlambat · ' : '') + when + (r.time ? ' · ' + escapeHtml(r.time) : '') +
        ' <span class="badge orange">' + (r.repeat === 'weekly' ? 'mingguan' : r.repeat === 'monthly' ? 'bulanan' : 'sekali') + '</span>' +
        (v.done ? ' <span class="badge green">selesai</span>' : '') + '</span></div>' +
      '<button type="button" class="icon-act danger" data-act="rem-del" data-id="' + r.id + '" title="Hapus">' + ICO_TRASH + '</button>' +
    '</div>';
  }).join('');
  const empty = document.getElementById('remEmpty');
  if (empty) empty.hidden = items.length > 0;
  setText('remCount', items.length ? items.filter(v => !v.done).length + ' aktif' : '');
  const dateEl = document.getElementById('remDate');
  if (dateEl && !dateEl.value) dateEl.value = today;
  document.getElementById('remStats').innerHTML =
    statCard('Pengingat Aktif', items.filter(v => !v.done).length, 'belum selesai') +
    statCard('Hari Ini', items.filter(v => !v.done && v.date === today).length, 'jatuh tempo', 'primary') +
    statCard('Terlambat', items.filter(v => v.overdue).length, 'perlu dikerjakan', 'danger') +
    statCard('Berulang', items.filter(v => v.r.repeat !== 'once').length, 'mingguan / bulanan');
}
function debtors() {
  const mode = { allTime: true, month: monthKey(todayStr()) };
  const claimed = new Set();
  const merged = {};
  db.customers.forEach(c => {
    const lines = unpaidLines(c, mode);
    const parentKey = (c.parent || '').trim();
    if (parentKey && !claimed.has(parentKey.toLowerCase())) {
      claimed.add(parentKey.toLowerCase());
      poUnpaidFor(parentKey, mode).forEach(l => lines.push(l));
    }
    if (!lines.length) return;
    const who = parentKey || c.name;
    const g = merged[who] || (merged[who] = { who: who, phone: '', kids: [], lines: [], total: 0 });
    g.kids.push(c.name);
    g.lines = g.lines.concat(lines);
    if (!g.phone && c.phone) g.phone = c.phone;
  });
  const finish = g => {
    g.lines.sort((a, b) => a.date.localeCompare(b.date));
    g.total = g.lines.reduce((s, l) => s + l.amount, 0);
    g.weeks = groupByWeek(g.lines);
    g.oldest = g.lines[0].date;
    g.last = g.lines[g.lines.length - 1].date;
    g.days = diffDays(g.oldest, todayStr());
    return g;
  };
  const out = Object.values(merged).map(finish).filter(g => g.total > 0);
  /* pesanan kelompok (lembaga/organisasi) bukan pelanggan, jadi dihitung terpisah agar tidak lolos tagihan */
  poGroups().forEach(g => {
    const lines = g.rows.filter(p => !p.paid && p.method !== 'Gratis').map(p => ({
      date: p.date, type: 'po', label: 'PO ' + g.item + ' × ' + (+p.qty || 0), amount: (+p.qty * +p.price) || 0
    }));
    if (!lines.length) return;
    const grp = finish({
      who: g.org, phone: g.contact || '', kids: [g.pic ? 'PIC ' + g.pic : g.item],
      lines: lines, groupId: g.id, due: g.due || '', invNo: g.invNo || ''
    });
    /* "umur" tunggakan kelompok diukur dari jatuh tempo, bukan tanggal ambil yang bisa masih di masa depan */
    grp.days = grp.due && grp.due < todayStr() ? diffDays(grp.due, todayStr()) : 0;
    out.push(grp);
  });
  return out.sort((a, b) => b.total - a.total || b.days - a.days);
}
function waNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const cc = db.settings.waCountry || '62';
  if (digits.charAt(0) === '0') return cc + digits.slice(1);
  if (digits.indexOf(cc) === 0) return digits;
  return digits;
}
function waRincian(g) {
  return g.weeks.map(w => '• Minggu ' + weekRangeLabel(w.monday) + ' · ' + fmtIDR(w.total)).join('\n') +
    '\n   (' + g.lines.length + ' tagihan sejak ' + fmtShortDate(g.oldest) + ')';
}
function bankText() {
  const s = db.settings;
  const acct = [s.bankName, s.bankNumber].filter(Boolean).join(' ');
  if (!acct) return '';
  return acct + (s.bankHolder ? ' a.n. ' + s.bankHolder : '');
}
function waMessage(g) {
  return String(db.settings.waTemplate)
    .replace(/{orang}/g, g.who)
    .replace(/{anak}/g, g.kids.join(', '))
    .replace(/{usaha}/g, db.settings.businessName)
    .replace(/{rincian}/g, waRincian(g))
    .replace(/{sisa}/g, fmtIDR(g.total))
    .replace(/{terakhir}/g, fmtShortDate(g.last))
    .replace(/{umur}/g, String(g.days))
    .replace(/{jatuh_tempo}/g, g.due ? fmtShortDate(g.due) : 'secepatnya')
    .replace(/{invoice}/g, g.invNo || (g.groupId ? 'belum diterbitkan' : '—'))
    .replace(/{rekening}/g, bankText() || '—');
}
function renderWaList() {
  const el = document.getElementById('waList');
  if (!el) return;
  const gs = debtors();
  state.debtors = gs;
  el.innerHTML = gs.map((g, i) => {
    const num = waNumber(g.phone);
    const late = g.due && g.due < todayStr();
    return '<tr' + (g.groupId ? ' class="is-group"' : '') + '>' +
      '<td><strong>' + escapeHtml(g.who) + '</strong>' +
        (g.groupId ? ' <span class="badge gold" title="pesanan kelompok / lembaga">kelompok</span>' : '') +
        '<div class="muted tiny">' + escapeHtml(g.kids.join(', ')) + ' · ' + g.lines.length + ' tagihan' +
        (g.due ? ' · jatuh tempo ' + fmtShortDate(g.due) + (late ? ' <span class="danger-text">(lewat)</span>' : '') : '') + '</div></td>' +
      '<td class="small">' + (num
        ? escapeHtml(g.phone) + '<div class="muted tiny">→ +' + escapeHtml(num) + '</div>'
        : '<span class="badge orange">belum ada No. HP</span>') + '</td>' +
      '<td class="small">' + fmtShortDate(g.oldest) + ' → ' + fmtShortDate(g.last) +
        '<div class="muted tiny">' + (g.groupId
          ? (g.due ? (late ? 'terlambat ' + g.days + ' hari dari jatuh tempo' : 'belum melewati jatuh tempo') : 'tanpa jatuh tempo')
          : g.days + ' hari' + (g.days > 14 ? ' · menunggak lama' : '')) + '</div></td>' +
      '<td class="num"><span class="danger-text">' + fmtIDR(g.total) + '</span></td>' +
      '<td class="end"><div class="row-actions">' +
        '<button class="btn btn-accent btn-sm" data-act="wa-send" data-i="' + i + '">Kirim WA</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="wa-copy" data-i="' + i + '">Salin</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="wa-open" data-i="' + i + '">' + (g.groupId ? 'Detail PO' : 'Rincian') + '</button>' +
        (g.groupId ? '<button class="btn btn-ghost btn-sm" data-act="po-group-invoice" data-id="' + escapeHtml(g.groupId) + '">Invoice</button>' : '') +
        '<button class="icon-act bell" data-act="rem-prefill"' + (g.groupId ? ' data-id="' + escapeHtml(g.groupId) + '"' : '') +
          ' data-text="' + escapeHtml('Tagih ' + g.who + ' · sisa ' + fmtIDR(g.total)) +
          '" data-date="' + (g.due || shiftDate(todayStr(), 7)) + '" title="Buat pengingat menagih penunggak ini">' + ICO_BELL + '</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
  document.getElementById('waEmpty').hidden = gs.length > 0;
  setText('waCount', gs.length ? gs.length + ' penunggak · ' + fmtIDR(gs.reduce((s, g) => s + g.total, 0)) : '');
}
function renderPengingat() {
  renderRemList();
  renderWaList();
}
function renderRemStrip() {
  const el = document.getElementById('remStrip');
  if (!el) return;
  const today = todayStr();
  const due = reminderDue();
  if (!due.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.innerHTML = due.slice(0, 5).map(v =>
    '<button type="button" class="rem-chip' + (v.overdue ? ' is-late' : '') + '" data-nav="pengingat">' +
      '<span class="rc-when">' + (v.overdue ? 'terlambat' : v.date === today ? 'hari ini' : fmtShortDate(v.date)) +
      (v.r.time ? ' · ' + escapeHtml(v.r.time) : '') + '</span>' +
      '<span class="rc-text">' + escapeHtml(v.r.text) + '</span></button>').join('');
  el.hidden = false;
}
function reminderNudge() {
  const due = reminderDue();
  if (!due.length) return;
  const late = due.filter(v => v.overdue).length;
  toast(due.length + ' pengingat perlu diperhatikan' + (late ? ' (' + late + ' terlambat)' : '') + ' · buka halaman Pengingat');
}
function saveWaSettings() {
  db.settings.waCountry = (document.getElementById('setWaCountry').value || '').replace(/\D/g, '') || '62';
  const tpl = (document.getElementById('setWaTemplate').value || '').trim();
  if (tpl) db.settings.waTemplate = tpl;
  logAction('pengaturan', 'Simpan format pengingat WhatsApp');
  save(); renderSettings();
  if (state.page === 'pengingat') renderPengingat();
  toast('Format pengingat disimpan');
}

/* ---------- Libur (dikelola dari Beranda) ---------- */
const SCOPE_LABEL = { all: 'Semua orang', cohort: 'Angkatan', class: 'Kelas', person: 'Orang' };
/* kotak merah hanya untuk libur seluruhnya, libur sebagian cukup ditandai titik merah */
function isFullHoliday(ymd) { return holidayKind(ymd) === 'all'; }
/* 'all' = seluruhnya libur · 'some' = hanya orang / kelas / angkatan tertentu */
function holidayKind(ymd) {
  let some = false;
  for (const h of db.holidays) {
    if (h.date !== ymd) continue;
    if (h.scope === 'all') return 'all';
    some = true;
  }
  return some ? 'some' : '';
}
/* daftar titik sebuah tanggal: g = ada snack/lunch · r = hanya sebagian orang libur · y = ada PO.
   Libur semua tidak memakai titik sama sekali. menuIkut = tanggal yang baru punya menu pun ikut bertitik. */
function dayDots(ymd, menuIkut) {
  const k = holidayKind(ymd);
  if (k === 'all') return [];
  const out = [];
  if (countOrdered('snack', ymd) || countOrdered('lunch', ymd) || (menuIkut && menuFor(ymd).length)) out.push('g');
  if (k === 'some') out.push('r');
  /* "ada PO hari ini" = sudah ada pembelinya ATAU menunya sudah dibuat (kartu Menu PO / baris PO di menu) */
  if (db.po.some(p => p.date === ymd) || db.poMenus.some(m => m.date === ymd) ||
      menuFor(ymd).some(it => it.type === 'po')) out.push('y');
  return out;
}
function holidayDates(mode) {
  const base = state.menuDate || todayStr();
  if (mode !== 'week') return [base];
  const mon = mondayOf(base);
  const out = [];
  for (let i = 0; i < 7; i++) out.push(shiftDate(mon, i));
  return out;
}
/* Tombol libur mengikuti tab Menu: "Mingguan" saat Menu Mingguan, "Harian" saat Menu Harian */
function syncLiburBtn() {
  const btn = document.getElementById('liburBtn');
  if (!btn) return;
  const daily = state.menuTab === 'daily';
  btn.dataset.act = daily ? 'holiday-day' : 'holiday-week';
  btn.textContent = daily ? 'Libur Harian' : 'Libur Mingguan';
  btn.title = daily ? 'Tandai tanggal terpilih di kalender sebagai libur' : 'Tandai seluruh minggu dari tanggal terpilih sebagai libur';
}
function renderHomeHoliday() {
  syncLiburBtn();
  const sum = document.getElementById('liburSummary');
  if (!sum) return;
  const chips = document.getElementById('liburChips');
  /* hanya minggu / hari yang sedang dibuka yang diberitakan */
  const daily = state.menuTab === 'daily';
  const base = state.menuDate || todayStr();
  const mon = mondayOf(base);
  const dalam = daily ? (h => h.date === base) : (h => h.date >= mon && h.date <= shiftDate(mon, 6));
  const daftar = db.holidays.filter(dalam).sort((a, b) => a.date.localeCompare(b.date));
  sum.textContent = daftar.length
    ? daftar.length + ' tanggal libur ' + (daily ? 'hari ini' : 'minggu ini')
    : 'Tidak ada libur ' + (daily ? 'hari ini' : 'minggu ini');
  if (!chips) return;
  /* tab Harian: agenda libur dipisah dari kalender, di bawah menu, menyamping,
     dan hanya berisi libur tanggal terpilih (tidak ada pesan kalau kosong) */
  const editor = document.getElementById('weekMenuEditor');
  const hint = document.getElementById('menuTabHint');
  if (daily) {
    if (hint && hint.parentElement) hint.insertAdjacentElement('afterend', chips);
    chips.classList.add('is-flat');
  } else {
    if (editor && editor.parentElement) editor.parentElement.insertBefore(chips, editor);
    chips.classList.remove('is-flat');
  }
  chips.innerHTML = daftar.length
    ? daftar.map(h => {
        let who = '';
        if (h.scope === 'person') { const c = customerById(h.value); who = c ? c.name : ''; }
        else if (h.value) who = h.value;
        return '<span class="libur-chip">' + escapeHtml(fmtShortDate(h.date)) + ' · ' + escapeHtml(SCOPE_LABEL[h.scope] || h.scope) +
          (who ? ' · ' + escapeHtml(who) : '') + (h.note ? ' <em>' + escapeHtml(h.note) + '</em>' : '') +
          '<button type="button" class="chip-x" data-act="holiday-remove" data-id="' + escapeHtml(h.id) + '" title="Hapus libur ini">&times;</button></span>';
      }).join('')
    : (daily ? '' : '<span class="muted tiny">Tekan Libur Mingguan supaya pesanan anak tidak terisi otomatis pada tanggal itu.</span>');
}
function openHolidayModal(mode) {
  const dates = holidayDates(mode);
  const span = dates.length === 1 ? fmtLong(dates[0]) : fmtShortDate(dates[0]) + ' – ' + fmtShortDate(dates[6]);
  openModal('<h3>Libur ' + (mode === 'week' ? 'Mingguan' : 'Harian') + '</h3>' +
    '<p class="muted small">' + escapeHtml(span) + (mode === 'week' ? ' (Senin–Minggu yang memuat tanggal terpilih)' : ' (tanggal terpilih di kalender Beranda)') + '</p>' +
    '<label class="field"><span>Berlaku untuk</span><select id="holidayScope" class="input">' +
      Object.keys(SCOPE_LABEL).map(k => '<option value="' + k + '">' + SCOPE_LABEL[k] + '</option>').join('') +
    '</select></label>' +
    '<label class="field" id="holidayValueField"><span>Pilih target</span><select id="holidayValue" class="input"></select></label>' +
    '<div class="field" id="holidayPeopleField" hidden><span>Pilih anak, boleh lebih dari satu</span>' +
      '<input type="text" id="holidayPeopleQ" class="input input-sm" placeholder="cari nama atau kelas…" autocomplete="off">' +
      '<div class="hp-list" id="holidayPeople"></div>' +
      '<span class="muted tiny" id="holidayPeopleCount"></span></div>' +
    '<label class="field"><span>Catatan (opsional)</span><input type="text" id="holidayNote" class="input" placeholder="cth: libur nasional"></label>' +
    '<p class="muted tiny" id="holidayWarn"></p>' +
    '<p class="muted tiny">Sakit atau tidak masuk satu anak cukup dimatikan pesanannya di <em>Pesanan Mingguan</em>, tidak perlu ditandai libur di sini.</p>' +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
    '<button type="button" class="btn btn-primary" data-act="holiday-save" data-mode="' + (mode === 'week' ? 'week' : 'day') + '">Simpan libur</button></div>');
  holidayModalDates = dates;
  renderHolidayValueOptions();
}
/* Target libur dari isi dialog: 'all' = value kosong; 'person' = banyak id; lainnya = satu nilai */
function holidayTargets() {
  const scopeSel = document.getElementById('holidayScope');
  const scope = scopeSel ? scopeSel.value : 'all';
  if (scope === 'all') return { scope: scope, values: [''] };
  if (scope === 'person') {
    const values = Array.from(document.querySelectorAll('#holidayPeople input:checked')).map(i => i.value);
    return { scope: scope, values: values };
  }
  const valSel = document.getElementById('holidayValue');
  return { scope: scope, values: [((valSel && valSel.value) || '')] };
}
/* Hitungan dampak tanpa mengubah data, dipakai peringatan di dialog sebelum menyimpan */
function holidayImpact(dates, scope, values) {
  const semua = scope === 'all';
  let porsi = 0, menu = 0;
  dates.forEach(d => {
    ['snack', 'lunch'].forEach(t => {
      const recs = db[t][d] || {};
      for (const id in recs) {
        if (!recs[id].ordered) continue;
        if (!semua && !leaveHit(scope, values, customerById(id), d)) continue;
        porsi++;
      }
    });
    if (!semua) return;
    menu += (db.menuPlan[d] || []).filter(it => it.type !== 'po').length;
  });
  return { porsi, menu };
}
function leaveHit(scope, values, c, d) {
  return values.some(v => holidayMatch({ date: d, scope: scope, value: v }, c, d));
}
let holidayModalDates = [];
function renderHolidayWarn() {
  const el = document.getElementById('holidayWarn');
  if (!el) return;
  const t = holidayTargets();
  const dampak = holidayImpact(holidayModalDates, t.scope, t.values);
  el.innerHTML = dampak.porsi || dampak.menu
    ? 'Pesanan yang <strong>ikut terhapus</strong>: ' + dampak.porsi + ' porsi snack/lunch' +
      (dampak.menu ? ' + menu snack/lunch ' + dampak.menu + ' pilihan' : '') +
      '. Bisa dikembalikan dengan <em>Urungkan</em>.'
    : 'Pilihan ini tidak menimpa pesanan snack/lunch yang ada, jadi tidak ada yang terhapus.';
}
function renderHolidayValueOptions() {
  const scopeSel = document.getElementById('holidayScope');
  if (!scopeSel) return;
  const scope = scopeSel.value;
  const field = document.getElementById('holidayValueField');
  const sel = document.getElementById('holidayValue');
  const peopleField = document.getElementById('holidayPeopleField');
  const people = document.getElementById('holidayPeople');
  const banyak = scope === 'person';
  field.hidden = banyak || scope === 'all';
  peopleField.hidden = !banyak;
  if (banyak) { renderHolidayPeople(); renderHolidayWarn(); return; }
  if (scope === 'all') { sel.innerHTML = ''; renderHolidayWarn(); return; }
  const pilih = sel.value;
  let opts = [];
  if (scope === 'class') opts = [...new Set(db.customers.map(c => (c.className || '').trim()).filter(Boolean))].sort().map(v => [v, v]);
  else opts = [...new Set(db.customers.map(c => cohortOf(c.className)).filter(Boolean))].sort().map(v => [v, v]);
  sel.innerHTML = opts.length ? opts.map(o => '<option value="' + escapeHtml(o[0]) + '">' + escapeHtml(o[1]) + '</option>').join('') : '<option value="">(tidak ada data)</option>';
  if (opts.some(o => o[0] === pilih)) sel.value = pilih;
  renderHolidayWarn();
}
/* Daftar centang anak: tetap tercentang saat kata kunci dicari, dan urutannya tidak berubah */
function renderHolidayPeople() {
  const box = document.getElementById('holidayPeople');
  if (!box) return;
  const dipilih = new Set(Array.from(box.querySelectorAll('input:checked')).map(i => i.value));
  const anak = db.customers.filter(c => c.active).sort(sortCustomers);
  box.innerHTML = anak.length ? anak.map(c => {
    const label = c.name + (c.className ? (' · ' + c.className) : '');
    return '<label class="hp-row" data-hay="' + escapeHtml((label + ' ' + (c.parent || '')).toLowerCase()) + '">' +
      '<input type="checkbox" data-hp="1" value="' + escapeHtml(c.id) + '"' + (dipilih.has(c.id) ? ' checked' : '') + '>' + escapeHtml(label) + '</label>';
  }).join('') : '<p class="muted tiny">Belum ada pelanggan aktif.</p>';
  filterHolidayPeople();
}
function filterHolidayPeople() {
  const q = ((document.getElementById('holidayPeopleQ') || {}).value || '').trim().toLowerCase();
  let tampil = 0;
  document.querySelectorAll('#holidayPeople .hp-row').forEach(r => {
    const cocok = !q || r.dataset.hay.indexOf(q) >= 0;
    r.hidden = !cocok;
    if (cocok) tampil++;
  });
  const cnt = document.getElementById('holidayPeopleCount');
  const n = document.querySelectorAll('#holidayPeople input:checked').length;
  if (cnt) cnt.textContent = n ? n + ' anak dipilih' : (tampil ? 'Belum ada yang dicentang, centang satu atau beberapa anak' : 'Tidak ada yang cocok dengan pencarian');
}
/* Menandai libur benar-benar mengosongkan hari itu, bukan hanya menyembunyikannya.
   Semua orang libur: pesanan snack+lunch tanggal itu dibuang dan menu snack/lunch-nya
   ikut dihapus (baris PO dipertahankan). Libur sebagian: hanya anak yang kena. */
function clearOrdersForHoliday(dates, scope, values) {
  const semua = scope === 'all';
  let porsi = 0, menu = 0;
  dates.forEach(d => {
    ['snack', 'lunch'].forEach(t => {
      const recs = db[t][d];
      if (!recs) return;
      Object.keys(recs).forEach(id => {
        if (!semua && !leaveHit(scope, values, customerById(id), d)) return;
        if (recs[id].ordered) porsi++;
        delete recs[id];
      });
      if (!Object.keys(recs).length) delete db[t][d];
    });
    if (!semua) return;
    const plan = db.menuPlan[d];
    if (!plan) return;
    const po = plan.filter(it => it.type === 'po');
    menu += plan.length - po.length;
    if (po.length) db.menuPlan[d] = po; else delete db.menuPlan[d];
  });
  return { porsi, menu };
}
function saveHoliday(mode) {
  const t = holidayTargets();
  const scope = t.scope;
  const values = scope === 'all' ? [''] : t.values.filter(Boolean);
  if (scope !== 'all' && !values.length) { toast(scope === 'person' ? 'Centang dulu anak yang libur' : 'Pilih dulu target liburnya'); return; }
  const note = ((document.getElementById('holidayNote') || {}).value || '').trim();
  const dates = holidayDates(mode);
  let added = 0;
  dates.forEach(d => {
    const baru = values.filter(v => !db.holidays.some(h => h.date === d && h.scope === scope && (h.value || '') === v));
    if (!baru.length) return;
    added++;
    baru.forEach(v => db.holidays.push({ id: uid(), date: d, scope: scope, value: v, note: note }));
  });
  closeModal();
  if (!added) { toast('Tanggal itu sudah ditandai libur'); return; }
  const bersih = clearOrdersForHoliday(dates, scope, values.length ? values : ['']);
  const siapa = scope === 'all' ? '' : (scope === 'person'
    ? ' · ' + (values.length <= 3 ? values.map(v => ((customerById(v) || {}).name) || v).join(', ') : values.length + ' anak')
    : ' (' + values[0] + ')');
  logAction('libur', 'Libur ' + (dates.length > 1 ? 'seminggu ' + dates[0] + ' s/d ' + dates[6] : dates[0]) +
    ' · ' + (SCOPE_LABEL[scope] || scope) + siapa +
    (note ? ' · ' + note : '') +
    (bersih.porsi ? ' · ' + bersih.porsi + ' porsi snack/lunch dihapus' : '') +
    (bersih.menu ? ' · menu snack/lunch ' + bersih.menu + ' item dibuang' : ''));
  save();
  renderHomeCalendar();
  renderWeekMenu();
  renderHomeHoliday();
  toast(added + ' tanggal ditandai libur' +
    (scope === 'person' ? ' untuk ' + values.length + ' anak' : '') +
    (bersih.porsi ? ' · ' + bersih.porsi + ' pesanan snack/lunch ikut terhapus' : '') +
    (bersih.menu ? ' · menu snack/lunch dikosongkan' : ''), { undo: !!bersih.porsi || !!bersih.menu });
}
function removeHoliday(id, quiet) {
  const h = db.holidays.find(x => x.id === id);
  if (!h) return false;
  db.holidays = db.holidays.filter(x => x.id !== id);
  logAction('libur', 'Hapus libur ' + h.date + ' (' + (SCOPE_LABEL[h.scope] || h.scope) + ')');
  save();
  renderHomeCalendar();
  renderWeekMenu();
  renderHomeHoliday();
  if (quiet) return true;
  toast('Libur dihapus. Pesanan yang tadi terhapus tidak kembali sendiri, pakai Urungkan bila masih ingin membatalkannya', { undo: true });
  return true;
}

/* ---------- Render: Log Aktivitas ---------- */
function renderLog() {
  const actSel = document.getElementById('logAction');
  if (!actSel) return;
  const cats = [...new Set(db.log.map(l => l.action))].sort();
  const cur = actSel.value;
  actSel.innerHTML = '<option value="">Semua aksi</option>' + cats.map(c => '<option value="' + escapeHtml(c) + '"' + (c === cur ? ' selected' : '') + '>' + escapeHtml(c) + '</option>').join('');
  const q = (document.getElementById('logSearch').value || '').trim().toLowerCase();
  const mo = document.getElementById('logMonth').value;
  let list = db.log.slice();
  if (cur) list = list.filter(l => l.action === cur);
  if (mo) list = list.filter(l => l.ts.slice(0, 7) === mo);
  if (q) list = list.filter(l => (l.action + ' ' + l.detail).toLowerCase().includes(q));
  const canUndo = undoableLogIds();
  document.getElementById('logList').innerHTML = list.map(l => {
    const d = new Date(l.ts);
    const when = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return '<tr><td class="muted">' + escapeHtml(when) + '</td><td><span class="badge orange">' + escapeHtml(l.action) + '</span></td><td>' + escapeHtml(l.detail) + '</td>' +
      '<td class="end">' + (canUndo.has(l.id)
        ? '<button class="btn btn-ghost btn-sm" data-act="log-undo" data-id="' + escapeHtml(l.id) + '" title="Kembalikan data ke sebelum aksi ini">Urungkan</button>'
        : '<span class="muted tiny" title="Hanya ' + UNDO_MAX + ' langkah terakhir yang bisa diurutkan balik">—</span>') + '</td></tr>';
  }).join('');
  document.getElementById('logEmpty').hidden = list.length > 0;
  document.getElementById('logCount').textContent = list.length + ' dari ' + db.log.length + ' entri · ' +
    undoStack.length + ' langkah bisa diurutkan balik';
}

/* ---------- Render: Dapur (bahan, belanja, acak menu) ---------- */
function dapurWeekStart() {
  state.dapurWeek = mondayOf(state.dapurWeek || todayStr());
  return state.dapurWeek;
}
function dapurRangeLabel(start) {
  return fmtShortDate(start) + ' - ' + fmtShortDate(shiftDate(start, 6));
}
function dapurMenuRows(start) {
  const map = new Map();
  for (let i = 0; i < 7; i++) {
    const date = shiftDate(start, i);
    menuPlanItems(date).forEach((it, idx) => {
      const key = recipeKey(it.type, it.name);
      let row = map.get(key);
      if (!row) {
        row = { key, name: it.name, type: recipeBaseType(it.type), dates: [], refDate: date, refIdx: idx, recipe: recipeFor(it.type, it.name) };
        map.set(key, row);
      }
      row.dates.push(date);
      if (!row.recipe) row.recipe = recipeFor(it.type, it.name);
    });
  }
  const order = { snack: 0, lunch: 1, po: 2 };
  return [...map.values()].sort((a, b) => order[a.type] - order[b.type] || flatName(a.name).localeCompare(flatName(b.name), 'id'));
}
function dapurShopping(start) {
  const by = new Map();
  let menuCount = 0, withRecipe = 0, without = 0;
  for (let i = 0; i < 7; i++) {
    const date = shiftDate(start, i);
    menuPlanItems(date).forEach(it => {
      menuCount++;
      const r = recipeFor(it.type, it.name);
      if (!r) { without++; return; }
      withRecipe++;
      r.ingredients.forEach(g => {
        const unit = (g.unit || '').trim();
        const key = g.name.toLowerCase() + '|' + unit.toLowerCase();
        let x = by.get(key);
        if (!x) { x = { name: g.name, unit: unit, qty: 0, hasQty: false }; by.set(key, x); }
        if (+g.qty > 0) { x.qty += +g.qty; x.hasQty = true; }
      });
    });
  }
  const items = [...by.values()].sort((a, b) => a.name.localeCompare(b.name, 'id') || a.unit.localeCompare(b.unit, 'id'));
  items.forEach(x => {
    x.stock = stockQtyFor(x.name, x.unit);
    x.buy = x.hasQty ? Math.max(0, Math.round((x.qty - x.stock) * 100) / 100) : 0;
  });
  return { items, menuCount, withRecipe, without, needCount: items.filter(x => !x.hasQty || x.buy > 0).length };
}
function fmtQtyNum(q) { return String(Math.round((+q || 0) * 100) / 100).replace('.', ','); }
function dapurShopText(start) {
  const shop = dapurShopping(start);
  const need = shop.items.filter(x => !x.hasQty || x.buy > 0);
  return 'Daftar belanja ' + dapurRangeLabel(start) + '\n' +
    need.map(x => '• ' + x.name + ': ' + (!x.hasQty ? 'secukupnya' : fmtQtyNum(x.buy) + (x.unit ? ' ' + x.unit : ''))).join('\n');
}
function renderDapur() {
  const start = dapurWeekStart();
  setText('dapurWeekText', dapurRangeLabel(start));
  const menus = dapurMenuRows(start);
  const shop = dapurShopping(start);
  const withRecipe = menus.filter(m => m.recipe).length;
  const stat = document.getElementById('dapurStats');
  if (stat) stat.innerHTML =
    statCard('Menu dengan resep', withRecipe, 'dari ' + menus.length + ' menu minggu ini', 'primary') +
    statCard('Bahan unik', shop.items.length, 'siap jadi daftar belanja', 'accent') +
    statCard('Menu tanpa resep', Math.max(0, menus.length - withRecipe), 'klik Atur resep untuk melengkapi', '');

  const list = document.getElementById('dapurMenuList');
  if (list) list.innerHTML = menus.map(m => {
    const lines = menuLines(m.name);
    const days = [...new Set(m.dates.map(d => WEEKDAYS[weekdayOf(d) - 1]))].join(', ');
    const sub = [lines.slice(1).join(' · '), days].filter(Boolean).join(' · ');
    const n = m.recipe ? m.recipe.ingredients.length : 0;
    return '<tr>' +
      '<td><div class="dapur-menu-name"><strong>' + escapeHtml(lines[0] || flatName(m.name)) + '</strong>' +
        (sub ? '<small>' + escapeHtml(sub) + '</small>' : '') + '</div></td>' +
      '<td class="c"><span class="badge ' + (m.type === 'lunch' ? 'green' : m.type === 'po' ? 'gold' : 'orange') + '">' + RECIPE_TYPE_LABEL[m.type] + '</span></td>' +
      '<td class="num">' + (n ? n + ' bahan' : '<span class="muted">belum</span>') + '</td>' +
      '<td class="end"><button class="btn btn-ghost btn-sm" data-act="recipe-menu" data-date="' + m.refDate + '" data-idx="' + m.refIdx + '">' +
        (m.recipe ? 'Ubah resep' : 'Atur resep') + '</button></td>' +
    '</tr>';
  }).join('');
  const menuEmpty = document.getElementById('dapurMenuEmpty');
  if (menuEmpty) menuEmpty.hidden = menus.length > 0;
  setText('dapurMenuCount', menus.length + ' menu');

  const shopList = document.getElementById('dapurShopList');
  if (shopList) shopList.innerHTML = shop.items.map(x => {
    const sat = x.unit ? ' ' + x.unit : '';
    const stockTxt = 'stok ' + (x.stock > 0 ? fmtQtyNum(x.stock) + sat : 'kosong');
    const main = !x.hasQty ? 'secukupnya' : x.buy > 0 ? 'beli ' + fmtQtyNum(x.buy) + sat : 'cukup';
    const sub = x.hasQty ? 'perlu ' + fmtQtyNum(x.qty) + sat + ' · ' + stockTxt : stockTxt;
    return '<div class="shop-row"><strong>' + escapeHtml(x.name) + '</strong><span class="shop-qty">' + escapeHtml(main) + '<small>' + escapeHtml(sub) + '</small></span></div>';
  }).join('');
  const shopEmpty = document.getElementById('dapurShopEmpty');
  if (shopEmpty) shopEmpty.hidden = shop.items.length > 0;
  setText('dapurShopCount', shop.items.length + ' bahan · ' + shop.withRecipe + ' menu');
  const covered = shop.items.filter(x => x.hasQty && x.buy === 0).length;
  setText('dapurShopNote', 'Bahan digabung dari semua menu minggu ini. Stok yang ada dikurangkan otomatis' + (covered ? ' · ' + covered + ' bahan sudah cukup' : '') + '.');

  const q = (state.dapurQ || '').trim().toLowerCase();
  const search = document.getElementById('dapurRecipeSearch');
  if (search && search.value !== state.dapurQ) search.value = state.dapurQ;
  const allRecipes = db.recipes.slice().sort((a, b) =>
    ({ snack: 0, lunch: 1, po: 2 })[a.type] - ({ snack: 0, lunch: 1, po: 2 })[b.type] || flatName(a.name).localeCompare(flatName(b.name), 'id'));
  const recipes = !q ? allRecipes : allRecipes.filter(r =>
    [flatName(r.name), r.note, r.steps, r.ingredients.map(g => g.name).join(' ')].join(' ').toLowerCase().includes(q));
  const recList = document.getElementById('dapurRecipeList');
  if (recList) recList.innerHTML = recipes.map(r => {
    const lines = menuLines(r.name);
    const ing = r.ingredients.map(g => g.name + (+g.qty > 0 ? ' ' + fmtQtyNum(g.qty) + (g.unit ? ' ' + g.unit : '') : '')).join(', ');
    const steps = r.steps
      ? '<details class="recipe-steps"><summary>Cara membuat</summary><div>' + escapeHtml(r.steps).replace(/\n/g, '<br>') + '</div></details>'
      : '';
    return '<tr>' +
      '<td><div class="dapur-menu-name"><strong>' + escapeHtml(lines[0] || r.name) + '</strong>' +
        (lines.length > 1 ? '<small>' + escapeHtml(lines.slice(1).join(' · ')) + '</small>' : '') + '</div></td>' +
      '<td class="c"><span class="badge ' + (r.type === 'lunch' ? 'green' : r.type === 'po' ? 'gold' : 'orange') + '">' + RECIPE_TYPE_LABEL[r.type] + '</span></td>' +
      '<td class="small">' + (ing ? escapeHtml(ing) : '<span class="muted">belum ada bahan</span>') +
        (r.note ? '<div class="muted tiny">' + escapeHtml(r.note) + '</div>' : '') + steps + '</td>' +
      '<td class="end"><div class="dapur-row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-act="recipe-remind" data-id="' + r.id + '" title="Isi pengingat beli bahan menu ini">Pengingat</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="recipe-edit" data-id="' + r.id + '">Ubah</button>' +
        '<button class="icon-act danger" data-act="recipe-delete" data-id="' + r.id + '" title="Hapus resep">×</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
  const recEmpty = document.getElementById('dapurEmpty');
  if (recEmpty) {
    recEmpty.hidden = recipes.length > 0;
    recEmpty.textContent = q ? 'Tidak ada resep yang cocok dengan pencarian.' : 'Belum ada resep. Klik + Resep.';
  }
  setText('dapurCount', q ? recipes.length + ' dari ' + allRecipes.length + ' resep' : allRecipes.length + ' resep');

  const ns = db.recipes.filter(r => r.type === 'snack' && r.ingredients.length).length;
  const nl = db.recipes.filter(r => r.type === 'lunch' && r.ingredients.length).length;
  const prev = previousWeekMenuInfo(start);
  const prevTxt = (prev.names.snack.size || prev.names.lunch.size)
    ? ' Minggu lalu: ' + prev.names.snack.size + ' menu snack dan ' + prev.names.lunch.size + ' menu lunch.'
    : '';
  setText('dapurRandInfo', (ns || nl)
    ? 'Tersedia ' + ns + ' menu snack dan ' + nl + ' menu lunch yang punya resep.' + prevTxt
    : 'Belum ada menu dengan resep. Tambahkan dulu lewat + Resep.');
}
function recipeRowHtml(g) {
  g = g || {};
  return '<div class="recipe-row">' +
    '<input class="input input-sm recipe-ing-name" placeholder="Nama bahan" value="' + escapeHtml(g.name || '') + '">' +
    '<input class="input input-sm recipe-ing-qty" type="number" min="0" step="any" placeholder="Qty" value="' + (g.qty || '') + '">' +
    '<input class="input input-sm recipe-ing-unit" list="recipeUnits" placeholder="Satuan" value="' + escapeHtml(g.unit || '') + '">' +
    '<button type="button" class="icon-act danger" data-act="recipe-row-del" title="Hapus bahan">×</button>' +
  '</div>';
}
function openRecipeModal(opts) {
  opts = opts || {};
  const rec = opts.recipeId
    ? db.recipes.find(r => r.id === opts.recipeId)
    : (opts.name ? recipeFor(opts.type, opts.name) : null);
  const type = rec ? rec.type : (RECIPE_TYPE_LABEL[opts.type] ? opts.type : 'snack');
  const name = rec ? rec.name : (opts.name || '');
  const ingredients = rec && rec.ingredients.length ? rec.ingredients : [{}];
  openModal(
    '<h3>' + (rec ? 'Ubah Resep' : 'Resep Baru') + '</h3>' +
    '<label class="field"><span>Nama menu</span><textarea id="recipeName" class="input" rows="3" placeholder="Nama menu, boleh beberapa baris">' + escapeHtml(name) + '</textarea></label>' +
    '<div class="pkg-pair">' +
      '<label class="field"><span>Jenis</span><select id="recipeType" class="input">' +
        ['snack', 'lunch', 'po'].map(t => '<option value="' + t + '"' + (t === type ? ' selected' : '') + '>' + RECIPE_TYPE_LABEL[t] + '</option>').join('') +
      '</select></label>' +
      '<label class="field"><span>Catatan (opsional)</span><input type="text" id="recipeNote" class="input" maxlength="160" value="' + escapeHtml(rec ? rec.note : '') + '"></label>' +
    '</div>' +
    '<div class="field"><span>Bahan</span><div id="recipeRows" class="recipe-grid">' + ingredients.map(recipeRowHtml).join('') + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="recipe-row-add">+ Tambah bahan</button></div>' +
    '<label class="field"><span>Cara membuat (opsional)</span><textarea id="recipeSteps" class="input" rows="4" placeholder="Tulis langkah memasak, satu baris per langkah">' + escapeHtml(rec ? rec.steps : '') + '</textarea></label>' +
    '<datalist id="recipeUnits">' + RECIPE_UNITS.map(u => '<option value="' + u + '">').join('') + '</datalist>' +
    '<input type="hidden" id="recipeId" value="' + escapeHtml(rec ? rec.id : '') + '">' +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
    '<button type="button" class="btn btn-primary" data-act="recipe-save">Simpan Resep</button></div>', true
  );
}
function saveRecipeModal() {
  const name = (document.getElementById('recipeName').value || '').trim();
  const type = document.getElementById('recipeType').value;
  const note = (document.getElementById('recipeNote').value || '').trim();
  const steps = (document.getElementById('recipeSteps').value || '').trim();
  const id = document.getElementById('recipeId').value;
  if (!name) { toast('Tulis nama menu dulu'); return; }
  const ingredients = [...document.querySelectorAll('#recipeRows .recipe-row')].map(row => ({
    name: (row.querySelector('.recipe-ing-name').value || '').trim(),
    qty: +row.querySelector('.recipe-ing-qty').value > 0 ? +row.querySelector('.recipe-ing-qty').value : '',
    unit: (row.querySelector('.recipe-ing-unit').value || '').trim()
  })).filter(g => g.name);
  const dup = db.recipes.find(r => r.id !== id && recipeKey(r.type, r.name) === recipeKey(type, name));
  if (dup) { toast('Resep untuk menu itu sudah ada di daftar'); return; }
  const old = id ? db.recipes.find(r => r.id === id) : null;
  const data = { name, type: ['snack', 'lunch', 'po'].includes(type) ? type : 'snack', note, steps, ingredients };
  if (old) {
    Object.assign(old, data);
    logAction('dapur', 'Ubah resep ' + flatName(name));
  } else {
    db.recipes.push(Object.assign({ id: uid() }, data));
    logAction('dapur', 'Tambah resep ' + flatName(name));
  }
  save();
  closeModal();
  if (state.page === 'dapur') renderDapur();
  toast(old ? 'Resep diperbarui' : 'Resep ditambahkan');
}
function recipeReminder(id) {
  const r = db.recipes.find(x => x.id === id);
  if (!r) return;
  const ing = r.ingredients.slice(0, 4).map(g => g.name + (+g.qty > 0 ? ' ' + fmtQtyNum(g.qty) + (g.unit ? ' ' + g.unit : '') : '')).join(', ');
  const more = r.ingredients.length > 4 ? ', dll' : '';
  prefillReminder(('Belanja bahan ' + (menuLines(r.name)[0] || r.name) + ': ' + ing + more).slice(0, 120), todayStr());
}
function dapurCopyList() {
  const start = dapurWeekStart();
  const shop = dapurShopping(start);
  const need = shop.items.filter(x => !x.hasQty || x.buy > 0);
  if (!need.length) { toast('Stok bahan minggu ini sudah cukup'); return; }
  copyText(dapurShopText(start));
}
function dapurMakeReminder() {
  const start = dapurWeekStart();
  const shop = dapurShopping(start);
  const need = shop.items.filter(x => !x.hasQty || x.buy > 0);
  if (!need.length) { toast('Stok bahan minggu ini sudah cukup'); return; }
  const first = need.slice(0, 3).map(x => x.name + (x.hasQty ? ' ' + fmtQtyNum(x.buy) + (x.unit ? ' ' + x.unit : '') : '')).join(', ');
  const rest = need.length > 3 ? ', +' + (need.length - 3) + ' bahan lain' : '';
  const text = ('Belanja bahan ' + dapurRangeLabel(start) + ': ' + first + rest + '. Rincian di halaman Dapur.').slice(0, 120);
  const due = shiftDate(start, -1);
  prefillReminder(text, due < todayStr() ? todayStr() : due);
}
/* Menu biasa minggu sebelumnya, dipakai filter "hindari menu minggu lalu" */
function previousWeekMenuInfo(start) {
  const prev = shiftDate(start, -7);
  const names = { snack: new Set(), lunch: new Set() };
  const slots = new Map();
  for (let i = 0; i < 5; i++) {
    const date = shiftDate(prev, i);
    menuPlanItems(date).forEach(it => {
      if (it.type !== 'snack' && it.type !== 'lunch') return;
      const name = flatName(it.name);
      if (!name) return;
      names[it.type].add(name);
      const key = it.type + '|' + i;
      if (!slots.has(key)) slots.set(key, new Set());
      slots.get(key).add(name);
    });
  }
  return { names, slots };
}
/* Pilih menu acak: utamakan yang belum dipakai minggu ini dan belum muncul minggu lalu.
   Kalau pilihan habis, jatuh ke menu lain yang tidak sama dengan hari yang sama minggu lalu. */
function pickRandomRecipe(pool, used, last, type, dayIdx, noRepeat) {
  if (!pool.length) return null;
  const slot = last.slots.get(type + '|' + dayIdx) || new Set();
  const nameOf = r => flatName(r.name);
  const countOf = r => used.get(nameOf(r)) || 0;
  const tiers = noRepeat ? [
    pool.filter(r => !last.names[type].has(nameOf(r)) && countOf(r) === 0),
    pool.filter(r => !slot.has(nameOf(r)) && countOf(r) === 0),
    pool.filter(r => !last.names[type].has(nameOf(r))),
    pool.filter(r => !slot.has(nameOf(r))),
    pool.filter(r => countOf(r) === 0),
    pool
  ] : [
    pool.filter(r => countOf(r) === 0),
    pool
  ];
  const cands = tiers.find(list => list.length) || pool;
  const min = Math.min(...cands.map(countOf));
  const best = cands.filter(r => countOf(r) === min);
  const r = best[Math.floor(Math.random() * best.length)];
  const name = nameOf(r);
  used.set(name, (used.get(name) || 0) + 1);
  return r;
}
function randomizeDapurWeek() {
  const start = dapurWeekStart();
  const wantSnack = document.getElementById('dapurRandSnack').checked;
  const wantLunch = document.getElementById('dapurRandLunch').checked;
  const noRepeat = document.getElementById('dapurRandNoRepeat').checked;
  if (!wantSnack && !wantLunch) { toast('Centang Snack atau Lunch dulu'); return; }
  const pools = {
    snack: wantSnack ? db.recipes.filter(r => r.type === 'snack' && r.ingredients.length) : [],
    lunch: wantLunch ? db.recipes.filter(r => r.type === 'lunch' && r.ingredients.length) : []
  };
  if (wantSnack && !pools.snack.length) { toast('Belum ada resep menu snack'); return; }
  if (wantLunch && !pools.lunch.length) { toast('Belum ada resep menu lunch'); return; }
  const last = previousWeekMenuInfo(start);
  const lastRelevant = (wantSnack && last.names.snack.size) || (wantLunch && last.names.lunch.size);
  if (!confirm('Acak menu ' + dapurRangeLabel(start) + '? Menu biasa snack/lunch akan diganti. Menu spesial dan PO tetap.' +
    (noRepeat ? ' Menu yang sama dengan minggu lalu dihindari bila ada pilihan lain.' : ''))) return;
  let changed = 0, skipped = 0, repeatLast = 0;
  const used = { snack: new Map(), lunch: new Map() };
  for (let i = 0; i < 5; i++) {
    const date = shiftDate(start, i);
    if (isFullHoliday(date)) { skipped++; continue; }
    let items = menuPlanItems(date).slice();
    ['snack', 'lunch'].forEach(type => {
      if (!pools[type].length) return;
      items = items.filter(it => it.type !== type);
      if (items.length >= WEEK_MENU_MAX) return;
      const r = pickRandomRecipe(pools[type], used[type], last, type, i, noRepeat);
      if (!r) return;
      if (noRepeat && last.names[type].has(flatName(r.name))) repeatLast++;
      items.push({ name: r.name, type: type, pkg: '', price: '' });
      changed++;
    });
    writeMenuPlan(date, items);
  }
  if (!changed) { toast('Tidak ada menu yang bisa diacak'); return; }
  logAction('dapur', 'Acak menu ' + start + ' · ' + changed + ' menu' + (noRepeat ? ' · hindari minggu lalu' : ''));
  save();
  renderDapur();
  let note = '';
  if (noRepeat && lastRelevant) note = repeatLast ? ' · ' + repeatLast + ' baris mengulang minggu lalu' : ' · semua beda dari minggu lalu';
  toast('Menu diacak: ' + changed + ' baris' + (skipped ? ' · ' + skipped + ' hari libur dilewati' : '') + note);
}

/* ---------- Stok bahan & tempat makan ---------- */
function stockKindOf(kind) { return kind === 'wadah' ? 'wadah' : 'bahan'; }
function stockItems(kind) { return (db.stock && db.stock[stockKindOf(kind)]) || []; }
function stockById(kind, id) { return stockItems(kind).find(x => x.id === id) || null; }
function stockQtyFor(name, unit) {
  const n = String(name || '').trim().toLowerCase();
  const u = String(unit || '').trim().toLowerCase();
  return stockItems('bahan')
    .filter(x => x.name.toLowerCase() === n && x.unit.toLowerCase() === u)
    .reduce((s, x) => s + (+x.qty || 0), 0);
}
function stockStatus(x) {
  if (+x.qty <= 0) return { label: 'Habis', cls: 'danger' };
  if (+x.min > 0 && +x.qty <= +x.min) return { label: 'Menipis', cls: 'orange' };
  return { label: 'Aman', cls: 'green' };
}
function fmtStockQty(x) { return fmtQtyNum(x.qty) + (x.unit ? ' ' + x.unit : ''); }
function renderStok() {
  const kind = stockKindOf(state.stockKind);
  state.stockKind = kind;
  document.querySelectorAll('[data-act="stock-kind"]').forEach(b => b.classList.toggle('is-on', b.dataset.kind === kind));
  const label = STOCK_KIND_LABEL[kind];
  setText('stockTitle', 'Stok ' + label);
  setText('stockAddBtn', '+ ' + label);
  const list = stockItems(kind).slice().sort((a, b) => a.name.localeCompare(b.name, 'id') || a.unit.localeCompare(b.unit, 'id'));
  const low = list.filter(x => +x.qty > 0 && +x.min > 0 && +x.qty <= +x.min).length;
  const empty = list.filter(x => +x.qty <= 0).length;
  const stat = document.getElementById('stockStats');
  if (stat) stat.innerHTML =
    statCard('Jenis Tercatat', list.length, 'di ' + label.toLowerCase(), 'primary') +
    statCard('Menipis', low, 'sudah di batas minimum', 'gold') +
    statCard('Habis', empty, 'perlu segera dibeli', 'danger');
  const tb = document.getElementById('stockList');
  if (tb) tb.innerHTML = list.map(x => {
    const st = stockStatus(x);
    return '<tr>' +
      '<td><div class="dapur-menu-name"><strong>' + escapeHtml(x.name) + '</strong>' +
        (x.note ? '<small>' + escapeHtml(x.note) + '</small>' : '') + '</div></td>' +
      '<td class="num">' + escapeHtml(fmtStockQty(x)) + '</td>' +
      '<td class="num">' + (+x.min > 0 ? escapeHtml(fmtQtyNum(x.min) + (x.unit ? ' ' + x.unit : '')) : '<span class="muted">-</span>') + '</td>' +
      '<td class="c"><span class="badge ' + st.cls + '">' + st.label + '</span></td>' +
      '<td class="end"><div class="dapur-row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-act="stock-in" data-kind="' + kind + '" data-id="' + escapeHtml(x.id) + '">+ Stok</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="stock-edit" data-kind="' + kind + '" data-id="' + escapeHtml(x.id) + '">Ubah</button>' +
        '<button class="icon-act danger" data-act="stock-delete" data-kind="' + kind + '" data-id="' + escapeHtml(x.id) + '" title="Hapus item">×</button>' +
      '</div></td></tr>';
  }).join('');
  const em = document.getElementById('stockEmpty');
  if (em) em.hidden = list.length > 0;
  setText('stockCount', list.length + ' item');
}
function openStockItemModal(kind, id) {
  kind = stockKindOf(kind);
  const it = id ? stockById(kind, id) : null;
  openModal(
    '<h3>' + (it ? 'Ubah' : 'Tambah') + ' Stok ' + STOCK_KIND_LABEL[kind] + '</h3>' +
    '<input type="hidden" id="stockItemId" value="' + escapeHtml(it ? it.id : '') + '">' +
    '<input type="hidden" id="stockItemKind" value="' + kind + '">' +
    '<label class="field"><span>Nama item</span><input type="text" id="stockItemName" class="input" maxlength="80" placeholder="mis. ' + (kind === 'wadah' ? 'Kotak snack' : 'Beras') + '" value="' + escapeHtml(it ? it.name : '') + '"></label>' +
    '<div class="pkg-pair">' +
      '<label class="field"><span>Satuan</span><input type="text" id="stockItemUnit" class="input" list="stockUnits" maxlength="16" placeholder="kg" value="' + escapeHtml(it ? it.unit : (kind === 'wadah' ? 'pcs' : 'kg')) + '"></label>' +
      '<label class="field"><span>Stok saat ini</span><input type="number" id="stockItemQty" class="input" min="0" step="any" value="' + (it ? it.qty : 0) + '"></label>' +
    '</div>' +
    '<div class="pkg-pair">' +
      '<label class="field"><span>Minimum (opsional)</span><input type="number" id="stockItemMin" class="input" min="0" step="any" value="' + (it ? it.min : 0) + '"></label>' +
      '<label class="field"><span>Catatan (opsional)</span><input type="text" id="stockItemNote" class="input" maxlength="160" value="' + escapeHtml(it ? it.note : '') + '"></label>' +
    '</div>' +
    '<datalist id="stockUnits">' + STOCK_UNITS.map(u => '<option value="' + u + '">').join('') + '</datalist>' +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
    '<button type="button" class="btn btn-primary" data-act="stock-save">Simpan</button></div>'
  );
}
function saveStockItemModal() {
  const kind = stockKindOf(document.getElementById('stockItemKind').value);
  const id = document.getElementById('stockItemId').value;
  const name = (document.getElementById('stockItemName').value || '').trim();
  const unit = (document.getElementById('stockItemUnit').value || '').trim();
  const qty = Math.max(0, +document.getElementById('stockItemQty').value || 0);
  const min = Math.max(0, +document.getElementById('stockItemMin').value || 0);
  const note = (document.getElementById('stockItemNote').value || '').trim();
  if (!name) { toast('Tulis nama item dulu'); return; }
  if (!unit) { toast('Isi satuannya dulu'); return; }
  const dup = stockItems(kind).find(x => x.id !== id && x.name.toLowerCase() === name.toLowerCase() && x.unit.toLowerCase() === unit.toLowerCase());
  if (dup) { toast('Item dengan nama dan satuan itu sudah ada'); return; }
  const old = id ? stockById(kind, id) : null;
  if (old) {
    Object.assign(old, { name, unit, qty, min, note });
    logAction('stok', 'Ubah stok ' + name);
  } else {
    stockItems(kind).push({ id: uid(), name, unit, qty, min, note });
    logAction('stok', 'Tambah stok ' + name + ' · ' + fmtQtyNum(qty) + (unit ? ' ' + unit : ''));
  }
  save();
  closeModal();
  if (state.page === 'stok') renderStok();
  toast(old ? 'Stok diperbarui' : 'Item stok ditambahkan');
}
function openStockMoveModal(kind, id) {
  kind = stockKindOf(kind);
  const it = stockById(kind, id);
  if (!it) return;
  openModal(
    '<h3>Tambah Stok</h3>' +
    '<div class="po-menu-info">' +
      '<div><span class="po-info-label">Item</span><strong>' + escapeHtml(it.name) + '</strong></div>' +
      '<div><span class="po-info-label">Stok sekarang</span><strong>' + escapeHtml(fmtStockQty(it)) + '</strong></div>' +
      '<div><span class="po-info-label">Satuan</span><strong>' + escapeHtml(it.unit || '-') + '</strong></div>' +
    '</div>' +
    '<input type="hidden" id="stockMoveKind" value="' + kind + '">' +
    '<input type="hidden" id="stockMoveId" value="' + escapeHtml(it.id) + '">' +
    '<label class="field"><span>Jumlah masuk</span><input type="number" id="stockMoveQty" class="input" min="0" step="any" value="" placeholder="0"></label>' +
    '<label class="field"><span>Catatan (opsional)</span><input type="text" id="stockMoveNote" class="input" maxlength="160" placeholder="mis. beli di pasar"></label>' +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
    '<button type="button" class="btn btn-primary" data-act="stock-move-save">Tambah ke Stok</button></div>'
  );
}
function saveStockMoveModal() {
  const kind = stockKindOf(document.getElementById('stockMoveKind').value);
  const id = document.getElementById('stockMoveId').value;
  const it = stockById(kind, id);
  const qty = +document.getElementById('stockMoveQty').value || 0;
  if (!it) { toast('Item stoknya sudah tidak ada'); return; }
  if (!(qty > 0)) { toast('Isi jumlah stok yang masuk'); return; }
  it.qty = Math.min(999999, Math.round((+it.qty + qty) * 100) / 100);
  const note = (document.getElementById('stockMoveNote').value || '').trim();
  if (note) it.note = note.slice(0, 160);
  logAction('stok', 'Tambah stok ' + it.name + ' · ' + fmtQtyNum(qty) + (it.unit ? ' ' + it.unit : ''));
  save();
  closeModal();
  if (state.page === 'stok') renderStok();
  toast('Stok ' + it.name + ' bertambah');
}

/* ---------- Pengeluaran operasional ---------- */
function expenseByMonth() {
  const map = {};
  db.expenses.forEach(e => { map[monthKey(e.date)] = (map[monthKey(e.date)] || 0) + e.amount; });
  return map;
}
function renderExpenses() {
  const m = state.expMonth || monthKey(todayStr());
  setText('expMonthText', monthTitle(m));
  const list = db.expenses.filter(e => monthKey(e.date) === m).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const total = list.reduce((s, e) => s + e.amount, 0);
  const income = incomeByMonth()[m] || 0;
  const net = income - total;
  const stat = document.getElementById('expStats');
  if (stat) stat.innerHTML =
    statCard('Pengeluaran', fmtIDR(total), monthTitle(m), 'danger') +
    statCard('Omset Dibayar', fmtIDR(income), 'transaksi lunas bulan ini', 'gold') +
    statCard('Laba Kotor', fmtIDR(net), net >= 0 ? 'omset dikurangi pengeluaran' : 'pengeluaran melebihi omset', net >= 0 ? 'accent' : 'danger') +
    statCard('Catatan', list.length, 'pengeluaran bulan ini');
  const tb = document.getElementById('expList');
  if (tb) tb.innerHTML = list.map(e =>
    '<tr><td class="muted small">' + escapeHtml(fmtShortDate(e.date)) + '</td>' +
    '<td><span class="badge orange">' + escapeHtml(e.category) + '</span></td>' +
    '<td>' + (e.note ? escapeHtml(e.note) : '<span class="muted">-</span>') + '</td>' +
    '<td class="num">' + escapeHtml(fmtIDR(e.amount)) + '</td>' +
    '<td class="end"><div class="dapur-row-actions">' +
      '<button class="btn btn-ghost btn-sm" data-act="expense-edit" data-id="' + escapeHtml(e.id) + '">Ubah</button>' +
      '<button class="icon-act danger" data-act="expense-delete" data-id="' + escapeHtml(e.id) + '" title="Hapus pengeluaran">×</button>' +
    '</div></td></tr>').join('');
  const em = document.getElementById('expEmpty');
  if (em) em.hidden = list.length > 0;
  setText('expCount', list.length + ' catatan · ' + fmtIDR(total));
  const months = lastMonths(6);
  const expBy = expenseByMonth();
  drawLine(document.getElementById('chartExpense'),
    months.map(d => MONTHS_ID[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2)),
    [{ label: 'Omset', color: '#C0272D', data: months.map(d => incomeByMonth()[toMonthKey(d)] || 0) },
     { label: 'Pengeluaran', color: '#DFBB69', data: months.map(d => expBy[toMonthKey(d)] || 0) }]);
}
function openExpenseModal(id) {
  const e = id ? db.expenses.find(x => x.id === id) : null;
  const cats = EXPENSE_CATEGORIES.slice();
  if (e && e.category && !cats.includes(e.category)) cats.unshift(e.category);
  openModal(
    '<h3>' + (e ? 'Ubah Pengeluaran' : 'Tambah Pengeluaran') + '</h3>' +
    '<input type="hidden" id="expId" value="' + escapeHtml(e ? e.id : '') + '">' +
    '<div class="pkg-pair">' +
      '<label class="field"><span>Tanggal</span><input type="date" id="expDate" class="input" value="' + escapeHtml(e ? e.date : todayStr()) + '"></label>' +
      '<label class="field"><span>Kategori</span><select id="expCategory" class="input">' +
        cats.map(c => '<option value="' + escapeHtml(c) + '"' + (e && e.category === c ? ' selected' : '') + '>' + escapeHtml(c) + '</option>').join('') +
      '</select></label>' +
    '</div>' +
    '<label class="field"><span>Nominal</span><input type="number" id="expAmount" class="input" min="0" step="any" placeholder="0" value="' + (e ? e.amount : '') + '"></label>' +
    '<label class="field"><span>Catatan (opsional)</span><input type="text" id="expNote" class="input" maxlength="160" value="' + escapeHtml(e ? e.note : '') + '"></label>' +
    '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
    '<button type="button" class="btn btn-primary" data-act="expense-save">Simpan</button></div>'
  );
}
function saveExpenseModal() {
  const id = document.getElementById('expId').value;
  const date = document.getElementById('expDate').value || '';
  const category = document.getElementById('expCategory').value;
  const note = (document.getElementById('expNote').value || '').trim();
  const amount = Math.round(+document.getElementById('expAmount').value || 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('Isi tanggal pengeluaran dulu'); return; }
  if (amount <= 0) { toast('Nominal pengeluaran harus lebih dari 0'); return; }
  const old = id ? db.expenses.find(x => x.id === id) : null;
  const data = { date, category: EXPENSE_CATEGORIES.includes(category) ? category : 'Lainnya', note, amount };
  if (old) {
    Object.assign(old, data);
    logAction('pengeluaran', 'Ubah pengeluaran ' + category + ' · ' + fmtIDR(amount));
  } else {
    db.expenses.push(Object.assign({ id: uid() }, data));
    logAction('pengeluaran', 'Tambah pengeluaran ' + category + ' · ' + fmtIDR(amount));
  }
  state.expMonth = monthKey(date);
  save();
  closeModal();
  if (state.page === 'expenses') renderExpenses();
  toast(old ? 'Pengeluaran diperbarui' : 'Pengeluaran ditambahkan');
}

/* ---------- Logo usaha ---------- */
function loadLogoImage() {
  state.logoImg = null;
  const src = db.settings.logo;
  if (!src) return;
  const img = new Image();
  img.onload = () => { state.logoImg = img; };
  img.src = src;
}

/* Kecilkan gambar ke sisi terpanjang 512 px supaya localStorage dan cadangan tetap ringan. */
function fileToLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Berkas itu bukan gambar')); return; }
    if (file.size > 8 * 1024 * 1024) { reject(new Error('Gambar terlalu besar, pilih berkas di bawah 8 MB')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
        const k = Math.min(1, 512 / Math.max(nw, nh));
        const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        let out = cv.toDataURL('image/png');
        if (out.length > 400000) out = cv.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(url);
        resolve(out);
      } catch (e) { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca')); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca')); };
    img.src = url;
  });
}

async function applyLogoFile(file) {
  try {
    db.settings.logo = await fileToLogo(file);
    logAction('pengaturan', 'Ganti logo usaha');
    save();
    loadLogoImage();
    applyBrand();
    renderLogoUI();
    toast('Logo disimpan');
  } catch (e) {
    toast(e.message || 'Gambar tidak bisa dipakai');
  }
}

function syncPrintLogoControls() {
  const has = !!db.settings.logo;
  [['stickerLogoUse', 'stiker'], ['satpamLogoUse', 'konfirmasi'], ['reportLogoUse', 'laporan'], ['poLogoUse', 'invoice']].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = printLogoOn(key);
    el.disabled = !has;
    el.title = has ? 'Berlaku untuk cetakan berikutnya, tanpa mengubah Pengaturan' : 'Unggah logo di Pengaturan › Informasi Usaha';
  });
}

function renderLogoUI() {
  const src = db.settings.logo, o = db.settings.logoOpts || {};
  const prev = document.getElementById('logoPreview');
  if (prev) prev.innerHTML = src ? '<img src="' + src + '" alt="Logo usaha">' : '<span class="muted tiny">Belum ada logo</span>';
  const rm = document.getElementById('logoRemoveBtn');
  if (rm) rm.disabled = !src;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
  set('logoOnSticker', o.stiker);
  set('logoOnKonfirmasi', o.konfirmasi);
  set('logoOnLaporan', o.laporan);
  set('logoOnInvoice', o.invoice);
  const mm = document.getElementById('logoHeadMm');
  if (mm && document.activeElement !== mm) mm.value = String(o.headMm || 14);
  const block = document.getElementById('logoOptsBlock');
  if (block) block.classList.toggle('is-off', !src);
  syncPrintLogoControls();
}

/* ---------- Render: Pengaturan ---------- */
function renderSettings() {
  document.getElementById('setName').value = db.settings.businessName;
  document.getElementById('setTagline').value = db.settings.tagline;
  document.getElementById('setBankName').value = db.settings.bankName;
  document.getElementById('setBankNumber').value = db.settings.bankNumber;
  document.getElementById('setBankHolder').value = db.settings.bankHolder;
  document.getElementById('setPeriod').value = db.settings.defaultPeriod;
  document.getElementById('setWaCountry').value = db.settings.waCountry;
  document.getElementById('setWaTemplate').value = db.settings.waTemplate;
  applyUiStyle();
  renderLogoUI();
  renderMethods();
  renderPackages();
  renderCustomers();
  renderBackups();
  renderNavCfg();
}
/* Makanan yang benar-benar dimakan anak ber-paket ini dalam 7 hari ke depan */
function pkgMenuSample(p) {
  const type = p.type;
  const names = [];
  for (let i = 0; i < 7; i++) {
    const d = shiftDate(todayStr(), i);
    const items = menuItemsFor(type, d);
    const recs = db[type][d] || {};
    Object.keys(recs).forEach(id => {
      const r = recs[id];
      if (!r || !r.ordered) return;
      const pk = pkgFor(type, r, customerById(id));
      if (!pk || pk.id !== p.id) return;
      customPicks(type, r).forEach(k => {
        const it = items[k];
        if (!it) return;
        const nm = menuLines(it.name)[0];
        if (nm && names.indexOf(nm) < 0) names.push(nm);
      });
    });
  }
  return names;
}
function renderPackages() {
  for (const type of ['snack', 'lunch']) {
    const el = document.getElementById(type === 'snack' ? 'pkgSnackList' : 'pkgLunchList');
    if (!el) continue;
    const items = pkgList(type);
    el.innerHTML = items.length ? items.map(p => {
      const u = pkgUsage(p);
      const sample = pkgMenuSample(p);
      return '<div class="pkg-row">' +
        '<div class="pkg-row-top">' +
          '<input type="text" class="input input-sm pkg-edit" data-id="' + escapeHtml(p.id) + '" data-field="name" value="' + escapeHtml(p.name) + '" placeholder="Nama paket">' +
          '<input type="number" class="input input-sm pkg-price-inp pkg-edit" data-id="' + escapeHtml(p.id) + '" data-field="price" min="0" value="' + (+p.price || 0) + '" title="Harga paket">' +
          '<button class="rm" data-act="pkg-remove" data-id="' + escapeHtml(p.id) + '" title="Hapus paket">×</button>' +
        '</div>' +
        '<div class="muted tiny">dipakai ' + u.kids + ' anak · ' + u.portions + ' porsi tercatat</div>' +
        (sample.length ? '<div class="pkg-sample">menu 7 hari ke depan: ' + escapeHtml(sample.slice(0, 4).join(', ')) + (sample.length > 4 ? ' +' + (sample.length - 4) + ' lagi' : '') + '</div>' : '<div class="pkg-sample muted">belum dipakai menu 7 hari ke depan</div>') +
      '</div>';
    }).join('')
      : '<p class="muted small">Belum ada paket. Tambah di form bawah agar harga tiap porsi terhitung.</p>';
  }
}
function editPackage(id, field, value) {
  const p = pkgById(id);
  if (!p) return;
  if (field === 'price') {
    const raw = String(value == null ? '' : value).trim();
    const n = Number(raw);
    if (raw === '' || !isFinite(n) || n < 0) {
      toast('Harga kosong atau tidak valid, dikembalikan ke ' + fmtIDR(+p.price || 0));
      renderPackages();
      return;
    }
    p.price = Math.round(n);
  }
  else {
    const v = String(value || '').trim();
    if (field === 'name' && !v) { toast('Nama paket tidak boleh kosong'); renderPackages(); return; }
    p[field] = v;
  }
  logAction('pengaturan', 'Ubah paket ' + p.type + ': ' + p.name + ' · ' + fmtIDR(p.price));
  save();
  renderPackages(); renderDailyMerged(); renderDashboard();
}
function addPackage(type) {
  const nameEl = document.getElementById(type === 'snack' ? 'newPkgSnackName' : 'newPkgLunchName');
  const priceEl = document.getElementById(type === 'snack' ? 'newPkgSnackPrice' : 'newPkgLunchPrice');
  const name = (nameEl.value || '').trim();
  const price = +priceEl.value || 0;
  if (!name) { toast('Nama paket diisi dulu'); return; }
  if (price <= 0) { toast('Harga paket harus di atas 0'); return; }
  db.settings.packages.push({ id: uid(), type: type, name: name, price: price });
  logAction('pengaturan', 'Tambah paket ' + type + ': ' + name + ' Rp' + price);
  save(); renderSettings(); renderDailyMerged();
  nameEl.value = ''; priceEl.value = ''; nameEl.focus();
  toast('Paket ' + name + ' ditambahkan');
}
function removePackage(id) {
  const p = pkgById(id);
  if (!p) return;
  if (!confirm('Hapus paket "' + p.name + '"? Pesanan terkait akan memakai paket lain yang tersedia.')) return;
  db.settings.packages = db.settings.packages.filter(x => x.id !== id);
  for (const c of db.customers) { if (c.snackPkg === id) c.snackPkg = ''; if (c.lunchPkg === id) c.lunchPkg = ''; }
  for (const type of ['snack', 'lunch']) for (const date in db[type]) for (const cid in db[type][date]) {
    const r = db[type][date][cid]; if (r.pkg === id) r.pkg = '';
  }
  for (const date in db.menuPlan) db.menuPlan[date].forEach(it => { if (it.pkg === id) it.pkg = ''; });
  logAction('pengaturan', 'Hapus paket ' + p.type + ': ' + p.name);
  save(); renderSettings(); renderDailyMerged();
  toast('Paket dihapus', { undo: true });
}
function renderMethods() {
  document.getElementById('methodList').innerHTML = db.settings.paymentMethods.map(m =>
    '<div class="method-item"><span>' + escapeHtml(m) + '</span><button class="rm" data-act="method-remove" data-method="' + escapeHtml(m) + '" title="Hapus">×</button></div>'
  ).join('');
}
function custDupKey(c) { return ((c.name || '').trim() + '|' + (c.className || '').trim()).toLowerCase(); }
function updateCustBulk(visibleIds) {
  const bulk = document.getElementById('custBulk');
  if (bulk) {
    bulk.hidden = state.custSel.size === 0;
    setText('custSelCount', state.custSel.size + ' pelanggan dipilih');
  }
  const all = document.getElementById('custCheckAll');
  if (all) {
    const ids = visibleIds || [...document.querySelectorAll('.cust-cb')].map(cb => cb.dataset.id);
    const sel = ids.filter(id => state.custSel.has(id)).length;
    all.checked = ids.length > 0 && sel === ids.length;
    all.indeterminate = sel > 0 && sel < ids.length;
  }
}
function allergyBadge(c) {
  if (!c || !c.allergy) return '';
  return '<span class="badge alg" title="' + escapeHtml(c.allergy) + '">&#9888; ' + escapeHtml(c.allergy) + '</span>';
}
function renderCustomers() {
  const st = state.cust;
  fillCascadeFilters(st, 'cust', db.customers, true);
  const search = document.getElementById('custSearch');
  if (search && search.value !== st.q) search.value = st.q;
  const statusSel = document.getElementById('custStatus');
  if (statusSel && statusSel.value !== st.status) statusSel.value = st.status;
  const onlyActive = document.getElementById('custOnlyActive');
  if (onlyActive) onlyActive.checked = st.status === 'jalan';

  state.custSel = new Set([...state.custSel].filter(id => db.customers.some(c => c.id === id)));
  let list = db.customers.slice();
  if (st.status === 'jalan') list = list.filter(custJalan);
  else if (CUST_STATUS.indexOf(st.status) >= 0) list = list.filter(c => c.status === st.status);
  list = list.filter(c => dailyMatch(c, st));
  if (st.q) list = list.filter(c => ((c.name || '') + ' ' + (c.className || '') + ' ' + (c.parent || '') + ' ' + (c.allergy || '')).toLowerCase().includes(st.q));
  list.sort(sortCustomers);

  const total = db.customers.length;
  const filtered = list.length !== total || st.status !== 'all' || !!st.q || !!st.level || !!st.cohort || !!st.cls;
  const byStatus = s => db.customers.filter(c => c.status === s).length;
  setText('custNote', total + ' pelanggan · ' + byStatus('aktif') + ' aktif · ' + byStatus('sekali') + ' beli sekali · ' +
    byStatus('selesai') + ' selesai · ' + byStatus('berhenti') + ' berhenti');

  document.getElementById('customerList').innerHTML = list.map(c =>
    '<tr>' +
      '<td class="chk-col"><input type="checkbox" class="cust-cb" data-id="' + escapeHtml(c.id) + '"' + (state.custSel.has(c.id) ? ' checked' : '') + '></td>' +
      '<td><strong>' + escapeHtml(c.name) + '</strong></td>' +
      '<td class="muted">' + escapeHtml(c.className) + '</td>' +
      '<td class="muted">' + escapeHtml(c.parent || '—') + (c.phone ? '<span class="muted tiny block" title="Dikirim ke +' + escapeHtml(waNumber(c.phone)) + '">' + escapeHtml(c.phone) + '</span>' : '') + '</td>' +
      '<td>' + (c.allergy ? allergyBadge(c) : '<span class="muted tiny">—</span>') + '</td>' +
      '<td>' + (c.status === 'sekali'
        ? ('Sekali · ' + escapeHtml(c.onceDate ? fmtShortDate(c.onceDate) : 'tanggal belum diisi') + (oncePassed(c) ? ' <span class="muted tiny">(sudah lewat)</span>' : ''))
        : (c.period === 'daily' ? ('Harian · ' + daysSummary(c.days)) : periodLabel(c.period))) + '</td>' +
      '<td>' + (c.snackDefault ? '✓' : '—') + '</td>' +
      '<td>' + (c.lunchDefault ? '✓' : '—') + '</td>' +
      '<td><span class="badge ' + (STATUS_BADGE[c.status] || 'red') + '" title="' + escapeHtml(STATUS_HINT[c.status] || '') + '">' + (STATUS_LABEL[c.status] || 'Aktif') + '</span></td>' +
      '<td class="end"><div class="row-actions">' +
        '<button class="icon-act" data-act="cust-report" data-id="' + c.id + '" title="Buka laporan anak ini">' + ICO_CHART + '</button>' +
        '<button class="icon-act" data-act="customer-edit" data-id="' + c.id + '" title="Ubah">' + ICO_EDIT + '</button>' +
        '<button class="icon-act danger" data-act="customer-delete" data-id="' + c.id + '" title="Hapus">' + ICO_TRASH + '</button>' +
      '</div></td>' +
    '</tr>'
  ).join('');
  const empty = document.getElementById('customerEmpty');
  empty.hidden = list.length > 0;
  if (list.length === 0) empty.textContent = filtered ? 'Tidak ada pelanggan yang cocok dengan filter.' : 'Belum ada pelanggan. Tambahkan untuk memulai.';
  updateCustBulk(list.map(c => c.id));
}
function openCustomerModal(c) {
  const isEdit = !!c;
  const x = c || { name: '', className: '', period: db.settings.defaultPeriod, snackDefault: true, lunchDefault: true, active: true };
  const days = x.days || [];
  const periodOpts = ['daily', 'weekly', 'monthly', 'semester'].map(p =>
    '<option value="' + p + '"' + (x.period === p ? ' selected' : '') + '>' + periodLabel(p) + '</option>').join('');
  const wdToggles = WEEKDAYS.map((w, i) =>
    '<label class="wd"><input type="checkbox" name="day" value="' + (i + 1) + '" ' + (days.includes(i + 1) ? 'checked' : '') + '>' + w + '</label>').join('');
  const pkgOpts = type => {
    const list = pkgList(type);
    if (!list.length) return '<option value="">Belum ada paket</option>';
    const cur = list.some(p => p.id === x[type + 'Pkg']) ? x[type + 'Pkg'] : list[0].id;
    return list.map(p => '<option value="' + escapeHtml(p.id) + '"' + (p.id === cur ? ' selected' : '') + '>' + escapeHtml(pkgLabel(p)) + '</option>').join('');
  };
  openModal(
    '<h3>' + (isEdit ? 'Ubah' : 'Tambah') + ' Pelanggan</h3>' +
    '<form id="custForm">' +
      '<label class="field"><span>Nama</span><input type="text" name="name" class="input" value="' + escapeHtml(x.name) + '" required></label>' +
      '<label class="field"><span>Kelas</span><input type="text" name="className" class="input" placeholder="mis. 2C, 11B, 12A" value="' + escapeHtml(x.className) + '"></label>' +
      '<label class="field"><span>Nama orang tua / pengenal (opsional, digabung bila satu orang tua punya beberapa anak)</span><input type="text" name="parent" class="input" value="' + escapeHtml(x.parent || '') + '"></label>' +
      '<label class="field"><span>No. HP / WA orang tua (untuk pengingat tagihan)</span><input type="text" name="phone" class="input" placeholder="0812… atau 62812…" value="' + escapeHtml(x.phone || '') + '"></label>' +
      '<label class="field"><span>Catatan alergi / preferensi (tampil di daftar harian, kertas konfirmasi &amp; stiker)</span>' +
        '<textarea name="allergy" class="input" rows="2" maxlength="80" placeholder="mis. Alergi kacang &amp; kerang, tidak makan pedas">' + escapeHtml(x.allergy || '') + '</textarea></label>' +
      '<label class="field" id="custPeriodField"><span>Periode</span><select name="period" id="custPeriod" class="input">' + periodOpts + '</select></label>' +
      '<div class="field" id="custOnceField" hidden>' +
        '<span>Tanggal beli</span>' +
        '<input type="date" name="onceDate" id="custOnceDate" class="input" value="' + escapeHtml(x.onceDate || '') + '">' +
        '<span class="muted tiny">Pesanan dibuat satu kali saja pada tanggal ini. Snack/lunch mengikuti centang di bawah.</span>' +
      '</div>' +
      '<div class="field wd-field" id="wdBlock"' + (x.period === 'daily' ? '' : ' hidden') + '>' +
        '<span>Pilih hari (harian)</span>' +
        '<div class="wd-row">' + wdToggles + '</div>' +
      '</div>' +
      '<label class="check"><input type="checkbox" name="snackDefault" id="custSnackChk" ' + (x.snackDefault ? 'checked' : '') + '> Snack</label>' +
      '<label class="check"><input type="checkbox" name="lunchDefault" id="custLunchChk" ' + (x.lunchDefault ? 'checked' : '') + '> Lunch</label>' +
      '<div class="pkg-pair">' +
        '<label class="field" id="custSnackPkgField"><span>Paket snack</span><select name="snackPkg" class="input">' + pkgOpts('snack') + '</select></label>' +
        '<label class="field" id="custLunchPkgField"><span>Paket lunch</span><select name="lunchPkg" class="input">' + pkgOpts('lunch') + '</select></label>' +
      '</div>' +
      '<label class="field"><span>Status langganan</span><select name="status" id="custStatusSel" class="input">' +
        CUST_STATUS.filter(s => isEdit || s === 'aktif' || s === 'sekali').map(s => '<option value="' + s + '"' + ((x.status || (x.active === false ? 'berhenti' : 'aktif')) === s ? ' selected' : '') + '>' +
          STATUS_LABEL[s] + ' · ' + STATUS_HINT[s] + '</option>').join('') +
      '</select></label>' +
      '<p class="muted tiny" id="custStatusNote">' + (isEdit
        ? 'Status <strong>Aktif</strong> mengisi pesanan sampai periode berikutnya (Senin–Jumat, belum dibayar); <strong>Beli Sekali</strong> hanya satu tanggal.'
        : 'Anak baru otomatis <strong>Aktif</strong> (mengisi pesanan sampai periode berikutnya) atau <strong>Beli Sekali</strong> (satu tanggal). Status <strong>Selesai</strong> / <strong>Berhenti</strong> diisi nanti lewat halaman Pelanggan.') + '</p>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
        '<button type="submit" class="btn btn-primary">Simpan</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('custPeriod').addEventListener('change', e => {
    document.getElementById('wdBlock').hidden = e.target.value !== 'daily';
  });
  /* "Beli Sekali" memakai tanggal, bukan periode, jadi blok periode diganti */
  const syncStatusFields = () => {
    const sekali = document.getElementById('custStatusSel').value === 'sekali';
    document.getElementById('custOnceField').hidden = !sekali;
    document.getElementById('custPeriodField').hidden = sekali;
    if (sekali) document.getElementById('wdBlock').hidden = true;
    else document.getElementById('wdBlock').hidden = document.getElementById('custPeriod').value !== 'daily';
  };
  document.getElementById('custStatusSel').addEventListener('change', syncStatusFields);
  syncStatusFields();
  const syncPkgFields = () => {
    document.getElementById('custSnackPkgField').hidden = !document.getElementById('custSnackChk').checked;
    document.getElementById('custLunchPkgField').hidden = !document.getElementById('custLunchChk').checked;
  };
  document.getElementById('custSnackChk').addEventListener('change', syncPkgFields);
  document.getElementById('custLunchChk').addEventListener('change', syncPkgFields);
  syncPkgFields();
  /* catatan alergi tinggi mengikuti isinya, hanya tumbuh ke bawah */
  const algTa = document.querySelector('#custForm textarea[name="allergy"]');
  if (algTa) { algTa.style.height = 'auto'; algTa.style.height = Math.min(algTa.scrollHeight + 2, 150) + 'px'; }
  document.getElementById('custForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const period = f.get('period');
    const selDays = f.getAll('day').map(Number).sort((a, b) => a - b);
    if (period === 'daily' && selDays.length === 0) { toast('Pilih minimal satu hari untuk langganan harian'); return; }
    const status = CUST_STATUS.indexOf(String(f.get('status'))) >= 0 ? String(f.get('status')) : 'aktif';
    const onceDate = /^\d{4}-\d{2}-\d{2}$/.test(String(f.get('onceDate') || '')) ? String(f.get('onceDate')) : '';
    if (status === 'sekali' && !onceDate) { toast('Isi dulu tanggal untuk beli sekali'); return; }
    if (status === 'sekali' && !f.get('snackDefault') && !f.get('lunchDefault')) { toast('Centang snack atau lunch, tidak ada yang bisa dipesan'); return; }
    const data = {
      name: f.get('name').trim(), className: (f.get('className') || '').trim(),
      parent: (f.get('parent') || '').trim(),
      phone: (f.get('phone') || '').trim(),
      allergy: String(f.get('allergy') || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      period: period, days: selDays, snackDefault: !!f.get('snackDefault'),
      lunchDefault: !!f.get('lunchDefault'),
      snackPkg: f.get('snackDefault') ? (f.get('snackPkg') || '') : '',
      lunchPkg: f.get('lunchDefault') ? (f.get('lunchPkg') || '') : '',
      status: status, onceDate: onceDate
    };
    data.active = custActive(data);
    if (!data.name) { toast('Nama wajib diisi'); return; }
    const dup = db.customers.some(x => x !== c && custDupKey(x) === custDupKey(data));
    if (dup && !confirm('Sudah ada pelanggan "' + data.name + '"' + (data.className ? '" di kelas "' + data.className + '"' : '') + '. Tetap simpan?')) return;
    const periodChanged = !isEdit || c.period !== period;
    const tanggalLama = isEdit ? (c.onceDate || '') : '';
    const statusLama = isEdit ? c.status : '';
    if (isEdit) Object.assign(c, data);
    else { data.id = uid(); db.customers.push(data); }
    const anak = isEdit ? c : data;
    /* tanggal beli sekali dipindah: pesanan lama yang belum dibayar ikut pindah, bukan menumpuk */
    let pindah = 0;
    if (statusLama === 'sekali' && data.status === 'sekali' && tanggalLama && tanggalLama !== data.onceDate) {
      ['snack', 'lunch'].forEach(t => {
        const r = (db[t][tanggalLama] || {})[anak.id];
        if (r && r.ordered && !r.paid && r.method !== 'Gratis') { delete db[t][tanggalLama][anak.id]; pindah++; }
      });
    }
    const perluIsi = periodChanged || data.status === 'sekali' &&
      (statusLama !== 'sekali' || tanggalLama !== data.onceDate);
    const filled = perluIsi ? autoFillPeriod(anak) : 0;
    if (filled) autoPickSingles(null, anak.id);
    logAction('pelanggan', (isEdit ? 'Ubah ' : 'Tambah ') + data.name + ' (' + (data.className || '-') + ', ' +
      (data.status === 'sekali' ? 'beli sekali @ ' + fmtShortDate(data.onceDate) : periodLabel(period)) + ')' +
      (filled ? ' · isi ' + filled + ' tanggal' : '') + (pindah ? ' · ' + pindah + ' pesanan lama dipindah' : ''));
    save(); closeModal(); renderSettings();
    renderDailyMerged(); renderDashboard();
    toast(isEdit ? 'Pelanggan diperbarui' : 'Pelanggan ditambahkan' + (filled ? ' · ' + filled + ' tanggal terisi otomatis' : ''));
  });
}

/* ---------- Backup ---------- */
function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cadangan-katering-' + todayStr() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
  markExported();
  toast('Backup diekspor');
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = normalize(JSON.parse(reader.result));
      db = d; save(); loadLogoImage(); applyBrand(); applyNavSettings(); showPage(firstVisibleNav());
      toast('Data dipulihkan', { undo: true });
    } catch (e) { toast('File tidak valid'); }
  };
  reader.readAsText(file);
}

/* ---------- Cadangan harian otomatis (tetap di perangkat) ---------- */
const BACKUP_KEY = STORE_PREFIX + 'backups_v1';
const BACKUP_MAX = 14;
const BACKUP_BYTES = 3500000;
function readBackups() {
  try { const a = JSON.parse(localStorage.getItem(BACKUP_KEY)); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function writeBackups(list) {
  const out = list.slice(0, BACKUP_MAX);
  while (out.length > 2 && out.reduce((s, b) => s + (b.json || '').length, 0) > BACKUP_BYTES) out.pop();
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify(out)); } catch (e) { /* penyimpanan penuh: abaikan */ }
}
let backupAt = 0;
function autoBackup(force) {
  const now = Date.now();
  if (!force && now - backupAt < 60000) return;
  backupAt = now;
  let json;
  try { json = JSON.stringify(db); } catch (e) { return; }
  const stamp = new Date().toISOString();
  const day = stamp.slice(0, 10);
  const list = readBackups();
  /* Jangan menimpa salinan hari ini dengan isi yang BEDA (mis. tepat setelah "Reset"):
     data asli pagi harinya hilang tanpa bekas. Isi yang sama cukup diperbarui jamnya. */
  if (list.length && list[0].day === day && list[0].json === json) list[0] = { day: day, ts: stamp, json: json };
  else list.unshift({ day: day, ts: stamp, json: json });
  writeBackups(list);
}
function backupSize(n) {
  return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
}
function renderBackups() {
  const el = document.getElementById('backupList');
  if (!el) return;
  const list = readBackups();
  const last = uiPrefs().lastExportAt;
  const total = list.reduce((s, b) => s + (b.json || '').length, 0);
  setText('backupNote', (list.length
    ? list.length + ' cadangan harian tersimpan di perangkat ini (' + backupSize(total) + ')'
    : 'Belum ada cadangan. Dibuat otomatis setiap hari begitu ada perubahan data') +
    (last ? ' · unduhan manual terakhir ' + fmtShortDate(new Date(last).toISOString().slice(0, 10)) : ' · belum pernah unduh manual'));
  el.innerHTML = list.map((b, i) =>
    '<div class="backup-item">' +
      '<span class="bk-date"><strong>' + fmtShortDate(b.day) + '</strong> <span class="muted tiny">' +
        new Date(b.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' · ' + backupSize((b.json || '').length) + '</span></span>' +
      '<span class="row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-act="backup-download" data-i="' + i + '">Unduh</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="backup-restore" data-i="' + i + '">Pulihkan</button>' +
        '<button class="icon-act danger" data-act="backup-delete" data-i="' + i + '" title="Hapus cadangan">' + ICO_TRASH + '</button>' +
      '</span>' +
    '</div>').join('');
}
function restoreBackup(i) {
  const b = readBackups()[i];
  if (!b) return;
  if (!confirm('Pulihkan data ke cadangan ' + fmtShortDate(b.day) + '? Data sekarang lebih dulu disimpan sebagai cadangan.')) return;
  autoBackup(true);
  try {
    db = normalize(JSON.parse(b.json));
    logAction('backup', 'Pulihkan cadangan ' + b.day);
    save(); applyBrand(); applyNavSettings(); showPage(firstVisibleNav());
    toast('Data dipulihkan ke cadangan ' + fmtShortDate(b.day));
  } catch (e) { toast('Cadangan tidak terbaca'); }
}

/* ---------- Unduh teks (CSV) ---------- */
function markExported() {
  const p = uiPrefs();
  p.lastExportAt = Date.now();
  try { localStorage.setItem(UI_KEY, JSON.stringify(p)); } catch (e) { /* abaikan */ }
}
function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  markExported();
}
const BOM = String.fromCharCode(0xFEFF);
const CRLF = String.fromCharCode(13, 10);
function csvCell(v) {
  const s = String(v == null ? '' : v).replace(/[\r\n]+/g, ' ');
  return /[;"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvRows(rows) { return BOM + rows.map(r => r.map(csvCell).join(';')).join(CRLF); }
function money(n) { return String(Math.round(+n || 0)); }
function applyBrand() {
  document.getElementById('brandName').textContent = db.settings.businessName;
  document.getElementById('brandTagline').textContent = db.settings.tagline;
  document.title = db.settings.businessName + ' · Catatan Usaha Catering';
  const brandImg = document.getElementById('brandLogoImg');
  const brandSvg = document.querySelector('#sidebar .brand-logo svg');
  if (brandImg) {
    const src = db.settings.logo || '';
    if (src && brandImg.getAttribute('src') !== src) brandImg.src = src;
    brandImg.hidden = !src;
    if (brandSvg) brandSvg.style.display = src ? 'none' : '';
  }
  let fav = document.querySelector('link[rel="icon"]');
  if (db.settings.logo) {
    if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
    fav.href = db.settings.logo;
  } else if (fav) fav.remove();
  syncPrintLogoControls();
}
/* Jenis huruf + skala teks seluruh aplikasi. Hanya memengaruhi layar, bukan hasil cetak. */
function applyUiStyle() {
  const root = document.documentElement;
  const stack = UI_FONTS[db.settings.uiFont];
  if (stack) root.style.setProperty('--font', stack); else root.style.removeProperty('--font');
  const pct = clampScale(db.settings.uiZoom, UI_ZOOM_MIN, UI_ZOOM_MAX);
  const z = pct / 100;
  root.style.setProperty('--ui-zoom', String(z));
  document.body.style.zoom = z === 1 ? '' : String(z);
  const sel = document.getElementById('setUiFont'); if (sel && sel.value !== db.settings.uiFont) sel.value = db.settings.uiFont;
  const rng = document.getElementById('setUiZoom'); if (rng) rng.value = String(pct);
  setText('setUiZoomVal', pct + '%');
}
function saveUiStyle() {
  const f = document.getElementById('setUiFont'), z = document.getElementById('setUiZoom');
  db.settings.uiFont = UI_FONTS[f.value] ? f.value : 'default';
  db.settings.uiZoom = clampScale(z.value, UI_ZOOM_MIN, UI_ZOOM_MAX);
  applyUiStyle();
  save({ noUndo: true });
}
function setTodayBadge() {
  document.getElementById('todayBadge').textContent = fmtLong(todayStr());
}

/* ---------- Sidebar mobile ---------- */
function openSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.add('open');
  let scrim = document.querySelector('.sidebar-scrim');
  if (!scrim) {
    scrim = document.createElement('div');
    scrim.className = 'sidebar-scrim';
    scrim.addEventListener('click', closeSidebar);
    document.body.appendChild(scrim);
  }
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const s = document.querySelector('.sidebar-scrim');
  if (s) s.remove();
}

/* ---------- Sidebar: kecilkan jadi ikon saja ---------- */
const UI_KEY = STORE_PREFIX + 'ui_v1';
function uiPrefs() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; } }
function applySidebar(collapsed) {
  document.querySelector('.app').classList.toggle('nav-collapsed', collapsed);
  const btn = document.getElementById('sideToggle');
  if (btn) {
    btn.title = collapsed ? 'Bentangkan sidebar' : 'Perkecil sidebar';
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }
  const p = uiPrefs();
  p.sidebarCollapsed = collapsed;
  try { localStorage.setItem(UI_KEY, JSON.stringify(p)); } catch (e) { /* penyimpanan penuh */ }
}
function toggleSidebar() {
  applySidebar(!document.querySelector('.app').classList.contains('nav-collapsed'));
}

/* ---------- Tema terang / gelap ---------- */
function applyTheme(theme) {
  const dark = theme !== 'light';
  document.body.classList.toggle('theme-dark', dark);
  const btn = document.getElementById('themeBtn');
  if (btn) { btn.title = dark ? 'Mode terang' : 'Mode gelap'; btn.setAttribute('aria-label', btn.title); }
  const p = uiPrefs();
  p.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem(UI_KEY, JSON.stringify(p)); } catch (e) { /* abaikan */ }
}
function toggleTheme() {
  applyTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark');
  if (state.page === 'dashboard') renderDashboard();
  else if (state.page === 'report') renderReport();
  else if (state.page === 'po') renderPO();
}

/* ---------- Event delegation ---------- */
function onDocClick(e) {
  const panel = document.getElementById('notifPanel');
  if (panel && !panel.hidden && !(e.target.closest && e.target.closest('.notif-wrap'))) closeNotif();
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    if (nav.dataset.stockKind) state.stockKind = nav.dataset.stockKind;
    closeNotif(); showPage(nav.dataset.nav); return;
  }
  if (e.target.closest('#menuBtn')) { openSidebar(); return; }
  if (e.target.closest('#sideToggle')) { toggleSidebar(); return; }
  if (e.target.closest('#themeBtn')) { toggleTheme(); return; }
  if (e.target.closest('#notifBtn')) { toggleNotif(); return; }
  if (e.target.id === 'modalBackdrop') { closeModal(); return; }
  if (e.target.id === 'calOverlay') { closeCalendar(); return; }

  const act = e.target.closest('[data-act]');
  if (!act) return;
  const a = act.dataset.act;
  const id = act.dataset.id;

  switch (a) {
    case 'day-prev': state.currentDate = shiftDate(state.currentDate, -1); renderDailyMerged(); break;
    case 'day-next': state.currentDate = shiftDate(state.currentDate, 1); renderDailyMerged(); break;
    case 'daily-filter-reset':
      state.daily.hari = { level: '', cohort: '', cls: '', q: '' };
      renderDailyMerged();
      break;
    case 'daily-pay-cfg': openDayPayModal(act.closest('tr').dataset.cid, state.currentDate); break;
    case 'daily-pay-save': saveDayPay(act.dataset.cid, act.dataset.date); break;
    case 'week-menu-add': {
      const date = act.dataset.date;
      const items = menuPlanItems(date).map(it => Object.assign({}, it));
      if (items.length >= WEEK_MENU_MAX) { toast('Maksimal ' + WEEK_MENU_MAX + ' pilihan per hari'); break; }
      const last = items[items.length - 1];
      const type = last ? last.type : 'snack';
      items.push({ name: '', type: type, pkg: '', price: '' });
      writeMenuPlan(date, items);
      save(); renderWeekMenu(); renderPkgShowcase(); renderHomeCalendar();
      const inputs = document.querySelectorAll('.wm-name[data-date="' + date + '"]');
      const el = inputs[inputs.length - 1];
      if (el) el.focus();
      break;
    }
    case 'week-menu-del': {
      const date = act.dataset.date, idx = +act.dataset.idx;
      const items = menuPlanItems(date).map(it => Object.assign({}, it));
      const ty = menuTypeOf(items[idx]);
      if (ty !== 'po') shiftPicksAfterDelete(date, ty, items.filter(x => menuTypeOf(x) === ty).indexOf(items[idx]));
      items.splice(idx, 1);
      writeMenuPlan(date, items);
      autoPickSingles([date]);
      save(); logAction('menu', 'Hapus satu pilihan menu ' + date);
      renderWeekMenu(); renderPkgShowcase(); renderHomeCalendar();
      renderDailyMerged(); renderCustom();
      break;
    }
    case 'menu-tab':
      state.menuTab = act.dataset.tab === 'daily' ? 'daily' : 'week';
      if (state.menuTab === 'daily') state.menuDay = weekdayOf(state.menuDate || todayStr()) - 1;
      renderWeekMenu();
      renderHomeHoliday();
      break;
    case 'menu-day': {
      state.menuDate = act.dataset.ymd;
      state.menuMonth = monthKey(state.menuDate);
      state.menuDay = weekdayOf(state.menuDate) - 1;
      renderHomeCalendar(); renderWeekMenu(); renderPkgShowcase(); renderHomeHoliday();
      break;
    }
    case 'menu-share': menuShareImage(); break;
    case 'goto-dapur': showPage('dapur'); break;
    case 'recipe-add': openRecipeModal({ type: 'snack', name: '' }); break;
    case 'recipe-menu': {
      const it = menuPlanItems(act.dataset.date)[+act.dataset.idx];
      if (it) openRecipeModal({ type: recipeBaseType(it.type), name: it.name });
      break;
    }
    case 'recipe-edit': openRecipeModal({ recipeId: id }); break;
    case 'recipe-save': saveRecipeModal(); break;
    case 'recipe-row-add': {
      const box = document.getElementById('recipeRows');
      if (box) {
        box.insertAdjacentHTML('beforeend', recipeRowHtml({}));
        const rows = box.querySelectorAll('.recipe-row');
        const last = rows[rows.length - 1];
        if (last) last.querySelector('.recipe-ing-name').focus();
      }
      break;
    }
    case 'recipe-row-del': {
      const row = act.closest('.recipe-row');
      if (row) row.remove();
      break;
    }
    case 'recipe-delete': {
      const r = db.recipes.find(x => x.id === id);
      if (r && confirm('Hapus resep "' + flatName(r.name) + '"?')) {
        db.recipes = db.recipes.filter(x => x.id !== id);
        logAction('dapur', 'Hapus resep ' + flatName(r.name));
        save(); renderDapur();
        toast('Resep dihapus', { undo: true });
      }
      break;
    }
    case 'recipe-remind': recipeReminder(id); break;
    case 'dapur-copy': dapurCopyList(); break;
    case 'dapur-remind': dapurMakeReminder(); break;
    case 'dapur-random': randomizeDapurWeek(); break;
    case 'goto-stok': state.stockKind = 'bahan'; showPage('stok'); break;
    case 'stock-kind': state.stockKind = act.dataset.kind === 'wadah' ? 'wadah' : 'bahan'; renderStok(); break;
    case 'stock-add': openStockItemModal(state.stockKind, ''); break;
    case 'stock-edit': openStockItemModal(act.dataset.kind, id); break;
    case 'stock-in': openStockMoveModal(act.dataset.kind, id); break;
    case 'stock-save': saveStockItemModal(); break;
    case 'stock-move-save': saveStockMoveModal(); break;
    case 'stock-delete': {
      const kind = stockKindOf(act.dataset.kind);
      const it = stockById(kind, id);
      if (it && confirm('Hapus item stok "' + it.name + '"?')) {
        db.stock[kind] = stockItems(kind).filter(x => x.id !== id);
        logAction('stok', 'Hapus stok ' + it.name);
        save(); renderStok();
        toast('Item stok dihapus', { undo: true });
      }
      break;
    }
    case 'expense-add': openExpenseModal(null); break;
    case 'expense-edit': openExpenseModal(id); break;
    case 'expense-save': saveExpenseModal(); break;
    case 'expense-delete': {
      const e = db.expenses.find(x => x.id === id);
      if (e && confirm('Hapus pengeluaran ' + e.category + ' ' + fmtIDR(e.amount) + '?')) {
        db.expenses = db.expenses.filter(x => x.id !== id);
        logAction('pengeluaran', 'Hapus pengeluaran ' + e.category + ' · ' + fmtIDR(e.amount));
        save(); renderExpenses();
        toast('Pengeluaran dihapus', { undo: true });
      }
      break;
    }
    case 'nav-up': moveNav(id, -1); break;
    case 'nav-down': moveNav(id, 1); break;
    case 'nav-reset':
      db.settings.navOrder = NAV_DEFAULT_ORDER.slice();
      db.settings.navHidden = [];
      save({ noUndo: true });
      applyNavSettings();
      renderNavCfg();
      toast('Menu sidebar kembali ke bawaan');
      break;
    case 'img-download': downloadPreview(); break;
    case 'img-share': sharePreview(); break;
    case 'custom-prev': state.custom.weekStart = shiftDate(state.custom.weekStart || mondayOf(todayStr()), -7); renderCustom(); break;
    case 'custom-next': state.custom.weekStart = shiftDate(state.custom.weekStart || mondayOf(todayStr()), 7); renderCustom(); break;
    case 'custom-today': state.custom.weekStart = mondayOf(todayStr()); renderCustom(); break;
    case 'custom-print': openCustomPrintModal(); break;
    case 'custom-print-go': customPrintFromModal(); break;
    case 'cprint-zoom-in': setCustomPrintZoom(cprintZoomIdx + 1); break;
    case 'cprint-zoom-out': setCustomPrintZoom(cprintZoomIdx - 1); break;
    case 'cprint-zoom-fit': setCustomPrintZoom(CUSTOM_PRINT_ZOOM_FIT); break;
    case 'custom-type': state.custom.type = act.dataset.type === 'lunch' ? 'lunch' : 'snack'; renderCustom(); break;
    case 'custom-reset': state.custom.level = ''; state.custom.cohort = ''; state.custom.cls = ''; state.custom.q = ''; renderCustom(); break;
    case 'custom-food': setCustomFood(act.dataset.cid, act.dataset.date, +act.dataset.mi); break;
    case 'daily-food': setCustomFood(act.dataset.cid, act.dataset.date, +act.dataset.mi, act.dataset.type); break;
    case 'custom-plain': togglePlainOrder(act.dataset.cid, act.dataset.date); break;
    case 'daily-plain': togglePlainOrder(act.dataset.cid, state.currentDate, act.dataset.type); break;
    case 'custom-display':
      db.settings.customDisplay = ['name', 'price', 'both'].indexOf(act.dataset.mode) >= 0 ? act.dataset.mode : 'both';
      save({ noUndo: true }); renderCustom();
      toast('Sel tabel menampilkan ' + (db.settings.customDisplay === 'name' ? 'nama paket' : db.settings.customDisplay === 'price' ? 'harga' : 'nama paket + harga'));
      break;
    case 'pkg-add': addPackage(act.dataset.which); break;
    case 'pkg-remove': removePackage(act.dataset.id); break;
    case 'bill-copy': {
      const kids = billSelection();
      if (!kids.length) { toast('Centang anak dulu'); break; }
      copyText(billText());
      break;
    }
    case 'bill-image': billImage(); break;
    case 'bill-clear': state.billSel.clear(); renderReport(); break;
    case 'po-menu-add': openPoMenuModal(null); break;
    case 'po-menu-edit': { const m = db.poMenus.find(x => x.id === id); if (m) openPoMenuModal(m); break; }
    case 'po-menu-delete': {
      const m = db.poMenus.find(x => x.id === id);
      if (m) {
        const n = db.po.filter(x => x.menuId === m.id).length;
        if (confirm('Hapus menu "' + m.item + '"' + (n ? ' beserta ' + n + ' pembeli' : '') + '?')) {
          db.poMenus = db.poMenus.filter(x => x.id !== m.id);
          db.po = db.po.filter(x => x.menuId !== m.id);
          logAction('po', 'Hapus menu PO ' + m.item + ' @ ' + m.date);
          save(); renderPO(); toast('Menu PO dihapus', { undo: true });
        }
      }
      break;
    }
    case 'po-buyer-add': { const m = db.poMenus.find(x => x.id === id); if (m) openPoBuyerModal(m, null); break; }
    case 'po-edit': {
      const p = db.po.find(x => x.id === id);
      if (p) {
        const m = p.menuId ? db.poMenus.find(x => x.id === p.menuId) : null;
        if (m) openPoBuyerModal(m, p); else openPoModal(p);
      }
      break;
    }
    case 'po-delete': { const p = db.po.find(x => x.id === id); if (p && confirm('Hapus PO ini?')) { db.po = db.po.filter(x => x.id !== id); logAction('po', 'Hapus PO ' + p.name + ' · ' + p.item); save(); renderPO(); toast('PO dihapus', { undo: true }); } break; }
    case 'po-toggle-paid': { const p = db.po.find(x => x.id === id); if (p) { p.paid = !p.paid; logAction('bayar', 'PO ' + p.name + ' ' + (p.paid ? 'lunas' : 'belum') + ' @ ' + p.date); save(); renderPO(); } break; }
    case 'po-toggle-status': {
      const p = db.po.find(x => x.id === id);
      if (p) { poNextStatus(p); logAction('po', 'Status PO ' + p.name + ' → ' + poStatusLabel(p)); save(); renderPO(); }
      break;
    }
    case 'po-resi': { const p = db.po.find(x => x.id === id); if (p) printPoDoc(buildPoResiHTML(p)); break; }
    case 'po-print-month': printPoDoc(buildPoMonthHTML(state.poMonth)); break;
    case 'po-group-add': openPoGroupModal(null); break;
    case 'po-group-edit': { const g = poGroups().find(x => x.id === id); if (g) openPoGroupModal(g); break; }
    case 'po-group-del': {
      const g = poGroups().find(x => x.id === id);
      if (g && confirm('Hapus pesanan kelompok "' + g.org + '" beserta ' + g.rows.length + ' baris jadwal ambil?')) {
        db.po = db.po.filter(x => x.groupId !== id);
        db.reminders = db.reminders.filter(r => r.ref !== id);
        logAction('po', 'Hapus pesanan kelompok ' + g.org);
        save(); renderPO(); toast('Pesanan kelompok dihapus', { undo: true });
      }
      break;
    }
    case 'po-group-detail': openPoGroupDetail(id); break;
    case 'po-group-invoice': poGroupInvoiceImage(id); break;
    case 'po-group-invoice-pdf': poGroupInvoicePrint(id); break;
    case 'rem-prefill': {
      const g = id ? poGroups().find(x => x.id === id) : null;
      if (id && !g) { toast('Pesanan kelompok tidak ditemukan'); break; }
      const text = act.dataset.text || (g ? 'Tagih ' + g.org + (g.sisa > 0 ? ' · sisa ' + fmtIDR(g.sisa) : ' · sudah lunas') : '');
      if (!text) { toast('Tidak ada yang perlu diingatkan'); break; }
      const date = act.dataset.date || (g ? (g.due || g.dates[g.dates.length - 1] || todayStr()) : todayStr());
      prefillReminder(text, date);
      break;
    }
    case 'po-group-paid': {
      const g = poGroups().find(x => x.id === id);
      if (g) {
        const toPaid = g.sisa > 0;
        /* pembatalan mengembalikan persis siapa yang sudah lunas sebelumnya, bukan menghapus semuanya */
        g.rows.forEach(p => {
          if (p.method === 'Gratis') return;
          if (toPaid) { if (!p.paid) { p.paidWas = true; p.paid = true; } }
          else if (p.paidWas) { p.paid = false; delete p.paidWas; }
        });
        logAction('bayar', 'PO kelompok ' + g.org + ' → ' + (toPaid ? 'lunas' : 'kembali ke status sebelumnya'));
        save(); closeModal(); renderPO();
        toast(toPaid ? 'Semua tanggal ditandai lunas' : 'Penandaan lunas dibatalkan, status tiap tanggal dikembalikan');
      }
      break;
    }
    case 'po-sched-add': {
      const box = document.getElementById('poSched');
      if (!box) break;
      const rws = box.querySelectorAll('.po-sched-row');
      if (rws.length >= 14) { toast('Maksimal 14 tanggal ambil'); break; }
      const last = rws.length ? rws[rws.length - 1] : null;
      const d = last ? last.querySelector('.ps-date').value : todayStr();
      const q = last ? +last.querySelector('.ps-qty').value : 20;
      box.insertAdjacentHTML('beforeend', poSchedRow(shiftDate(d || todayStr(), 7), q || 20));
      updatePoGroupTotal();
      break;
    }
    case 'po-sched-del': {
      const box = document.getElementById('poSched');
      const r = act.closest('.po-sched-row');
      if (box && r && box.querySelectorAll('.po-sched-row').length > 1) { r.remove(); updatePoGroupTotal(); }
      break;
    }
    case 'sticker-select-all': document.querySelectorAll('.sticker-cb').forEach(cb => cb.checked = true); stickerPreview(); break;
    case 'sticker-clear': document.querySelectorAll('.sticker-cb').forEach(cb => cb.checked = false); stickerPreview(); break;
    case 'print-mode': state.printMode = act.dataset.mode === 'konfirmasi' ? 'konfirmasi' : 'stiker'; renderPrint(); break;
    case 'sticker-type': case 'satpam-type': typeSeg(act.dataset.act, act); break;
    case 'sticker-preview': stickerPreview(); break;
    case 'sticker-print': stickerPreview(); setTimeout(() => printFrame(document.getElementById('stickerFrame')), 300); break;
    case 'satpam-preview': satpamPreview(); break;
    case 'satpam-print': satpamPreview(); setTimeout(() => printFrame(document.getElementById('satpamFrame')), 300); break;
    case 'home-cal-prev': shiftHomeMonth(-1); break;
    case 'home-cal-next': shiftHomeMonth(1); break;
    case 'home-day': { state.menuDate = act.dataset.ymd; state.menuMonth = monthKey(state.menuDate); state.menuDay = weekdayOf(state.menuDate) - 1; renderHomeCalendar(); renderWeekMenu(); renderPkgShowcase(); renderHomeHoliday(); break; }
    case 'goto-menu':
      openDailyMenu(act.dataset.date || (act.dataset.week === '1' ? (state.custom.weekStart || mondayOf(todayStr())) : ''),
        act.dataset.po === '1', act.dataset.tab);
      break;
    case 'goto-day':
      state.currentDate = act.dataset.date;
      showPage('hari');
      break;
    case 'goto-orders': {
      const oc = customerById(act.dataset.cid);
      if (!oc) break;
      state.custom.q = (oc.name || '').toLowerCase();
      state.custom.weekStart = mondayOf(state.currentDate);
      showPage('custom');
      toast('Pesanan Mingguan dibuka pada ' + oc.name);
      break;
    }
    case 'holiday-day': openHolidayModal('day'); break;
    case 'holiday-week': openHolidayModal('week'); break;
    case 'holiday-save': saveHoliday(act.dataset.mode === 'week' ? 'week' : 'day'); break;
    case 'holiday-remove': removeHoliday(id); break;
    case 'holiday-unblock': {
      const h = db.holidays.find(x => x.id === id);
      const retry = pendingAfterUnblock; pendingAfterUnblock = null;
      closeModal();
      if (!h) { toast('Tanda liburnya sudah tidak ada'); break; }
      removeHoliday(id, true);
      toast('Libur ' + fmtShortDate(h.date) + ' dilepas, pesanannya boleh dinyalakan lagi', { undo: true });
      if (retry) retry();
      break;
    }
    case 'log-undo': undoToLog(id); break;
    case 'log-clear': if (db.log.length && confirm('Bersihkan seluruh log aktivitas?')) { db.log = []; logAction('log', 'Log dibersihkan'); save(); renderLog(); toast('Log dibersihkan', { undo: true }); } break;
    case 'customer-add': openCustomerModal(null); break;
    case 'customer-edit': { const c = customerById(id); if (c) openCustomerModal(c); break; }
    case 'cust-report': {
      const c = customerById(id);
      if (!c) break;
      const rs = document.getElementById('rptSearch');
      if (rs) rs.value = c.name;
      showPage('report');
      toast('Laporan ' + c.name + (c.className ? ' · ' + c.className : ''));
      break;
    }
    case 'customer-delete': { const c = customerById(id); if (c && confirm('Hapus pelanggan "' + c.name + '"? Catatan absensi lama tetap tersimpan.')) { db.customers = db.customers.filter(x => x.id !== id); save(); logAction('pelanggan', 'Hapus ' + c.name); renderSettings(); toast('Pelanggan dihapus', { undo: true }); } break; }
    case 'method-remove': { const m = act.dataset.method; db.settings.paymentMethods = db.settings.paymentMethods.filter(x => x !== m); save(); renderMethods(); break; }
    case 'method-add': {
      const inp = document.getElementById('newMethod');
      const v = inp.value.trim();
      if (v && !db.settings.paymentMethods.includes(v)) { db.settings.paymentMethods.push(v); save(); renderMethods(); inp.value = ''; }
      break;
    }
    case 'ui-reset-style':
      db.settings.uiFont = 'default'; db.settings.uiZoom = 100;
      applyUiStyle(); save({ noUndo: true });
      toast('Jenis huruf & ukuran teks kembali ke bawaan');
      break;
    case 'settings-save': {
      db.settings.businessName = document.getElementById('setName').value.trim() || 'Nama Usaha';
      db.settings.tagline = document.getElementById('setTagline').value.trim();
      db.settings.bankName = document.getElementById('setBankName').value.trim().slice(0, 30);
      db.settings.bankNumber = document.getElementById('setBankNumber').value.replace(/[^\d-]/g, '').slice(0, 30);
      db.settings.bankHolder = document.getElementById('setBankHolder').value.trim().slice(0, 40);
      db.settings.defaultPeriod = document.getElementById('setPeriod').value;
      logAction('pengaturan', 'Simpan pengaturan usaha');
      save(); applyBrand(); renderPackages(); renderDailyMerged(); renderDashboard();
      toast('Pengaturan disimpan');
      break;
    }
    case 'logo-pick': document.getElementById('logoFile').click(); break;
    case 'logo-remove':
      if (db.settings.logo && confirm('Hapus logo usaha?')) {
        db.settings.logo = '';
        logAction('pengaturan', 'Hapus logo usaha');
        save(); loadLogoImage(); applyBrand(); renderLogoUI();
        toast('Logo dihapus', { undo: true });
      }
      break;
    case 'export': exportBackup(); break;
    case 'import': document.getElementById('importFile').click(); break;
    case 'reset': if (confirm('Hapus SEMUA data dan kembali ke pengaturan awal? Tindakan ini tidak bisa dibatalkan.')) { db = defaultData(); save(); applyBrand(); applyNavSettings(); showPage('dashboard'); toast('Data direset'); } break;
    case 'demo-load': if (confirm('Ganti data saat ini dengan data contoh (demo)?')) { db = normalize(makeDemoData()); save(); applyBrand(); applyNavSettings(); showPage('dashboard'); toast('Data contoh dimuat'); } break;
    case 'backup-now': autoBackup(true); renderBackups(); toast('Cadangan harian dibuat'); break;
    case 'backup-download': {
      const b = readBackups()[+act.dataset.i];
      if (b) { downloadText('cadangan-katering-' + b.day + '.json', b.json, 'application/json'); toast('Cadangan ' + fmtShortDate(b.day) + ' diunduh'); }
      break;
    }
    case 'backup-restore': restoreBackup(+act.dataset.i); break;
    case 'backup-delete': {
      const list = readBackups(); const i = +act.dataset.i;
      if (list[i] && confirm('Hapus cadangan ' + fmtShortDate(list[i].day) + '?')) {
        list.splice(i, 1); writeBackups(list); renderBackups(); toast('Cadangan dihapus');
      }
      break;
    }
    case 'csv-report': exportReportCSV(); break;
    case 'csv-parents': exportParentsCSV(); break;
    case 'bill-csv': exportBillCSV(); break;
    case 'cust-filter-reset':
      state.cust = { q: '', level: '', cohort: '', cls: '', status: 'jalan' };
      renderCustomers();
      break;
    case 'cust-clear-sel': state.custSel.clear(); renderCustomers(); break;
    case 'cust-bulk': {
      const to = act.dataset.to;
      const ids = [...state.custSel];
      if (!ids.length) { toast('Centang pelanggan dulu'); break; }
      if (to === 'delete') {
        if (!confirm('Hapus ' + ids.length + ' pelanggan terpilih? Catatan absensi lama tetap tersimpan.')) break;
        db.customers = db.customers.filter(c => !state.custSel.has(c.id));
        logAction('pelanggan', 'Hapus massal ' + ids.length + ' pelanggan');
      } else if (CUST_STATUS.indexOf(to) >= 0) {
        db.customers.forEach(c => { if (state.custSel.has(c.id)) { c.status = to; c.active = custActive(c); } });
        logAction('pelanggan', 'Ubah status ' + ids.length + ' pelanggan → ' + STATUS_LABEL[to]);
      }
      state.custSel.clear();
      save(); renderCustomers(); renderDailyMerged(); renderDashboard();
      toast(to === 'delete' ? 'Pelanggan dihapus' : 'Status pelanggan diperbarui', { undo: true });
      break;
    }
    case 'unpaid-seeall': {
      const gs = groupByWeek(unpaidEntries());
      state.unpaidAll = !gs.every(gr => unpaidIsOpen(gr.monday, gs));
      state.unpaidOpen = null;
      renderDashboard();
      break;
    }
    case 'unpaid-week': {
      const gs = groupByWeek(unpaidEntries());
      const set = unpaidOpenMap(gs);
      const k = act.dataset.wk;
      if (set.has(k)) set.delete(k); else set.add(k);
      renderDashboard();
      break;
    }
    case 'rem-add': addReminder(); break;
    case 'rem-toggle': toggleReminder(id); break;
    case 'rem-del': removeReminder(id); break;
    case 'wa-send': {
      const g = (state.debtors || [])[+act.dataset.i];
      if (!g) break;
      const msg = waMessage(g);
      const num = waNumber(g.phone);
      if (!num) {
        copyText(msg);
        toast('No. HP ' + g.who + ' belum diisi. Pesan disalin, tempel manual di WhatsApp');
        break;
      }
      window.open('https://wa.me/' + encodeURIComponent(num) + '?text=' + encodeURIComponent(msg), '_blank');
      logAction('pengingat', 'Kirim WA ' + g.who + ' · sisa ' + fmtIDR(g.total));
      save();
      break;
    }
    case 'wa-copy': { const g = (state.debtors || [])[+act.dataset.i]; if (g) copyText(waMessage(g)); break; }
    case 'wa-open': {
      const g = (state.debtors || [])[+act.dataset.i];
      if (!g) break;
      if (g.groupId) { showPage('po'); openPoGroupDetail(g.groupId); break; }
      showPage('report');
      const s = document.getElementById('rptSearch');
      if (s) { s.value = g.kids[0] || g.who; renderReport(); }
      break;
    }
    case 'wa-copy-all': {
      const gs = debtors();
      if (!gs.length) { toast('Tidak ada tagihan tertunda'); break; }
      copyText(db.settings.businessName + ' · daftar tagihan belum dibayar (' + gs.length + ' penunggak)\n\n' +
        gs.map(g => '• ' + g.who + ' · ' + fmtIDR(g.total) + ' (' + g.kids.join(', ') + ', ' + g.days + ' hari)').join('\n') +
        '\n\nTOTAL: ' + fmtIDR(gs.reduce((s, g) => s + g.total, 0)));
      break;
    }
    case 'wa-save': saveWaSettings(); break;
    case 'report-detail': openReportDetail(id); break;
    case 'report-image': customerRincianImage(id); break;
    case 'report-print': printRecap(); break;
    case 'hub-print-report': renderReport(); printRecap(); break;
    case 'hub-csv-report': renderReport(); exportReportCSV(); break;
    case 'hub-nav': showPage(act.dataset.page); toast(act.dataset.t + ' · ' + act.dataset.h); break;
    case 'open-cal': {
      const field = act.dataset.field;
      if (field === 'hari') openCalendar({ mode: 'day', field, value: state.currentDate, dotFn: ymd => dayDots(ymd, false) });
      else if (field === 'dapurWeek') openCalendar({ mode: 'day', field, value: state.dapurWeek && mondayOf(state.dapurWeek) || mondayOf(todayStr()), dotFn: ymd => dayDots(ymd, false) });
      else if (field === 'satpam') openCalendar({ mode: 'day', field, value: state.satpamDate || todayStr(), dotFn: satpamDot });
      else if (field === 'sticker') openCalendar({ mode: 'day', field, value: state.stickerDate || todayStr(), dotFn: satpamDot });
      else if (field === 'poMonth') openCalendar({ mode: 'month', field, value: state.poMonth });
      else if (field === 'rptMonth') openCalendar({ mode: 'month', field, value: state.rptMonth });
      else if (field === 'expMonth') openCalendar({ mode: 'month', field, value: state.expMonth });
      break;
    }
    case 'cal-prev':
      if (cal.mode === 'day') { cal.month--; if (cal.month < 1) { cal.month = 12; cal.year--; } } else cal.year--;
      renderCalendar(); break;
    case 'cal-next':
      if (cal.mode === 'day') { cal.month++; if (cal.month > 12) { cal.month = 1; cal.year++; } } else cal.year++;
      renderCalendar(); break;
    case 'cal-pick': applyCalPick(act.dataset.ymd || act.dataset.ym); closeCalendar(); break;
    case 'cal-today': {
      const d = new Date();
      const v = cal.mode === 'day' ? toDateStr(d) : (d.getFullYear() + '-' + pad(d.getMonth() + 1));
      applyCalPick(v); closeCalendar(); break;
    }
    case 'cal-cancel': closeCalendar(); break;
    case 'modal-close': closeModal(); break;
  }
}

function onDocChange(e) {
  const t = e.target;
  if (t.id === 'logoFile') { if (t.files && t.files[0]) applyLogoFile(t.files[0]); t.value = ''; return; }
  if (t.classList.contains('nav-toggle')) { setNavHidden(t.dataset.key, !t.checked); return; }
  if (t.classList.contains('logo-opt')) {
    db.settings.logoOpts[t.dataset.key] = t.checked;
    save();
    syncPrintLogoControls();
    toast((t.checked ? 'Logo dicetak di ' : 'Logo tidak dicetak di ') + (t.dataset.label || t.dataset.key));
    return;
  }
  if (t.classList.contains('print-logo')) {
    state.printLogo[t.dataset.key] = t.checked;
    if (t.dataset.key === 'stiker') stickerPreview();
    else if (t.dataset.key === 'konfirmasi') satpamPreview();
    return;
  }
  if (t.id === 'logoHeadMm') {
    const v = Math.min(30, Math.max(8, Math.round(+t.value || 14)));
    db.settings.logoOpts.headMm = v;
    t.value = String(v);
    save();
    return;
  }
  if (t.classList.contains('pkg-edit')) { editPackage(t.dataset.id, t.dataset.field, t.value); return; }
  if (t.id === 'poFilter' || t.id === 'poProcess') { renderPO(); return; }
  if (t.id === 'poGroupMenu') {
    const m = db.poMenus.find(x => x.id === t.value);
    if (m) {
      const it = document.querySelector('#poGroupForm [name="item"]');
      const pr = document.querySelector('#poGroupForm [name="price"]');
      if (it) it.value = m.item;
      if (pr) pr.value = String(m.price || 0);
      const days = document.querySelectorAll('#poSched .ps-date');
      if (days.length === 1 && m.date) days[0].value = m.date;
    }
    updatePoGroupTotal();
    return;
  }
  if (t.id === 'printFontColor' || t.id === 'printTableTone') {
    savePrintStyle();
    if (state.printMode === 'konfirmasi') satpamPreview(); else stickerPreview();
    return;
  }
  if (t.id === 'stickerSize' || t.id === 'stickerContent' || t.id === 'stickerBrand' || t.id === 'stickerLines') {
    stickerPreview();
    return;
  }
  if (t.classList.contains('sticker-cb')) { stickerPreview(); return; }
  if (t.id === 'setUiFont' || t.id === 'setUiZoom') { saveUiStyle(); return; }
  if (t.id === 'stickerNameFont' || t.id === 'stickerClsFont' || t.id === 'stickerBrandFont' ||
      t.id === 'stickerNameScale' || t.id === 'stickerClsScale' || t.id === 'stickerBrandScale' ||
      t.id === 'stickerCellPad' || t.id === 'stickerCellTight' || t.id === 'stickerLineW' ||
      t.id === 'stickerMark' || t.id === 'stickerTone') {
    saveStickerStyle(); stickerPreview(); return;
  }
  if (t.id === 'satpamShowClass') { satpamPreview(); return; }
  if (t.id === 'rptClass' || t.id === 'rptAllTime' || t.id === 'rptSort') { renderReport(); return; }
  if (t.classList.contains('cust-cb')) {
    if (t.checked) state.custSel.add(t.dataset.id); else state.custSel.delete(t.dataset.id);
    updateCustBulk();
    return;
  }
  if (t.id === 'custCheckAll') {
    const ids = [...document.querySelectorAll('.cust-cb')].map(cb => cb.dataset.id);
    ids.forEach(id => t.checked ? state.custSel.add(id) : state.custSel.delete(id));
    renderCustomers();
    return;
  }
  if (t.id === 'custStatus') { state.cust.status = t.value; renderCustomers(); return; }
  if (t.id === 'custOnlyActive') { state.cust.status = t.checked ? 'jalan' : 'all'; renderCustomers(); return; }
  if (t.classList.contains('chk-family')) {
    const ids = (t.dataset.ids || '').split(',').filter(Boolean);
    ids.forEach(id => t.checked ? state.billSel.add(id) : state.billSel.delete(id));
    renderReport();
    return;
  }
  if (t.classList.contains('chk-kid')) {
    const cid = t.dataset.cid;
    if (t.checked) state.billSel.add(cid); else state.billSel.delete(cid);
    const tr = t.closest('tr');
    const fam = tr ? tr.querySelector('.chk-family') : null;
    if (fam) {
      const ids = (fam.dataset.ids || '').split(',').filter(Boolean);
      const sel = ids.filter(id => state.billSel.has(id)).length;
      fam.checked = ids.length > 0 && sel === ids.length;
      fam.indeterminate = sel > 0 && sel < ids.length;
    }
    renderBillPanel();
    return;
  }
  if (t.id === 'customWeekend') { state.custom.hideWeekend = t.checked; renderCustom(); return; }
  const df = /^(snack|lunch|hari|custom|cust)(Level|Cohort|Class)Filter$/.exec(t.id);
  if (df) {
    const which = df[1];
    const f = which === 'custom' ? state.custom : which === 'cust' ? state.cust : state.daily.hari;
    if (df[2] === 'Level') { f.level = t.value; f.cohort = ''; f.cls = ''; }
    else if (df[2] === 'Cohort') { f.cohort = t.value; f.cls = ''; }
    else f.cls = t.value;
    if (which === 'custom') renderCustom();
    else if (which === 'cust') renderCustomers();
    else renderDailyMerged();
    return;
  }
  if (t.id === 'holidayScope') { renderHolidayValueOptions(); renderHolidayWarn(); return; }
  if (t.id === 'holidayValue') { renderHolidayWarn(); return; }
  if (t.dataset.hp === '1') { filterHolidayPeople(); renderHolidayWarn(); return; }
  if (t.classList.contains('wm-name') || t.classList.contains('wm-type') || t.classList.contains('wm-price') || t.classList.contains('wm-pkg')) {
    applyMenuEdit(t, false);
    return;
  }
  if (t.id === 'logAction' || t.id === 'logMonth') { renderLog(); return; }

  const pageEl = t.closest('#page-hari');
  if (pageEl && t.closest('tr')) {
    const tr = t.closest('tr');
    const cid = tr.dataset.cid;
    const date = state.currentDate;
    if (t.classList.contains('inp-note')) {
      /* satu catatan untuk seluruh hari, ditulis ke semua pesanan yang aktif */
      let touched = 0;
      DAY_TYPES.forEach(ty => {
        const rr = (db[ty][date] || {})[cid];
        if (!rr || !rr.ordered) return;
        rr.note = t.value; touched++;
      });
      if (touched) save();
      syncMergedRow(tr);
      renderDailyStats();
    }
  }
}

/* ---------- Kalender besar ---------- */
let cal = { open: false, mode: 'day', field: null, year: 0, month: 1, selected: '', dotFn: null };
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
/* Urutan kolom kalender dimulai Minggu, beda dengan daftar hari (menu, tabel) yang tetap Senin */
const CAL_WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

function monthTitle(ym) { const p = ym.split('-').map(Number); return MONTHS_FULL[p[1] - 1] + ' ' + p[0]; }

function satpamDot(ymd) { return dayDots(ymd, false); }

function openCalendar(opts) {
  const p = String(opts.value).split('-').map(Number);
  cal.mode = opts.mode;
  cal.field = opts.field;
  cal.dotFn = opts.dotFn || null;
  cal.year = p[0];
  cal.month = p[1] || 1;
  cal.selected = opts.value;
  cal.open = true;
  document.getElementById('calOverlay').hidden = false;
  renderCalendar();
}
function closeCalendar() {
  cal.open = false;
  document.getElementById('calOverlay').hidden = true;
}

function renderCalendar() {
  const card = document.getElementById('calCard');
  if (cal.mode === 'day') {
    const title = MONTHS_FULL[cal.month - 1] + ' ' + cal.year;
    card.innerHTML =
      '<div class="cal-head">' +
        '<button type="button" class="cal-nav" data-act="cal-prev" aria-label="Sebelumnya">' + ICO_PREV + '</button>' +
        '<div class="cal-title">' + title + '</div>' +
        '<button type="button" class="cal-nav" data-act="cal-next" aria-label="Berikutnya">' + ICO_NEXT + '</button>' +
      '</div>' +
      '<div class="cal-week">' + CAL_WEEKDAYS.map(w => '<span>' + w + '</span>').join('') + '</div>' +
      '<div class="cal-grid">' + buildDayGrid(cal.year, cal.month, cal.selected, todayStr(), cal.dotFn, 'cal-pick', '', isFullHoliday) + '</div>' +
      '<div class="cal-foot">' +
        '<button type="button" class="btn btn-primary" data-act="cal-today">Hari ini</button>' +
        '<button type="button" class="btn btn-ghost" data-act="cal-cancel">Batal</button>' +
      '</div>';
  } else {
    card.innerHTML =
      '<div class="cal-head">' +
        '<button type="button" class="cal-nav" data-act="cal-prev" aria-label="Tahun sebelumnya">' + ICO_PREV + '</button>' +
        '<div class="cal-title">' + cal.year + '</div>' +
        '<button type="button" class="cal-nav" data-act="cal-next" aria-label="Tahun berikutnya">' + ICO_NEXT + '</button>' +
      '</div>' +
      '<div class="cal-grid cal-grid-month">' + buildMonthGrid(cal.year, cal.selected, monthKey(todayStr())) + '</div>' +
      '<div class="cal-foot">' +
        '<button type="button" class="btn btn-primary" data-act="cal-today">Bulan ini</button>' +
        '<button type="button" class="btn btn-ghost" data-act="cal-cancel">Batal</button>' +
      '</div>';
  }
}

function buildDayGrid(year, month, selectedYmd, todayYmd, dotFn, act, markCls, flagFn) {
  act = act || 'cal-pick';
  const startIdx = new Date(year, month - 1, 1).getDay(); // 0 = Minggu
  const days = new Date(year, month, 0).getDate();
  let html = '';
  for (let i = 0; i < startIdx; i++) html += '<div class="cal-empty"></div>';
  for (let d = 1; d <= days; d++) {
    const ymd = year + '-' + pad(month) + '-' + pad(d);
    const dots = dotFn ? dotFn(ymd) : [];
    const cls = 'cal-day' +
      (ymd === selectedYmd ? ' is-selected' : '') +
      (ymd === todayYmd ? ' is-today' : '') +
      (flagFn && flagFn(ymd) ? ' is-holiday' : '') +
      (dots.length && markCls ? ' ' + markCls : '');
    const dot = dots.length && !markCls ? '<span class="cal-dots">' + dots.map(k => '<i class="cal-dot ' + k + '"></i>').join('') + '</span>' : '';
    html += '<button type="button" class="' + cls + '" data-act="' + act + '" data-ymd="' + ymd + '">' + d + dot + '</button>';
  }
  return html;
}

function buildMonthGrid(year, selectedYm, currentYm) {
  let html = '';
  for (let m = 1; m <= 12; m++) {
    const ym = year + '-' + pad(m);
    const cls = 'cal-month' +
      (ym === selectedYm ? ' is-selected' : '') +
      (ym === currentYm ? ' is-today' : '');
    html += '<button type="button" class="' + cls + '" data-act="cal-pick" data-ym="' + ym + '">' + MONTHS_FULL[m - 1] + '</button>';
  }
  return html;
}

function applyCalPick(v) {
  const f = cal.field;
  if (f === 'hari') { state.currentDate = v; renderDailyMerged(); } else if (f === 'satpam') {
    state.satpamDate = v;
    satpamPreview();
  } else if (f === 'sticker') {
    state.stickerDate = v;
    renderStickerDate();
    renderStickerCustomers();
    stickerPreview();
  } else if (f === 'poMonth') {
    state.poMonth = v;
    renderPO();
  } else if (f === 'rptMonth') {
    state.rptMonth = v;
    renderReport();
  } else if (f === 'dapurWeek') {
    state.dapurWeek = mondayOf(v);
    if (state.page === 'dapur') renderDapur();
  } else if (f === 'expMonth') {
    state.expMonth = monthKey(v);
    if (state.page === 'expenses') renderExpenses();
  }
}

function backupReminder() {
  const last = uiPrefs().lastExportAt;
  if (!db.customers.length) return;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (days !== null && days < 7) return;
  toast('Belum ada unduhan cadangan' + (days ? ' sejak ' + days + ' hari lalu' : '') + ' · buka Pengaturan › Tampilan & Cadangan Data');
}

/* ---------- Init ---------- */
function init() {
  /* pesanan lama tanpa pilihan makanan di hari yang cuma punya satu pilihan, dirapikan sekali saat dibuka */
  if (autoPickSingles()) save({ noUndo: true });
  applyTheme(uiPrefs().theme === 'light' ? 'light' : 'dark');
  applySidebar(!!uiPrefs().sidebarCollapsed);
  buildDailyMergedPage();
  buildCustomPage();
  applyBrand();
  applyUiStyle();
  loadLogoImage();
  renderLogoUI();
  applyNavSettings();
  setTodayBadge();
  setSaveStatus();
  state.currentDate = todayStr();
  state.satpamDate = todayStr();
  state.poMonth = monthKey(todayStr());
  state.rptMonth = monthKey(todayStr());
  state.expMonth = monthKey(todayStr());
  setText('hariDateText', fmtLong(state.currentDate));
  setText('satpamDateText', fmtLong(state.satpamDate));
  setText('poMonthText', monthTitle(state.poMonth));
  setText('rptMonthText', monthTitle(state.rptMonth));
  setText('expMonthText', monthTitle(state.expMonth));
  state.stickerDate = todayStr();
  renderStickerDate();

  document.addEventListener('click', onDocClick);
  document.addEventListener('change', onDocChange);
  document.addEventListener('mouseover', e => { const c = chipFromEvent(e); if (c) showFoodTip(c); });
  document.addEventListener('mouseout', e => { if (chipFromEvent(e)) hideFoodTip(); });
  document.addEventListener('focusin', e => { const c = chipFromEvent(e); if (c) showFoodTip(c); });
  document.addEventListener('focusout', e => { if (chipFromEvent(e)) hideFoodTip(); });
  window.addEventListener('scroll', hideFoodTip, true);
  window.addEventListener('resize', hideFoodTip);
  document.getElementById('undoBtn').addEventListener('click', undoLast);
  document.getElementById('redoBtn').addEventListener('click', redoLast);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modalBackdrop').hidden) closeModal();
      else if (cal.open) closeCalendar();
      else closeNotif();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      e.preventDefault();
      if (e.key.toLowerCase() === 'y' || e.shiftKey) redoLast(); else undoLast();
    }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'poSearch') renderPO();
    if (t.id === 'rptSearch') renderReport();
    if (t.id === 'logSearch') renderLog();
    if (t.id === 'customSearch') { state.custom.q = (t.value || '').trim().toLowerCase(); renderCustom(); }
    if (t.id === 'hariSearch') { state.daily.hari.q = (t.value || '').trim().toLowerCase(); renderDailyMerged(); }
    if (t.id === 'custSearch') { state.cust.q = (t.value || '').trim().toLowerCase(); renderCustomers(); }
    if (t.id === 'holidayPeopleQ') { filterHolidayPeople(); return; }
    if (t.id === 'dapurRecipeSearch') { state.dapurQ = t.value || ''; renderDapur(); }
    if (t.classList.contains('wm-name')) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 170) + 'px'; applyMenuEdit(t, true); }
    if (t.name === 'allergy') { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 150) + 'px'; }
    if (t.id === 'stickerNameScale') setText('stickerNameScaleVal', t.value + '%');
    if (t.id === 'stickerClsScale') setText('stickerClsScaleVal', t.value + '%');
    if (t.id === 'stickerBrandScale') setText('stickerBrandScaleVal', t.value + '%');
    if (t.id === 'stickerCellPad') setText('stickerCellPadVal', mmLabel(t.value) + ' mm');
    if (t.id === 'stickerCellTight') setText('stickerCellTightVal', t.value + '%');
    if (t.id === 'setUiZoom') { db.settings.uiZoom = clampScale(t.value, UI_ZOOM_MIN, UI_ZOOM_MAX); applyUiStyle(); }
    if (t.closest && t.closest('#poGroupForm')) updatePoGroupTotal();
  });
  document.getElementById('importFile').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) importBackup(f);
    e.target.value = '';
  });

  let rt;
  window.addEventListener('resize', () => {
    if (document.getElementById('cprintPreview')) fitCustomPrintPreview();
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (state.page === 'dashboard') renderDashboard();
      else if (state.page === 'po') renderPO();
      else if (state.page === 'report') renderReport();
      else if (state.page === 'expenses') renderExpenses();
    }, 150);
  });

  showPage(firstVisibleNav());
  renderNotif();
  setTimeout(backupReminder, 1400);
  setTimeout(reminderNudge, 2600);
}

document.addEventListener('DOMContentLoaded', init);
