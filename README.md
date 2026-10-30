# Catatan Katering

Aplikasi pencatat untuk usaha katering sekolah — snack box & nasi kotak. Dibuat untuk **satu pemilik** yang mencatat pesanan, menghitung tagihan, dan menyiapkan kertas untuk dapur tanpa laptop orang lain, tanpa server, dan tanpa internet.

Dijalankan cukup dengan **membuka `index.html`** di browser (Chrome/Edge). Tidak ada build, tidak ada dependensi, tidak ada server.

![Pratinjau aplikasi](preview.gif)

Video lengkap (± 60 detik, 1280px, tanpa suara): **[preview.mp4](https://github.com/IniEyyy/catatan-katering/releases/download/preview/preview.mp4)**

## Cara memakai

1. Unduh repo, buka foldernya, klik dua kali `index.html`.
2. Data pertama yang muncul adalah **data contoh** (21 anak + menu seminggu) supaya tampilan bisa langsung dicoba.
3. Ganti nama usaha di **Pengaturan › Informasi Usaha** — nama itu dipakai di sidebar, stiker, invoice, dan laporan.
4. Untuk mulai dari kosong: **Pengaturan › Reset semua data**, lalu tambahkan anak di **Pelanggan**.
5. Semua perubahan tersimpan otomatis di browser ini. Unduh cadangan berkala lewat **Beranda › Cetak & Bagikan › Cadangan JSON**.

## Halaman

| Halaman | Isi |
|---|---|
| **Beranda** | kartu ringkasan, kalender + menu mingguan, tanda **libur harian/mingguan**, paket harga, grafik omset, daftar belum lunas, dan pusat **Cetak & Bagikan** |
| **Hari Ini** | absensi harian: satu baris per anak, snack dan lunch berdampingan, pilihan makanan A/B/C, catatan, total, dan tombol lunasi |
| **Pesanan Seminggu** | koreksi pesanan untuk 7 hari sekaligus (paket, pilihan makanan, metode, gratis/kompensasi) |
| **Cetak** | stiker nama A4 untuk kotak bekal dan kertas konfirmasi porsi — dipilih lewat toggle di atas |
| **Laporan** | rekap per anak dan per orang tua (tagihan / dibayar / sisa), cetak PDF + CSV |
| **Pengingat** | pengingat harian/mingguan/bulanan dan daftar tagihan menunggak siap kirim WhatsApp |
| **Pre-Order (PO)** | pesanan per tanggal: menu PO + pembeli, dan pesanan kelompok (lembaga) dengan invoice bernomor |
| **Pelanggan** | daftar anak, filter jenjang/angkatan/kelas/status, alergi, periode langganan, dan aksi massal |
| **Log Aktivitas** | semua aksi yang pernah dilakukan, bisa membatalkan perubahan |
| **Pengaturan** | informasi usaha, rekening, template WA, metode pembayaran, paket harga, font & ukuran tampilan, cadangan |

Libur bisa ditandai untuk semua orang, satu angkatan, satu kelas, atau satu anak — baik satu hari maupun seminggu. Sakit atau tidak masuk satu hari lebih cepat ditangani di **Pesanan Seminggu** dengan mematikan pesanannya.

## Catatan teknis

- **Vanilla HTML/CSS/JS** dalam tiga berkas: `index.html`, `styles.css`, `app.js`. Tidak ada framework, tidak ada npm.
- **Penyimpanan**: `localStorage` pada origin `file://` — `catatan_katering_data_v1` (data), `_ui_v1` (tema/font), `_backups_v1` (cadangan otomatis), `_undo_v1` / `_redo_v1`. Kunci lama dari versi sebelumnya dipindahkan otomatis saat aplikasi dibuka.
- **Cetak & PDF** memakai iframe tersembunyi + `window.print()`; "Simpan sebagai PDF" dipilih di dialog cetak browser.
- **Grafik** digambar sendiri pada `<canvas>` (tanpa library).
- **Tema** terang/gelap dan ukuran font bisa diubah dari Pengaturan; tata letak menyesuaikan sampai lebar 820px.
- Data tidak pernah dikirim ke mana pun — aplikasi ini sepenuhnya lokal di satu komputer.

## Pengembangan

Buka `index.html` di browser dan segarkan setelah mengedit. Perubahan pada struktur data selalu dilewatkan `normalize()` di `app.js` supaya berkas cadangan lama tetap bisa dibaca. Tombol **Urungkan** (Ctrl+Z) dan **Ulangi** (Ctrl+Shift+Z) bekerja untuk semua perubahan data, kecuali perubahan tampilan.
