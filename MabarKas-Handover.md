# MabarKas — Handover (Struktur v2)

Salin seluruh isi ini ke sesi Claude yang baru.

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
| Frontend | React + Vite (PWA), inline-style + CSS variables |
| Backend | Supabase |
| PDF | jsPDF (vendor di `public/jspdf.umd.min.js`, dipanggil `window.jspdf.jsPDF`) |
| GitHub | `https://github.com/anotherie17/pboasis.git` |
| Folder lokal | `C:\DATA\mabarkas` |
| Bahasa UI | Indonesia |
| Warna brand | Navy `#031E53` (utama), Royal Blue `#1368C8` (aksen) |

---

## SUPABASE

- **Project ID:** `geowkpxcwftvnbtdblol`
- **URL:** `https://geowkpxcwftvnbtdblol.supabase.co`
- **Auth:** `pboasis@mabarkas.app` / `admin`

### Tabel

```
players        -> id, name, created_at
member_periods -> id, period_number, started_at, created_at        (DIPAKAI v2)
member_list    -> period_id, player_id                              (DIPAKAI v2)
sessions       -> id, name, date, court_fee_nonmember, cock_price_per_piece, created_at
attendees      -> session_id, player_id, is_member_this_session, paid, checked_in_at
games          -> id, session_id, cock_used (INT >= 0), played_at   (BUKAN lagi 0|1)
game_players   -> game_id, player_id
```

⚠️ **RLS masih OFF**. Aman untuk 1 pengurus. Sebelum go-live/multi-user perlu diaktifkan + policy.

---

## MODEL IURAN (v2 — DIKOREKSI)

Tagihan per orang = **biaya lapangan** (kalau non-member) **+ porsi cock yang dia pakai**.

**Cock dihitung PER GAME**, bukan dikolam satu sesi:
```
biaya_cock_game   = jumlah_cock_game x harga_cock_per_biji
porsi_per_pemain  = biaya_cock_game / 4          (tiap game selalu 4 pemain)
porsi_cock_pemain = jumlah semua porsi dari game yang dia ikut
tagihan_pemain    = (non-member ? tarif_lapangan : 0) + porsi_cock_pemain
```

- Cock per game **bisa berapa aja** (1, 2, 3...), diisi **pas game selesai** (tentatif).
- Tarif lapangan = fixed cost dari panitia, **flat per non-member** (mis. Rp15.000). Member tidak kena lapangan.
- Karena dihitung per game, orang yang **pulang duluan** langsung bisa ditagih dari
  game yang sudah dia mainkan. Bayar = **final**, tidak ada tagihan susulan.
- Iuran = hasil komputasi (`src/lib/iuran.js`), tidak disimpan. Yang disimpan cuma `paid`.

---

## MODEL MEMBER (v2)

- Member berlaku **per periode 1 bulan (4x main)**. Tiap bulan dilist ulang.
- Ada **layar Daftar Member**: centang siapa member periode ini (tabel member_periods + member_list).
- Pas **check-in**, status member **otomatis** kebawa dari periode aktif (badge nyala sendiri).
  Operator tetap bisa **override** per sesi (`attendees.is_member_this_session`).

---

## DESAIN (v2) — GLASSMORPHISM "MEWAH"

Arah visual dikunci: **glassmorphism premium**. Wajib dipertahankan konsisten.
- **Background**: navy berlapis + gradient radial (royal blue glow) + 2 "blob" blur
  yang ketangkep di balik kaca. Base `#0a1838`.
- **Kaca (.glass)**: `background rgba(255,255,255,0.10)` + `backdrop-filter blur(22px) saturate(160%)`
  + border `rgba(255,255,255,0.18)` + inner highlight `inset 0 1px 0 rgba(255,255,255,0.25)`.
- **Tipografi**: heading `Plus Jakarta Sans` (700–800), body `Inter`. Teks putih + tingkat opasitas.
- **Sudut**: membulat besar (18–26px kartu, 46px frame). Shadow lembut, no flat.
- **Aksen**: tombol utama gradient `#2f86ff → #1368C8 → #0e54a6` + glow.
- **Status**: tag "Berlangsung" hijau mint, "Selesai" abu transparan; badge cock kuning lembut.
- **Tab bawah**: kaca, tab aktif "nyala" gradient biru + inner highlight.
- **Layout**: di HP full-screen; di desktop **ketengah dalam bingkai HP** (max-width ~430px).
- Ikon: pakai set ikon proper (mis. lucide / SVG inline), bukan emoji.

> Referensi visual final ada di mockup yang disetujui user (Beranda + tab Game).

## ALUR & STRUKTUR LAYAR (v2)

```
Login
  -> Beranda
       - Sesi baru
       - Riwayat sesi (buka sesi lama, update bayar nyusul)
       - Daftar member (atur bulanan)
  -> (buka satu sesi) Workspace dengan 4 TAB di bawah, bebas pindah:
       [ Hadir ] [ Game ] [ Iuran ] [ Rekap ]
```

- **Hadir** — catat orang dateng (member auto, bisa override). Min 4 buat mulai main.
- **Game** — **list match** (numpuk ke bawah). Catat game baru: pilih 4 pemain
  (ada **saran giliran** = gabungan paling sedikit main + paling lama nunggu),
  isi jumlah cock pas selesai. Tap nama pemain -> **history dia di sesi itu**
  (main berapa game, bareng siapa, total tagihan). History cukup **dalam sesi** saja.
- **Iuran** — tagihan tiap orang (lapangan + cock dia), tandai **Lunas/Belum** kapan aja.
- **Rekap** — ringkasan sesi + **export PDF** (buat share grup WA).

---

## PERUBAHAN DARI v1 (yang sudah terlanjur dibuat)

1. `games.cock_used` jadi **integer bebas** (bukan 0/1). Perlu drop check constraint.
2. Hitung cock jadi **per game dibagi 4**, bukan dikolam total sesi. (`iuran.js` ditulis ulang.)
3. Tambah **Beranda** (list sesi) + **Daftar Member** + **bottom tab** dalam sesi.
4. Sesi **bisa dibuka ulang** dari riwayat.
5. Tampilan **diketengahin** pakai bingkai selebar HP (app shell).
6. Member jadi **bulanan** beneran (member_periods dipakai).

---

## FILE STRUKTUR (target v2)

```
mabarkas\
├── index.html              (load jspdf.umd.min.js)
├── public\jspdf.umd.min.js (vendor — jangan hapus)
└── src\
    ├── main.jsx
    ├── App.jsx             (auth + routing: Beranda <-> Sesi workspace)
    ├── index.css           (+ app shell ketengah / bingkai HP)
    ├── lib\
    │   ├── supabase.js
    │   └── iuran.js         (hitung per-game split — v2)
    └── pages\
        ├── Login.jsx
        ├── Beranda.jsx      (list sesi + pintu ke member)        [BARU]
        ├── DaftarMember.jsx (atur member bulanan)                [BARU]
        ├── SetupSesi.jsx    (nama + tanggal + harga)
        ├── SesiWorkspace.jsx(shell + bottom tab)                 [BARU]
        ├── TabHadir.jsx     (eks CheckIn)
        ├── TabGame.jsx      (eks CatatGame — list match + history)
        ├── TabIuran.jsx     (eks Iuran)
        └── TabRekap.jsx     (eks Rekap)
```

---

## PROGRESS

- ✅ Sprint 1–5 (v1) selesai: Login, Setup, Check-in, Catat Game, Iuran, Rekap+PDF.
- 🔧 **Rework v2** (lagi dikerjain): Beranda + bottom tab, member bulanan, cock per-game, layout ketengah.

*Handover v2 — 29 Juni 2026, sesudah wawancara alur sama user.*
