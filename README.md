# Catatan Katering

Aplikasi pencatat untuk usaha katering sekolah — snack box & nasi kotak. Dibuat untuk **satu pemilik** yang mencatat pesanan, menghitung tagihan, dan menyiapkan kertas untuk dapur tanpa laptop orang lain, tanpa server, dan tanpa internet.

Dijalankan cukup dengan **membuka `index.html`** di browser (Chrome/Edge). Tidak ada build, tidak ada dependensi, tidak ada server.

![Pratinjau aplikasi](preview.gif)

Video lengkap (± 60 detik, 1280px, tanpa suara): **[preview.mp4](https://github.com/IniEyyy/catatan-katering/releases/download/preview/preview.mp4)**

## Cara memakai

1. Unduh repo, buka foldernya, klik dua kali `index.html`.
2. Data pertama yang muncul adalah **data contoh** (25 anak, 6 paket harga, pesanan ± 6 minggu, PO kelompok + invoice) supaya tampilan bisa langsung dicoba.
3. Ganti nama usaha di **Pengaturan › Informasi Usaha** — nama itu dipakai di sidebar, stiker, invoice, dan laporan.
4. Untuk mulai dari kosong: **Pengaturan › Reset semua data**, lalu tambahkan anak di **Pelanggan**.
5. Semua perubahan tersimpan otomatis di browser ini — jam simpan terakhir terlihat di kaki sidebar. Unduh cadangan berkala lewat ikon unduh di kiri bawah atau **Beranda › Cetak & Bagikan › Cadangan JSON**.

## Halaman

| Halaman | Isi |
|---|---|
| **Beranda** | kartu ringkasan, kalender (hari ini bertanda hijau) + menu mingguan dengan kolom harga sendiri, tombol **Libur Harian/Mingguan** di kanan, paket harga, grafik omset bulanan & harian plus tiga donat sejajar (per jenis, porsi snack vs lunch, status pembayaran) dengan legenda di samping masing-masing, daftar belum lunas, dan pusat **Cetak & Bagikan** |
| **Hari Ini** | absensi harian: satu baris per anak, snack dan lunch berdampingan, pilihan makanan A/B/C dengan nama paket + harga di bawahnya, catatan, dan total yang diklik untuk mengatur pembayaran |
| **Pesanan Seminggu** | koreksi pesanan untuk 7 hari sekaligus (paket, pilihan makanan, metode, gratis/kompensasi); huruf makanan + nama di judul kolom bisa disorot untuk melihat isi lengkapnya |
| **Cetak** | stiker nama A4 untuk kotak bekal dan kertas konfirmasi porsi — dipilih lewat toggle di atas; keduanya sama-sama kontrol di kiri + pratinjau A4 di kanan dan memakai tombol tanggal ber-popover |
| **Laporan** | rekap per anak dan per orang tua (tagihan / dibayar / sisa), cetak PDF + CSV |
| **Pengingat** | pengingat harian/mingguan/bulanan dan daftar tagihan menunggak siap kirim WhatsApp |
| **Pre-Order (PO)** | pesanan per tanggal: menu PO + pembeli, dan pesanan kelompok (lembaga) dengan invoice bernomor; grafik nilai PO per bulan dan per tahun berdampingan |
| **Pelanggan** | daftar anak, filter jenjang/angkatan/kelas/status, alergi, periode langganan, aksi massal, dan tombol rekap yang membuka anak itu di Laporan |
| **Log Aktivitas** | semua aksi yang pernah dilakukan, bisa membatalkan perubahan |
| **Pengaturan** | informasi usaha, rekening, template WA, metode pembayaran, paket harga, font & ukuran tampilan, cadangan |

Lonceng di kanan atas mengumpulkan hal yang sedang menunggu — pengingat jatuh tempo, penunggak tagihan, pesanan hari ini yang belum dipilih makanannya, dan menu yang belum diisi. Klik salah satu barisnya untuk langsung membuka halamannya.

Arahkan kursor (atau tab keyboard) ke chip makanan A/B/C di halaman Hari Ini **dan ke huruf A/B/C maupun nama makanan di judul kolom tabel Pesanan Seminggu** untuk melihat dialog berisi nama lengkap + isi porsi + paketnya.

Harga sebuah porsi mengikuti paketnya. Kalau satu hari harganya berbeda (mis. menu spesial), ubah di kolom harga pada editor menu Beranda — cukup hari itu, tempat lain ikut menyesuaikan. Kosongkan atau isi sama dengan harga paket untuk kembali ke bawaan; mengganti paket juga mengembalikan harga ke paket baru. Bayar / belum tidak lagi diberi tanda warna di tabel — cukup lihat angka totalnya (bisa diklik) dan kartu **Belum Lunas** di Beranda.

Libur bisa ditandai untuk semua orang, satu angkatan, satu kelas, atau satu anak — baik satu hari maupun seminggu. Kotak merah (border + latar) khusus untuk tanggal yang libur untuk **semua orang**; hari itu juga tidak lagi memakai titik. Kalau yang libur hanya sebagian, sel kalender tetap tampil normal dan mendapat **titik merah di samping titik hijaunya**, karena orang lain masih pesan. Titik bawah tanggal berarti: **hijau** ada snack/lunch, **kuning** ada pre-order, **merah** hanya sebagian orang libur — keterangannya tampil di bawah kalender. Aturan yang sama dipakai di kalender Beranda, pemilih tanggal Hari Ini, dan pemilih tanggal stiker. Daftar "N tanggal libur" di bawah tab menu hanya berisi minggu yang sedang dibuka (tab Menu Mingguan) atau tanggal yang sedang dipilih (tab Menu Harian), jadi tidak ada berita libur dari minggu lain yang ikut muncul. Sakit atau tidak masuk satu hari lebih cepat ditangani di **Pesanan Seminggu** dengan mematikan pesanannya.

Status **Aktif / Selesai / Berhenti** tidak berubah dengan sendirinya. Memesan 1, 2, atau puluhan hari tidak membuat seorang anak jadi aktif — status hanya diubah dari form anak atau aksi massal di Pelanggan, dan isinya menentukan apakah anak itu muncul di tabel pesanan serta ikut terisi otomatis saat simpan pelanggan. Pesanan tetap tercatat dan tetap masuk laporan walau statusnya sudah Selesai atau Berhenti.

## Catatan teknis

- **Vanilla HTML/CSS/JS** dalam tiga berkas: `index.html`, `styles.css`, `app.js`. Tidak ada framework, tidak ada npm.
- **Penyimpanan**: `localStorage` pada origin `file://` — `catatan_katering_data_v1` (data), `_ui_v1` (tema/font), `_backups_v1` (cadangan otomatis), `_undo_v1` / `_redo_v1`. Kunci lama dari versi sebelumnya dipindahkan otomatis saat aplikasi dibuka.
- **Cetak & PDF** memakai iframe tersembunyi + `window.print()`; "Simpan sebagai PDF" dipilih di dialog cetak browser. Jam, judul, dan alamat file di tepi halaman adalah header/footer browser — judul dokumen dikosongkan selama dialog cetak terbuka, sisanya dimatikan lewat centang *Header and footers* di dialog tersebut.
- **Grafik** digambar sendiri pada `<canvas>` (tanpa library).
- **Input angka** tidak menampilkan panah naik-turun; nilainya tetap bisa digeser dengan tombol ↑/↓ di keyboard atau dengan mengetik.
- **Tema** terang/gelap dan ukuran font bisa diubah dari Pengaturan; tata letak menyesuaikan sampai lebar 620px (di bawah 1200px kalender turun ke atas menu, di bawah 640px nama makanan turun ke baris kedua).
- Data tidak pernah dikirim ke mana pun — aplikasi ini sepenuhnya lokal di satu komputer.

## Pengembangan

Buka `index.html` di browser dan segarkan setelah mengedit. Perubahan pada struktur data selalu dilewatkan `normalize()` di `app.js` supaya berkas cadangan lama tetap bisa dibaca. Tombol **Urungkan** (Ctrl+Z) dan **Ulangi** (Ctrl+Shift+Z) bekerja untuk semua perubahan data, kecuali perubahan tampilan.
