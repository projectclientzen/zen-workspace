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
- [ ] Sprint 3 — Inbox (query murni, belum ada RPC dedicated — pakai query tasks langsung)
- [ ] Sprint 4 — Recurring engine (pg_cron)
- [ ] Sprint 5 — Reminders + Digest
- [x] Metrics + check-in dasar (MET-1, MET-2, MET-5) — diajukan lebih awal karena jadi dependency RPC-2
- [ ] Sprint 7 — Weekly Review
- [ ] Sprint 8 — Kalender internal
- [ ] Sprint K — Ideation (ideas + idea_history)

## Setelah signup user pertama

Panggil RPC `seed_default_projects()` sekali (butuh sesi auth) untuk mengisi 8 project default.

## Env FE

Isi `apps/web/.env.local` (tidak di-commit) dengan:

```
NEXT_PUBLIC_SUPABASE_URL=https://qexwjdkmsheqaumopwbb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key dari Supabase dashboard>
```
