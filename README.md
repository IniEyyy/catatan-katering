# Lovely Kitchen

Aplikasi pencatat untuk usaha katering sekolah — snack box & nasi kotak. Dibuat untuk **satu pemilik** yang mencatat pesanan, menghitung tagihan, dan menyiapkan kertas untuk dapur tanpa laptop orang lain, tanpa server, dan tanpa internet.

Dijalankan cukup dengan **membuka `index.html`** di browser (Chrome/Edge). Tidak ada build, tidak ada dependensi, tidak ada server.

![Pratinjau Lovely Kitchen](preview.gif)

Video lengkap (± 44 detik, 1280px, tanpa suara): **[preview.mp4](https://github.com/IniEyyy/lovely-kitchen/releases/download/preview/preview.mp4)**

## Cara memakai

1. Unduh repo, buka foldernya, klik dua kali `index.html`.
2. Data pertama yang muncul adalah **data contoh** (19 anak + menu seminggu) supaya tampilan bisa langsung dicoba.
3. Untuk mulai dari kosong: **Pengaturan › Hapus semua data**, lalu tambahkan pelanggan di **Pengaturan › Daftar Pelanggan**.
4. Semua perubahan tersimpan otomatis di browser ini (localStorage). Unduh cadangan berkala lewat **Beranda › Cetak & Bagikan › Cadangan JSON**.

## Halaman

| Halaman | Isi |
|---|---|
| **Beranda** | kartu ringkasan, kalender + menu mingguan/makanan paket, grafik omset, daftar belum lunas, dan pusat **Cetak & Bagikan** |
| **Hari Ini** | absensi harian: satu baris per anak, snack dan lunch berdampingan, pilihan makanan A/B/C, metode, catatan, total, dan tombol lunasi |
| **Pesanan Seminggu** | koreksi pesanan untuk 7 hari sekaligus (paket, pilihan makanan, gratis/kompensasi) |
| **Pre-Order (PO)** | pesanan per tanggal: menu PO + pembeli, dan pesanan kelompok (lembaga) dengan invoice bernomor |
| **Laporan** | rekap per anak dan per orang tua (tagihan / dibayar / sisa), cetak PDF + CSV |
| **Pengingat & Tagihan** | daftar penunggak, template pesan WhatsApp, pengingat harian/mingguan/bulanan |
| **Stiker** | stiker nama A4 untuk kotak bekal, penanda alergi, ukuran font dan isi sel |
| **Kertas Konfirmasi** | daftar porsi untuk dapur / penerima barang, siap cetak |
| **Hari Libur** | libur semua / per kelas / per angkatan / per anak, ditandai di kalender |
| **Log Aktivitas** | semua aksi yang pernah dilakukan, bisa membatalkan perubahan |
| **Pengaturan** | data pelanggan, paket harga, template WA, rekening, font & ukuran tampilan, cadangan |

## Catatan teknis

- **Vanilla HTML/CSS/JS** dalam tiga berkas: `index.html`, `styles.css`, `app.js`. Tidak ada framework, tidak ada npm.
- **Penyimpanan**: `localStorage` pada origin `file://` — `lovely_kitchen_data_v1` (data), `_ui_v1` (tema/font), `_backups_v1` (cadangan otomatis), `_undo_v1` / `_redo_v1`.
- **Cetak & PDF** memakai iframe tersembunyi + `window.print()`; "Simpan sebagai PDF" dipilih di dialog cetak browser.
- **Grafik** digambar sendiri pada `<canvas>` (tanpa library).
- **Tema** terang/gelap dan ukuran font bisa diubah dari Pengaturan; tata letak menyesuaikan sampai lebar 820px.
- Data tidak pernah dikirim ke mana pun — aplikasi ini sepenuhnya lokal di satu komputer.

## Pengembangan

Buka `index.html` di browser dan segarkan setelah mengedit. Perubahan pada struktur data selalu dilewatkan `normalize()` di `app.js` supaya berkas cadangan lama tetap bisa dibaca. Tombol **Urungkan** (Ctrl+Z) dan **Ulangi** (Ctrl+Shift+Z) bekerja untuk semua perubahan data, kecuali perubahan tampilan.
