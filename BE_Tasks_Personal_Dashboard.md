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

---

## Konvensi

- Semua waktu `timestamptz`. Tanggal murni `date`. Batas hari dihitung `Asia/Jakarta`.
- Field status/tipe pakai `text` + CHECK, bukan enum native.
- Tiap tabel punya `created_at`, `updated_at` + trigger `set_updated_at`.
- Semua tabel enable RLS dengan policy tunggal: `using (user_id = auth.uid()) with check (user_id = auth.uid())`.
- View pakai `with (security_invoker = true)`.

---

## Sprint 0 — Foundation (FND)

- [ ] **FND-1 Repo + project** Next.js App Router + TS + Tailwind + shadcn, repo baru. Cek: app jalan lokal.
- [ ] **FND-2 Supabase project baru** Terpisah dari tim. Simpan URL + anon key + service key di env server. Cek: koneksi berhasil.
- [ ] **FND-3 Netlify site baru** Deploy target terpisah. Cek: deploy kosong sukses.
- [ ] **FND-4 Auth + profiles** Supabase Auth single user. Tabel `profiles(id uuid pk references auth.users, name text, timezone text default 'Asia/Jakarta', created_at, updated_at)`. Buat profil saat user dibuat. Cek: login jalan.
- [ ] **FND-5 Trigger updated_at** `set_updated_at()` + pasang ke semua tabel. Cek: update mengubah updated_at.
- [ ] **FND-6 Util timezone** `jakarta_date(ts timestamptz) returns date`. Cek: konversi WIB benar.

---

## Sprint 1 — Projects + Tasks (DATA)

- [ ] **DATA-1 Tabel projects**
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

- [ ] **DATA-2 Seed 8 project** ngajigaes.id, Labbaika, Alaikahabibi, Shaleeha Journey, MediaPondok Jatim, PauseProject.id, Ngonten Kopi, Belajar AI. Cek: 8 baris.

- [ ] **DATA-3 Tabel tasks** `project_id` null berarti Inbox.
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

- [ ] **DATA-3b Storage bucket attachments** Bucket privat `attachments` (Supabase Storage), path `{user_id}/tasks/{task_id}/...` dan `{user_id}/ideas/{idea_id}/...`. Policy: hanya owner (`auth.uid()` = folder pertama path) yang boleh read/write. `tasks.image_path` dan (nanti) `ideas.image_path` menyimpan path ini, bukan base64. Cek: upload lalu signed URL berhasil, user lain 403.

- [ ] **DATA-4 View tasks_view** overdue flag, security_invoker.
```sql
create view public.tasks_view with (security_invoker = true) as
select t.*, (t.due_at < now() and t.status not in ('done','dropped')) as is_overdue
from public.tasks t;
```
Cek: task lewat due ber-flag true.

- [ ] **DATA-5 RLS projects + tasks** policy tunggal user_id = auth.uid(). Cek: query tanpa auth kosong.

- [ ] **DATA-6 Guard Top 3 fokus** Batasi `is_focus_today = true` maksimal 3 per user via trigger before insert/update. Cek: menandai fokus ke-4 ditolak.

---

## Sprint 2 — Today + Attention (RPC)

- [ ] **RPC-1 get_today(p_project uuid default null)** Kembalikan task dari `tasks_view` yang: due hari ini WIB, atau overdue, atau is_focus_today, status todo/doing. Filter project jika diberikan. Cek: hasil cocok data uji tengah malam WIB.
- [ ] **RPC-2 get_attention()** Kembalikan hitungan: overdue, due_today, recurring_today, checkins_due. Dipakai panel Butuh Perhatian dan digest. Cek: angka benar.
- [ ] **RPC-3 get_project_stats()** Per project: open, due_today, overdue. Cek: cocok manual count.
- [ ] **RPC-4 get_urgent()** Panel Urgent (beda dari Butuh Perhatian): kembalikan dua grup task — (a) overdue (`due_at < today start WIB`, status bukan done/dropped), (b) high-priority-due-today (due hari ini WIB, `priority='high'`, tidak overdue). Tiap baris pakai bentuk `tasks_view` (title, project, due, priority, dst). Cek: task yang sama tidak dobel muncul di kedua grup.

---

## Sprint 3 — Inbox

- [ ] **INBOX-1 Query inbox** Select tasks where project_id is null. Cek: item tanpa project muncul.
- [ ] **INBOX-2 Triage update** Update task set project_id, due_at, priority, source='manual'. Cek: item pindah dari Inbox ke project.

---

## Sprint 4 — Recurring engine (JOB)

- [ ] **JOB-1 Tabel recurring_rules**
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

- [ ] **JOB-2 FK recurring di tasks** `alter table tasks add constraint fk_recurring foreign key (recurring_rule_id) references recurring_rules(id)`. Cek: relasi valid.

- [ ] **JOB-3 Fungsi generate_recurring_instances()** Untuk tiap rule aktif yang jatuh hari ini WIB (daily; weekly jika weekday hari ini ada di weekdays; monthly jika day_of_month = tanggal hari ini) dan `last_generated_date` bukan hari ini: insert satu task (source recurring, recurring_rule_id, due_at = hari ini + time_of_day WIB), set last_generated_date. Idempoten via guard last_generated_date. Cek: jalan dua kali sehari sama tidak dobel.

- [ ] **JOB-4 Jadwalkan via pg_cron** Aktifkan extension pg_cron, jadwalkan `generate_recurring_instances()` tiap hari sekitar 00:05 WIB. Cek: instance muncul otomatis keesokan hari.

- [ ] **JOB-5 Unique guard instance** `create unique index on tasks(recurring_rule_id, (jakarta_date(due_at))) where recurring_rule_id is not null`. Cek: instance ganda untuk hari sama ditolak.

---

## Sprint 5 — Reminders + Digest (JOB)

- [ ] **REM-1 Tabel reminders**
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

- [ ] **REM-2 RLS reminders** user_id = auth.uid(). Cek: terisolasi.
- [ ] **REM-3 RPC get_pending_reminders()** Kembalikan reminders status pending dengan remind_at <= now(), plus `title` dan `sub` hasil render server-side (join ke task/metric by target_id untuk target_type task/metric, ringkasan attention untuk target_type digest) sehingga notification center FE tinggal tampilkan tanpa logic tambahan. Dipakai in-app dan nanti Hermes. Cek: hanya yang jatuh tempo muncul, title/sub terisi sesuai target_type.
- [ ] **REM-4 Dismiss reminder** Update status dismissed/done. Cek: hilang dari pending.
- [ ] **REM-5 Fungsi generate_morning_digest()** Insert satu reminder target_type digest, remind_at jam pagi WIB, payload hasil get_attention(). Cek: reminder digest muncul tiap pagi.
- [ ] **REM-6 Jadwalkan digest** pg_cron harian pagi WIB. Cek: digest otomatis.

Catatan Hermes: struktur `reminders` + `get_pending_reminders()` sudah cukup untuk nanti dibaca orchestrator eksternal dan diteruskan ke WhatsApp/Telegram tanpa ubah skema.

---

## Sprint 6 — Metrics + Check-in (DATA)

- [ ] **MET-1 Tabel metrics**
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

- [ ] **MET-2 Tabel metric_checkins** unique(metric_id, checkin_date).
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

- [ ] **MET-3 RLS metrics + checkins** user_id = auth.uid(). Cek: terisolasi.
- [ ] **MET-4 Reminder metrik** Saat metrik dibuat dengan jadwal, buat reminder harian/hari tertentu (target_type metric). Bisa lewat generate job harian yang cek metrik jatuh hari ini. Cek: prompt check-in muncul sesuai jadwal.
- [ ] **MET-5 RPC metric_streak(metric_id)** Hitung streak berjalan dari checkin berturut sesuai jadwal metrik. Cek: streak benar termasuk saat ada bolong.

---

## Sprint 7 — Weekly Review

- [ ] **WR-1 Tabel weekly_reviews** unique(user_id, project_id, period_start, period_end), project_id null = gabungan.
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

- [ ] **WR-2 RPC weekly_counts(p_start, p_end, p_project)** Hitung task done vs meleset (overdue belum done) pada rentang, minggu Senin-Minggu WIB. Cek: angka cocok.
- [ ] **WR-3 RLS weekly_reviews** user_id = auth.uid(). Cek: terisolasi.

---

## Sprint 8 — Kalender internal

- [ ] **CAL-1 RPC tasks_in_range(p_start, p_end, p_project)** Task ber-due dalam rentang untuk view kalender. Cek: cocok.
- [ ] **CAL-2 (v1.1) GCal push satu arah** OAuth Google, simpan token server-only, buat event GCal saat task ber-due dibuat/diubah. Ditunda sampai v1 stabil. Cek: task muncul di Google Calendar.

---

## Sprint K — Ideation (DATA, RPC)

Fitur baru dari revisi FE: catatan ide mentah, terpisah dari task, dengan riwayat versi manual dan alur convert-to-task yang memindahkan (bukan menyalin) isi ide ke task baru.

- [ ] **IDEA-1 Tabel ideas**
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

- [ ] **IDEA-2 Tabel idea_history** Snapshot manual (bukan trigger otomatis) — user klik "Simpan versi" untuk menyimpan title/body saat itu sebelum lanjut edit.
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

- [ ] **IDEA-3 RLS ideas + idea_history** policy tunggal user_id = auth.uid(). Cek: terisolasi.
- [ ] **IDEA-4 RPC save_idea_version(p_idea_id)** Insert baris idea_history dari state ideas saat ini (title, body), dipanggil sebelum idea diedit lebih lanjut. Cek: riwayat bertambah tanpa mengubah baris ideas.
- [ ] **IDEA-5 RPC convert_idea_to_task(p_idea_id, p_status_default 'todo')** Dalam satu transaksi: buat task baru dari idea (title, notes = gabungan body+link, project_id, image_path ikut pindah), lalu hapus baris ideas (idea_history ikut terhapus via cascade). Cek: idea hilang, task baru muncul dengan isi yang benar, gagal di tengah tidak menyisakan state parsial.

---

## Testing (TEST)

- [ ] **TEST-1 Migrasi urut** Jalankan semua migrasi di staging, urut dependensi (profiles, projects, tasks, ...). Cek: tanpa error.
- [ ] **TEST-2 RLS** Query tanpa sesi kosong, dengan sesi hanya data sendiri.
- [ ] **TEST-3 Recurring idempoten** Jalankan generate dua kali, tidak dobel.
- [ ] **TEST-4 Timezone** Uji due tengah malam WIB masuk hari benar.
- [ ] **TEST-5 Top 3 guard** Fokus ke-4 ditolak.
- [ ] **TEST-6 Streak** Uji streak dengan bolong.
- [ ] **TEST-7 Digest** Digest pagi berisi angka attention benar.
- [ ] **TEST-8 Urgent tanpa duplikat** Task overdue dan high-priority-hari-ini tidak muncul dobel di get_urgent().
- [ ] **TEST-9 Convert idea→task atomik** Simulasikan gagal di tengah convert_idea_to_task, pastikan tidak ada task setengah jadi atau idea hilang tanpa task terbentuk.
- [ ] **TEST-10 Storage isolation** User A tidak bisa akses signed URL folder attachments User B (khusus test ini butuh 2 akun uji sementara, meski app single-user di production).

---

## Blocker

Tidak ada blocker keputusan tersisa. Semua default sudah disetujui. Prasyarat operasional: pg_cron aktif di project Supabase (Sprint 4-5), bucket Storage `attachments` dibuat sebelum Sprint 1 (DATA-3b) karena tasks.image_path dan ideas.image_path merujuk ke situ.

Ditunda ke v1.1 (bukan blocker v1): push notification sungguhan (service worker + push subscription + VAPID) — mockup FE saat ini baru placeholder client-side `Notification` API, belum ada alur subscribe nyata yang perlu didukung skema.
