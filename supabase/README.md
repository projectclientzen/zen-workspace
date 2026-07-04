# Supabase — Zen Dashboard

Project: `zen-dashboard` (ref `qexwjdkmsheqaumopwbb`, region `ap-southeast-1`), organisasi `projectclientzen`.
Terpisah dari project Supabase dashboard tim lain (`ads lab`, `adslab-ngajigaes`).

Migrasi di `migrations/` sudah diterapkan langsung ke project via Supabase MCP, disimpan di sini
untuk versioning dan supaya bisa direplay lewat `supabase db push` kalau nanti dipakai dengan
Supabase CLI.

## Status Sprint (lihat `BE_Tasks_Personal_Dashboard.md` untuk detail penuh)

- [x] Sprint 0 — Foundation (profiles, set_updated_at, jakarta_date)
- [x] Sprint 1 — Projects + Tasks (termasuk kolom `link`/`image_path`, guard Top 3, storage bucket `attachments`)
- [x] Sprint 2 — RPC Today/Attention/Project Stats/Urgent
- [x] Sprint 3 — Inbox (tidak ada RPC dedicated — triase pakai update langsung ke `tasks` + RLS, sesuai spek asli)
- [x] Sprint 4 — Recurring engine (`recurring_rules`, `generate_recurring_instances()`, unique guard per hari, pg_cron 00:05 WIB)
- [x] Sprint 5 — Reminders + Digest (`reminders`, `get_pending_reminders()` dengan title/sub render, `dismiss_reminder()`, `generate_morning_digest()` pg_cron 07:00 WIB)
- [x] Sprint 6 — Metrics + check-in (`metrics`, `metric_checkins`, `metric_streak()`, `generate_metric_reminders()` pg_cron 08:00 WIB)
- [x] Sprint 7 — Weekly Review (`weekly_reviews`, `weekly_counts()`, `upsert_weekly_review()`)
- [x] Sprint 8 — Kalender internal (`tasks_in_range()`)
- [x] Sprint K — Ideation (`ideas`, `idea_history`, `save_idea_version()`, `convert_idea_to_task()` transaksional)

Semua tabel RLS aktif, di-cek via Supabase advisor (security + performance) — bersih kecuali
satu warning yang disengaja (`seed_default_projects` callable oleh authenticated, memang untuk
dipanggil user setelah signup) dan info "unused index" yang wajar untuk DB baru kosong.

## Belum dikerjakan / v1.1

- Testing sprint (TEST-1..10 di `BE_Tasks_Personal_Dashboard.md`) belum dijalankan end-to-end
  dengan sesi auth nyata — verifikasi sejauh ini via Supabase advisor + review manual SQL.
  Perlu diulang setelah ada user login sungguhan (bukan lewat MCP service-role).
- CAL-2 GCal push satu arah — ditunda sesuai keputusan awal.
- Push notification sungguhan (service worker + subscription) — ditunda ke v1.1, FE baru placeholder.

## Setelah signup user pertama

Panggil RPC `seed_default_projects()` sekali (butuh sesi auth) untuk mengisi 8 project default.

## Env FE

Isi `apps/web/.env.local` (tidak di-commit) dengan:

```
NEXT_PUBLIC_SUPABASE_URL=https://qexwjdkmsheqaumopwbb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key dari Supabase dashboard>
```
