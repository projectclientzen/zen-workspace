# BE Tasks — Personal Productivity Dashboard (Zen)

Backend untuk dashboard produktivitas pribadi. Supabase project, repo, dan Netlify terpisah dari dashboard tim. Single user, RLS by `auth.uid()`. Timezone `Asia/Jakarta`. Tiap task atomik dengan cara cek selesai.

Keputusan terkunci: recurrence via pg_cron, status task `todo/doing/done/dropped`, minggu Senin-Minggu, GCal internal dulu.

Track: FND foundation, DATA schema, RPC, JOB scheduled, TEST.

## Update — menyesuaikan revisi FE (v1.1)

FE (Zen Dashboard desktop + Zen Mobile) sudah direvisi dan menambah fitur yang belum tercakup dokumen ini semula. Hasil analisa mockup terbaru (`.dc.html`) dibanding kontrak lama:

- **Fitur baru: Ideation** (catatan ide mentah dengan gambar/link, riwayat versi manual, convert-to-task). Tidak ada di skema lama sama sekali → Sprint K baru.
- **Task butuh 2 kolom baru**: `link` (url opsional) dan `image_path` (path ke Supabase Storage, bukan base64). Field ini dipakai di task form, capture sheet, dan task detail drawer di FE baru.
- **Panel "Urgent" (beda dari "Butuh Perhatian")**: gabungan overdue + high-priority-due-today, ditampilkan sebagai daftar (bukan cuma angka) → butuh RPC baru.
- **Reminder/notification center** FE mengharapkan `title`/`sub` siap render, bukan `payload` mentah → RPC get_pending_reminders perlu merender teks.
- **Push notification** di mock murni placeholder client-side (`Notification` API browser, tanpa service worker/subscription nyata) → tidak wajib untuk v1, dicatat sebagai item v1.1 terpisah, skema tidak berubah untuk ini sekarang.
- Field lain yang FE baru pakai (`project.type`, `project.sort_order`, `metric.unit`, `recurring_rules.weekdays`) **sudah** ada di skema lama — tidak ada perubahan di situ.

## Status implementasi

Semua sprint DATA/RPC/JOB sudah diterapkan ke project Supabase `zen-dashboard` (ref `qexwjdkmsheqaumopwbb`, region ap-southeast-1) via migrasi — lihat `supabase/migrations/` di repo `zen-workspace` untuk SQL lengkap dan `supabase/README.md` untuk status per sprint. Dicek lewat Supabase advisor (security + performance), bersih.

Sudah live di Netlify (`zen-dashboard-app.netlify.app`, auto-deploy dari `main`) — **FND-3 selesai**, coret dari "belum dikerjakan".

Belum dikerjakan:
- **Testing (TEST-1..10)** — belum dijalankan end-to-end dengan sesi auth user sungguhan (baru dicek via advisor + review SQL manual saat apply migrasi).
- **CAL-2 GCal push** — sesuai keputusan, ditunda ke v1.1. **Update:** user sudah minta ini dikerjakan sekarang (bukan ditunda lagi) — perlu OAuth Client Google (Client ID + Secret) yang harus dibuat user sendiri di Google Cloud Console, belum bisa mulai sampai itu ada.
- **Sprint M (Push notification asli)** — tabel, RPC, Edge Function sudah jalan, tapi **belum tersambung end-to-end**: 3 secret (VAPID public/private key, cron secret) belum diisi user ke Supabase Dashboard, dan pg_cron belum dijadwalkan untuk memanggil Edge Function `send-push`. Lihat detail di Sprint M di bawah.

## Sprint L — Time Blocking + Pomodoro (di luar spek awal, ditambah atas permintaan user)

- [x] **TB-1 Tabel time_blocks** slot waktu kerja per task, terpisah dari `due_at` (deadline vs kapan sungguhan dikerjakan). RLS standar.
- [x] **TB-2 RPC time_blocks_in_range(p_start, p_end)** untuk tampilan kalender.
- [x] **POM-1 Tabel pomodoro_sessions** sesi fokus/istirahat per task, kolom completed untuk bedakan sesi selesai natural vs dihentikan.
- [x] **POM-2 RPC task_focus_minutes(p_task_id)** total menit fokus per task (badge ringkasan).

## Sprint M — Push Notification asli (v1.1 → dikerjakan sekarang atas permintaan user)

- [x] **PUSH-1 Tabel push_subscriptions** endpoint + keys (p256dh/auth) per user/device, RLS standar.
- [x] **PUSH-2 Kolom reminders.pushed_at** penanda reminder yang sudah dikirim via push (beda dari status pending/dismissed yang atur tampilan in-app), supaya job pengirim tidak dobel kirim.
- [x] **PUSH-3 RPC get_reminders_to_push() / mark_reminder_pushed()** service-role only, dipakai Edge Function.
- [x] **PUSH-4 Edge Function send-push** (`supabase/functions/send-push`) — pakai `npm:web-push`, kirim ke semua subscription milik user pemilik reminder, hapus subscription yang sudah invalid (404/410). Sudah ter-deploy (`verify_jwt=false`, diproteksi header `x-cron-secret`).
- [ ] **PUSH-5 Isi secret Edge Function** — **BUTUH AKSI USER**: buka Supabase Dashboard → Project → Edge Functions → `send-push` → Secrets, isi `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET` (nilai sudah digenerate, ada di riwayat chat — tidak diulang di sini demi keamanan). Sengaja tidak diisi otomatis oleh asisten supaya secret tidak lewat log tool-call.
- [ ] **PUSH-6 Jadwalkan pg_cron → send-push** Setelah PUSH-5 selesai, jalankan `select cron.schedule('send_push_every_5min', '*/5 * * * *', $$select net.http_post(url:='<function-url>', headers:=jsonb_build_object('x-cron-secret','<CRON_SECRET>'))$$);` — juga butuh user (supaya secret tidak lewat asisten).
- [x] **PUSH-7 FE subscribe flow** — selesai di sisi FE (lihat FE_Tasks Sprint N PUSH-FE-1/2): tombol Aktifkan/Nonaktifkan di Settings, status berdasarkan subscription aktual, upsert/delete ke `push_subscriptions`. End-to-end baru jalan setelah PUSH-5/6 (aksi user).

## Sprint N — Google Calendar sync (selesai 2026-07-17)

- [x] **GCAL-1 OAuth Client Google** — selesai oleh user: Client ID + Secret terpasang di env Vercel (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`), redirect URI final `https://zen-workspace-psi.vercel.app/api/auth/google/callback`.
- [x] **GCAL-2 Tabel google_calendar_tokens** — migrasi `google_calendar_sync`: token per user (RLS owner-only, hanya diakses route handler server) + kolom `tasks.google_event_id`.
- [x] **GCAL-3 Route OAuth** — `/api/auth/google/start` (redirect consent + state cookie) & `/api/auth/google/callback` (verifikasi state, tukar code, simpan token, redirect ke Settings dengan feedback).
- [x] **GCAL-4 Sinkronisasi task→event** — `/api/gcal/sync-task` dipanggil FE fire-and-forget setelah task ber-due dibuat/diubah: buat/update event (durasi 30 menit, timezone Asia/Jakarta), hapus event saat due dihapus/task done/dropped; mapping di `tasks.google_event_id`.
- [x] **GCAL-5 Refresh token handling** — `ensureFreshToken()` refresh otomatis dengan margin 60 detik, token baru disimpan kembali.

---

## Konvensi

- Semua waktu `timestamptz`. Tanggal murni `date`. Batas hari dihitung `Asia/Jakarta`.
- Field status/tipe pakai `text` + CHECK, bukan enum native.
- Tiap tabel punya `created_at`, `updated_at` + trigger `set_updated_at`.
- Semua tabel enable RLS dengan policy tunggal: `using (user_id = auth.uid()) with check (user_id = auth.uid())`.
- View pakai `with (security_invoker = true)`.

---

## Sprint 0 — Foundation (FND)

- [x] **FND-1 Repo + project** Next.js App Router + TS + Tailwind + shadcn, repo baru. Cek: app jalan lokal.
- [x] **FND-2 Supabase project baru** Terpisah dari tim. Simpan URL + anon key + service key di env server. Cek: koneksi berhasil.
- [ ] **FND-3 Netlify site baru** Deploy target terpisah. Cek: deploy kosong sukses.
- [x] **FND-4 Auth + profiles** Supabase Auth single user. Tabel `profiles(id uuid pk references auth.users, name text, timezone text default 'Asia/Jakarta', created_at, updated_at)`. Buat profil saat user dibuat. Cek: login jalan.
- [x] **FND-5 Trigger updated_at** `set_updated_at()` + pasang ke semua tabel. Cek: update mengubah updated_at.
- [x] **FND-6 Util timezone** `jakarta_date(ts timestamptz) returns date`. Cek: konversi WIB benar.

---

## Sprint 1 — Projects + Tasks (DATA)

- [x] **DATA-1 Tabel projects**
```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  name text not null,
  type text not null default 'brand' check (type in ('brand','content','learning','personal')),
  color text,
  sort_order integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_user on public.projects(user_id);
```
Cek: insert jalan.

- [x] **DATA-2 Seed 8 project** ngajigaes.id, Labbaika, Alaikahabibi, Shaleeha Journey, MediaPondok Jatim, PauseProject.id, Ngonten Kopi, Belajar AI. Cek: 8 baris.

- [x] **DATA-2b Buat/edit project manual (bug ditemukan user, diperbaiki)** Spek awal cuma asumsikan 8 project tetap dari seed — ternyata tidak ada jalur bikin project baru sama sekali di FE. Ditambahkan: insert langsung via `projects` table (RLS sudah cukup, tidak perlu RPC baru) dari dialog FE baru. Cek: project baru muncul di sidebar tanpa refresh.

- [x] **DATA-3 Tabel tasks** `project_id` null berarti Inbox.
```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  title text not null,
  notes text,
  link text,
  image_path text,
  status text not null default 'todo' check (status in ('todo','doing','done','dropped')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_at timestamptz,
  is_focus_today boolean not null default false,
  source text not null default 'manual' check (source in ('manual','inbox','recurring')),
  recurring_rule_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_user on public.tasks(user_id);
create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_due on public.tasks(due_at);
create index idx_tasks_focus on public.tasks(is_focus_today) where is_focus_today;
create index idx_tasks_inbox on public.tasks(user_id) where project_id is null;
```
Cek: insert task dengan dan tanpa project.

- [x] **DATA-3b Storage bucket attachments** Bucket privat `attachments` (Supabase Storage), path `{user_id}/tasks/{task_id}/...` dan `{user_id}/ideas/{idea_id}/...`. Policy: hanya owner (`auth.uid()` = folder pertama path) yang boleh read/write. `tasks.image_path` dan (nanti) `ideas.image_path` menyimpan path ini, bukan base64. Cek: upload lalu signed URL berhasil, user lain 403.

- [x] **DATA-4 View tasks_view** overdue flag, security_invoker.
```sql
create view public.tasks_view with (security_invoker = true) as
select t.*, (t.due_at < now() and t.status not in ('done','dropped')) as is_overdue
from public.tasks t;
```
Cek: task lewat due ber-flag true.

- [x] **DATA-5 RLS projects + tasks** policy tunggal user_id = auth.uid(). Cek: query tanpa auth kosong.

- [x] **DATA-6 Guard Top 3 fokus** Batasi `is_focus_today = true` maksimal 3 per user via trigger before insert/update. Cek: menandai fokus ke-4 ditolak.

---

## Sprint 2 — Today + Attention (RPC)

- [x] **RPC-1 get_today(p_project uuid default null)** Kembalikan task dari `tasks_view` yang: due hari ini WIB, atau overdue, atau is_focus_today, status todo/doing. Filter project jika diberikan. Cek: hasil cocok data uji tengah malam WIB.
- [x] **RPC-2 get_attention()** Kembalikan hitungan: overdue, due_today, recurring_today, checkins_due. Dipakai panel Butuh Perhatian dan digest. Cek: angka benar.
- [x] **RPC-3 get_project_stats()** Per project: open, due_today, overdue. Cek: cocok manual count.
- [x] **RPC-4 get_urgent()** Panel Urgent (beda dari Butuh Perhatian): kembalikan dua grup task — (a) overdue (`due_at < today start WIB`, status bukan done/dropped), (b) high-priority-due-today (due hari ini WIB, `priority='high'`, tidak overdue). Tiap baris pakai bentuk `tasks_view` (title, project, due, priority, dst). Cek: task yang sama tidak dobel muncul di kedua grup.

---

## Sprint 3 — Inbox

- [x] **INBOX-1 Query inbox** Select tasks where project_id is null. Cek: item tanpa project muncul.
- [x] **INBOX-2 Triage update** Update task set project_id, due_at, priority, source='manual'. Cek: item pindah dari Inbox ke project.

---

## Sprint 4 — Recurring engine (JOB)

- [x] **JOB-1 Tabel recurring_rules**
```sql
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  title_template text not null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  weekdays smallint[] ,            -- 0=Minggu..6=Sabtu, untuk weekly hari tertentu
  day_of_month smallint,           -- untuk monthly
  time_of_day time,                -- jam due, opsional
  is_active boolean not null default true,
  last_generated_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
Cek: insert aturan jalan.

- [x] **JOB-2 FK recurring di tasks** `alter table tasks add constraint fk_recurring foreign key (recurring_rule_id) references recurring_rules(id)`. Cek: relasi valid.

- [x] **JOB-3 Fungsi generate_recurring_instances()** Untuk tiap rule aktif yang jatuh hari ini WIB (daily; weekly jika weekday hari ini ada di weekdays; monthly jika day_of_month = tanggal hari ini) dan `last_generated_date` bukan hari ini: insert satu task (source recurring, recurring_rule_id, due_at = hari ini + time_of_day WIB), set last_generated_date. Idempoten via guard last_generated_date. Cek: jalan dua kali sehari sama tidak dobel.

- [x] **JOB-4 Jadwalkan via pg_cron** Aktifkan extension pg_cron, jadwalkan `generate_recurring_instances()` tiap hari sekitar 00:05 WIB. Cek: instance muncul otomatis keesokan hari.

- [x] **JOB-5 Unique guard instance** `create unique index on tasks(recurring_rule_id, (jakarta_date(due_at))) where recurring_rule_id is not null`. Cek: instance ganda untuk hari sama ditolak.

---

## Sprint 5 — Reminders + Digest (JOB)

- [x] **REM-1 Tabel reminders**
```sql
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('task','metric','digest')),
  target_id uuid,
  remind_at timestamptz not null,
  channel text not null default 'inapp' check (channel in ('inapp')),
  status text not null default 'pending' check (status in ('pending','sent','done','dismissed')),
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_reminders_due on public.reminders(remind_at, status);
```
Cek: insert jalan.

- [x] **REM-2 RLS reminders** user_id = auth.uid(). Cek: terisolasi.
- [x] **REM-3 RPC get_pending_reminders()** Kembalikan reminders status pending dengan remind_at <= now(), plus `title` dan `sub` hasil render server-side (join ke task/metric by target_id untuk target_type task/metric, ringkasan attention untuk target_type digest) sehingga notification center FE tinggal tampilkan tanpa logic tambahan. Dipakai in-app dan nanti Hermes. Cek: hanya yang jatuh tempo muncul, title/sub terisi sesuai target_type.
- [x] **REM-4 Dismiss reminder** Update status dismissed/done. Cek: hilang dari pending.
- [x] **REM-5 Fungsi generate_morning_digest()** Insert satu reminder target_type digest, remind_at jam pagi WIB, payload hasil get_attention(). Cek: reminder digest muncul tiap pagi.
- [x] **REM-6 Jadwalkan digest** pg_cron harian pagi WIB. Cek: digest otomatis.

Catatan Hermes: struktur `reminders` + `get_pending_reminders()` sudah cukup untuk nanti dibaca orchestrator eksternal dan diteruskan ke WhatsApp/Telegram tanpa ubah skema.

---

## Sprint 6 — Metrics + Check-in (DATA)

- [x] **MET-1 Tabel metrics**
```sql
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  name text not null,
  unit text,
  type text not null default 'boolean' check (type in ('number','boolean')),
  schedule_type text not null default 'daily' check (schedule_type in ('daily','specific_days')),
  weekdays smallint[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
Cek: insert jalan.

- [x] **MET-2 Tabel metric_checkins** unique(metric_id, checkin_date).
```sql
create table public.metric_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  metric_id uuid not null references public.metrics(id) on delete cascade,
  checkin_date date not null,
  value_number numeric,
  value_bool boolean,
  note text,
  created_at timestamptz not null default now(),
  unique (metric_id, checkin_date)
);
```
Cek: check-in ganda per hari ditolak.

- [x] **MET-3 RLS metrics + checkins** user_id = auth.uid(). Cek: terisolasi.
- [x] **MET-4 Reminder metrik** Saat metrik dibuat dengan jadwal, buat reminder harian/hari tertentu (target_type metric). Bisa lewat generate job harian yang cek metrik jatuh hari ini. Cek: prompt check-in muncul sesuai jadwal.
- [x] **MET-5 RPC metric_streak(metric_id)** Hitung streak berjalan dari checkin berturut sesuai jadwal metrik. Cek: streak benar termasuk saat ada bolong.

---

## Sprint 7 — Weekly Review

- [x] **WR-1 Tabel weekly_reviews** unique(user_id, project_id, period_start, period_end), project_id null = gabungan.
```sql
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  period_start date not null,
  period_end date not null,
  done_summary text,
  missed_summary text,
  carry_over text,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, period_start, period_end)
);
```
Cek: insert jalan.

- [x] **WR-2 RPC weekly_counts(p_start, p_end, p_project)** Hitung task done vs meleset (overdue belum done) pada rentang, minggu Senin-Minggu WIB. Cek: angka cocok.
- [x] **WR-3 RLS weekly_reviews** user_id = auth.uid(). Cek: terisolasi.

---

## Sprint 8 — Kalender internal

- [x] **CAL-1 RPC tasks_in_range(p_start, p_end, p_project)** Task ber-due dalam rentang untuk view kalender. Cek: cocok.
- [x] **CAL-2 (v1.1) GCal push satu arah** — selesai via Sprint N GCAL-1 s/d GCAL-5 di atas.

---

## Sprint K — Ideation (DATA, RPC)

Fitur baru dari revisi FE: catatan ide mentah, terpisah dari task, dengan riwayat versi manual dan alur convert-to-task yang memindahkan (bukan menyalin) isi ide ke task baru.

- [x] **IDEA-1 Tabel ideas**
```sql
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  title text not null,
  body text,
  link text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ideas_user on public.ideas(user_id);
create index idx_ideas_project on public.ideas(project_id);
```
Cek: insert idea dengan dan tanpa project.

- [x] **IDEA-2 Tabel idea_history** Snapshot manual (bukan trigger otomatis) — user klik "Simpan versi" untuk menyimpan title/body saat itu sebelum lanjut edit.
```sql
create table public.idea_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);
create index idx_idea_history_idea on public.idea_history(idea_id, created_at desc);
```
Cek: insert history jalan, urut created_at desc benar.

- [x] **IDEA-3 RLS ideas + idea_history** policy tunggal user_id = auth.uid(). Cek: terisolasi.
- [x] **IDEA-4 RPC save_idea_version(p_idea_id)** Insert baris idea_history dari state ideas saat ini (title, body), dipanggil sebelum idea diedit lebih lanjut. Cek: riwayat bertambah tanpa mengubah baris ideas.
- [x] **IDEA-5 RPC convert_idea_to_task(p_idea_id, p_status_default 'todo')** Dalam satu transaksi: buat task baru dari idea (title, notes = gabungan body+link, project_id, image_path ikut pindah), lalu hapus baris ideas (idea_history ikut terhapus via cascade). Cek: idea hilang, task baru muncul dengan isi yang benar, gagal di tengah tidak menyisakan state parsial.

---

## Testing (TEST)

Semua dijalankan 2026-07-09 langsung terhadap database production `zen-dashboard` (satu-satunya environment; data uji dibersihkan setelah selesai).

- [x] **TEST-1 Migrasi urut** 19 migrasi lokal semua terapply urut tanpa error (remote punya 2 ekstra: `app_secrets_table` yang dibuat lalu di-drop — netral).
- [x] **TEST-2 RLS** Role `anon`: 0 baris di projects/tasks/ideas/metrics/reminders/push_subscriptions. Authenticated user asli: lihat 8 project miliknya. Authenticated dengan UUID lain: 0 baris.
- [x] **TEST-3 Recurring idempoten** Rule daily uji, `generate_recurring_instances()` dipanggil 2x → tetap 1 instance.
- [x] **TEST-4 Timezone** `jakarta_date`: 00:30 WIB hari ini → jatuh hari ini; 23:30 WIB kemarin → jatuh kemarin.
- [x] **TEST-5 Top 3 guard** Insert 3 task fokus sukses; ke-4 ditolak trigger `guard_focus_today()` dengan pesan "Top 3 fokus sudah penuh".
- [x] **TEST-6 Streak** Check-in hari 0,1 lalu bolong hari 2, lanjut hari 3,4 → `metric_streak()` = 2 (bolong memutus dengan benar).
- [x] **TEST-7 Digest** `generate_morning_digest()` menghasilkan payload {overdue:3, due_today:2, recurring_today:1, checkins_due:0} — persis sama dengan `get_attention()` saat itu.
- [x] **TEST-8 Urgent tanpa duplikat** Task high-priority yang juga overdue hanya muncul di grup `overdue`, tidak dobel di `high_today`.
- [x] **TEST-9 Convert idea→task atomik** Kegagalan diinjeksi via trigger saat insert task di tengah `convert_idea_to_task` → seluruhnya rollback (idea utuh, tidak ada task setengah jadi). Happy path: task terbentuk, idea terhapus (dipindah, bukan disalin).
- [x] **TEST-10 Storage isolation** Diuji di level RLS `storage.objects` (bukan 2 akun nyata): user B tidak melihat objek folder user A (select = 0) dan insert ke folder user A ditolak RLS; user A melihat objek sendiri. Signed URL hanya bisa diminta klien yang lolos policy select, jadi tercakup.

---

## Blocker

Tidak ada blocker keputusan tersisa. Semua default sudah disetujui. Prasyarat operasional: pg_cron aktif di project Supabase (Sprint 4-5), bucket Storage `attachments` dibuat sebelum Sprint 1 (DATA-3b) karena tasks.image_path dan ideas.image_path merujuk ke situ.

Ditunda ke v1.1 (bukan blocker v1): push notification sungguhan (service worker + push subscription + VAPID) — mockup FE saat ini baru placeholder client-side `Notification` API, belum ada alur subscribe nyata yang perlu didukung skema.
