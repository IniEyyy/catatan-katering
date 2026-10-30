/* =========================================================
   Lovely Kitchen — Catatan Usaha Catering (offline)
   Data tersimpan di localStorage perangkat ini.
   ========================================================= */

'use strict';

/* ---------- Data & penyimpanan ---------- */
const DB_KEY = 'lovely_kitchen_data_v1';
const UNDO_KEY = 'lovely_kitchen_undo_v1';
const REDO_KEY = 'lovely_kitchen_redo_v1';
const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

/* Pilihan font untuk stiker — key => stack CSS */
const STK_FONTS = {
  sans: '"Segoe UI",system-ui,sans-serif',
  serif: 'Georgia,"Times New Roman",serif',
  mono: 'Consolas,"Courier New",monospace',
  round: '"Trebuchet MS",Verdana,sans-serif',
  narrow: '"Arial Narrow",Arial,Helvetica,sans-serif'
};
function clampScale(v, lo, hi, fb) { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : (fb === undefined ? 100 : fb); }
/* Pilihan font untuk seluruh aplikasi — key => stack CSS ('default' = ikut styles.css) */
const UI_FONTS = {
  default: '',
  sans: '"Segoe UI",system-ui,sans-serif',
  serif: 'Georgia,"Times New Roman",serif',
  mono: 'Consolas,"Courier New",monospace',
  round: '"Trebuchet MS",Verdana,sans-serif',
  narrow: '"Arial Narrow",Arial,Helvetica,sans-serif'
};
const UI_ZOOM_MIN = 85, UI_ZOOM_MAX = 130;
/* Status pelanggan: aktif = ikut pesanan berikutnya; selesai = sudah tamat (catatan tetap ada); berhenti = nonaktif */
const CUST_STATUS = ['aktif', 'selesai', 'berhenti'];
const STATUS_LABEL = { aktif: 'Aktif', selesai: 'Selesai', berhenti: 'Berhenti' };
const STATUS_BADGE = { aktif: 'green', selesai: 'gold', berhenti: 'red' };
const STATUS_HINT = {
  aktif: 'masih berlangganan — akan ikut terisi pada pesanan berikutnya',
  selesai: 'sudah tamat / pindah (mis. lulus) — riwayat tagihan tetap disimpan, tidak ikut pesanan berikutnya',
  berhenti: 'berhenti sementara — bisa diaktifkan lagi kapan saja'
};
const LETTERS = 'ABCDEFGH';
function shortTxt(s, n) { const t = String(s || ''); return t.length > n ? t.slice(0, n - 1).trim() + '…' : t; }

function defaultData() {
  return {
    settings: {
      businessName: 'Lovely Kitchen',
      tagline: 'Catering & Snack',
      priceSnack: 5000,
      priceLunch: 15000,
      packages: [], // { id, type:'snack'|'lunch', name, price } — paket = tingkatan harga; makanannya dari menu harian
      defaultPeriod: 'weekly',
      bankName: '', bankNumber: '', bankHolder: '', // rekening usaha — dicetak di invoice
      invSeq: 0, // penghitung nomor invoice yang sudah terbit
      waCountry: '62',
      waTemplate: 'Halo {orang}, berikut tagihan {usaha} yang belum dibayar:\n{rincian}\nTotal sisa: {sisa}\nMohon konfirmasi setelah transfer. Terima kasih.',
      sticker: { nameFont: 'sans', clsFont: 'sans', brandFont: 'sans', lineW: 2, nameScale: 100, clsScale: 100, brandScale: 100, cellPad: 25 },
      uiFont: 'default', // jenis huruf seluruh aplikasi (key UI_FONTS)
      uiZoom: 100,       // skala teks seluruh aplikasi, 85–130 %
      customDisplay: 'both', // tampilan sel Kustomisasi: 'both' | 'name' | 'price'
      paymentMethods: ['Tunai', 'Transfer', 'QRIS', 'Gratis'],
      menuSnack: ['Roti & Buah', 'Nasi Goreng', 'Lontong'],
      menuLunch: ['Ayam Geprek + Nasi', 'Nasi Uduk + Ayam', 'Soto + Nasi']
    },
    customers: [],
    snack: {},   // { 'YYYY-MM-DD': { customerId: {ordered,paid,method,note,pkg} } }
    lunch: {},
    menu: { snack: {}, lunch: {} },   // { 'YYYY-MM-DD': 'nama menu' }
    menuPlan: {}, // { 'YYYY-MM-DD': [{name,type,pkg}] } — menu mingguan per hari; name boleh multiline (isi paket)
    holidays: [], // { id, date, scope:'all'|'class'|'cohort'|'person', value, note }
    reminders: [], // { id, date, time, text, repeat:'once'|'weekly'|'monthly', doneOn }
    poMenus: [], // { id, date, item, price, note } — menu PO beserta tanggal
    po: [],      // { id, menuId?, date, name, item, qty, price, method, paid, note }
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
  sk.cellPad = clampScale(sk.cellPad, 0, 100, 25);
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
  const normMenu = arr => (Array.isArray(arr) ? arr : []).map(it => typeof it === 'string'
    ? { name: it, type: 'snack', pkg: '' }
    : { name: String((it && it.name) || '').trim(), type: ['snack', 'lunch', 'po'].includes(it && it.type) ? it.type : 'snack', pkg: (it && it.pkg) || '' }
  ).filter(it => it.name);
  if (!d.menuPlan || typeof d.menuPlan !== 'object') d.menuPlan = {};
  for (const date in d.menuPlan) {
    d.menuPlan[date] = normMenu(d.menuPlan[date]);
    if (!d.menuPlan[date].length) delete d.menuPlan[date];
  }
  delete d.menuDaily;
  d.customers.forEach(c => {
    c.snackPkg = c.snackPkg || ''; c.lunchPkg = c.lunchPkg || ''; c.parent = c.parent || '';
    c.phone = String(c.phone || '').trim(); c.allergy = String(c.allergy || '').trim().slice(0, 80);
    /* status = satu-satunya sumber; c.active dibiarkan tetap terisi supaya logika lama tidak berubah */
    c.status = CUST_STATUS.indexOf(c.status) >= 0 ? c.status : (c.active === false ? 'berhenti' : 'aktif');
    c.active = c.status === 'aktif';
  });
  ['snack', 'lunch'].forEach(t => {
    for (const date in d[t]) {
      const n = (d.menuPlan[date] || []).filter(it => (it.type === 'lunch' ? 'lunch' : it.type === 'po' ? 'po' : 'snack') === t).length;
      for (const id in d[t][date]) {
        const r = d[t][date][id];
        const max = t === 'snack' ? 2 : 1;
        let list = (Array.isArray(r.mis) ? r.mis.map(Number) : [])
          .filter(x => Number.isInteger(x) && x >= 0 && x < n);
        if (!list.length && Number.isInteger(r.mi) && r.mi >= 0 && r.mi < n) list = [r.mi];
        list = [...new Set(list)].sort((a, b) => a - b).slice(0, max);
        if (list.length) { r.mis = list; r.mi = list[0]; } else { delete r.mis; delete r.mi; }
      }
    }
  });
  if (!Array.isArray(d.holidays)) d.holidays = [];
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
  d.settings.invSeq = Math.max(0, Math.min(999999, Math.round(+d.settings.invSeq || 0)));
  if (!Array.isArray(d.poMenus)) d.poMenus = [];
  return d;
}

/* ---------- Data contoh (demo) ---------- */
/* Nama usaha contoh — dipilih acak tiap kali data contoh dimuat */
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
  const sLite = pk('snack', 'Snack Ringan', 4000);
  const sMid = pk('snack', 'Snack Sedang', 6000);
  const sFull = pk('snack', 'Snack Komplit', 8000);
  const lStd = pk('lunch', 'Lunch Standar', 15000);
  const lPrem = pk('lunch', 'Lunch Premium', 22000);
  d.settings.packages = [sLite, sMid, sFull, lStd, lPrem];
  d.settings.bankName = 'BCA';
  d.settings.bankNumber = '8765432190';
  d.settings.invSeq = 12;

  const mk = (name, className, parent, period, days, snack, lunch, extra) =>
    Object.assign({ id: uid(), name, className, parent: parent || '', period, days: days || [], snackDefault: !!snack, lunchDefault: !!lunch, snackPkg: '', lunchPkg: '', allergy: '', active: true }, extra || {});
  const kids = [
    mk('Andi Pratama', '2C', 'Bpk. Surya', 'weekly', [], true, true, { snackPkg: sMid.id, lunchPkg: lStd.id, phone: '0812-3456-7890', allergy: 'Alergi kacang & kerang' }),
    mk('Bella Surya', '2C', 'Bpk. Surya', 'weekly', [], true, false, { snackPkg: sLite.id }),
    mk('Cici Lestari', '3A', 'Ibu Rina', 'weekly', [], true, true, { lunchPkg: lPrem.id, phone: '0857-1122-3344', allergy: 'Tidak makan pedas' }),
    mk('Dodo Ramdan', '3A', 'Ibu Rina', 'daily', [1, 3, 5], true, true, { snackPkg: sFull.id, phone: '0857-1122-3344' }),
    mk('Eko Saputra', '4B', '', 'weekly', [], true, true, { lunchPkg: lStd.id }),
    mk('Fira Anisa', '4B', 'Bpk. Tono', 'monthly', [], true, true, { phone: '0821-9876-5432', allergy: 'Intoleransi laktosa — tanpa susu' }),
    mk('Gita Melia', '2C', 'Ibu Dewi', 'semester', [], false, true, { phone: '0811-2233-4455', lunchPkg: lPrem.id }),
    mk('Hana Kirana', '3A', '', 'weekly', [], true, false, { snackPkg: sMid.id, allergy: 'Alergi cokelat' }),
    mk('Intan Permata', '4B', 'Bpk. Tono', 'weekly', [], true, true, { phone: '0813-2244-6688' }),
    mk('Joko Slamet', '3A', 'Ibu Dewi', 'monthly', [], false, true, { lunchPkg: lStd.id, status: 'berhenti' }),
    mk('Miko Tanoto', '7B', 'Bpk. Surya', 'weekly', [], true, true, { snackPkg: sMid.id, allergy: ' Vegetarian — tanpa daging' }),
    mk('Nadia Putri', '8C', 'Ibu Rina', 'monthly', [], false, true, { lunchPkg: lPrem.id, allergy: 'Alergi telur' }),
    mk('Oscar Wijaya', '10A', '', 'weekly', [], true, true, { snackPkg: sLite.id, phone: '0819-3355-7799' }),
    mk('Putri Ayu', '10B', 'Bpk. Tono', 'daily', [2, 4], true, false, { snackPkg: sLite.id }),
    mk('Quinn Azalea', '8C', 'Ibu Dewi', 'weekly', [], true, true, { allergy: 'Alergi seafood' }),
    mk('Raka Aditya', '11B', 'Ibu Dewi', 'weekly', [], true, true, { snackPkg: sFull.id, phone: '0811-2233-4455' }),
    mk('Sinta Lestari', '12A', '', 'monthly', [], true, false, { snackPkg: sMid.id }),
    mk('Sinta Lestari', '12A', 'Bpk. Lestari', 'weekly', [], false, true, { lunchPkg: lStd.id }),
    mk('Tio Nugroho', '11B', 'Bpk. Surya', 'weekly', [], true, true, { phone: '0812-3456-7890' }),
    mk('Umi Kalsum', '12A', 'Ibu Rina', 'semester', [], true, true, { lunchPkg: lPrem.id, allergy: 'Maag — tidak pedas & tidak asam' }),
    mk('Vino Alfarizi', '6A', 'Bpk. Vino', 'weekly', [], true, true, { snackPkg: sMid.id, status: 'selesai', allergy: 'Riwayat alergi udang' })
  ];
  d.customers = kids;

  const today = todayStr();
  const offAll = shiftDate(today, -10);
  const offCohort = shiftDate(today, -7);
  const methods = ['Tunai', 'Transfer', 'QRIS'];

  /* menu 2 varian yang berganti tiap minggu — paket yang sama, makanan berbeda */
  const mi = (name, type, pkg) => ({ name, type, pkg: pkg || '' });
  const W1 = [
    [mi('Roti & Buah\nSelai stroberi\nPisang', 'snack', sLite.id), mi('Susu Cair\nCokelat', 'snack', sMid.id)],
    [mi('Nasi Goreng Mini\nAyam\nSayur\nBuah', 'lunch', lStd.id), mi('Bakwan Jagung\nSayur', 'snack', sLite.id)],
    [mi('Bubur Kacang\nKurma', 'snack', sMid.id), mi('Pisang Goreng\nNangka', 'snack', sLite.id),
      mi('Nasi Uduk\nAyam Bakar\nTempe\nPuding', 'lunch', lPrem.id)],
    [mi('Perkedel\nKentang', 'snack', sLite.id), mi('Teh Manis\nJeruk', 'snack', sMid.id),
      mi('Mie Goreng\nBakso\nSayur', 'lunch', lPrem.id), mi('Nasi Ayam\nSayur\nBuah', 'lunch', lStd.id)],
    [mi('Kue Pelita\nTelur', 'snack', sLite.id), mi('Nasi Kuning\nAyam\nAbon\nPuding', 'lunch', lStd.id)],
    [mi('Sandwich Selai\nPisang', 'snack', sMid.id), mi('Kue Tart', 'po')],
    []
  ];
  const W2 = [
    [mi('Donat Mini\nGula', 'snack', sLite.id), mi('Susu\nVanila', 'snack', sMid.id), mi('Abon\nSapi', 'snack', sFull.id)],
    [mi('Nasi Ayam\nSayur\nBuah', 'lunch', lStd.id), mi('Lontong Sayur\nAyam', 'lunch', lPrem.id), mi('Lapis Legit', 'snack', sMid.id)],
    [mi('Bola-bola Tahu\nSayur', 'snack', sLite.id), mi('Camilan Manis\nPuding', 'snack', sMid.id)],
    [mi('Soto\nNasi\nPerkedel', 'lunch', lStd.id), mi('Tahu Isi\nSayur', 'snack', sLite.id), mi('Es Teh\nManila', 'snack', sLite.id)],
    [mi('Nasi Uduk\nAyam Goreng\nTempe\nBuah', 'lunch', lPrem.id)],
    [mi('Roti Bakar\nKeju', 'snack', sMid.id), mi('Kue Tart', 'po')],
    []
  ];
  const mon = mondayOf(today);
  for (let w = -2; w <= 1; w++) {
    const tpl = w % 2 === 0 ? W1 : W2;
    for (let i = 0; i < 7; i++) {
      const date = shiftDate(mon, w * 7 + i);
      if (tpl[i].length) d.menuPlan[date] = tpl[i].map(x => Object.assign({}, x));
    }
  }

  const pickOf = (type, date, c, i) => {
    const items = (d.menuPlan[date] || []).filter(x => (x.type === 'lunch' ? 'lunch' : x.type === 'po' ? 'po' : 'snack') === type);
    if (!items.length) return { items: [], mis: [] };
    const first = (i * 3 + c.name.length + (type === 'lunch' ? 2 : 0)) % items.length;
    const mis = [first];
    if (type === 'snack' && items.length > 1 && (i + c.name.length) % 3 === 0) {
      const second = (first + 1) % items.length;
      mis.push(second);
      mis.sort((a, b) => a - b);
    }
    return { items, mis };
  };
  for (let i = 21; i >= 0; i--) {
    const date = shiftDate(today, -i);
    if (date === offAll) continue;
    for (const type of ['snack', 'lunch']) {
      for (const c of kids) {
        if (!c.active) continue;
        if (date === offCohort && cohortOf(c.className) === '11') continue;
        if (c.period === 'daily' && !(c.days || []).includes(weekdayOf(date))) continue;
        if (!c[type === 'snack' ? 'snackDefault' : 'lunchDefault']) continue;
        if (!d[type][date]) d[type][date] = {};
        const gratis = (type === 'lunch' && c.name === 'Eko Saputra' && i % 8 === 0) || (type === 'snack' && c.name === 'Gita Melia' && i % 11 === 0);
        const unpaid = (i * 5 + c.name.length + (type === 'lunch' ? 3 : 0)) % 9 === 0;
        const pick = pickOf(type, date, c, i);
        const rec = {
          ordered: true, paid: gratis || !unpaid,
          method: gratis ? 'Gratis' : methods[(i + c.name.length + (type === 'lunch' ? 1 : 0)) % 3],
          note: i === 3 && c.name === 'Andi Pratama' ? 'Tanpa sambal (alergi)' : '',
          pkg: pick.mis.length ? (pick.items[pick.mis[0]].pkg || '') : (type === 'snack' && c.name === 'Dodo Ramdan' && i % 5 === 0 ? sFull.id : '')
        };
        if (pick.mis.length) { rec.mis = pick.mis; rec.mi = pick.mis[0]; }
        d[type][date][c.id] = rec;
      }
    }
  }

  const pm = (date, item, price) => ({ id: uid(), date, item, price, note: '' });
  const m1 = pm(shiftDate(today, -35), 'Snack Box Rapat OSIS', 15000);
  const m2 = pm(shiftDate(today, -12), 'Tumpeng Mini', 25000);
  const m3 = pm('2025-12-20', 'Hampers Natal', 150000);
  const m4 = pm('2024-05-10', 'Nasi Box Ulang Tahun', 20000);
  const m5 = pm(shiftDate(today, 5), 'Kue Ulang Tahun', 120000);
  d.poMenus = [m1, m2, m3, m4, m5];
  const buyer = (m, name, qty, method, paid, note, status) =>
    ({ id: uid(), menuId: m.id, date: m.date, item: m.item, name, qty, price: method === 'Gratis' ? 0 : m.price, method, paid: method === 'Gratis' ? true : !!paid, note: note || '', status: status || '' });
  d.po = [
    buyer(m1, 'Bpk. Surya', 10, 'Transfer', true, '', 'kirim'),
    buyer(m1, 'Ibu Rina', 5, 'Tunai', false, '', 'siap'),
    buyer(m2, 'Ibu Dewi', 2, 'QRIS', true),
    buyer(m2, 'Bpk. Tono', 1, 'Gratis', true, 'kompensasi kegiatan'),
    buyer(m3, 'Ibu Rina', 3, 'Transfer', false),
    buyer(m4, 'Bpk. Surya', 4, 'Tunai', true, '', 'kirim'),
    buyer(m5, 'Raka Aditya', 1, 'QRIS', false, 'DP 50%', 'siap')
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
  const gHut = groupOrder('Panitia HUT SDN 05', 'Ibu Rina', '0812-3456-7890', 'Nasi Box Ulang Tahun Sekolah', 18000,
    'Tanpa pedas, antar pukul 10.00 (contoh)', [[shiftDate(today, 2), 40], [shiftDate(today, 9), 60]], 720000,
    shiftDate(today, 12), ['siap', '']);
  const gDesa = groupOrder('Kantor Desa Sukamaju', 'Bpk. Tono', '0821-9876-5432', 'Rapat Bulanan (Nasi Box)', 22000,
    '2 porsi extra untuk panitia (contoh)', [[shiftDate(today, -4), 25], [shiftDate(today, 11), 30]], 550000,
    shiftDate(today, -1), ['kirim', '']);
  /* satu kelompok sudah diterbitkan invoice-nya, satu lagi belum — untuk melihat dua keadaan nomor invoice */
  d.po.forEach(p => { if (p.groupId === gDesa.gid) p.invNo = 'INV/' + today.slice(0, 4) + '/' + today.slice(5, 7) + '/012'; });

  d.holidays = [
    { id: uid(), date: offAll, scope: 'all', value: '', note: 'Libur nasional (contoh)' },
    { id: uid(), date: offCohort, scope: 'cohort', value: '11', note: 'Study tour kelas 11 (contoh)' },
    { id: uid(), date: shiftDate(today, 3), scope: 'person', value: kids[3].id, note: 'Sakit (contoh)' }
  ];

  d.reminders = [
    { id: uid(), date: shiftDate(today, -2), time: '', text: 'Ambil kotak snack yang tertinggal di sekolah', repeat: 'once', doneOn: '', ref: '' },
    { id: uid(), date: today, time: '07:00', text: 'Belanja bahan untuk besok', repeat: 'weekly', doneOn: '', ref: '' },
    { id: uid(), date: shiftDate(today, 2), time: '', text: 'Cek pesanan PO yang diambil minggu ini', repeat: 'once', doneOn: '', ref: '' },
    { id: uid(), date: today.slice(0, 8) + '05', time: '', text: 'Tagih langganan bulanan', repeat: 'monthly', doneOn: '', ref: '' },
    { id: uid(), date: shiftDate(today, 1), time: '13:30', text: 'Kirim invoice Panitia HUT SDN 05', repeat: 'once', doneOn: '', ref: gHut.gid },
    { id: uid(), date: shiftDate(today, -1), time: '', text: 'Bungkus 25 porsi Kantor Desa', repeat: 'once', doneOn: shiftDate(today, -1), ref: '' },
    { id: uid(), date: shiftDate(today, -1), time: '', text: 'Tagih Kantor Desa Sukamaju — jatuh tempo terlewat', repeat: 'once', doneOn: '', ref: gDesa.gid }
  ];

  d.log = [
    { id: uid(), ts: new Date().toISOString(), action: 'default', detail: 'Data contoh dimuat untuk demo' },
    { id: uid(), ts: new Date(Date.now() - 3600e3).toISOString(), action: 'kustomisasi', detail: 'Pilih snack Andi Pratama — menu A+B' },
    { id: uid(), ts: new Date(Date.now() - 7200e3).toISOString(), action: 'po', detail: 'Tambah pesanan kelompok Kantor Desa Sukamaju' },
    { id: uid(), ts: new Date(Date.now() - 108000e3).toISOString(), action: 'pelanggan', detail: 'Catatan alergi Umi Kalsum diperbarui' }
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

function save(opts) {
  const quiet = !!(opts && opts.noUndo); // perubahan tampilan saja: tidak masuk antrean urungkan
  const json = JSON.stringify(db);
  if (!quiet && lastSaved !== null && json !== lastSaved) pushUndo();
  try { localStorage.setItem(DB_KEY, json); }
  catch (e) { toast('Gagal menyimpan: penyimpanan penuh?'); return; }
  lastSaved = json;
  const st = document.getElementById('saveStatus');
  if (st) st.textContent = 'Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  updateReminderBadge();
  if (!quiet) autoBackup();
  updateUndoBtn();
}

/* ---------- Urungkan / Ulangi — snapshot disimpan terpisah agar bisa dipakai dari Log Aktivitas ---------- */
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
  applyBrand(); applyUiStyle(); showPage(state.page);
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
/* Urungkan kembali sampai satu entri log — perubahan yang lebih baru ikut dibatalkan */
function undoToLog(logId) {
  const idx = undoStack.findIndex(s => s.refLog === logId);
  if (idx < 0) { toast('Langkah itu tidak ada di daftar urungkan — terlalu lama atau sudah pernah dibatalkan'); return; }
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
  currentDate: todayStr(),
  unpaidAll: false,      // "Buka semua" pada daftar Belum Lunas
  unpaidOpen: null,      // null = otomatis (hanya minggu terbaru), selain itu Set tanggal Senin yang dibuka
  report: null,
  satpamDate: todayStr(),
  poMonth: monthKey(todayStr()),
  rptMonth: monthKey(todayStr()),
  stickerDate: todayStr(),
  stickerMonth: monthKey(todayStr()),
  holidayDate: todayStr(),
  holidayMonth: monthKey(todayStr()),
  menuDate: todayStr(),
  menuMonth: monthKey(todayStr()),
  daily: { hari: { level: '', cohort: '', cls: '', q: '' } },
  billSel: new Set(), // anak yang dicentang untuk cek tagihan
  debtors: [],       // hasil perhitungan penunggak pada halaman Pengingat
  preview: null,     // { url, file, title } gambar yang sedang dipratinjau sebelum dibagikan
  cust: { q: '', level: '', cohort: '', cls: '', status: 'aktif' },
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
/* Harga sebuah porsi selalu dari paket: override harian > paket pelanggan > paket pertama */
function effPrice(type, rec, cust) {
  const p = pkgFor(type, rec, cust);
  return p ? +p.price || 0 : basePrice(type);
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
/* Mingguan: 7 hari berikutnya. Bulanan: besok s/d akhir bulan. Hanya Senin–Jumat. */
function autoFillPeriod(c) {
  if (!c || c.active === false) return 0;
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
function openModal(html) {
  const b = document.getElementById('modalBackdrop');
  b.innerHTML = '<div class="modal" role="dialog">' + html + '</div>';
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
    if (r.ordered && r.paid && r.method !== 'Gratis') paid += effPrice(type, r, customerById(id));
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
        out[type] += effPrice(type, r, customerById(id));
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
        const v = effPrice(type, r, customerById(id));
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
          out.push({ name: c ? c.name : '(dihapus)', cls: c ? c.className : '', type: type === 'snack' ? 'Snack' : 'Lunch', date, amount: effPrice(type, r, c) });
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
  /* ukur lebar ruang dulu, bukan lebar kanvas: lebar px dari render sebelumnya
     mengunci kanvas sehingga tidak pernah menyusut saat jendela dikecilkan */
  canvas.style.width = '100%';
  const w = Math.round(canvas.clientWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 0) || 400);
  const h = canvas.clientHeight || parseInt(canvas.getAttribute('height')) || 220;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
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
const TITLES = { dashboard: 'Beranda', hari: 'Hari Ini', custom: 'Pesanan Seminggu', po: 'Pre-Order (PO)', report: 'Laporan', pengingat: 'Pengingat & Tagihan', stiker: 'Stiker', satpam: 'Kertas Konfirmasi', libur: 'Hari Libur', log: 'Log Aktivitas', settings: 'Pengaturan' };

function showPage(name) {
  state.page = name;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.nav === name));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('is-active', p.id === 'page-' + name));
  document.getElementById('topbarTitle').textContent = TITLES[name];
  closeSidebar();
  renderPage(name);
}
function renderPage(name) {
  if (name === 'dashboard') renderDashboard();
  else if (name === 'hari') renderDailyMerged();
  else if (name === 'custom') renderCustom();
  else if (name === 'po') renderPO();
  else if (name === 'report') renderReport();
  else if (name === 'pengingat') renderPengingat();
  else if (name === 'stiker') { renderStickerCalendar(); renderStickerCustomers(); stickerPreview(); }
  else if (name === 'satpam') satpamPreview();
  else if (name === 'libur') renderLibur();
  else if (name === 'log') renderLog();
  else if (name === 'settings') renderSettings();
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

  const months = lastMonths(6);
  drawLine(document.getElementById('chartMonthly'),
    months.map(d => MONTHS_ID[d.getMonth()] + ' ' + d.getFullYear()),
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
function homeDayDot(ymd) {
  if (menuFor(ymd).length) return true;
  if (countOrdered('snack', ymd) || countOrdered('lunch', ymd)) return true;
  return db.po.some(p => p.date === ymd);
}
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
    '<div class="cal-week">' + WEEKDAYS.map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + buildDayGrid(y, mo, state.menuDate || '', todayStr(), homeDayDot, 'home-day') + '</div>';
}
const WEEK_MENU_MAX = 6;
function menuPlanItems(date) { return db.menuPlan[date] || []; }
function writeMenuPlan(date, items) {
  if (items.length) db.menuPlan[date] = items; else delete db.menuPlan[date];
}
/* Menu yang tampil untuk sebuah tanggal (menu mingguan) */
function menuFor(date) { return db.menuPlan[date] || []; }
function menuItemsFor(type, date) {
  return menuFor(date).filter(it => (it.type === 'lunch' ? 'lunch' : it.type === 'po' ? 'po' : 'snack') === type);
}
function menuItemsHtml(date) {
  const items = menuPlanItems(date);
  return items.map((it, idx) => {
    const type = ['snack', 'lunch', 'po'].includes(it.type) ? it.type : 'snack';
    const pkgs = pkgList(type);
    let pkgSel;
    if (type === 'po') {
      pkgSel = '<select class="input input-sm wm-pkg" disabled title="PO tidak memakai paket"><option>PO</option></select>';
    } else if (!pkgs.length) {
      pkgSel = '<select class="input input-sm wm-pkg" disabled title="Belum ada paket"><option>Belum ada paket</option></select>';
    } else {
      const cur = pkgs.some(p => p.id === it.pkg) ? it.pkg : pkgs[0].id;
      pkgSel = '<select class="input input-sm wm-pkg" data-date="' + date + '" data-idx="' + idx + '" title="Paket harga">' +
        pkgs.map(p => '<option value="' + escapeHtml(p.id) + '"' + (p.id === cur ? ' selected' : '') + '>' +
          escapeHtml(p.name) + ' · ' + fmtShort(p.price) + '</option>').join('') +
        '</select>';
    }
    return '<div class="wm-item">' +
      '<select class="input input-sm wm-type" data-date="' + date + '" data-idx="' + idx + '">' +
        '<option value="snack"' + (type === 'snack' ? ' selected' : '') + '>Snack</option>' +
        '<option value="lunch"' + (type === 'lunch' ? ' selected' : '') + '>Lunch</option>' +
        '<option value="po"' + (type === 'po' ? ' selected' : '') + '>PO</option>' +
      '</select>' +
      pkgSel +
      '<textarea class="input input-sm wm-name" rows="1" data-date="' + date + '" data-idx="' + idx + '" placeholder="Nama menu / isi paket — tekan Enter untuk baris baru">' + escapeHtml(it.name) + '</textarea>' +
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
    if (hint) hint.textContent = 'Filter menu mingguan per hari — pilih hari untuk melihat atau mengubah menu tanggal itu.';
    el.innerHTML = '<div class="wm-days">' + WEEKDAYS.map((w, i) => {
      const d = shiftDate(mon, i);
      return '<button type="button" class="day-chip' + (i === idx ? ' is-on' : '') + '" data-act="menu-day" data-ymd="' + d + '">' +
        w + '<small>' + d.slice(8) + '/' + d.slice(5, 7) + '</small></button>';
    }).join('') + '</div>' +
      '<div class="wm-row">' +
        '<span class="wm-day">' + WEEKDAYS[idx] + '<small>' + date.slice(8) + '/' + date.slice(5, 7) + '</small></span>' +
        '<div class="wm-items">' +
          (menuItemsHtml(date) || '<p class="muted tiny">Belum ada menu — tekan + Pilihan.</p>') +
          addBtn(date) +
        '</div>' +
      '</div>';
    growMenuNames(el);
    return;
  }

  const mon = mondayOf(state.menuDate || todayStr());
  setText('menuWeekLabel', fmtShortDate(mon) + ' – ' + fmtShortDate(shiftDate(mon, 6)));
  if (hint) hint.textContent = 'Menu per tanggal — isi paket ditulis satu baris per komponen (Enter untuk baris baru).';
  el.innerHTML = WEEKDAYS.map((w, i) => {
    const date = shiftDate(mon, i);
    return '<div class="wm-row">' +
      '<span class="wm-day">' + w + '<small>' + date.slice(8) + '/' + date.slice(5, 7) + '</small></span>' +
      '<div class="wm-items">' +
        (menuItemsHtml(date) || '<p class="muted tiny">Belum ada menu — tekan + Pilihan.</p>') +
        addBtn(date) +
      '</div>' +
    '</div>';
  }).join('');
  growMenuNames(el);
}
function applyMenuEdit(t, quiet) {
  const date = t.dataset.date, idx = +t.dataset.idx;
  const items = menuPlanItems(date).map(it => Object.assign({}, it));
  if (!items[idx]) return;
  const isName = t.classList.contains('wm-name');
  if (isName) {
    items[idx].name = (t.value || '').trim();
    if (!items[idx].name) items.splice(idx, 1);
  } else if (t.classList.contains('wm-type')) {
    items[idx].type = ['snack', 'lunch', 'po'].includes(t.value) ? t.value : 'snack';
    if (items[idx].type === 'po') items[idx].pkg = '';
    else if (!pkgList(items[idx].type).some(p => p.id === items[idx].pkg)) items[idx].pkg = firstPkgId(items[idx].type);
  } else if (t.classList.contains('wm-pkg')) {
    items[idx].pkg = t.value;
  }
  writeMenuPlan(date, items);
  save();
  if (!quiet) logAction('menu', 'Menu ' + date + ': ' + (menuPlanItems(date).map(i => flatName(i.name)).join(', ') || '(kosong)'));
  const row = menuPlanItems(date)[idx];
  if (!isName || !row || (isName && !row.name)) renderWeekMenu();
  renderHomeCalendar();
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
      const p = it.pkg ? pkgById(it.pkg) : null;
      return {
        type: it.type === 'lunch' ? 'lunch' : it.type === 'po' ? 'po' : 'snack',
        title: parts[0] || it.name,
        comps: parts.slice(1).join(' · '),
        pkg: p ? p.name + ' · ' + fmtIDR(p.price) : (it.type === 'po' ? 'Pre-Order' : '')
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
  toast('Foto diunduh — tinggal dibagikan');
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
    const plan = menuFor(date).filter(it => (it.type === 'lunch' ? 'lunch' : it.type === 'po' ? 'po' : 'snack') === type);
    const chips = pkgList(type).map(p => {
      const items = plan.filter(it => (it.pkg || firstPkgId(type)) === p.id);
      const menu = items.map(it => {
        const parts = menuLines(it.name);
        return '<div class="pm"><b>' + escapeHtml(parts[0] || it.name) + '</b>' +
          (parts.length > 1 ? '<span>' + parts.slice(1).map(escapeHtml).join(' · ') + '</span>' : '') + '</div>';
      }).join('');
      const usedBy = counts[p.id] || 0;
      return '<div class="pkg-chip"><span class="pkg-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="pkg-price">' + fmtIDR(p.price) + '</span>' +
        '<span class="pkg-use">' + usedBy + ' orang pesan</span>' +
        '<div class="pkg-menu">' + (menu || '<span class="pm-none">belum ada menu paket ini' +
          (usedBy ? ' — ' + usedBy + ' orang pesan dengan paket ini' : '') + '</span>') + '</div></div>';
    }).join('');
    return '<div class="pkg-group"><div class="pkg-group-title">' + (type === 'snack' ? 'Snack' : 'Lunch') +
      '<span class="muted tiny"> · ' + total + ' porsi</span></div>' +
      '<div class="pkg-chips">' + (chips || '<span class="muted small">Belum ada paket — tambah di Pengaturan.</span>') + '</div></div>';
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
    '<div class="stat-grid" id="hariStats"></div>' +
    '<div class="card">' +
      '<div class="card-head"><h3>Absensi Hari Ini</h3><span class="muted tiny" id="hariCount"></span>' +
        '<button class="btn btn-ghost btn-sm" data-act="daily-pay-all" title="Tandai lunas semua pesanan hari ini yang belum dibayar">Lunasi semua yang belum</button></div>' +
      '<p class="muted tiny" id="hariPkgSummary"></p>' +
      '<div class="table-wrap"><table class="table table-daily">' +
        '<thead>' +
          '<tr><th class="sticky-col" rowspan="2">Nama · kelas</th>' +
            '<th colspan="3" class="grp grp-snack">Snack</th>' +
            '<th colspan="3" class="grp grp-lunch">Lunch</th>' +
            '<th colspan="3" class="grp grp-day">Hari ini</th></tr>' +
          '<tr><th>Paket</th><th>Makanan / pesan</th><th class="c">Lunas</th>' +
            '<th>Paket</th><th>Makanan / pesan</th><th class="c">Lunas</th>' +
            '<th>Metode</th><th>Catatan</th><th class="num">Total</th></tr>' +
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
/* Chip makanan anak pada tanggal tsb. Dengan cid → jadi tombol pilihan (halaman harian & Pesanan Seminggu). */
function foodChips(type, date, rec, cid) {
  const items = menuItemsFor(type, date);
  if (!items.length) return '<span class="muted tiny" title="Belum ada menu ' + type + ' pada tanggal ini — atur di Beranda › Menu Mingguan">tidak ada menu</span>';
  const picks = rec && rec.ordered ? customPicks(type, rec).filter(k => k < items.length) : [];
  const label = it => shortTxt(menuLines(it.name)[0] || it.name, 16);
  if (!cid) {
    if (!picks.length) return '<span class="muted tiny">' + (rec && rec.ordered ? 'belum dipilih' : '—') + '</span>';
    return picks.map(k => '<span class="food-chip is-on" title="' + escapeHtml(menuLines(items[k].name).join(' · ')) + '"><b>' + LETTERS[k] + '</b>' + escapeHtml(label(items[k])) + '</span>').join('');
  }
  return items.slice(0, LETTERS.length).map((it, k) => {
    const on = picks.indexOf(k) >= 0;
    return '<button type="button" class="food-chip ' + (on ? 'is-on' : 'is-off') + '" data-act="daily-food" data-type="' + type +
      '" data-cid="' + escapeHtml(cid) + '" data-date="' + date + '" data-mi="' + k + '" title="' +
      escapeHtml(LETTERS[k] + ' · ' + (menuLines(it.name)[0] || it.name) + (on ? ' — klik untuk membatalkan' : ' — klik untuk memilih')) + '">' +
      '<b>' + LETTERS[k] + '</b>' + escapeHtml(label(it)) + '</button>';
  }).join('');
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
/* Pill status pembayaran — selalu ada supaya kolomnya tidak bolong-bolong */
function statePill(rec) {
  const free = rec.method === 'Gratis';
  const done = !!rec.ordered && (!!rec.paid || free);
  if (done) return { text: free ? 'Gratis' : 'Lunas', cls: '' };
  if (rec.ordered) return { text: 'Belum', cls: ' is-belum' };
  return { text: 'tidak pesan', cls: ' is-kosong' };
}
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
    const v = effPrice(t, r, c);
    value += v;
    if (!(r.paid || free)) unpaid += v;
    if (!method && r.method) method = r.method;
    if (!note && r.note) note = r.note;
  });
  const cls = ordered === 0 ? '' : (unpaid === 0 ? (gratis === ordered ? 'is-gratis' : 'is-lunas') : 'is-belum');
  return { recs: recs, value: value, unpaid: unpaid, ordered: ordered, gratis: gratis, method: method, note: note, cls: cls };
}
function dailyPkgCell(type, c, r) {
  const pkgs = pkgList(type);
  const cur = pkgFor(type, r, c);
  if (!pkgs.length) return '<td><select class="sel-pkg input input-sm" data-type="' + type + '" disabled><option>tidak ada paket</option></select></td>';
  return '<td><select class="sel-pkg input input-sm" data-type="' + type + '" title="Paket / harga porsi ' + TYPE_LABEL[type].toLowerCase() + '">' +
    pkgs.map(x => '<option value="' + escapeHtml(x.id) + '"' + (cur && x.id === cur.id ? ' selected' : '') + '>' + escapeHtml(pkgLabel(x)) + '</option>').join('') + '</select></td>';
}
/* Sel makanan: kalau sudah ada pilihan cukup chip; kalau belum (hari tanpa menu, atau
   pesanan tanpa pilihan) satu tombol "pesan" jadi saklar pesanan. */
function dailyFoodCell(type, date, c, r) {
  const items = menuItemsFor(type, date);
  const picks = r.ordered ? customPicks(type, r).filter(k => k < items.length) : [];
  const chips = items.length ? foodChips(type, date, r, c.id) : '';
  const showBtn = !items.length || (r.ordered && !picks.length);
  const btn = showBtn
    ? '<button type="button" class="cs-plain' + (r.ordered ? ' is-on' : '') + '" data-act="daily-plain" data-type="' + type + '" data-cid="' + escapeHtml(c.id) + '" title="' +
      (r.ordered ? 'Batalkan pesanan ' + type + ' hari ini' : 'Tandai pesan ' + type + ' hari ini — paket mengikuti default pelanggan') + '">' +
      (r.ordered ? '✓ pesan' : 'pesan') + '</button>'
    : '';
  return '<td class="food-cell' + (items.length ? '' : ' food-none') + '" data-type="' + type + '">' + chips + btn + '</td>';
}
function dailyPaidCell(type, r) {
  const free = r.method === 'Gratis';
  const w = statePill(r);
  return '<td class="c paid-cell" data-type="' + type + '"><input type="checkbox" class="chk-paid" data-type="' + type + '" title="' + (free ? 'Gratis (0 Rp)' : 'Lunas') + '" ' +
    ((r.paid || free) ? 'checked ' : '') + (r.ordered && !free ? '' : 'disabled ') + '>' +
    '<span class="state-pill' + w.cls + '">' + w.text + '</span></td>';
}
function dayTotalHTML(s) {
  return '<strong>' + fmtIDR(s.value) + '</strong>' +
    (s.unpaid > 0 ? '<button type="button" class="pay-day" data-act="daily-pay-day" title="Tandai lunas semua pesanan hari ini">' + fmtIDR(s.unpaid) + ' lunasi</button>' : '');
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
      const canPay = s.ordered > 0;
      return '<tr data-cid="' + c.id + '" class="' + s.cls + '">' +
        '<td class="sticky-col">' + escapeHtml(c.name) + ' <span class="d-cls">' + clsCell + '</span>' + allergyBadge(c) + '</td>' +
        DAY_TYPES.map(t => dailyPkgCell(t, c, s.recs[t]) +
          dailyFoodCell(t, date, c, s.recs[t]) +
          dailyPaidCell(t, s.recs[t])).join('') +
        '<td><select class="sel-method input input-sm"' + (canPay ? '' : ' disabled title="Centang pesan dulu"') + '><option value="">—</option>' +
          db.settings.paymentMethods.map(m => '<option value="' + escapeHtml(m) + '"' + (s.method === m ? ' selected' : '') + '>' + escapeHtml(m) + '</option>').join('') +
          '</select></td>' +
        '<td><input type="text" class="inp-note input input-sm" value="' + escapeHtml(s.note) + '" placeholder="' + (canPay ? 'Catatan hari ini…' : '—') + '"></td>' +
        '<td class="num day-total">' + dayTotalHTML(s) + '</td>' +
        '</tr>';
    }).join('');
  }
  renderDailyStats();
}

/* Perbarui baris tanpa render ulang — fokus input catatan tidak hilang */
function syncMergedRow(tr) {
  if (!tr) return;
  const cid = tr.dataset.cid, date = state.currentDate;
  const s = daySummary(cid, date);
  tr.className = s.cls;
  DAY_TYPES.forEach(t => {
    const r = s.recs[t];
    const fc = tr.querySelector('.food-cell[data-type="' + t + '"]');
    if (fc) fc.outerHTML = dailyFoodCell(t, date, customerById(cid), r);
    const cell = tr.querySelector('.paid-cell[data-type="' + t + '"]');
    if (cell) {
      const chk = cell.querySelector('.chk-paid');
      const free = r.method === 'Gratis';
      chk.checked = !!(r.paid || free);
      chk.disabled = !r.ordered || free;
      chk.title = free ? 'Gratis (0 Rp)' : 'Lunas';
      const pill = cell.querySelector('.state-pill');
      const w = statePill(r);
      pill.className = 'state-pill' + w.cls;
      pill.textContent = w.text;
    }
    const pk = tr.querySelector('.sel-pkg[data-type="' + t + '"]');
    if (pk && pk.options.length > 1) { const cur = pkgFor(t, r, customerById(cid)); if (cur) pk.value = cur.id; }
  });
  const canPay = s.ordered > 0;
  const ms = tr.querySelector('.sel-method');
  if (ms) { ms.disabled = !canPay; ms.value = s.method || ''; }
  const tot = tr.querySelector('.day-total');
  if (tot) tot.innerHTML = dayTotalHTML(s);
}

function renderDailyStats() {
  const date = state.currentDate;
  const f = state.daily.hari;
  const filtered = !!(f.level || f.cohort || f.cls);
  let pesan = 0, lunas = 0, belum = 0, gratis = 0, revenue = 0, belumValue = 0;
  const perType = { snack: 0, lunch: 0 };
  DAY_TYPES.forEach(type => {
    const recs = db[type][date] || {};
    for (const id in recs) {
      const r = recs[id];
      if (!r.ordered) continue;
      const c = customerById(id);
      if (filtered && (!c || !dailyMatch(c, f))) continue;
      pesan++; perType[type]++;
      if (r.method === 'Gratis') { gratis++; lunas++; continue; }
      if (r.paid) { lunas++; revenue += effPrice(type, r, c); } else { belum++; belumValue += effPrice(type, r, c); }
    }
  });
  document.getElementById('hariStats').innerHTML =
    statCard('Pesan', pesan, perType.snack + ' snack · ' + perType.lunch + ' lunch') +
    statCard('Lunas', lunas, '', 'accent') +
    statCard('Belum Lunas', belum, belumValue ? fmtIDR(belumValue) : '', 'danger') +
    statCard('Omset', fmtIDR(revenue), '', 'gold') +
    (gratis ? statCard('Gratis', gratis, 'harga 0', 'primary') : '');
  setText('hariCount', pesan + ' pesanan • ' + lunas + ' lunas' + (gratis ? ' • ' + gratis + ' gratis' : ''));
  const br = DAY_TYPES.map(t => pkgBreakdown(t, date)).filter(Boolean).join('  ·  ');
  const sum = document.getElementById('hariPkgSummary');
  if (sum) { sum.textContent = br ? 'Pilihan paket hari ini: ' + br : ''; sum.hidden = !br; }
}

/* Lunasi seluruh pesanan hari ini (satu klik untuk semua anak) */
function payAllToday(onlyCid) {
  const date = state.currentDate;
  let n = 0;
  DAY_TYPES.forEach(type => {
    const recs = db[type][date] || {};
    for (const id in recs) {
      if (onlyCid && id !== onlyCid) continue;
      const r = recs[id];
      if (!r.ordered || r.paid || r.method === 'Gratis') continue;
      r.paid = true; n++;
    }
  });
  if (!n) { toast(onlyCid ? 'Tidak ada yang perlu dilunasi' : 'Semua pesanan hari ini sudah lunas'); return; }
  logAction('bayar', 'Lunasi ' + n + ' pesanan ' + (onlyCid ? customerName(onlyCid) : 'semua anak') + ' @ ' + date);
  save();
  renderDailyMerged(); renderDashboard();
  toast(n + ' pesanan ditandai lunas');
}
function customerName(cid) { const c = customerById(cid); return c ? c.name : cid; }

/* ---------- Render: Kustomisasi (edit pesanan seminggu) ---------- */
function buildCustomPage() {
  document.getElementById('page-custom').innerHTML =
    '<div class="date-nav">' +
      '<button class="nav-arrow" data-act="custom-prev" title="Minggu sebelumnya">' + ICO_PREV + '</button>' +
      '<div class="date-field" style="cursor:default">' + ICO_CAL + '<span id="customWeekText"></span></div>' +
      '<button class="nav-arrow" data-act="custom-next" title="Minggu berikutnya">' + ICO_NEXT + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="custom-today">Minggu ini</button>' +
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
        '<div><h3>Tabel Pesanan Seminggu</h3><span class="muted tiny" id="customCount"></span></div>' +
        '<div class="head-tools">' +
          '<span class="muted tiny">tampilkan</span>' +
          '<div class="seg seg-xs" id="customDisplaySeg">' +
            '<button class="seg-btn" data-act="custom-display" data-mode="name" title="Hanya nama paket">Nama paket</button>' +
            '<button class="seg-btn" data-act="custom-display" data-mode="price" title="Hanya harga">Harga</button>' +
            '<button class="seg-btn" data-act="custom-display" data-mode="both" title="Nama paket + harga">Keduanya</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="muted tiny">Klik huruf makanan (A, B, C…) untuk menandai pesanan — klik lagi untuk membatalkan. <strong>Snack boleh 2 pilihan sekaligus</strong> (harga mengikuti paket pilihan pertama). Baris di bawah huruf menunjukkan paket/harga. Hari yang belum punya menu cukup ditandai <em>pesan</em> — paketnya mengikuti default pelanggan, ubah harganya di halaman Hari Ini. <span id="customHiddenNote"></span></p>' +
      '<div class="table-wrap custom-wrap"><table class="table custom-table">' +
        '<thead><tr id="customHead"></tr></thead><tbody id="customList"></tbody>' +
      '</table></div>' +
      '<p class="empty" id="customEmpty" hidden>Tidak ada pelanggan yang cocok dengan filter.</p>' +
    '</div>';
}
function customDates() {
  const start = state.custom.weekStart || mondayOf(todayStr());
  const out = [];
  for (let i = 0; i < 7; i++) out.push(shiftDate(start, i));
  return out;
}
function customPkgNote(type, rec, c, chosen) {
  const mode = db.settings.customDisplay === 'name' ? 'name' : db.settings.customDisplay === 'price' ? 'price' : 'both';
  const p = chosen ? (pkgById(chosen.pkg) || pkgFor(type, rec, c)) : pkgFor(type, rec, c);
  if (!p) return mode === 'price' ? '—' : 'tanpa paket';
  if (mode === 'name') return p.name;
  if (mode === 'price') return fmtIDR(p.price);
  return p.name + ' · ' + fmtIDR(p.price);
}
function customPicks(type, rec) {
  const max = type === 'snack' ? 2 : 1;
  let list = Array.isArray(rec && rec.mis) ? rec.mis.filter(n => Number.isInteger(n) && n >= 0) : [];
  if (!list.length && rec && Number.isInteger(rec.mi)) list = [rec.mi];
  if (list.length > max) list = list.slice(0, max);
  return [...new Set(list)].sort((a, b) => a - b);
}
function setCustomFood(cid, date, mi, typeIn) {
  const type = typeIn === 'lunch' || typeIn === 'snack' ? typeIn : (state.custom.type === 'lunch' ? 'lunch' : 'snack');
  const c = customerById(cid);
  if (!c) return;
  const items = menuItemsFor(type, date);
  const it = items[mi];
  if (!it) return;
  const rec = ensureRecord(type, date, cid);
  let picks = customPicks(type, rec);
  const had = picks.indexOf(mi) >= 0;
  if (had) picks = picks.filter(x => x !== mi);
  else if (type === 'snack') {
    picks = picks.length >= 2 ? [mi] : picks.concat(mi).sort((a, b) => a - b);
    if (picks.length === 2) toast('Snack: ' + LETTERS[picks[0]] + ' + ' + LETTERS[picks[1]] + ' — harga mengikuti paket ' + LETTERS[picks[0]]);
  } else picks = [mi];
  rec.mis = picks;
  rec.mi = picks.length ? picks[0] : undefined;
  if (!picks.length) delete rec.mi;
  if (picks.length) {
    rec.ordered = true;
    const primary = items[picks[0]];
    rec.pkg = (primary && primary.pkg) || rec.pkg || firstPkgId(type) || '';
    if (!rec.method) rec.method = defaultMethod();
    logAction('kustomisasi', 'Pilih ' + type + ' ' + c.name + ' @ ' + date + ' menu ' + picks.map(k => LETTERS[k]).join('+') + ' — ' + (menuLines(primary.name)[0] || ''));
  } else {
    rec.ordered = false; rec.paid = false;
    logAction('kustomisasi', 'Batalkan ' + type + ' ' + c.name + ' @ ' + date + ' (menu ' + LETTERS[mi] + ')');
  }
  save();
  renderCustom();
  renderDailyMerged(); renderDashboard();
}
function customType() { return state.custom.type === 'lunch' ? 'lunch' : 'snack'; }
/* Hari yang belum punya menu: satu tombol "pesan" saja — paket mengikuti default pelanggan */
function togglePlainOrder(cid, date, typeIn) {
  const type = typeIn === 'snack' || typeIn === 'lunch' ? typeIn : customType();
  const c = customerById(cid);
  if (!c) return;
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
function clearColumn(date) {
  const type = customType();
  const ids = (state.customVisible || []).filter(cid => customerById(cid));
  if (!ids.length) { toast('Tidak ada anak yang tampil'); return; }
  if (!confirm('Kosongkan kolom ' + fmtShortDate(date) + ' untuk ' + ids.length + ' anak yang tampil?')) return;
  let n = 0;
  ids.forEach(cid => {
    const rec = (db[type][date] || {})[cid];
    if (!rec || !rec.ordered) return;
    rec.ordered = false; rec.paid = false; delete rec.mis; delete rec.mi; n++;
  });
  logAction('kustomisasi', 'Kosongkan kolom ' + type + ' ' + date + ' (' + n + ' anak)');
  save(); renderCustom(); renderDailyMerged(); renderDashboard();
  toast(n + ' pesanan dihapus dari kolom ini · Ctrl+Z untuk membatalkan', { undo: true });
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
  const hideWe = st.hideWeekend !== false;
  const cols = [];
  allDates.forEach((d, i) => {
    const items = menuItemsFor(type, d);
    const anyOrder = Object.keys(db[type][d] || {}).some(id => (db[type][d][id] || {}).ordered);
    if (i >= 5 && hideWe && !items.length && !anyOrder) return;
    cols.push({ date: d, dow: i, items: items });
  });
  const weHidden = allDates.length - cols.length;
  const weBox = document.getElementById('customWeekend');
  if (weBox) weBox.checked = hideWe;
  setText('customHiddenNote', weHidden ? weHidden + ' hari akhir pekan disembunyikan (tidak ada menu & tidak ada pesanan)' : '');

  document.getElementById('customHead').innerHTML =
    '<th class="sticky-col">Nama</th><th>Kelas</th>' +
    cols.map(col => {
      const items = col.items;
      const legend = items.length
        ? '<span class="cs-legend">' + items.slice(0, LETTERS.length).map((it, k) =>
            '<span><b>' + LETTERS[k] + '</b>' + escapeHtml(shortTxt(menuLines(it.name)[0] || it.name, 15)) + '</span>').join('') +
          (items.length > LETTERS.length ? '<span class="more">+' + (items.length - LETTERS.length) + ' lagi</span>' : '') +
          '<button type="button" class="cs-clear" data-act="custom-col-clear" data-date="' + col.date + '" title="Kosongkan seluruh pesanan di kolom ini">×</button></span>'
        : '<span class="cs-legend cs-none">belum ada menu</span>';
      return '<th class="day">' + WEEKDAYS[col.dow] + '<small>' + col.date.slice(8) + '/' + col.date.slice(5, 7) + '</small>' + legend + '</th>';
    }).join('') +
    '<th class="num">Total mingguan</th>';

  const customers = db.customers.filter(c => c.active && dailyMatch(c, st))
    .filter(c => !st.q || ((c.name || '') + ' ' + (c.className || '') + ' ' + (c.allergy || '')).toLowerCase().includes(st.q))
    .sort(sortCustomers);
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
      if (ordered) { n++; const p = effPrice(type, rec, c); rowValue += p; portions++; value += p; if (!rec.paid && rec.method !== 'Gratis') unpaid++; }
      const leave = isOnLeave(c, d);
      if (!items.length) {
        return '<td class="cell' + (leave ? ' is-leave' : '') + '"' + (leave ? ' title="Sedang libur"' : '') + '>' +
          '<button type="button" class="cs-plain' + (ordered ? ' is-on' : '') + '" data-act="custom-plain" data-cid="' + escapeHtml(c.id) + '" data-date="' + d + '" title="' +
          (ordered ? 'Batalkan pesanan hari ini' : 'Tandai pesan hari ini — paket mengikuti default pelanggan; ubah di halaman ' + (type === 'snack' ? 'Snack' : 'Lunch')) + '">' +
          (ordered ? '✓ pesan' : 'pesan') + '</button>' +
          '<div class="cs-pkg' + (ordered ? ' is-manual' : ' is-off') + '">' + escapeHtml(ordered ? customPkgNote(type, rec, c) : 'belum pesan') + '</div></td>';
      }
      const picks = ordered ? customPicks(type, rec).filter(k => k < items.length) : [];
      return '<td class="cell' + (leave ? ' is-leave' : '') + '"' + (leave ? ' title="Sedang libur"' : '') + '>' +
        '<div class="cs-food">' + items.slice(0, LETTERS.length).map((it, k) =>
          '<button type="button" class="cs-letter' + (picks.indexOf(k) >= 0 ? ' is-on' : '') + '" data-act="custom-food" data-cid="' + escapeHtml(c.id) + '" data-date="' + d + '" data-mi="' + k + '" title="' +
          escapeHtml(LETTERS[k] + ' · ' + (menuLines(it.name)[0] || it.name) + (pkgById(it.pkg) ? ' · ' + pkgLabel(pkgById(it.pkg)) : ' · tanpa paket menu')) + '">' + LETTERS[k] + '</button>').join('') + '</div>' +
        '<div class="cs-pkg' + (picks.length ? '' : (ordered ? ' is-manual' : ' is-off')) + '" title="' +
        escapeHtml(picks.length > 1 ? ('2 pilihan — harga mengikuti paket pilihan ' + LETTERS[picks[0]]) : (picks.length === 0 && ordered ? 'Pesanan tercatat tanpa pilihan menu — harga mengikuti paket pelanggan' : (type === 'snack' ? 'Boleh pilih 2 makanan sekaligus' : 'Satu pilihan per hari'))) + '">' +
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
        '<button class="btn btn-ghost btn-sm" data-act="po-labels-menu" data-id="' + m.id + '">Label</button>' +
        '<button class="icon-act" data-act="po-menu-edit" data-id="' + m.id + '" title="Ubah menu">' + ICO_EDIT + '</button>' +
        '<button class="icon-act danger" data-act="po-menu-delete" data-id="' + m.id + '" title="Hapus menu">' + ICO_TRASH + '</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
  document.getElementById('poMenuEmpty').hidden = menus.length > 0;
  document.getElementById('poMenuCount').textContent = menus.length + ' menu';

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
      '<td class="c"><button class="badge ' + poStatusClass(p) + '" data-act="po-toggle-status" data-id="' + p.id + '" title="Klik untuk ubah status proses">' + poStatusLabel(p) + '</button></td>' +
      '<td class="end"><div class="row-actions">' +
        '<button class="icon-act" data-act="po-label" data-id="' + p.id + '" title="Cetak label / resi">' + ICO_PRINT + '</button>' +
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

function poStatusLabel(p) { return p.status === 'siap' ? 'Siap diambil' : p.status === 'kirim' ? 'Dikirim' : 'Belum diproses'; }
function poStatusClass(p) { return p.status === 'siap' ? 'gold' : p.status === 'kirim' ? 'green' : 'orange'; }
function poNextStatus(p) { p.status = p.status === '' ? 'siap' : p.status === 'siap' ? 'kirim' : ''; }
function poLabelBoxHTML(p, i) {
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
function buildPoLabelsHTML(list, subtitle) {
  const boxes = list.length
    ? list.map((p, i) => poLabelBoxHTML(p, i)).join('')
    : '<p style="text-align:center">Tidak ada pembeli pada menu ini.</p>';
  return printableDoc('Label Pre-Order', subtitle, '<div class="lbl-grid">' + boxes + '</div>');
}
function buildPoResiHTML(p) {
  const total = (+p.qty * +p.price) || 0;
  return printableDoc('Resi Pre-Order', fmtShortDate(p.date) + ' · ' + p.item,
    poLabelBoxHTML(p, null) +
    '<h4>Rincian pesanan</h4>' +
    '<table><tbody>' +
      '<tr><th>Nama</th><td>' + escapeHtml(p.name) + '</td></tr>' +
      '<tr><th>Menu</th><td>' + escapeHtml(p.item) + '</td></tr>' +
      '<tr><th>Tanggal ambil</th><td>' + fmtLong(p.date) + '</td></tr>' +
      '<tr><th>Jumlah</th><td>' + (+p.qty || 0) + ' × ' + fmtIDR(p.price) + '</td></tr>' +
      '<tr><th>Metode</th><td>' + escapeHtml(p.method || '—') + '</td></tr>' +
      '<tr><th>Pembayaran</th><td>' + (p.method === 'Gratis' ? 'GRATIS (kompensasi)' : (p.paid ? 'Lunas' : 'Belum dibayar')) + '</td></tr>' +
      '<tr><th>Status proses</th><td>' + escapeHtml(poStatusLabel(p)) + '</td></tr>' +
      (p.note ? '<tr><th>Catatan</th><td>' + escapeHtml(p.note) + '</td></tr>' : '') +
      '<tr><th>Total</th><td class="r"><strong>' + fmtIDR(total) + '</strong></td></tr>' +
    '</tbody></table>' +
    '<div class="sign"><div class="col">Penerima<div class="line">( ___________________ )</div></div><div class="col">' +
      escapeHtml(db.settings.businessName) + '<div class="line">( ___________________ )</div></div></div>');
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
    '<table><thead><tr><th>Tanggal</th><th>Nama</th><th>Menu</th><th class="r">Jml</th><th class="r">Nilai</th><th class="c">Bayar</th><th class="c">Status</th></tr></thead>' +
    '<tbody>' + (buyRows || '<tr><td colspan="7" class="c">Belum ada PO pada periode ini.</td></tr>') + '</tbody>' +
    '<tfoot><tr><td colspan="3">Total</td><td class="r">' + totQty + '</td><td class="r">' + fmtIDR(totNilai) + '</td><td class="c" colspan="2">Belum dibayar: ' + fmtIDR(totBelum) + '</td></tr></tfoot></table>');
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
    if (isEdit) { Object.assign(po, data); logAction('po', 'Ubah pembeli PO ' + data.name + ' — ' + data.item); }
    else { data.id = uid(); db.po.push(data); logAction('po', 'Tambah pembeli PO ' + data.name + ' — ' + data.item); }
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
    if (isEdit) { Object.assign(po, data); logAction('po', 'Ubah PO ' + data.name + ' — ' + data.item); }
    else { data.id = uid(); db.po.push(data); logAction('po', 'Tambah PO ' + data.name + ' — ' + data.item); }
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
      '<td class="small">' + g.dates.map(d => fmtShortDate(d) + ' <span class="muted tiny">(' +
        (g.rows.filter(p => p.date === d).reduce((s, p) => s + (+p.qty || 0), 0)) + ' porsi)</span>').join('<br>') + '</td>' +
      '<td class="num">' + g.qty + '</td>' +
      '<td class="num">' + fmtIDR(g.nilai) + (g.sisa > 0 ? '<div class="muted tiny danger-text">sisa ' + fmtIDR(g.sisa) + '</div>' : '<div class="muted tiny">lunas</div>') + '</td>' +
      '<td class="c"><button class="badge ' + (g.sisa > 0 ? 'red' : 'green') + '" data-act="po-group-paid" data-id="' + g.id + '" title="' +
        (g.sisa > 0 ? 'Tandai lunas — sisa ' + fmtIDR(g.sisa) : 'Batalkan penandaan lunas') + '">' +
        (g.sisa > 0 ? 'Belum' : 'Lunas') + '</button></td>' +
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
      (g.due ? '<br>Jatuh tempo ' + escapeHtml(fmtLong(g.due)) + (late ? ' — <span class="danger-text">sudah lewat, sisa masih ' + fmtIDR(g.sisa) + '</span>' : '') : '') + '</p>' +
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
      '<tr><th>Item</th><td colspan="3">' + escapeHtml(g.item) + ' · ' + fmtIDR(g.unit) + ' / porsi' + (g.note ? ' · ' + escapeHtml(g.note) : '') + '</td></tr>' +
    '</tbody></table>' +
    '<h4>Rincian tanggal ambil</h4>' +
    '<table><thead><tr><th class="no">No</th><th>Tanggal ambil</th><th class="c">Porsi</th><th class="r">Harga</th><th class="r">Jumlah</th><th class="c">Status bayar</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr><td colspan="2">TOTAL</td><td class="c">' + g.qty + '</td><td></td><td class="r">' + fmtIDR(g.nilai) + '</td><td></td></tr></tfoot></table>' +
    '<h4>Ringkasan pembayaran</h4>' +
    '<table><tbody>' +
      '<tr><th>Nilai pesanan</th><td class="r">' + fmtIDR(g.nilai) + '</td></tr>' +
      '<tr><th>Dibayar / uang muka</th><td class="r">' + fmtIDR(g.bayar) + '</td></tr>' +
      '<tr><th>Sisa tagihan</th><td class="r"><strong>' + fmtIDR(g.sisa) + '</strong></td></tr>' +
      (bank ? '<tr><th>Transfer ke</th><td>' + escapeHtml(bank) + ' — cantumkan nomor ' + escapeHtml(no) + '</td></tr>' : '') +
    '</tbody></table>' +
    '<div class="sign"><div class="col">Petugas<div class="line">( ___________________ )</div></div><div class="col">' +
      escapeHtml(db.settings.businessName) + '<div class="line">( ___________________ )</div></div></div>';
  printPoDoc(printableDoc('Invoice ' + no, 'Diterbitkan ' + fmtLong(todayStr()), inner));
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
  const headH = 150, sumH = 118;
  /* tinggi kanvas dihitung dari alur gambar yang sama — tidak ada ruang kosong di bawah ringkasan */
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
  c.textAlign = 'left'; c.fillStyle = th.text; c.font = '800 21px Segoe UI, sans-serif';
  c.fillText(clipText(c, db.settings.businessName, W - pad - 170), pad, 44);
  if (db.settings.tagline) { c.fillStyle = th.muted; c.font = '11.5px Segoe UI, sans-serif'; c.fillText(clipText(c, db.settings.tagline, W - pad - 170), pad, 62); }
  c.textAlign = 'right';
  c.fillStyle = th.strip[0]; c.font = '800 17px Segoe UI, sans-serif';
  c.fillText('INVOICE', W - pad, 44);
  c.fillStyle = th.muted; c.font = '700 11.5px Segoe UI, sans-serif';
  c.fillText(no, W - pad, 62);
  c.font = '11.5px Segoe UI, sans-serif';
  c.fillText('Diterbitkan ' + fmtLong(todayStr()), W - pad, 79);
  c.textAlign = 'left';
  c.strokeStyle = th.line; c.beginPath(); c.moveTo(pad, 96); c.lineTo(W - pad, 96); c.stroke();

  roundRect(c, pad, 108, W - pad * 2, 44, 8);
  c.fillStyle = th.panel; c.fill();
  c.fillStyle = th.muted; c.font = '700 9.5px Segoe UI, sans-serif';
  c.fillText('DITAGIHKAN KEPADA', pad + 12, 122);
  c.fillStyle = th.text; c.font = '800 14px Segoe UI, sans-serif';
  c.fillText(clipText(c, g.org, W - pad * 2 - 220), pad + 12, 138);
  const pic = (g.pic ? 'PIC: ' + g.pic : '') + (g.pic && g.contact ? ' · ' : '') + (g.contact || '');
  c.fillStyle = th.muted; c.font = '11px Segoe UI, sans-serif';
  c.fillText(clipText(c, pic || 'PIC belum diisi', 250), pad + 12, 150);
  c.textAlign = 'right';
  c.fillStyle = th.muted; c.font = '700 9.5px Segoe UI, sans-serif';
  c.fillText('JATUH TEMPO', W - pad - 12, 122);
  const late = !!g.due && g.sisa > 0 && g.due < todayStr();
  c.fillStyle = g.due ? (late ? th.danger : th.text) : th.muted;
  c.font = '800 13px Segoe UI, sans-serif';
  c.fillText(clipText(c, g.due ? fmtShortDate(g.due) : 'belum diatur', 200), W - pad - 12, 138);
  if (late) { c.font = '700 9.5px Segoe UI, sans-serif'; c.fillStyle = th.danger; c.fillText('SUDAH LEWAT', W - pad - 12, 150); }
  c.textAlign = 'left';

  const colPorsi = pad + 250, colHarga = pad + 350, colJumlah = pad + 452, colStat = W - pad;
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
    c.fillText((free ? 'GRATIS' : (p.paid ? 'LUNAS' : 'BELUM')) + (p.status === 'kirim' ? ' · dikirim' : p.status === 'siap' ? ' · siap' : ''), colStat, y);
    c.textAlign = 'left';
    y += rowH;
  });
  y += 2;
  c.strokeStyle = th.line; c.beginPath(); c.moveTo(pad, y); c.lineTo(W - pad, y); c.stroke();
  y += 16;
  c.font = '700 11px Segoe UI, sans-serif'; c.fillStyle = th.muted;
  c.fillText('TOTAL', pad, y);
  c.textAlign = 'right';
  c.fillText(g.qty + ' porsi', colPorsi, y);
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
  if (!gratis && a.left > 0 && a.lunas < sched.length) txt += ' — DP ' + fmtIDR(a.left) + ' belum terpakai, kecilkan DP atau tandai manual nanti';
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
  const menuOpts = '<option value="">— tulis sendiri —</option>' +
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
      '<div class="field"><span>Jadwal ambil — tanggal + jumlah porsi</span>' +
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
        text: 'Tagih ' + org + ' — sisa ' + fmtIDR(total - paidSum)
      });
      remNote = ' + pengingat tagihan ' + fmtShortDate(due);
    }
    logAction('po', (isEdit ? 'Ubah' : 'Tambah') + ' pesanan kelompok ' + org + ' — ' +
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
      else { const v = effPrice('snack', r, c); snackDays++; snackValue += v; if (r.paid) { snackPaid++; snackPaidValue += v; } }
    }
  }
  for (const date in db.lunch) {
    const r = db.lunch[date][c.id];
    if (r && r.ordered && inScope(date)) {
      if (r.method === 'Gratis') lunchFree++;
      else { const v = effPrice('lunch', r, c); lunchDays++; lunchValue += v; if (r.paid) { lunchPaid++; lunchPaidValue += v; } }
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
      out.push({ date, type, label: type === 'snack' ? 'Snack' : 'Lunch', amount: effPrice(type, r, c) });
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

  /* "Gratis" sengaja tidak ditampilkan di tabel rekap — hanya muncul di rincian */
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
        '<span>' + escapeHtml(k.c.name) + ' — ' + escapeHtml(k.c.className || '-') + ': ' + fmtIDR(k.tagihan) +
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
            '<li class="wk"><span>Minggu ' + weekRangeLabel(g.monday) + '</span><span>' + fmtIDR(g.total) + '</span></li>' +
            g.lines.map(l => '<li><span>' + fmtShortDate(l.date) + ' · ' + l.label + '</span><span>' + fmtIDR(l.amount) + '</span></li>').join('')
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
  const out = [db.settings.businessName + ' — Tagihan Belum Dibayar', ''];
  let grand = 0;
  for (const k of kids) {
    out.push((k.c.parent ? k.c.parent + ' — ' : '') + k.c.name + (k.c.className ? ' (' + k.c.className + ')' : ''));
    if (!k.lines.length) out.push('  Tidak ada tagihan tertunda');
    groupByWeek(k.lines).forEach(g => {
      out.push('  Minggu ' + weekRangeLabel(g.monday));
      g.lines.forEach(l => out.push('    · ' + fmtShortDate(l.date) + ' ' + l.label + ' — ' + fmtIDR(l.amount)));
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
    const head = (k.c.parent ? k.c.parent + ' — ' : '') + k.c.name + (k.c.className ? ' (' + k.c.className + ')' : '');
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
  g.textAlign = 'left'; g.fillStyle = th.muted; g.font = '700 13px Segoe UI, sans-serif';
  g.fillText('TOTAL', tStart, y + 13);
  g.fillStyle = th.danger; g.font = '800 16px Segoe UI, sans-serif';
  g.fillText(tAmt, tStart + tLblW + tGap, y + 13);
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
        amount: free ? 0 : effPrice(type, r, c), paid: free || !!r.paid
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
    g.fillText('Tidak ada tagihan tertunda — semua sudah lunas.', pad, y);
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
    'Rincian Tagihan — ' + c.name);
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
    '<h3>Rincian — ' + escapeHtml(c.name) + ' <span class="muted" style="font-weight:400">(' + escapeHtml(c.className) + ')</span></h3>' +
    '<p class="muted small">Periode: ' + escapeHtml(scope) + ' · Langganan ' + periodLabel(c.period) + '</p>' +
    '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">' +
      statCard('Tagihan', fmtIDR(rep.tagihan)) +
      statCard('Dibayar', fmtIDR(rep.bayar), '', 'accent') +
      statCard('Sisa', fmtIDR(rep.sisa), '', 'danger') +
    '</div>' +
    '<h4 style="margin-bottom:8px">Catatan harian</h4>' +
    '<div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th class="c">Snack</th><th class="c">Lunch</th></tr></thead><tbody>' + dailyRows + '</tbody></table></div>' +
    (det.pos.length ? '<h4 style="margin:16px 0 8px">Pre-Order</h4><div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Item</th><th class="num">Nilai</th><th class="c">Bayar</th></tr></thead><tbody>' + poRows + '</tbody></table></div>' : '') +
    '<div class="modal-actions">' +
      '<button type="button" class="btn btn-ghost" data-act="modal-close">Tutup</button>' +
      '<button type="button" class="btn btn-accent" data-act="report-image" data-id="' + c.id + '">Simpan Gambar</button>' +
    '</div>'
  );
}

function printableDoc(title, subtitle, inner) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
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
    '.lbl-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}' +
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
    '</style></head><body>' +
    '<div class="head"><h1>' + escapeHtml(db.settings.businessName) + '</h1>' +
    '<div class="sub">' + escapeHtml(title) + '</div>' +
    (subtitle ? '<div class="sub">' + escapeHtml(subtitle) + '</div>' : '') +
    '</div>' + inner + '</body></html>';
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

/* ---------- Render: Stiker ---------- */
function renderStickerCalendar() {
  const el = document.getElementById('stickerCal');
  if (!el) return;
  const p = (state.stickerMonth || monthKey(state.stickerDate || todayStr())).split('-').map(Number);
  const y = p[0], mo = p[1];
  el.innerHTML =
    '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-act="sticker-cal-prev" aria-label="Bulan sebelumnya">' + ICO_PREV + '</button>' +
      '<div class="cal-title">' + MONTHS_FULL[mo - 1] + ' ' + y + '</div>' +
      '<button type="button" class="cal-nav" data-act="sticker-cal-next" aria-label="Bulan berikutnya">' + ICO_NEXT + '</button>' +
    '</div>' +
    '<div class="cal-week">' + WEEKDAYS.map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + buildDayGrid(y, mo, state.stickerDate || '', todayStr(), satpamDot, 'sticker-day') + '</div>';
  setText('stickerDateLabel', fmtLong(state.stickerDate || todayStr()));
}
function shiftStickerMonth(delta) {
  const p = state.stickerMonth.split('-').map(Number);
  let y = p[0], mo = p[1] + delta;
  if (mo < 1) { mo = 12; y--; } else if (mo > 12) { mo = 1; y++; }
  state.stickerMonth = y + '-' + pad(mo);
  renderStickerCalendar();
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
  const typeEl = document.getElementById('stickerType');
  const want = typeEl ? typeEl.value : 'all';
  const match = c => {
    const o = ordered[c.id];
    if (!o) return false;
    if (want === 'snack') return o.indexOf('Snack') >= 0;
    if (want === 'lunch') return o.indexOf('Lunch') >= 0;
    return true;
  };
  const list = db.customers.filter(match).sort(sortCustomers);
  const wrap = document.getElementById('stickerCustomerList');
  if (!list.length) {
    wrap.innerHTML = '<p class="empty">Tidak ada pesanan ' + (want === 'snack' ? 'snack' : want === 'lunch' ? 'lunch' : 'snack / lunch') +
      ' pada ' + escapeHtml(fmtLong(date)) + '. Ubah filter atau pilih tanggal lain.</p>';
    return;
  }
  wrap.innerHTML = list.map(c =>
    '<label><input type="checkbox" class="sticker-cb" value="' + c.id + '" checked><span>' + escapeHtml(c.name) +
    (c.allergy ? '<span class="alg-dot" title="' + escapeHtml(c.allergy) + '">&#9888;</span>' : '') +
    '</span><span class="cls">' + escapeHtml(ordered[c.id]) + '</span></label>'
  ).join('');
}
function stickerOptions() {
  const parts = document.getElementById('stickerSize').value.split('x').map(Number);
  return {
    cols: parts[0], rows: parts[1],
    content: document.getElementById('stickerContent').value,
    brand: document.getElementById('stickerBrand').checked,
    lines: document.getElementById('stickerLines').checked,
    style: db.settings.sticker
  };
}
function buildStickerHTML(customers, o) {
  const cols = o.cols, rows = o.rows, style = o.style || db.settings.sticker;
  const perPage = cols * rows;
  const pages = [];
  for (let i = 0; i < customers.length; i += perPage) pages.push(customers.slice(i, i + perPage));
  if (!pages.length) pages.push([]);
  const MM = 96 / 25.4;
  const cellWpx = (198 / cols) * MM, cellHpx = (287 / rows) * MM;
  const padMm = 2.6 * (style.cellPad / 100);
  const padPx = padMm * MM;
  const innerW = Math.max(20, cellWpx - padPx * 2), innerH = Math.max(20, cellHpx - padPx * 2);
  const autoName = Math.max(12, Math.min(40, innerW / 4.2, innerH / 3.8));
  const autoCls = Math.max(10, Math.min(34, innerW / 3.6, innerH / 4.4));
  const brandSize = Math.max(5, Math.min(30, autoName * 0.3 * (style.brandScale / 100)));
  let nameSize = autoName * (style.nameScale / 100);
  let clsSize = autoCls * (style.clsScale / 100);
  const stack = nameSize + clsSize + (o.brand ? brandSize + 2 : 0);
  const budget = innerH * 0.92;
  if (stack > budget) { const k = budget / stack; nameSize *= k; clsSize *= k; }
  const nameFont = STK_FONTS[style.nameFont] || STK_FONTS.sans;
  const clsFont = STK_FONTS[style.clsFont] || STK_FONTS.sans;
  const brandFont = STK_FONTS[style.brandFont] || STK_FONTS.sans;
  const brandName = db.settings.businessName;
  const frame = document.getElementById('stickerFrame');
  const fit = frame && frame.clientWidth ? Math.min(1, (frame.clientWidth - 16) / 794).toFixed(3) : 1;
  const flagMm = Math.max(3.2, Math.min(8, (198 / cols) * 0.17));
  const flagPx = flagMm * MM * 0.66;
  const rowHmm = 287 / rows;
  const sheets = pages.map(page => {
    const items = page.map(c => {
      let cls = '';
      if (o.content === 'namealg' && c.allergy) {
        const len = Math.max(8, c.allergy.length);
        const availH = Math.max(14, innerH * 0.8 - nameSize - (o.brand ? brandSize + 2 : 0));
        let best = { sz: 0, lines: 1 };
        for (let ln = 1; ln <= 5; ln++) {
          const s = Math.min(clsSize, ln * innerW / (0.72 * len), availH / (1.12 * ln));
          if (s > best.sz) best = { sz: s, lines: ln };
        }
        cls = '<div class="alg" style="font-size:' + best.sz.toFixed(1) + 'px;-webkit-line-clamp:' + best.lines + '">&#9888; ' + escapeHtml(c.allergy) + '</div>';
      } else if ((o.content === 'nameclass' || o.content === 'namamark') && c.className) {
        cls = '<div class="cls">' + escapeHtml(c.className) + '</div>';
      }
      const mark = (o.content === 'namamark' && c.allergy)
        ? '<span class="flag" title="' + escapeHtml(c.allergy) + '">!</span>' : '';
      const br = o.brand ? '<div class="brand">' + escapeHtml(brandName) + '</div>' : '';
      return '<div class="label' + (mark ? ' has-flag' : '') + '">' + mark + '<div class="name">' + escapeHtml(c.name) + '</div>' + cls + br + '</div>';
    }).join('');
    /* berhenti di baris terakhir yang terisi — tidak ada kotak kosong di bawahnya */
    const usedRows = Math.ceil(page.length / cols);
    return '<div class="sheet" style="grid-template-columns:repeat(' + cols + ',1fr);' +
      (usedRows ? 'grid-template-rows:repeat(' + usedRows + ',' + rowHmm.toFixed(2) + 'mm)' : '') + '">' + items + '</div>';
  }).join('');
  const edge = o.lines ? (+style.lineW || 2) + 'px solid #A9A092' : '0';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page{size:A4;margin:5mm 6mm}' +
    '*{box-sizing:border-box}' +
    'html,body{margin:0;padding:0;background:#fff}' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#2B2020;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '@media screen{body{zoom:' + fit + '}}' +
    '.sheet{display:grid;gap:0;width:198mm;margin:0 auto;border-top:' + edge + ';border-left:' + edge + ';page-break-inside:avoid}' +
    '.sheet + .sheet{margin-top:5mm;page-break-before:always}' +
    '.label{position:relative;border-right:' + edge + ';border-bottom:' + edge + ';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:' + padMm.toFixed(2) + 'mm ' + (padMm * 0.45).toFixed(2) + 'mm;overflow:hidden;min-height:0;line-height:1.02;gap:.25mm}' +
    '.flag{position:absolute;bottom:.6mm;right:.6mm;width:' + flagMm.toFixed(1) + 'mm;height:' + flagMm.toFixed(1) + 'mm;border-radius:50%;background:#C0272D;color:#fff;font-weight:800;font-size:' + flagPx.toFixed(1) + 'px;display:flex;align-items:center;justify-content:center;line-height:1}' +
    '.label.has-flag .brand,.label.has-flag .alg,.label.has-flag .cls{max-width:calc(100% - ' + (flagMm + 1).toFixed(1) + 'mm)}' +
    '.name{font-family:' + nameFont + ';font-weight:700;font-size:' + nameSize.toFixed(1) + 'px;max-width:100%;overflow-wrap:anywhere}' +
    '.cls{font-family:' + clsFont + ';color:#5F564B;font-weight:700;font-size:' + clsSize.toFixed(1) + 'px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.alg{font-family:' + clsFont + ';color:#C0272D;font-weight:700;font-size:' + clsSize.toFixed(1) + 'px;line-height:1.08;max-width:100%;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}' +
    '.brand{font-family:' + brandFont + ';color:#C0272D;font-size:' + brandSize.toFixed(1) + 'px;letter-spacing:.3px;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
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
  set('stickerCellPad', String(st.cellPad));
  setText('stickerNameScaleVal', st.nameScale + '%');
  setText('stickerClsScaleVal', st.clsScale + '%');
  setText('stickerBrandScaleVal', st.brandScale + '%');
  setText('stickerCellPadVal', st.cellPad + '%');
  setText('stickerLineVal', st.lineW + ' px');
  const brandChk = document.getElementById('stickerBrand');
  const linesChk = document.getElementById('stickerLines');
  const brandRow = document.getElementById('stickerBrandRow');
  if (brandRow) brandRow.classList.toggle('is-dim', !(brandChk && brandChk.checked));
  const row = document.getElementById('stickerLineRow');
  if (row) row.classList.toggle('is-dim', !(linesChk && linesChk.checked));
  const markNote = document.getElementById('stickerMarkNote');
  if (markNote) markNote.hidden = document.getElementById('stickerContent').value !== 'namamark';
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
  st.cellPad = clampScale(val('stickerCellPad', 25), 0, 100, 25);
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
  if (selected.length > o.cols * o.rows) toast('Jumlah melebihi 1 lembar — otomatis dibuat beberapa halaman.');
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
  const typeLabel = type === 'snack' ? 'Snack' : 'Lunch';
  const menus = menuFor(date).filter(it => (it.type === 'lunch' ? 'lunch' : it.type === 'po' ? 'po' : 'snack') === type);
  const menuHtml = menus.length
    ? '<div class="menu"><strong>Pilihan ' + typeLabel + ':</strong>' + menus.map(m => {
        const parts = menuLines(m.name);
        return '<div class="mi"><strong>' + escapeHtml(parts[0] || m.name) + '</strong>' +
          (parts.length > 1 ? ' <span class="isi">' + parts.slice(1).map(escapeHtml).join(' · ') + '</span>' : '') + '</div>';
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
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page{size:A4 portrait;margin:12mm}' +
    'body{font-family:"Segoe UI",system-ui,sans-serif;color:#222;font-size:12px}' +
    'h1{font-size:19px;margin:0 0 2mm;letter-spacing:.2px}' +
    '.head{text-align:center;margin-bottom:6mm}' +
    '.head .sub{font-size:11px;color:#555}' +
    '.menu{margin:0 0 4mm;font-size:12px}' +
    '.menu .mi{margin:.6mm 0}' +
    '.menu .isi{color:#555;font-size:11px}' +
    '.menu em{color:#666;font-weight:400}' +
    'table{width:100%;border-collapse:collapse}' +
    'th,td{border:1px solid #555;padding:2.6mm 2mm;text-align:left}' +
    'th{background:#f3efe8;font-size:11px}' +
    'td.r,th.r{text-align:right}' +
    'td.box{width:14mm}' +
    'td.no{width:9mm;text-align:center}' +
    '.cap{font-size:10.5px;color:#555;margin:0 0 2mm}' +
    'th.pick,td.pick{width:13mm;text-align:center}' +
    'th.pick{font-size:14px;line-height:1.15}' +
    'th.pick small{display:block;font-size:8.5px;font-weight:600;color:#555;line-height:1.2;letter-spacing:0;text-transform:none}' +
    'td.pick{font-size:14px;color:#777}' +
    'td.pick.off{background:#f1efe9}' +
    '</style></head><body>' +
    '<div class="head"><h1>' + escapeHtml(db.settings.businessName) + '</h1>' +
    '<div class="sub">Lembar Konfirmasi / Penerimaan — ' + typeLabel + '</div>' +
    '<div class="sub">Tanggal: ' + fmtLong(date) + '</div></div>' +
    menuHtml +
    caption +
    '<table><thead><tr><th class="no">No</th><th>Nama</th>' +
    (showClass ? '<th>Kelas</th>' : '') +
    (useFoods
      ? foods.map((f, k) => '<th class="pick">' + LETTERS[k] + '<small>' + escapeHtml(shortTxt(menuLines(f.name)[0] || f.name, 16)) + '</small></th>').join('')
      : '<th>Paket</th><th class="box">Cek ✓</th>') +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</body></html>';
}
function satpamPreview() {
  const date = state.satpamDate || todayStr();
  const type = document.getElementById('satpamType').value;
  const showClass = document.getElementById('satpamShowClass').checked;
  document.getElementById('satpamFrame').srcdoc = buildSatpamHTML(date, type, showClass);
  document.getElementById('satpamCount').textContent = satpamEntries(date, type).length + ' nama';
  setText('satpamDateText', fmtLong(date));
}
function printFrame(frame) {
  try { frame.contentWindow.focus(); frame.contentWindow.print(); }
  catch (e) { toast('Tidak bisa mencetak. Gunakan menu cetak browser.'); }
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
  return g.weeks.map(w => '• Minggu ' + weekRangeLabel(w.monday) + ' — ' + fmtIDR(w.total)).join('\n') +
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
        '<button class="btn btn-ghost btn-sm" data-act="rem-prefill"' + (g.groupId ? ' data-id="' + escapeHtml(g.groupId) + '"' : '') +
          ' data-text="' + escapeHtml('Tagih ' + g.who + ' — sisa ' + fmtIDR(g.total)) +
          '" data-date="' + (g.due || shiftDate(todayStr(), 7)) + '" title="Buat pengingat menagih penunggak ini">+ Pengingat</button>' +
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
  toast(due.length + ' pengingat perlu diperhatikan' + (late ? ' (' + late + ' terlambat)' : '') + ' — buka halaman Pengingat');
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

/* ---------- Render: Hari Libur ---------- */
const SCOPE_LABEL = { all: 'Semua orang', cohort: 'Angkatan', class: 'Kelas', person: 'Orang' };
function renderLibur() {
  if (!state.holidayDate) state.holidayDate = todayStr();
  state.holidayMonth = state.holidayMonth || monthKey(state.holidayDate);
  renderLiburCalendar();
  renderHolidayValueOptions();
  renderHolidayList();
}
function renderLiburCalendar() {
  const el = document.getElementById('liburCal');
  if (!el) return;
  const p = (state.holidayMonth || monthKey(state.holidayDate)).split('-').map(Number);
  const y = p[0], mo = p[1];
  const dotFn = d => db.holidays.some(h => h.date === d);
  el.innerHTML =
    '<div class="cal-head">' +
      '<button type="button" class="cal-nav" data-act="libur-cal-prev" aria-label="Bulan sebelumnya">' + ICO_PREV + '</button>' +
      '<div class="cal-title">' + MONTHS_FULL[mo - 1] + ' ' + y + '</div>' +
      '<button type="button" class="cal-nav" data-act="libur-cal-next" aria-label="Bulan berikutnya">' + ICO_NEXT + '</button>' +
    '</div>' +
    '<div class="cal-week">' + WEEKDAYS.map(w => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid">' + buildDayGrid(y, mo, state.holidayDate || '', todayStr(), dotFn, 'libur-day', 'is-holiday') + '</div>';
  setText('liburDateLabel', fmtLong(state.holidayDate || todayStr()));
}
function shiftLiburMonth(delta) {
  const p = state.holidayMonth.split('-').map(Number);
  let y = p[0], mo = p[1] + delta;
  if (mo < 1) { mo = 12; y--; } else if (mo > 12) { mo = 1; y++; }
  state.holidayMonth = y + '-' + pad(mo);
  renderLiburCalendar();
}
function renderHolidayValueOptions() {
  const scopeSel = document.getElementById('holidayScope');
  if (!scopeSel) return;
  const scope = scopeSel.value;
  const field = document.getElementById('holidayValueField');
  const sel = document.getElementById('holidayValue');
  if (scope === 'all') { field.hidden = true; sel.innerHTML = ''; return; }
  field.hidden = false;
  let opts = [];
  if (scope === 'class') opts = [...new Set(db.customers.map(c => (c.className || '').trim()).filter(Boolean))].sort().map(v => [v, v]);
  else if (scope === 'cohort') opts = [...new Set(db.customers.map(c => cohortOf(c.className)).filter(Boolean))].sort().map(v => [v, v]);
  else if (scope === 'person') opts = db.customers.filter(c => c.active).sort(sortCustomers).map(c => [c.id, c.name + (c.className ? (' — ' + c.className) : '')]);
  sel.innerHTML = opts.length ? opts.map(o => '<option value="' + escapeHtml(o[0]) + '">' + escapeHtml(o[1]) + '</option>').join('') : '<option value="">(tidak ada data)</option>';
}
function renderHolidayList() {
  const list = db.holidays.slice().sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById('holidayList').innerHTML = list.map(h => {
    let who = 'Semua';
    if (h.scope === 'person') { const c = customerById(h.value); who = c ? escapeHtml(c.name) : escapeHtml(h.value || '-'); }
    else if (h.value) who = escapeHtml(h.value);
    return '<tr>' +
      '<td>' + fmtShortDate(h.date) + '</td>' +
      '<td><span class="badge orange">' + (SCOPE_LABEL[h.scope] || h.scope) + '</span></td>' +
      '<td>' + who + '</td>' +
      '<td class="muted">' + escapeHtml(h.note || '') + '</td>' +
      '<td class="end"><div class="row-actions"><button class="icon-act danger" data-act="holiday-remove" data-id="' + h.id + '" title="Hapus">' + ICO_TRASH + '</button></div></td>' +
    '</tr>';
  }).join('');
  document.getElementById('holidayEmpty').hidden = list.length > 0;
  document.getElementById('holidayCount').textContent = list.length + ' hari';
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
  renderMethods();
  renderPackages();
  renderCustomers();
  renderBackups();
}
function pkgMenuSample(p) {
  const names = [];
  for (let i = 0; i < 7; i++) {
    menuFor(shiftDate(todayStr(), i)).forEach(it => {
      if (it.type !== p.type || (it.pkg || firstPkgId(p.type)) !== p.id) return;
      const nm = menuLines(it.name)[0];
      if (nm && names.indexOf(nm) < 0) names.push(nm);
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
      : '<p class="muted small">Belum ada paket — tambah di form bawah agar harga tiap porsi terhitung.</p>';
  }
}
function editPackage(id, field, value) {
  const p = pkgById(id);
  if (!p) return;
  if (field === 'price') {
    const raw = String(value == null ? '' : value).trim();
    const n = Number(raw);
    if (raw === '' || !isFinite(n) || n < 0) {
      toast('Harga kosong atau tidak valid — dikembalikan ke ' + fmtIDR(+p.price || 0));
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
  logAction('pengaturan', 'Ubah paket ' + p.type + ': ' + p.name + ' — ' + fmtIDR(p.price));
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
  if (onlyActive) onlyActive.checked = st.status === 'aktif';

  state.custSel = new Set([...state.custSel].filter(id => db.customers.some(c => c.id === id)));
  let list = db.customers.slice();
  if (CUST_STATUS.indexOf(st.status) >= 0) list = list.filter(c => c.status === st.status);
  list = list.filter(c => dailyMatch(c, st));
  if (st.q) list = list.filter(c => ((c.name || '') + ' ' + (c.className || '') + ' ' + (c.parent || '') + ' ' + (c.allergy || '')).toLowerCase().includes(st.q));
  list.sort(sortCustomers);

  const total = db.customers.length;
  const filtered = list.length !== total || st.status !== 'all' || !!st.q || !!st.level || !!st.cohort || !!st.cls;
  const byStatus = s => db.customers.filter(c => c.status === s).length;
  setText('custNote', total + ' pelanggan · ' + byStatus('aktif') + ' aktif · ' + byStatus('selesai') + ' selesai · ' + byStatus('berhenti') + ' berhenti');

  document.getElementById('customerList').innerHTML = list.map(c =>
    '<tr>' +
      '<td class="chk-col"><input type="checkbox" class="cust-cb" data-id="' + escapeHtml(c.id) + '"' + (state.custSel.has(c.id) ? ' checked' : '') + '></td>' +
      '<td><strong>' + escapeHtml(c.name) + '</strong></td>' +
      '<td class="muted">' + escapeHtml(c.className) + '</td>' +
      '<td class="muted">' + escapeHtml(c.parent || '—') + (c.phone ? '<span class="muted tiny block" title="Dikirim ke +' + escapeHtml(waNumber(c.phone)) + '">' + escapeHtml(c.phone) + '</span>' : '') + '</td>' +
      '<td>' + (c.allergy ? allergyBadge(c) : '<span class="muted tiny">—</span>') + '</td>' +
      '<td>' + (c.period === 'daily' ? ('Harian · ' + daysSummary(c.days)) : periodLabel(c.period)) + '</td>' +
      '<td>' + (c.snackDefault ? '✓' : '—') + '</td>' +
      '<td>' + (c.lunchDefault ? '✓' : '—') + '</td>' +
      '<td><span class="badge ' + (STATUS_BADGE[c.status] || 'red') + '" title="' + escapeHtml(STATUS_HINT[c.status] || '') + '">' + (STATUS_LABEL[c.status] || 'Aktif') + '</span></td>' +
      '<td class="end"><div class="row-actions">' +
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
      '<label class="field"><span>Nama orang tua / pengenal (opsional — digabung bila satu orang tua punya beberapa anak)</span><input type="text" name="parent" class="input" value="' + escapeHtml(x.parent || '') + '"></label>' +
      '<label class="field"><span>No. HP / WA orang tua (untuk pengingat tagihan)</span><input type="text" name="phone" class="input" placeholder="0812… atau 62812…" value="' + escapeHtml(x.phone || '') + '"></label>' +
      '<label class="field"><span>Catatan alergi / preferensi (tampil di daftar harian, kertas konfirmasi &amp; stiker)</span>' +
        '<textarea name="allergy" class="input" rows="2" maxlength="80" placeholder="mis. Alergi kacang &amp; kerang, tidak makan pedas">' + escapeHtml(x.allergy || '') + '</textarea></label>' +
      '<label class="field"><span>Periode</span><select name="period" id="custPeriod" class="input">' + periodOpts + '</select></label>' +
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
      '<label class="field"><span>Status langganan</span><select name="status" class="input">' +
        CUST_STATUS.map(s => '<option value="' + s + '"' + ((x.status || (x.active === false ? 'berhenti' : 'aktif')) === s ? ' selected' : '') + '>' +
          STATUS_LABEL[s] + ' — ' + STATUS_HINT[s] + '</option>').join('') +
      '</select></label>' +
      '<p class="muted tiny">Hanya status <strong>Aktif</strong> yang otomatis mengisi pesanan sampai periode berikutnya (Senin–Jumat, belum dibayar).</p>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="modal-close">Batal</button>' +
        '<button type="submit" class="btn btn-primary">Simpan</button>' +
      '</div>' +
    '</form>'
  );
  document.getElementById('custPeriod').addEventListener('change', e => {
    document.getElementById('wdBlock').hidden = e.target.value !== 'daily';
  });
  const syncPkgFields = () => {
    document.getElementById('custSnackPkgField').hidden = !document.getElementById('custSnackChk').checked;
    document.getElementById('custLunchPkgField').hidden = !document.getElementById('custLunchChk').checked;
  };
  document.getElementById('custSnackChk').addEventListener('change', syncPkgFields);
  document.getElementById('custLunchChk').addEventListener('change', syncPkgFields);
  syncPkgFields();
  document.getElementById('custForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const period = f.get('period');
    const selDays = f.getAll('day').map(Number).sort((a, b) => a - b);
    if (period === 'daily' && selDays.length === 0) { toast('Pilih minimal satu hari untuk langganan harian'); return; }
    const data = {
      name: f.get('name').trim(), className: (f.get('className') || '').trim(),
      parent: (f.get('parent') || '').trim(),
      phone: (f.get('phone') || '').trim(),
      allergy: String(f.get('allergy') || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      period: period, days: selDays, snackDefault: !!f.get('snackDefault'),
      lunchDefault: !!f.get('lunchDefault'),
      snackPkg: f.get('snackDefault') ? (f.get('snackPkg') || '') : '',
      lunchPkg: f.get('lunchDefault') ? (f.get('lunchPkg') || '') : '',
      status: CUST_STATUS.indexOf(String(f.get('status'))) >= 0 ? String(f.get('status')) : 'aktif'
    };
    data.active = data.status === 'aktif';
    if (!data.name) { toast('Nama wajib diisi'); return; }
    const dup = db.customers.some(x => x !== c && custDupKey(x) === custDupKey(data));
    if (dup && !confirm('Sudah ada pelanggan "' + data.name + '"' + (data.className ? '" di kelas "' + data.className + '"' : '') + '. Tetap simpan?')) return;
    const periodChanged = !isEdit || c.period !== period;
    if (isEdit) Object.assign(c, data);
    else { data.id = uid(); db.customers.push(data); }
    const filled = periodChanged ? autoFillPeriod(data) : 0;
    logAction('pelanggan', (isEdit ? 'Ubah ' : 'Tambah ') + data.name + ' (' + (data.className || '-') + ', ' + periodLabel(period) + ')' + (filled ? ' · isi ' + filled + ' tanggal' : ''));
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
  a.download = 'lovely-kitchen-backup-' + todayStr() + '.json';
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
      db = d; save(); applyBrand(); showPage('dashboard');
      toast('Data dipulihkan', { undo: true });
    } catch (e) { toast('File tidak valid'); }
  };
  reader.readAsText(file);
}

/* ---------- Cadangan harian otomatis (tetap di perangkat) ---------- */
const BACKUP_KEY = 'lovely_kitchen_backups_v1';
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
  if (list.length && list[0].day === day) list[0] = { day: day, ts: stamp, json: json };
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
    : 'Belum ada cadangan — dibuat otomatis setiap hari begitu ada perubahan data') +
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
    save(); applyBrand(); showPage('dashboard');
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
  document.title = db.settings.businessName + ' — Catatan Usaha Catering';
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
const UI_KEY = 'lovely_kitchen_ui_v1';
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
  const nav = e.target.closest('[data-nav]');
  if (nav) { showPage(nav.dataset.nav); return; }
  if (e.target.closest('#menuBtn')) { openSidebar(); return; }
  if (e.target.closest('#sideToggle')) { toggleSidebar(); return; }
  if (e.target.closest('#themeBtn')) { toggleTheme(); return; }
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
    case 'daily-pay-day': payAllToday(act.closest('tr') ? act.closest('tr').dataset.cid : null); break;
    case 'daily-pay-all': payAllToday(null); break;
    case 'week-menu-add': {
      const date = act.dataset.date;
      const items = menuPlanItems(date).map(it => Object.assign({}, it));
      if (items.length >= WEEK_MENU_MAX) { toast('Maksimal ' + WEEK_MENU_MAX + ' pilihan per hari'); break; }
      const last = items[items.length - 1];
      const type = last ? last.type : 'snack';
      const pkg = last && last.type === type && last.pkg ? last.pkg : (type === 'po' ? '' : firstPkgId(type));
      items.push({ name: '', type: type, pkg: pkg });
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
      items.splice(idx, 1);
      writeMenuPlan(date, items);
      save(); logAction('menu', 'Hapus satu pilihan menu ' + date);
      renderWeekMenu(); renderPkgShowcase(); renderHomeCalendar();
      break;
    }
    case 'menu-tab':
      state.menuTab = act.dataset.tab === 'daily' ? 'daily' : 'week';
      if (state.menuTab === 'daily') state.menuDay = weekdayOf(state.menuDate || todayStr()) - 1;
      renderWeekMenu();
      break;
    case 'menu-day': {
      state.menuDate = act.dataset.ymd;
      state.menuMonth = monthKey(state.menuDate);
      state.menuDay = weekdayOf(state.menuDate) - 1;
      renderHomeCalendar(); renderWeekMenu(); renderPkgShowcase();
      break;
    }
    case 'menu-share': menuShareImage(); break;
    case 'img-download': downloadPreview(); break;
    case 'img-share': sharePreview(); break;
    case 'custom-prev': state.custom.weekStart = shiftDate(state.custom.weekStart || mondayOf(todayStr()), -7); renderCustom(); break;
    case 'custom-next': state.custom.weekStart = shiftDate(state.custom.weekStart || mondayOf(todayStr()), 7); renderCustom(); break;
    case 'custom-today': state.custom.weekStart = mondayOf(todayStr()); renderCustom(); break;
    case 'custom-type': state.custom.type = act.dataset.type === 'lunch' ? 'lunch' : 'snack'; renderCustom(); break;
    case 'custom-reset': state.custom.level = ''; state.custom.cohort = ''; state.custom.cls = ''; state.custom.q = ''; renderCustom(); break;
    case 'custom-food': setCustomFood(act.dataset.cid, act.dataset.date, +act.dataset.mi); break;
    case 'daily-food': setCustomFood(act.dataset.cid, act.dataset.date, +act.dataset.mi, act.dataset.type); break;
    case 'custom-plain': togglePlainOrder(act.dataset.cid, act.dataset.date); break;
    case 'daily-plain': togglePlainOrder(act.dataset.cid, state.currentDate, act.dataset.type); break;
    case 'custom-col-clear': clearColumn(act.dataset.date); break;
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
    case 'po-delete': { const p = db.po.find(x => x.id === id); if (p && confirm('Hapus PO ini?')) { db.po = db.po.filter(x => x.id !== id); logAction('po', 'Hapus PO ' + p.name + ' — ' + p.item); save(); renderPO(); toast('PO dihapus', { undo: true }); } break; }
    case 'po-toggle-paid': { const p = db.po.find(x => x.id === id); if (p) { p.paid = !p.paid; logAction('bayar', 'PO ' + p.name + ' ' + (p.paid ? 'lunas' : 'belum') + ' @ ' + p.date); save(); renderPO(); } break; }
    case 'po-toggle-status': {
      const p = db.po.find(x => x.id === id);
      if (p) { poNextStatus(p); logAction('po', 'Status PO ' + p.name + ' → ' + poStatusLabel(p)); save(); renderPO(); }
      break;
    }
    case 'po-label': { const p = db.po.find(x => x.id === id); if (p) printPoDoc(buildPoResiHTML(p)); break; }
    case 'po-labels-menu': {
      const m = db.poMenus.find(x => x.id === id);
      const list = db.po.filter(x => x.menuId === id).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (m) printPoDoc(buildPoLabelsHTML(list, m.item + ' · ' + fmtShortDate(m.date) + ' · ' + list.length + ' pembeli'));
      break;
    }
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
      const text = act.dataset.text || (g ? 'Tagih ' + g.org + (g.sisa > 0 ? ' — sisa ' + fmtIDR(g.sisa) : ' — sudah lunas') : '');
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
        toast(toPaid ? 'Semua tanggal ditandai lunas' : 'Penandaan lunas dibatalkan — status tiap tanggal dikembalikan');
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
    case 'sticker-cal-prev': shiftStickerMonth(-1); break;
    case 'sticker-cal-next': shiftStickerMonth(1); break;
    case 'sticker-day': { state.stickerDate = act.dataset.ymd; state.stickerMonth = monthKey(state.stickerDate); renderStickerCalendar(); renderStickerCustomers(); stickerPreview(); break; }
    case 'sticker-select-all': document.querySelectorAll('.sticker-cb').forEach(cb => cb.checked = true); stickerPreview(); break;
    case 'sticker-clear': document.querySelectorAll('.sticker-cb').forEach(cb => cb.checked = false); stickerPreview(); break;
    case 'sticker-preview': stickerPreview(); break;
    case 'sticker-print': stickerPreview(); setTimeout(() => printFrame(document.getElementById('stickerFrame')), 300); break;
    case 'satpam-preview': satpamPreview(); break;
    case 'satpam-print': satpamPreview(); setTimeout(() => printFrame(document.getElementById('satpamFrame')), 300); break;
    case 'home-cal-prev': shiftHomeMonth(-1); break;
    case 'home-cal-next': shiftHomeMonth(1); break;
    case 'home-day': { state.menuDate = act.dataset.ymd; state.menuMonth = monthKey(state.menuDate); state.menuDay = weekdayOf(state.menuDate) - 1; renderHomeCalendar(); renderWeekMenu(); renderPkgShowcase(); break; }
    case 'libur-cal-prev': shiftLiburMonth(-1); break;
    case 'libur-cal-next': shiftLiburMonth(1); break;
    case 'libur-day': { state.holidayDate = act.dataset.ymd; state.holidayMonth = monthKey(state.holidayDate); renderLiburCalendar(); break; }
    case 'holiday-add': {
      const date = state.holidayDate || todayStr();
      const scope = document.getElementById('holidayScope').value;
      const valEl = document.getElementById('holidayValue');
      const value = scope === 'all' ? '' : valEl.value;
      if (scope !== 'all' && !value) { toast('Pilih target libur terlebih dulu'); break; }
      const note = document.getElementById('holidayNote').value.trim();
      const c = scope === 'person' ? customerById(value) : null;
      db.holidays.push({ id: uid(), date: date, scope: scope, value: value, note: note });
      logAction('libur', 'Libur ' + date + ' — ' + (SCOPE_LABEL[scope] || scope) + (value ? (' (' + (c ? c.name : value) + ')') : ''));
      save(); renderLibur(); document.getElementById('holidayNote').value = ''; toast('Hari libur ditambahkan');
      break;
    }
    case 'holiday-remove': { const h = db.holidays.find(x => x.id === id); if (h) { db.holidays = db.holidays.filter(x => x.id !== id); logAction('libur', 'Hapus libur ' + h.date); save(); renderLibur(); toast('Libur dihapus', { undo: true }); } break; }
    case 'log-undo': undoToLog(id); break;
    case 'log-clear': if (db.log.length && confirm('Bersihkan seluruh log aktivitas?')) { db.log = []; logAction('log', 'Log dibersihkan'); save(); renderLog(); toast('Log dibersihkan', { undo: true }); } break;
    case 'customer-add': openCustomerModal(null); break;
    case 'customer-edit': { const c = customerById(id); if (c) openCustomerModal(c); break; }
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
      db.settings.businessName = document.getElementById('setName').value.trim() || 'Lovely Kitchen';
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
    case 'export': exportBackup(); break;
    case 'import': document.getElementById('importFile').click(); break;
    case 'reset': if (confirm('Hapus SEMUA data dan kembali ke pengaturan awal? Tindakan ini tidak bisa dibatalkan.')) { db = defaultData(); save(); applyBrand(); showPage('dashboard'); toast('Data direset'); } break;
    case 'demo-load': if (confirm('Ganti data saat ini dengan data contoh (demo)?')) { db = normalize(makeDemoData()); save(); applyBrand(); showPage('dashboard'); toast('Data contoh dimuat'); } break;
    case 'backup-now': autoBackup(true); renderBackups(); toast('Cadangan harian dibuat'); break;
    case 'backup-download': {
      const b = readBackups()[+act.dataset.i];
      if (b) { downloadText('lovely-kitchen-cadangan-' + b.day + '.json', b.json, 'application/json'); toast('Cadangan ' + fmtShortDate(b.day) + ' diunduh'); }
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
      state.cust = { q: '', level: '', cohort: '', cls: '', status: 'aktif' };
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
        db.customers.forEach(c => { if (state.custSel.has(c.id)) { c.status = to; c.active = to === 'aktif'; } });
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
        toast('No. HP ' + g.who + ' belum diisi — pesan disalin, tempel manual di WhatsApp');
        break;
      }
      window.open('https://wa.me/' + encodeURIComponent(num) + '?text=' + encodeURIComponent(msg), '_blank');
      logAction('pengingat', 'Kirim WA ' + g.who + ' — sisa ' + fmtIDR(g.total));
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
      copyText(db.settings.businessName + ' — daftar tagihan belum dibayar (' + gs.length + ' penunggak)\n\n' +
        gs.map(g => '• ' + g.who + ' — ' + fmtIDR(g.total) + ' (' + g.kids.join(', ') + ', ' + g.days + ' hari)').join('\n') +
        '\n\nTOTAL: ' + fmtIDR(gs.reduce((s, g) => s + g.total, 0)));
      break;
    }
    case 'wa-save': saveWaSettings(); break;
    case 'report-detail': openReportDetail(id); break;
    case 'report-image': customerRincianImage(id); break;
    case 'report-print': {
      if (!state.report || !state.report.rows.length) { toast('Tidak ada data untuk dicetak.'); break; }
      const fr = document.getElementById('reportFrame');
      fr.srcdoc = buildRecapHTML(state.report.rows, state.report.mode);
      setTimeout(() => printFrame(fr), 300);
      break;
    }
    case 'open-cal': {
      const field = act.dataset.field;
      if (field === 'hari') openCalendar({ mode: 'day', field, value: state.currentDate, dotFn: ymd => dayDot('snack')(ymd) || dayDot('lunch')(ymd) });
      else if (field === 'satpam') openCalendar({ mode: 'day', field, value: state.satpamDate || todayStr(), dotFn: satpamDot });
      else if (field === 'poMonth') openCalendar({ mode: 'month', field, value: state.poMonth });
      else if (field === 'rptMonth') openCalendar({ mode: 'month', field, value: state.rptMonth });
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
  if (t.id === 'stickerSize' || t.id === 'stickerContent' || t.id === 'stickerBrand' || t.id === 'stickerLines' || t.id === 'stickerType') {
    if (t.id === 'stickerType') renderStickerCustomers();
    stickerPreview();
    return;
  }
  if (t.classList.contains('sticker-cb')) { stickerPreview(); return; }
  if (t.id === 'setUiFont' || t.id === 'setUiZoom') { saveUiStyle(); return; }
  if (t.id === 'stickerNameFont' || t.id === 'stickerClsFont' || t.id === 'stickerBrandFont' ||
      t.id === 'stickerNameScale' || t.id === 'stickerClsScale' || t.id === 'stickerBrandScale' ||
      t.id === 'stickerCellPad' || t.id === 'stickerLineW') {
    saveStickerStyle(); stickerPreview(); return;
  }
  if (t.id === 'satpamType' || t.id === 'satpamShowClass') { satpamPreview(); return; }
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
  if (t.id === 'custOnlyActive') { state.cust.status = t.checked ? 'aktif' : 'all'; renderCustomers(); return; }
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
  if (t.id === 'holidayScope') { renderHolidayValueOptions(); return; }
  if (t.classList.contains('wm-name') || t.classList.contains('wm-type') || t.classList.contains('wm-pkg')) {
    applyMenuEdit(t, false);
    return;
  }
  if (t.id === 'logAction' || t.id === 'logMonth') { renderLog(); return; }

  const pageEl = t.closest('#page-hari');
  if (pageEl && t.closest('tr')) {
    const tr = t.closest('tr');
    const cid = tr.dataset.cid;
    const c = customerById(cid);
    const who = c ? c.name : cid;
    const date = state.currentDate;
    const type = t.dataset.type;
    if (t.classList.contains('sel-method') || t.classList.contains('inp-note')) {
      /* satu metode & satu catatan untuk seluruh hari — ditulis ke semua pesanan yang aktif */
      const isMethod = t.classList.contains('sel-method');
      let touched = 0;
      DAY_TYPES.forEach(ty => {
        const rr = (db[ty][date] || {})[cid];
        if (!rr || !rr.ordered) return;
        if (isMethod) { rr.method = t.value; if (t.value === 'Gratis') rr.paid = true; }
        else rr.note = t.value;
        touched++;
      });
      if (touched && isMethod) logAction('metode', who + ' → ' + (t.value || '—') + ' @ ' + date);
      save();
      syncMergedRow(tr);
      renderDailyStats();
      return;
    }
    if (type !== 'snack' && type !== 'lunch') return;
    const rec = ensureRecord(type, date, cid);
    if (t.classList.contains('chk-paid')) { rec.paid = t.checked; logAction('bayar', who + ' ' + type + ' ' + (t.checked ? 'lunas' : 'belum') + ' @ ' + date); }
    else if (t.classList.contains('sel-pkg')) {
      rec.pkg = t.value;
      const pk = pkgById(t.value);
      logAction('paket', who + ' ' + type + ' → ' + (pk ? pk.name : '—') + ' @ ' + date);
    }
    else return;
    save();
    syncMergedRow(tr);
    renderDailyStats();
  }
}

/* ---------- Kalender besar ---------- */
let cal = { open: false, mode: 'day', field: null, year: 0, month: 1, selected: '', dotFn: null };
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

function monthTitle(ym) { const p = ym.split('-').map(Number); return MONTHS_FULL[p[1] - 1] + ' ' + p[0]; }

function dayDot(type) {
  return function (ymd) {
    const r = db[type][ymd];
    return !!r && Object.keys(r).some(id => r[id].ordered);
  };
}
function satpamDot(ymd) {
  const s = db.snack[ymd], l = db.lunch[ymd];
  const has = rec => !!rec && Object.keys(rec).some(id => rec[id].ordered);
  return has(s) || has(l);
}

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
      '<div class="cal-week">' + WEEKDAYS.map(w => '<span>' + w + '</span>').join('') + '</div>' +
      '<div class="cal-grid">' + buildDayGrid(cal.year, cal.month, cal.selected, todayStr(), cal.dotFn) + '</div>' +
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

function buildDayGrid(year, month, selectedYmd, todayYmd, dotFn, act, markCls) {
  act = act || 'cal-pick';
  const startIdx = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Senin pertama
  const days = new Date(year, month, 0).getDate();
  let html = '';
  for (let i = 0; i < startIdx; i++) html += '<div class="cal-empty"></div>';
  for (let d = 1; d <= days; d++) {
    const ymd = year + '-' + pad(month) + '-' + pad(d);
    const marked = !!(dotFn && dotFn(ymd));
    const cls = 'cal-day' +
      (ymd === selectedYmd ? ' is-selected' : '') +
      (ymd === todayYmd ? ' is-today' : '') +
      (marked && markCls ? ' ' + markCls : '');
    const dot = marked && !markCls ? '<span class="cal-dot"></span>' : '';
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
  } else if (f === 'poMonth') {
    state.poMonth = v;
    renderPO();
  } else if (f === 'rptMonth') {
    state.rptMonth = v;
    renderReport();
  }
}

function backupReminder() {
  const last = uiPrefs().lastExportAt;
  if (!db.customers.length) return;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (days !== null && days < 7) return;
  toast('Belum ada unduhan cadangan' + (days ? ' sejak ' + days + ' hari lalu' : '') + ' — buka Pengaturan › Backup Data');
}

/* ---------- Init ---------- */
function init() {
  applyTheme(uiPrefs().theme === 'light' ? 'light' : 'dark');
  applySidebar(!!uiPrefs().sidebarCollapsed);
  buildDailyMergedPage();
  buildCustomPage();
  applyBrand();
  applyUiStyle();
  setTodayBadge();
  state.currentDate = todayStr();
  state.satpamDate = todayStr();
  state.poMonth = monthKey(todayStr());
  state.rptMonth = monthKey(todayStr());
  setText('hariDateText', fmtLong(state.currentDate));
  setText('satpamDateText', fmtLong(state.satpamDate));
  setText('poMonthText', monthTitle(state.poMonth));
  setText('rptMonthText', monthTitle(state.rptMonth));
  state.stickerDate = todayStr();
  state.stickerMonth = monthKey(todayStr());

  document.addEventListener('click', onDocClick);
  document.addEventListener('change', onDocChange);
  document.getElementById('undoBtn').addEventListener('click', undoLast);
  document.getElementById('redoBtn').addEventListener('click', redoLast);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modalBackdrop').hidden) closeModal();
      else if (cal.open) closeCalendar();
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
    if (t.classList.contains('wm-name')) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 170) + 'px'; applyMenuEdit(t, true); }
    if (t.id === 'stickerNameScale') setText('stickerNameScaleVal', t.value + '%');
    if (t.id === 'stickerClsScale') setText('stickerClsScaleVal', t.value + '%');
    if (t.id === 'stickerBrandScale') setText('stickerBrandScaleVal', t.value + '%');
    if (t.id === 'stickerCellPad') setText('stickerCellPadVal', t.value + '%');
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
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (state.page === 'dashboard') renderDashboard();
      else if (state.page === 'po') renderPO();
      else if (state.page === 'report') renderReport();
    }, 150);
  });

  showPage('dashboard');
  setTimeout(backupReminder, 1400);
  setTimeout(reminderNudge, 2600);
}

document.addEventListener('DOMContentLoaded', init);
