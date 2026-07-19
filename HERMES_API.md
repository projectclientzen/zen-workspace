# Zen ↔ Hermes — Agent API

REST API untuk orchestrator eksternal (Hermes) membaca dan menulis data Zen Dashboard.
Base URL: `https://zen-workspace-psi.vercel.app`

## Autentikasi

Semua request wajib membawa header:

```
x-agent-key: <AGENT_API_KEY>
```

Dua environment variable harus diset di **Vercel** (Project zen-workspace → Settings → Environment Variables → Production):

| Var | Isi | Cara dapat |
|---|---|---|
| `AGENT_API_KEY` | Kunci rahasia bebas (sarankan `openssl rand -hex 32`) | Buat sendiri; nilai yang sama dipakai Hermes di header `x-agent-key` |
| `SUPABASE_SECRET_KEY` | Secret/service-role key project `zen-dashboard` | Supabase Dashboard → Project Settings → API Keys → `service_role` (atau "secret key" `sb_secret_...`) |

Setelah keduanya diisi, **redeploy** sekali agar terbaca.

## Endpoints

Semua tanggal ISO UTC; "hari ini" dihitung timezone Asia/Jakarta (WIB).

### `GET /api/agent/today`
Task untuk hari ini: due hari ini WIB, overdue, atau Top 3.
```json
{ "ok": true, "tasks": [{ "id", "title", "notes", "link", "status", "priority", "due_at", "is_focus_today", "is_overdue", "project_id", "source" }] }
```

### `GET /api/agent/urgent`
Daftar aksi mendesak, dua grup tanpa duplikat.
```json
{ "ok": true, "overdue": [...], "high_today": [...] }
```

### `GET /api/agent/attention`
Ringkasan angka untuk digest/briefing.
```json
{ "ok": true, "attention": { "overdue": 3, "due_today": 2, "recurring_today": 1 } }
```

### `GET /api/agent/reminders`
Reminder pending hari ini (WIB) yang sudah jatuh tempo — cocok diteruskan ke WhatsApp/Telegram.
`payload` digest berisi `{overdue, due_today, recurring_today, checkins_due}`.
```json
{ "ok": true, "reminders": [{ "id", "target_type", "target_id", "remind_at", "status", "payload" }] }
```

### `GET /api/agent/routines`
Pantau pekerjaan rutin: definisi rutinitas + instance yang jatuh hari ini (WIB) beserta status.
```json
{
  "ok": true,
  "summary": { "total_today": 4, "done_today": 1, "pending_today": 3 },
  "today": [{ "id", "title", "status", "done", "priority", "due_at", "is_overdue", "recurring_rule_id" }],
  "rules": [{ "id", "title_template", "priority", "frequency", "weekdays", "day_of_month", "time_of_day", "is_active", "project_id" }]
}
```
Pola pakai Hermes: polling pagi/sore → laporkan rutinitas yang belum selesai (`pending_today`) ke WhatsApp.

### `POST /api/agent/task`
Buat task. `project_name` opsional, dicocokkan longgar ke project aktif (404 kalau tidak ketemu); tanpa project → masuk Inbox.
```json
{ "title": "Follow up vendor visa", "notes": "...", "priority": "high", "due_at": "2026-07-18T09:00:00Z", "project_name": "Labbaika" }
```
→ `201 { "ok": true, "task": { "id", "title", "due_at", "project_id", "source" } }`

### `POST /api/agent/task/complete`
Tandai selesai via `{ "id": "..." }` atau `{ "title": "vendor visa" }` (pencocokan longgar di task terbuka; kalau ambigu → `409` dengan daftar `candidates`).
```json
{ "ok": true, "task": { "id", "title", "status": "done", "completed_at" } }
```

## Contoh (curl)

```bash
BASE=https://zen-workspace-psi.vercel.app
KEY=$AGENT_API_KEY

curl -s "$BASE/api/agent/today" -H "x-agent-key: $KEY"
curl -s "$BASE/api/agent/task" -H "x-agent-key: $KEY" -H "Content-Type: application/json" \
  -d '{"title":"Tes dari Hermes","priority":"high"}'
curl -s "$BASE/api/agent/task/complete" -H "x-agent-key: $KEY" -H "Content-Type: application/json" \
  -d '{"title":"Tes dari Hermes"}'
```

## Error

| Kode | Arti |
|---|---|
| 401 | `x-agent-key` salah/kosong |
| 400 | body tidak valid (mis. `title` kosong) |
| 404 | task/project tidak ditemukan |
| 409 | pencocokan judul ambigu (lihat `candidates`) |
| 500 | env belum lengkap atau error database |

## Catatan desain

- App single-user: semua endpoint beroperasi atas data pemilik (profil satu-satunya).
- Task yang dibuat lewat API ini **belum** memicu sync Google Calendar (sync dipicu dari FE); kalau perlu, tambahkan panggilan `POST /api/gcal/sync-task` internal — tinggal minta.
- Pola pemakaian yang direncanakan: Hermes polling `GET /api/agent/reminders` (mis. tiap 5 menit) → kirim ke WhatsApp/Telegram → tandai lewat dismiss di app, atau cukup andalkan auto-expire harian.
