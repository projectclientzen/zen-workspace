# Zen — Personal Productivity Dashboard

Dashboard produktivitas pribadi, single user. Fokus utama desain: satu prioritas hari ini, bukan
delapan brand paralel. Lihat `FE_Tasks_Personal_Dashboard.md` dan `BE_Tasks_Personal_Dashboard.md`
untuk spesifikasi lengkap per sprint.

## Live

- **App**: https://zen-dashboard-app.netlify.app
- **Supabase project**: `zen-dashboard` (ref `qexwjdkmsheqaumopwbb`, region `ap-southeast-1`)
- **Repo**: https://github.com/projectclientzen/zen-workspace (push ke `main` = auto-deploy Netlify)

Project Supabase dan site Netlify ini **terpisah** dari dashboard tim lain (`ads lab`,
`adslab-ngajigaes`, dan 4 site Netlify tim lainnya).

## Struktur repo

```
zen-workspace/
├── apps/web/                       Next.js App Router + Tailwind + shadcn (FE)
├── supabase/migrations/            Semua migrasi SQL (schema, RPC, pg_cron), sudah diterapkan
├── supabase/README.md              Status sprint BE + catatan setup
├── netlify.toml                    Konfigurasi build Netlify (base: apps/web)
├── FE_Tasks_Personal_Dashboard.md  Spesifikasi + checklist FE per sprint
└── BE_Tasks_Personal_Dashboard.md  Spesifikasi + checklist BE per sprint
```

## Stack

- **FE**: Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui + React Hook Form + Zod + Recharts
- **BE**: Supabase (Postgres + Auth + Storage + pg_cron), akses langsung dari FE via `@supabase/ssr`
  (tanpa API layer custom) — semua isolasi data lewat Row Level Security (`user_id = auth.uid()`)
- **Deploy**: Netlify (continuous deployment dari `main`)

## Jalan lokal

```bash
cd apps/web
npm install
cp .env.example .env.local   # isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Env var yang dipakai (lihat `supabase/README.md` untuk nilai project ini):

```
NEXT_PUBLIC_SUPABASE_URL=https://qexwjdkmsheqaumopwbb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key dari Supabase dashboard>
```

Setelah signup pertama kali (via halaman `/login`, konfirmasi email dulu kalau diaktifkan),
8 project default (ngajigaes.id, Labbaika, dst) otomatis ter-seed lewat RPC `seed_default_projects()`.

## Status

- **FE**: semua sprint A–K selesai (lihat checklist di `FE_Tasks_Personal_Dashboard.md`), sudah
  tersambung ke Supabase asli (bukan mock lagi).
- **BE**: semua sprint DATA/RPC/JOB selesai (lihat checklist di `BE_Tasks_Personal_Dashboard.md`),
  diverifikasi lewat Supabase advisor (security + performance), bersih.
- **Belum**: testing end-to-end dengan sesi auth user sungguhan (perlu signup manual lewat situs live
  dulu — verifikasi email tidak bisa/boleh di-bypass lewat SQL), CAL-2 (GCal push, ditunda ke v1.1),
  push notification asli (v1.1, FE baru placeholder).

## Keamanan

- Tidak ada service-role key atau kunci rahasia lain di kode FE — hanya `NEXT_PUBLIC_SUPABASE_URL`
  dan publishable key (memang didesain untuk terekspos di client).
- RLS aktif di semua tabel, policy tunggal per tabel (`user_id = auth.uid()`, dibungkus
  `(select auth.uid())` untuk performa).
- Bucket Storage `attachments` privat, akses lewat signed URL, path terisolasi per `user_id`.
