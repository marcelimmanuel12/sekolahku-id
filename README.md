# SekolahKu.id — React SIAKAD & E-Learning Inklusif (V4)

**Source code website, bukan gambar desain.** Dibangun dengan React.js + Vite + CSS murni (tanpa Bootstrap, tanpa Lovable). Gaya academy colorful menggunakan ilustrasi kartun 3D dan ikon, mengikuti tampilan V3 sebelumnya. Paket ini juga menyertakan server Node.js bawaan yang diperlukan untuk meeting antarpengguna dan penyimpanan absensi lintas perangkat.

> **PENTING:** Ini adalah prototipe pengembangan dan demonstrasi dengan akun contoh, **bukan sistem produksi**. Jangan menggunakan data wajah, foto, identitas, atau video anak sungguhan tanpa persetujuan yang sah, penilaian keamanan, HTTPS, prosedur penghapusan, dan audit. Sediakan alternatif absensi manual tanpa konsekuensi negatif.

## 1. Cara menjalankan (pemula)

Persyaratan: **Node.js 22 atau yang lebih baru**, komputer terhubung internet saat pertama kali menginstal paket.

1. Ekstrak file ZIP `sekolahku-id-react-v4.zip`.
2. Buka folder `sekolahku-id` menggunakan **VS Code**.
3. Buka **Terminal → New Terminal** di VS Code.
4. Ketik:

   ```bash
   npm install
   npm run dev
   ```

5. Buka alamat **http://localhost:5173** di Chrome atau Edge.
6. **Jangan tutup terminal**, karena satu perintah itu menjalankan dua proses: React Vite di port 5173 dan server lokal di port 8787.

Untuk build produksi:

```bash
npm run build
npm run start
```

Setelah build, aplikasi lengkap disajikan server Node di **http://localhost:8787**. Agar kamera siswa di ponsel/PC lain bisa digunakan, pasang website di **domain HTTPS** dengan reverse proxy/TLS. `http://alamat-IP-LAN` biasa **tidak cukup** untuk izin kamera di sebagian besar browser.

## 2. Akun demo

| Peran | Nomor induk | Password |
|---|---|---|
| Admin sekolah | `ADM001` | `Admin123!` |
| Guru | `19850102001` | `Guru123!` |
| Siswa (NISN) | `0098765432` | `Siswa123!` |

Login memakai nomor induk + password dari sekolah, **bukan Gmail**. Admin dapat menambah akun lewat Manajemen Pengguna; akun tersebut disinkronkan ke katalog server demo. Admin juga dapat mereset password pengguna.

## 3. Yang benar-benar dibuat / diperbarui

### A. Branding & UI

- Nama dan teks utama **SekolahKu.id** menggantikan Equora AI Learn.
- Tetap memakai homepage, halaman login, dan tiga dashboard Admin/Guru/Siswa dengan ilustrasi lokal di `public/art/`.
- Tema academy: navy, biru, ungu pastel, kartu warna-warni, ikon `lucide-react`, tampilan responsif.

### B. Meeting internal (tanpa menempel link Google Meet)

**Guru → Meeting → Buat & Masuk Meeting.** Guru memilih kelas dan judul; website otomatis membuat **ruang internal** pada server SekolahKu.id.

**Siswa → Meeting → Gabung.** Siswa melihat ruang kelasnya yang dibuat guru, lalu menekan **Gabung** pada website yang sama.

Fitur yang sudah dikodekan:

- Audio/video antar peserta melalui **WebRTC peer-to-peer (mesh)**.
- Tombol **mikrofon**, **kamera**, **berbagi layar**, dan **keluar**.
- **Chat** kelas real-time.
- **Subtitle otomatis bahasa Indonesia** menggunakan Web Speech API browser (ketika browser mendukung dan izin suara aktif); tersedia **subtitle manual** sebagai alternatif.
- Subtitle dan chat dikirim ke peserta lainnya lewat server komunikasi (SSE/HTTP).
- **Kartu ilustrasi gestur tangan** seperti menyapa 👋, setuju 👍, perhatian ✋, mengangkat tangan 🙋, dan terima kasih 🙏 yang dipicu dari kata tertentu pada subtitle.
- Ruang meeting tetap terlihat setelah guru membuatnya; maksimal **8 peserta dalam satu ruang** untuk prototipe.

**Bukan integrasi Google Meet resmi.** Ini adalah **ruang video SekolahKu.id sendiri** menggunakan WebRTC. Perlu server yang aktif saat meeting dan koneksi internet antar pengguna. Koneksi WebRTC dalam jaringan NAT yang ketat mungkin memerlukan **TURN**. Untuk konfigurasi TURN, lihat bagian 5.

**Keterbatasan penting:** Kartu tangan di atas **BUKAN** terjemahan BISINDO sungguhan. Kartu adalah petunjuk visual umum; bahasa isyarat Indonesia memiliki struktur linguistik sendiri. Terjemahan ucapan menjadi rangkaian tangan BISINDO yang akurat memerlukan dataset gerakan/video BISINDO berlisensi, model AI, dan validasi bersama pengguna BISINDO. Jangan mengklaim gestur emoji sebagai terjemahan resmi. Akurasi/ketersediaan subtitle bergantung pada browser, layanan speech browser, noise, dan internet. Rekaman meeting tidak disediakan pada versi ini.

### C. Absensi wajah dan simpan foto

**Guru → Absensi → Daftarkan Wajah**:

1. Pilih kelas dan siswa.
2. Pastikan persetujuan yang diperlukan sudah diperoleh; centang konfirmasi.
3. Aktifkan kamera dan ambil **3 sampel wajah** untuk pengenalan otomatis dengan `face-api.js`.
4. Tekan **Simpan profil wajah**. Aplikasi menyimpan **foto JPEG 224×224 yang diperkecil**, tiga descriptor numerik, dan status persetujuan ke server demo.
5. Pada panel daftar pendaftaran, foto yang telah disimpan ditampilkan sebagai thumbnail. Bisa dihapus oleh guru/admin yang berwenang.
6. Guru dapat membuat sesi absensi, mencatat otomatis dengan scan, atau **mengubah manual** menjadi Hadir, Terlambat, Izin, Sakit, Alpa.

**Baru — fallback unggah foto:** Jika kamera atau model pengenal wajah belum berfungsi, guru bisa memilih tombol **Unggah foto siswa saja** (JPG/PNG/WebP maks. 5 MB) setelah mengonfirmasi persetujuan. Foto tetap disimpan di server, tetapi **tidak bisa dipakai untuk pengenalan otomatis** sampai 3 sampel pengenal wajah berhasil didaftarkan.

**Siswa → Absensi**: sesi dan profil guru tersedia dari server yang sama. Siswa dapat memindai wajah sendiri jika descriptor sudah terdaftar, kamera diizinkan, dan sesi guru aktif. Guru dapat mencatat manual jika siswa tidak dapat menggunakan pengenalan wajah.

**Penyimpanan:** Foto dan descriptor tersimpan **terenkripsi AES-256-GCM pada disk server demo** di folder `server/.data/`; kunci dibuat lokal pada `server/.data/secret.key`. Data biometrik tidak ditulis ke localStorage baru. **Jangan menghapus key saat masih menyimpan faces.enc**; jika kunci hilang, foto tidak dapat dipulihkan. Untuk benar-benar aman diperlukan sistem manajemen kunci dan hak akses produksi.

**Bukan sistem biometrik siap pakai:** Pengenalan wajah ini belum memiliki deteksi liveness/anti-foto palsu yang teruji, audit lengkap, pengukuran false positive untuk kondisi nyata, perlindungan transportasi HTTPS bawaan, ataupun kontrol privasi setingkat produksi. Server demo menerima catatan kecocokan dari browser; tidak dapat menjadi bukti identitas yang tahan manipulasi. Gunakan hanya dengan data contoh sintetis untuk pengembangan.

## 4. Status fitur lainnya

Struktur dari V3 dipertahankan: dashboard, pengelolaan pengguna, kelas, mata pelajaran, materi, tugas, game/kuis, generator PPT berbasis template, laporan, dan pengaturan.

- **Server bersama:** katalog akun dan kelas, ruang meeting, sesi absensi, rekap absensi, foto dan descriptor wajah.
- **Masih penyimpanan browser (`localStorage`)**: beberapa modul akademik lainnya seperti materi, kuis, nilai dan pengaturan demo. Modul-modul itu **belum sinkron penuh antarperangkat**.
- **Masih demo/placeholder:** AI generatif PowerPoint/quiz, penerjemah BISINDO, 9 mekanik game berbeda, payment gateway, serta perekaman meeting.
- Foto siswa yang dahulu hanya berupa vektor wajah kini memiliki foto nyata dan alternatif unggah foto, tetapi **pengujian kamera nyata tetap perlu dilakukan di perangkat**.

## 5. Infrastruktur dan deployment

Di Vite development, request `/api` diteruskan ke port 8787 lewat `vite.config.js`.

Pada hosting HTTPS, arahkan domain ke Node server port 8787 setelah `npm run build`. Reverse proxy/Nginx/Caddy harus mendukung endpoint SSE (jangan buffer response `text/event-stream`). Pastikan kamera/mikrofon perangkat memiliki izin akses, dan origin berada di HTTPS atau localhost.

Untuk jaringan NAT yang sulit, pasang layanan TURN (misalnya coturn) dan jalankan server dengan variabel lingkungan:

```bash
TURN_URL=turn:turn.sekolahku.id:3478 TURN_USERNAME=user TURN_CREDENTIAL=secret npm run start
```

Untuk produksi, kredensial TURN sebaiknya **sementara** (bukan hardcoded statis); siapkan batas akses ruang, monitoring, firewall, dan kapasitas konferensi/SFU untuk banyak peserta. Server Node yang disertakan adalah **signalling**; media mengalir lewat WebRTC dan, bila dibutuhkan, TURN.

Folder `server/.data/` berisi informasi yang sensitif. Sudah masuk `.gitignore` dan **tidak ikut ZIP**. Backup data serta kunci secara aman. Ubah password akun demo sebelum membuka layanan ke publik; jangan gunakan konfigurasi demo ini sebagai layanan sekolah sungguhan.

## 6. Uji server otomatis

Setelah ekstrak, bahkan sebelum `npm install`, kamu bisa menjalankan:

```bash
npm run test:server
```

Test menggunakan server dan direktori sementara sendiri, tidak mengubah data sekolah. Pengecekan meliputi login tiga peran, pembuatan akun baru admin, ruang dan signaling WebRTC, pengiriman subtitle SSE, absensi, simpan/hapus foto terenkripsi, serta larangan siswa mendaftarkan dirinya sendiri.

**Catatan pengujian paket:** Pengujian API/server tersebut telah berhasil dan sintaks JSX diperiksa dengan parser TypeScript. **Build Vite dan tes kamera/WebRTC langsung di browser belum terverifikasi di lingkungan pembuatan paket** karena akses ke registry npm gagal (DNS `EAI_AGAIN`). Jalankan `npm install`, `npm run build`, dan tes memakai dua perangkat/browser di komputermu.

## 7. Struktur proyek

```text
sekolahku-id/
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
├── README.md
├── public/
│   ├── art/                     # Ilustrasi kartun 3D dan ikon yang sudah ada di V3
│   ├── illustrations/
│   └── favicon.svg
├── src/
│   ├── api.js                   # Akses API dan stream SSE
│   ├── App.jsx                  # Dashboard 3 peran, login dan modul sekolah
│   ├── data.js                  # Data demo
│   ├── components/
│   │   ├── Landing.jsx          # Beranda kartun
│   │   ├── FaceAttendance.jsx   # Foto, pengenalan wajah dan absensi
│   │   ├── ClassroomMeeting.jsx # Video kelas WebRTC, subtitle, chat
│   │   └── meeting.css
│   ├── style.css
│   └── theme-v3.css
└── server/
    ├── dev.mjs                  # Menyalakan Vite + API dalam satu perintah
    ├── server.mjs               # Node API, katalog, foto terenkripsi, SSE/WebRTC
    └── tests/smoke.mjs
```

**SekolahKu.id V4** · Kode proyek pengembangan untuk pembelajaran inklusif.
