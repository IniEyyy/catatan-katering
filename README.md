# Catatan Katering

Aplikasi pencatat untuk usaha katering sekolah — snack box & nasi kotak. Dibuat untuk **satu pemilik** yang mencatat pesanan, menghitung tagihan, dan menyiapkan kertas untuk dapur tanpa laptop orang lain, tanpa server, dan tanpa internet.

Dijalankan cukup dengan **membuka `index.html`** di browser (Chrome/Edge). Tidak ada build, tidak ada dependensi, tidak ada server.

![Pratinjau aplikasi](preview.gif)

Video tur seluruh halaman (± 51 detik, 1280px, tanpa suara): **[preview.mp4](https://github.com/IniEyyy/catatan-katering/releases/download/preview/preview.mp4)**

## Langkah setup

![Tutorial langkah setup](tutorial.gif)

Rekaman langkah-langkah di bawah dari keadaan kosong (± 64 detik, tanpa suara): **[tutorial.mp4](https://github.com/IniEyyy/catatan-katering/releases/download/preview/tutorial.mp4)**

1. **Klik dua kali `index.html`** — tidak ada instalasi, tidak ada server. Data pertama yang muncul adalah **data contoh** (25 anak, 6 paket, pesanan ± 6 minggu, PO kelompok + invoice) supaya tampilan bisa langsung dicoba.
2. **Mulai dari kosong**: *Pengaturan › Reset semua data* (tombol merah di bagian bawah).
3. **Identitas usaha**: *Pengaturan › Informasi Usaha* — nama usaha + bank, no. rekening, atas nama. Nama itu dipakai di sidebar, stiker, invoice, kertas konfirmasi, dan pesan tagihan; nomor rekening muncul di template WA lewat `{rekening}`.
4. **Paket harga**: *Pengaturan › Paket Harga* — buat tingkatan, mis. *Snack Sedang* Rp 6.000 dan *Nasi Kotak* Rp 13.000. Paket hanya nama + harga; makanannya mengikuti menu harian, jadi satu paket bisa berisi menu berbeda tiap hari.
5. **Pelanggan**: *Pelanggan › + Tambah Pelanggan* — nama, kelas (angka di depan menentukan jenjang, mis. `3A` = SD, `11B` = SMA), nama orang tua, No. WA, catatan alergi, dan periode langganan. Menyimpan anak dengan periode mingguan/bulanan/semester langsung mengisi pesanannya ke depan (Senin–Jumat, tanggal libur dilewati).
6. **Menu**: *Beranda › Menu Harian* (atau *Menu Mingguan*) › **+ Pilihan** — tulis isi makanan per baris, pilih jenis snack/lunch/PO dan paketnya. Kolom harga boleh kosong; kalau diisi, harga itu hanya berlaku hari itu.
7. **Pesanan hari ini**: *Hari Ini* — tombol **pesan** menandai anak yang ikut hari itu, klik huruf **A/B/C** untuk memilih makanannya (snack boleh dua), isi catatan, lalu klik **angka total** untuk mengatur metode bayar / menandai lunas.
8. **Cetak**: *Cetak* — pilih tanggal dan anak, lalu cetak **stiker A4** untuk kotak bekal atau **kertas konfirmasi** untuk satpam. Kalau tanggal itu tidak ada pelanggan, halamannya otomatis maju ke hari berikutnya.
9. **Cadangkan**: ikon unduh di kaki sidebar, atau *Beranda › Cetak & Bagikan › Cadangan JSON*. File cadangan itu satu-satunya salinan data kalau browser dibersihkan atau laptop diganti.

Semua perubahan tersimpan otomatis di browser itu juga — jam simpan terakhir terlihat di kaki sidebar, dan setiap aksi tercatat di *Log Aktivitas* lengkap dengan tombol **Urungkan**.

## Halaman

| Halaman | Isi |
|---|---|
| **Beranda** | kartu ringkasan, kalender (**dimulai hari Minggu**, hari ini bertanda hijau) + menu mingguan dengan kolom harga sendiri, tombol **Libur Harian/Mingguan** di kanan, paket harga, grafik omset bulanan & harian plus tiga donat sejajar (per jenis, porsi snack vs lunch, status pembayaran) dengan legenda di samping masing-masing, daftar belum lunas, dan pusat **Cetak & Bagikan**. Saat tab **Menu Harian** dibuka, blok Paket pindah menjadi baris sendiri di bawah menu (sebelum grafik) dan tersusun melebar ke samping |
| **Hari Ini** | absensi harian: satu baris per anak, snack dan lunch berdampingan, pilihan makanan A/B/C dengan nama paket + harga di bawahnya, catatan, dan total yang diklik untuk mengatur pembayaran. Tidak ada kartu statistik di bawah filter — ringkasannya satu baris di judul tabel; kalau menu tanggal itu belum dibuat, muncul pintasan ke **Beranda › Menu Harian** |
| **Pesanan Seminggu** | koreksi pesanan untuk 7 hari sekaligus (paket, pilihan makanan, metode, gratis/kompensasi); judul kolom rata tengah mengikuti isi selnya, dan huruf makanan di sel bisa disorot untuk melihat isi lengkapnya |
| **Cetak** | stiker nama A4 untuk kotak bekal dan kertas konfirmasi porsi — dipilih lewat toggle di atas; keduanya sama-sama kontrol di kiri + pratinjau A4 di kanan dan memakai tombol tanggal ber-popover. Tanggal dibuka otomatis dimajukan ke hari berikutnya kalau hari itu tidak ada pelanggan. Tinggi baris sel otomatis + slider **Rapat sel** untuk memipihkan kotak, dan slider **Padding sel** untuk jarak isi; penanda alergi bisa dipilih bentuknya (titik / lingkaran A / garis / tulisan / tanpa penanda) dan warnanya |
| **Laporan** | rekap per anak dan per orang tua (tagihan / dibayar / sisa), cetak PDF + CSV |
| **Pengingat** | pengingat harian/mingguan/bulanan dan daftar tagihan menunggak siap kirim WhatsApp |
| **Pre-Order (PO)** | pesanan per tanggal: menu PO + pembeli, dan pesanan kelompok (lembaga) dengan invoice bernomor; grafik nilai PO per bulan dan per tahun berdampingan. Tiap menu PO punya pintasan **Beranda** yang membuka Menu Harian tanggal itu dan menyiapkan baris PO kosong |
| **Pelanggan** | daftar anak, filter jenjang/angkatan/kelas/status, alergi, periode langganan, aksi massal, dan tombol rekap yang membuka anak itu di Laporan |
| **Log Aktivitas** | semua aksi yang pernah dilakukan, bisa membatalkan perubahan |
| **Pengaturan** | informasi usaha, rekening, template WA, metode pembayaran, paket harga, font & ukuran tampilan, cadangan |

Lonceng di kanan atas mengumpulkan hal yang sedang menunggu — pengingat jatuh tempo, penunggak tagihan, pesanan hari ini yang belum dipilih makanannya, dan menu yang belum diisi. Klik salah satu barisnya untuk langsung membuka halamannya.

Arahkan kursor (atau tab keyboard) ke chip makanan A/B/C di halaman Hari Ini **atau ke huruf A/B/C di tabel Pesanan Seminggu** untuk melihat dialog berisi nama lengkap + isi porsi + paketnya.

Penanda alergi di stiker sengaja **tidak** memakai lingkaran bertanda seru — bentuk itu terbaca sebagai rambu bahaya. Pilihannya ada di halaman Cetak: titik kecil di pojok (bawaan), lingkaran huruf A, garis di bawah nama, tulisan "ALERGI", atau tanpa penanda; warnanya bisa cokelat kalem, kuning kayu, atau merah. Catatan alergi lengkapnya tetap hanya terlihat di aplikasi.

Harga sebuah porsi mengikuti paketnya. Kalau satu hari harganya berbeda (mis. menu spesial), ubah di kolom harga pada editor menu Beranda — cukup hari itu, tempat lain ikut menyesuaikan. Kosongkan atau isi sama dengan harga paket untuk kembali ke bawaan; mengganti paket juga mengembalikan harga ke paket baru. Baris **PO** juga punya kolom harga: nilainya diambil dari menu PO bertanggal sama di halaman Pre-Order, dan kalau diubah di sini harga menu PO itu ikut berubah (dicatat di Log Aktivitas). Bayar / belum tidak lagi diberi tanda warna di tabel — cukup lihat angka totalnya (bisa diklik) dan kartu **Belum Lunas** di Beranda.

Libur bisa ditandai untuk semua orang, satu angkatan, satu kelas, atau satu anak — baik satu hari maupun seminggu. Menandai libur **langsung mengosongkan hari itu**: pesanan snack & lunch tanggal tersebut dihapus, dan kalau liburnya untuk semua orang menu snack/lunch hari itu ikut dibuang (baris PO serta pembeli PO tidak disentuh — PO bisa tetap jalan walau sekolah libur). Dialognya menampilkan jumlah yang akan terhapus sebelum disimpan, dan hasilnya bisa dibatalkan dengan **Urungkan** (tombolnya muncul di toast). Melepas tanda libur **tidak** mengembalikan pesanan yang sudah terhapus — pakai Urungkan segera setelah ditandai. Kotak merah (border + latar) khusus untuk tanggal yang libur untuk **semua orang**; hari itu juga tidak lagi memakai titik, tidak lagi menagih "menu belum diisi" di lonceng, dan halaman Hari Ini hanya menampilkan keterangan bahwa tanggal itu libur. Kalau yang libur hanya sebagian, sel kalender tetap tampil normal dan mendapat **titik merah di samping titik hijaunya**, karena orang lain masih pesan. Titik bawah tanggal berarti: **hijau** ada snack/lunch, **kuning** ada PO (menunya atau pembelinya), **merah** hanya sebagian orang libur — keterangannya tampil di bawah kalender. Titik kuning muncul begitu tanggal itu punya salah satu dari tiga: pembeli PO, menu PO di halaman Pre-Order, atau baris PO pada menu harian tanggal itu — jadi menu PO yang baru dibuat sudah bertitik kuning walau belum ada yang pesan, dan titik hilangnya lagi kalau ketiganya dikosongkan. Aturan yang sama dipakai di kalender Beranda, pemilih tanggal Hari Ini, dan pemilih tanggal stiker — ketiganya dimulai dari kolom **Minggu**, sementara daftar hari di tempat lain (baris menu mingguan, chip hari, tabel Pesanan Seminggu) tetap berurut Senin sampai Minggu karena mengikuti minggu kerja. Daftar "N tanggal libur" di bawah tab menu hanya berisi minggu yang sedang dibuka (tab Menu Mingguan) atau tanggal yang sedang dipilih (tab Menu Harian); pada tab Menu Harian daftar ini terpisah dari kalender, tampil menyamping di bawah menu, dan hanya berisi libur tanggal itu saja — hari biasa tidak menampilkan apa pun. Sakit atau tidak masuk satu hari lebih cepat ditangani di **Pesanan Seminggu** dengan mematikan pesanannya.

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
