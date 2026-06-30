# MabarKas — Handover (Struktur v3.3)

Salin seluruh isi ini ke sesi Claude yang baru.

> **v3.2 (30 Juni 2026)** — audit + 6 sprint + 2 lapangan (Sprint 7) + **feedback uji-coba user**
> (Sprint 8): periode member jadi daftar folder, input rupiah berformat, dialog kaca,
> sesi bisa ditandai selesai, tombol simpan game diperbaiki.
> **v3.3 (Sprint 9):** periode member bebas (nama/tanggal/aktif + tambah member),
> layar Kelola pemain (rename/hapus), PDF rekap dirombak. Lulus `npm run build`.

---

## KONTEKS PROYEK

**MabarKas** — aplikasi pencatatan sesi mabar (main bareng) badminton untuk
komunitas **PB Oasis**. Dioperasikan 1 pengurus lewat HP.

**Aturan kerja:**
- User tidak punya background IT. Jelaskan teknis pakai bahasa sehari-hari.
- Jangan eksekusi hal yang berdampak ke UI/struktur data tanpa konfirmasi.
- Pilihan teknis: sajikan max 3 opsi + trade-off, tunggu pilihan.
- Ringkas, tanya satu hal pada satu waktu.
- App dibuka di **HP** (mobile-first). Di desktop tampil **ketengah pakai bingkai HP**.
- Kirim file dalam **zip folder `mabarkas`** — user tinggal extract & timpa.
  node_modules & .git TIDAK diikutkan (punya user yang lama tetap aman).

---

## STACK

| Komponen | Detail |
|---|---|
| Frontend | React 19 + Vite 6 (**PWA installable**), inline-style + CSS variables |
| Backend | Supabase |
| PDF | jsPDF (vendor di `public/jspdf.umd.min.js`, dipanggil `window.jspdf.jsPDF`) |
| PWA | `public/manifest.webmanifest` + `public/sw.js` (service worker), didaftarkan di `main.jsx` |
| GitHub | `https://github.com/anotherie17/pboasis.git` |
| Folder lokal | `C:\DATA\mabarkas` |
| Bahasa UI | Indonesia |
| Warna brand | Navy `#031E53` (utama), Royal Blue `#1368C8` (aksen) |

---

## SUPABASE

- **Project ID:** `geowkpxcwftvnbtdblol`
- **URL:** `https://geowkpxcwftvnbtdblol.supabase.co`
- **Auth:** `pboasis@mabarkas.app` / `admin`

### Tabel (skema asli — sudah diverifikasi via MCP)

```
players        -> id(uuid), name(text, UNIQUE), created_at
member_periods -> id(uuid), period_number(int), started_at(date), ended_at(date),
                  label(text), active(bool default true), created_at   [3 kolom BARU v3.3]
member_list    -> period_id(uuid), player_id(uuid)            [PK gabungan]
sessions       -> id(uuid), name(text), date(date), court_fee_nonmember(int),
                  cock_price_per_piece(int), closed(bool, default false), created_at   [closed BARU v3.2]
attendees      -> session_id, player_id [PK gabungan],
                  is_member_this_session(bool), paid(bool), checked_in_at
games          -> id(uuid), session_id, cock_used(int, CHECK >= 0),
                  finished(bool, default true), played_at        [finished BARU v3.1]
game_players   -> game_id, player_id [PK gabungan]
```

**Relasi penting (ON DELETE CASCADE — sudah diverifikasi):**
- Hapus `sessions` → `attendees`, `games`, `game_players`-nya ikut terhapus otomatis.
- Hapus `games` → `game_players`-nya ikut terhapus otomatis.
- `players` tidak pernah dihapus oleh app.

⚠️ **RLS masih OFF** (sengaja — aman untuk 1 pengurus). SQL untuk menyalakannya
sudah disiapkan di bagian **CHECKLIST SEBELUM GO-LIVE**. **Jangan dijalankan**
sampai siap multi-user (bisa mengunci app kalau policy salah).

---

## MODEL IURAN (v2 — tetap berlaku)

Tagihan per orang = **biaya lapangan** (kalau non-member) **+ porsi cock yang dia pakai**.

```
biaya_cock_game   = jumlah_cock_game x harga_cock_per_biji
porsi_per_pemain  = biaya_cock_game / 4          (tiap game 4 pemain)
porsi_cock_pemain = jumlah semua porsi dari game yang dia ikut
tagihan_pemain    = (non-member ? tarif_lapangan : 0) + porsi_cock_pemain
```

- Iuran = hasil komputasi (`src/lib/iuran.js`), tidak disimpan. Yang disimpan cuma `paid`.
- **v3:** pembulatan sekarang **presisi** (metode *largest remainder*) — jumlah porsi
  semua pemain **persis** sama dengan total biaya cock (tidak meleset rupiah).

---

## MODEL MEMBER (v3.3 — periode fleksibel)

- Member berlaku **per periode** (satu "batch", mis. 4x main). Tidak dipatok bulan.
- Layar **Daftar Member** = daftar folder periode. Tiap periode bisa diatur:
  **nama bebas** (`label`), **tanggal mulai & selesai** (`started_at`/`ended_at`),
  dan **toggle Aktif** (`active`). Bisa **tambah pemain baru langsung jadi member**
  dari dalam periode.
- Pas **check-in**, auto-member diambil dari periode yang **`active=true`** DAN
  rentang tanggalnya mencakup tanggal sesi (`started_at <= tgl <= ended_at`, atau
  `ended_at` kosong = terbuka). Kalau cocok lebih dari satu, ambil yang mulainya
  paling baru. Operator tetap bisa **override** per sesi.

---

## DESAIN (v2) — GLASSMORPHISM "MEWAH" (tetap)

Arah visual dikunci: glassmorphism premium. Base `#0a1838`, kaca `rgba(255,255,255,0.10)`
+ `backdrop-filter blur(18px)` (v3: diturunkan dari 22px biar lebih ringan di HP lama),
border `rgba(255,255,255,0.18)`. Heading `Plus Jakarta Sans`, body `Inter`.
Teks: `--t-2 0.68`, `--t-3 0.58` (v3: kontras dinaikkan biar lebih kebaca).
Tombol utama gradient biru + glow. Tab bawah kaca. Layout HP full-screen, desktop
ketengah bingkai HP (max ~430px). Ikon SVG (`src/components/ui.jsx`), bukan emoji.

## ALUR & STRUKTUR LAYAR (v3)

```
Login
  -> Beranda
       - Sesi baru
       - Daftar member (periode fleksibel)
       - Kelola pemain (rename / hapus pemain)        [BARU v3.3]
       - Riwayat sesi
       - [v3] Tombol KELUAR (logout) di pojok header
  -> (buka satu sesi) Workspace:
       - Tombol EDIT sesi di header: ubah nama/tanggal/harga, **Tandai sesi selesai**
         (v3.2 → Beranda jadi "Selesai"), atau HAPUS sesi
       - 4 TAB bawah: [ Hadir ] [ Game ] [ Iuran ] [ Rekap ]
```

- **Hadir** — catat orang dateng (member auto by tanggal sesi, bisa override). Min 4 buat main.
  [v3] Checkout pakai ikon "×" + konfirmasi; **diblokir kalau pemain sudah punya game**.
- **Game** — list match. **Alur 2 lapangan (v3.1):** pilih 4 → **"Mulai main"**
  (game jadi "● Lagi main"), pas kelar tap game itu → isi cock → **"Selesai"**.
  **Saran giliran otomatis mengecualikan yang lagi main**, jadi 2 lapangan bisa
  jalan barengan tanpa bentrok. Ada juga "langsung catat selesai" buat game yang
  dicatat belakangan. Tombol simpan nempel di bawah sheet + anti dobel-tap.
  Ganti pemain = hapus lalu mulai ulang.
- **Iuran** — tagihan tiap orang, tandai Lunas/Belum.
- **Rekap** — ringkasan + export PDF ([v3] tahan-banting di iOS).

---

## FILE STRUKTUR (v3)

```
mabarkas\
├── index.html              (load jspdf + link manifest + apple-touch-icon)
├── public\
│   ├── jspdf.umd.min.js    (vendor — jangan hapus)
│   ├── manifest.webmanifest[BARU v3]
│   ├── sw.js               (service worker)         [BARU v3]
│   └── icon-192/512/maskable-512.png                [BARU v3]
└── src\
    ├── main.jsx            (+ daftar service worker)
    ├── App.jsx             (auth + routing; passes onSesiUpdated)
    ├── index.css           (kontras & blur disesuaikan)
    ├── components\
    │   ├── ui.jsx          (+ Overlay portal, CurrencyInput, ikon)
    │   └── Dialog.jsx      (pop-up konfirmasi/alert kaca)         [BARU v3.2]
    ├── lib\
    │   ├── supabase.js
    │   └── iuran.js         (pembulatan presisi + totalCourt, cockCount per pemain)
    └── pages\
        ├── Login.jsx
        ├── Beranda.jsx      (+ logout, status bayar akurat)
        ├── DaftarMember.jsx (periode fleksibel + tambah member)
        ├── KelolaPemain.jsx (rename / hapus pemain)             [BARU v3.3]
        ├── SetupSesi.jsx    (+ pesan kalau sesi tanggal sama sudah ada)
        ├── SesiWorkspace.jsx(+ Edit/Hapus sesi)
        ├── TabHadir.jsx     (checkout aman, normalisasi nama)
        ├── TabGame.jsx      (simpan nempel, anti dobel, rollback)
        ├── TabIuran.jsx     (error handling tandai lunas)
        └── TabRekap.jsx     (PDF iOS-friendly)
```

> File v1 lama (CheckIn/CatatGame/Iuran/Rekap.jsx) **sudah dihapus** (dead code).

---

## CHANGELOG v3.3 (feedback lanjutan — Sprint 9)

- **Periode member jadi fleksibel**: bisa ubah **nama periode**, set **tanggal
  mulai & selesai**, dan **toggle Aktif**. Check-in pakai periode aktif yang
  rentang tanggalnya cocok.
- **Tambah pemain baru langsung dari periode** (otomatis jadi member).
- **Layar Kelola pemain** (dari Beranda): **ubah nama** & **hapus pemain**.
  Hapus diblokir kalau pemain sudah punya riwayat (hadir/game) biar rekap lama utuh.
- **PDF rekap dirombak**: pemasukan **lapangan vs cock dipisah** (2 kartu),
  ringkasan lebih jelas, **rincian per pemain detail** (game, biji cock, biaya
  lapangan, biaya cock, total, status bayar), tanda (M) untuk member, lebih rapi.
- `iuran.js` kini juga keluarkan `totalCourt` (pemasukan lapangan) & `cockCount`/pemain.

---

## CHANGELOG v3.2 (feedback uji-coba user — Sprint 8)

- **Daftar member jadi daftar folder periode** (buat/buka/hapus), label pakai
  tanggal mulai + "Periode N", folder teratas "Aktif". Nama-bulan dibuang
  (rancu karena periode tak selalu mulai awal bulan).
- **Input harga berformat ribuan** otomatis (12.000) di Setup & Edit sesi.
- **Tombol simpan game diperbaiki**: sheet dipindah ke *portal* + tinggi `dvh`,
  area daftar bisa menyusut → tombol simpan SELALU kelihatan (tidak lagi ketutup
  bar browser di HP).
- **Sesi bisa ditandai "Selesai"** (kolom `sessions.closed`) lewat Edit sesi →
  Beranda tampil "Selesai" walau tanggalnya hari ini. Bisa diaktifkan lagi.
- **Semua `confirm()`/`alert()` bawaan browser diganti pop-up kaca** senada app.
- **Credit halus** "Dikembangkan oleh Rie" di bawah kotak Login & paling bawah Beranda
  (komponen `Credit` di `components/ui.jsx`).

---

## CHANGELOG v3.1 (dukungan 2 lapangan — Sprint 7)

- Kolom baru `games.finished` (game lama otomatis `true`/selesai).
- Alur game jadi **Mulai main → Selesai**: game "lagi main" ditandai hijau,
  cock diisi pas selesai. Opsi "langsung catat selesai" tetap ada.
- **Saran giliran & daftar pilih pemain mengecualikan yang lagi main** → 2 lapangan
  (atau lebih) bisa jalan bersamaan tanpa menyodorkan orang yang lagi di lapangan.
- Statistik & badge "lagi main" muncul di daftar pemain dan match list.
- Uang/iuran TIDAK berubah — tiap game tetap cock ÷ 4 pemainnya.

---

## CHANGELOG v3 (apa yang diperbaiki)

**3 temuan user:**
1. **Tombol simpan game** kini menempel di dasar sheet (sticky), satu area scroll,
   selalu kelihatan; saat <4 pemain tombol tetap tampil ("Pilih N pemain lagi").
   + **anti dobel-tap** (status "Menyimpan…").
2. **Konsep "periode" disederhanakan** jadi **nama bulan**; tombol bulan baru pakai
   konfirmasi & tidak bisa numpuk; pemilihan daftar member kini **pasti** (by tanggal sesi).
   Data: **4 periode kosong yang nyangkut sudah dibersihkan**; 2 member yang salah
   ditandai non-member sudah dibetulkan.
3. **Tombol Logout** ditambahkan di Beranda.

**Critical:**
- **Checkout aman**: pemain yang sudah punya game **tidak bisa dikeluarkan**
  (cegah uang hilang & nama jadi "—"). Checkout biasa pakai konfirmasi.

**Bug:**
- Simpan game: cek error pada langkah pemain; kalau gagal, game **dibatalkan** (rollback).
- Error handling pada tandai-bayar, toggle member, check-in, tambah pemain
  (kalau gagal simpan, tampilan dikembalikan + pesan).
- Beranda "ada belum bayar" kini akurat — member bertagihan **Rp0 tidak dihitung** nunggak.

**Fungsi baru:**
- **Edit sesi** (nama/tanggal/harga cock/tarif) + **Hapus sesi** (dengan konfirmasi ganda).

**Polish:**
- Ikon hadir/checkout diperjelas (+ / ×), area tap diperbesar (38px).
- Kontras teks dinaikkan; blur diturunkan biar ringan.
- Pembulatan iuran presisi.
- Nama pemain dinormalkan (trim + spasi ganda) & cek duplikat tanpa peduli huruf besar/kecil.

**Produksi:**
- **PWA installable** (manifest + ikon + service worker) — bisa "Add to Home Screen".
  Service worker hanya cache aset app, **bukan** data Supabase (angka selalu fresh).
- **Export PDF** dibuat tahan-banting di iOS Safari (buka di tab baru kalau perlu).

---

## CHECKLIST SEBELUM GO-LIVE (belum dikerjakan — sengaja)

**1) Nyalakan RLS + policy** (WAJIB sebelum dipakai banyak orang).
Karena app login dengan 1 akun pengurus (role `authenticated`), policy paling
sederhana: izinkan akun login melakukan semua, tutup untuk publik (`anon`).
Jalankan di Supabase SQL editor **hanya saat siap**:

```sql
-- Aktifkan RLS
ALTER TABLE public.players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_list    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players   ENABLE ROW LEVEL SECURITY;

-- Policy: hanya user yang sudah login boleh baca/tulis semua
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['players','member_periods','member_list','sessions','attendees','games','game_players']
  LOOP
    EXECUTE format('CREATE POLICY %I_auth_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;
```

> Setelah ini, app yang login tetap jalan normal, tapi anon key tidak bisa
> mengubah data lagi. Uji dulu setelah menyalakannya.

**2) Uji export PDF di iPhone** (Safari) — pastikan PDF kebuka/bisa di-share.

**3) (opsional) Offline antrian** — saat ini kalau sinyal jelek, aksi yang gagal
diberi pesan & dikembalikan. Antrian offline penuh = pekerjaan besar, pertimbangkan nanti.

---

## CATATAN MODEL (yang belum diubah, by design)

- **Saran giliran** sudah **mendukung 2 lapangan barengan** (v3.1): pakai metrik
  paling sedikit main + paling lama nunggu, DAN mengecualikan pemain yang status
  game-nya masih "lagi main". User konfirmasi: kadang 2 lapangan jalan bersamaan
  saat ramai (mis. Sabtu: Lap 1 jam 20–23, Lap 2 jam 21–23). Uang & data tidak
  terpengaruh jumlah lapangan — tiap game tetap berdiri sendiri (cock ÷ 4).
- "Berlangsung vs Selesai" di Beranda ditentukan dari `date == hari ini`.

*Handover v3 — 30 Juni 2026, sesudah audit + 6 sprint perbaikan.*
