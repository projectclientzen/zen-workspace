# FE Tasks — Personal Productivity Dashboard (Zen)

Frontend untuk dibangun di Claude Design pakai mock data, sebelum backend disambung. Fokus utama desain: satu prioritas hari ini, bukan delapan brand paralel.

Stack: Next.js App Router + Tailwind + shadcn + Recharts (ringan) + React Hook Form + Zod. Single user, tanpa role, tanpa masking finansial.

Track: FND, UI komponen, PAGE, STATE.

---

## Prinsip UI yang mengikat

1. Layar default = Today lintas brand + Top 3. Melihat semua tercampur hanya di Overview.
2. Focus Mode mengunci satu project, sisanya hilang. Ini penawar utama kebiasaan lompat.
3. Capture cepat: Inbox satu ketikan (dan capture sheet mobile Task/Idea sekaligus).
4. Overdue terlihat tapi tidak membanjiri. Banyak overdue tampil sebagai hitungan, bukan daftar panjang.
5. Ukuran ringan: completion percent + streak, tanpa skor menghakimi.
6. Urgent ≠ Butuh Perhatian: Urgent adalah daftar aksi (overdue + high-priority-hari-ini) untuk dikerjakan satu-satu; Butuh Perhatian tetap ringkasan angka di Overview.
7. Ideation adalah tempat parkir ide mentah, terpisah dari task — konversi ke task memindahkan isi (bukan menyalin), ide lama hilang setelah dikonversi.

---

## Data Contract (mock target, wajib cocok dengan BE)

Semua tanggal string ISO UTC, FE tampilkan WIB.

```ts
export type ProjectType = "brand" | "content" | "learning" | "personal";
export interface Project {
  id: string; name: string; type: ProjectType;
  color: string | null; is_active: boolean; sort_order: number;
}

export type TaskStatus = "todo" | "doing" | "done" | "dropped";
export type Priority = "low" | "medium" | "high";
export interface Task {
  id: string;
  project_id: string | null;       // null = Inbox
  project_name: string | null;
  title: string; notes: string | null;
  link: string | null;             // v1.1 field
  image_path: string | null;       // path storage bucket "attachments", FE resolve ke signed URL
  status: TaskStatus; priority: Priority;
  due_at: string | null;
  is_focus_today: boolean;
  is_overdue: boolean;             // dari backend, WIB
  source: "manual" | "inbox" | "recurring";
  recurring_rule_id: string | null;
  completed_at: string | null;
}

export interface Idea {
  id: string;
  project_id: string | null;
  title: string; body: string | null;
  link: string | null;
  image_path: string | null;
  created_at: string;
}
export interface IdeaHistoryEntry {
  id: string; idea_id: string;
  title: string; body: string | null;
  created_at: string;
}

export interface UrgentGroup {
  kind: "overdue" | "high_today";
  tasks: Task[];
}

export interface RecurringRule {
  id: string; project_id: string | null;
  title_template: string; priority: Priority;
  frequency: "daily" | "weekly" | "monthly";
  weekdays: number[] | null;       // 0=Minggu..6=Sabtu
  day_of_month: number | null;
  time_of_day: string | null;      // "HH:mm"
  is_active: boolean;
}

export interface Reminder {
  id: string; target_type: "task" | "metric" | "digest";
  target_id: string | null; remind_at: string;
  status: "pending" | "sent" | "done" | "dismissed";
  payload: Record<string, unknown> | null;
  title: string;                   // dirender backend, siap tampil di notification center
  sub: string;                     // dirender backend
}

export interface Metric {
  id: string; project_id: string | null;
  name: string; unit: string | null;
  type: "number" | "boolean";
  schedule_type: "daily" | "specific_days";
  weekdays: number[] | null; is_active: boolean;
}
export interface MetricCheckin {
  id: string; metric_id: string; checkin_date: string;
  value_number: number | null; value_bool: boolean | null; note: string | null;
}

export interface AttentionSummary {
  overdue: number; due_today: number; recurring_today: number; checkins_due: number;
}
export interface ProjectStat {
  project_id: string; project_name: string;
  open: number; due_today: number; overdue: number;
}
export interface WeeklyReview {
  id: string; project_id: string | null;
  period_start: string; period_end: string;
  done_summary: string | null; missed_summary: string | null;
  carry_over: string | null; next_focus: string | null;
}
```

---

## Sprint A — Foundation (FND)

- [ ] **FND-1 Setup + design tokens** Warna, teks, radius, spacing. Satu warna aksen netral, warna per project dari `project.color`. Cek: konsisten.
- [ ] **FND-2 Layout shell** Sidebar kiri (Overview, lalu daftar project, lalu Inbox, Calendar, Weekly Review, Metrics, Settings). Top bar: tombol capture cepat + tombol Focus Mode. Cek: responsif desktop dan HP.
- [ ] **FND-3 Project switcher + scope state** State global project aktif. "All" untuk Overview. Memilih project menyempitkan seluruh konten. Cek: ganti project mengubah data yang tampil.
- [ ] **FND-4 Focus Mode** Toggle mengunci ke project aktif, menyembunyikan Overview dan project lain dari navigasi sampai dimatikan. Cek: saat aktif, hanya satu project terlihat.
- [ ] **FND-5 Mock dataset** `lib/mock/` untuk semua tipe, plus skenario kosong dan skenario overdue banyak. Cek: dua skenario tersedia.

---

## Sprint B — Overview (PAGE)

- [ ] **PAGE-B1 Panel Hari Ini** Task due hari ini + overdue + recurring hari ini, lintas project, urut prioritas. Badge project kecil. Cek: ikut mock terfilter.
- [ ] **PAGE-B2 Top 3 hari ini** Zona menonjol di atas, maksimal 3 task fokus. Tambah/lepas fokus. Tolak fokus ke-4 dengan pesan. Cek: batas 3 jalan.
- [ ] **PAGE-B3 Panel Butuh Perhatian** Dari AttentionSummary: overdue, due today, recurring today, checkin due. Klik menuju daftar terkait. Cek: angka dari mock.
- [ ] **PAGE-B4 Kartu per project** ProjectStat kompak: open, due today, overdue. Klik masuk project. Cek: 8 kartu.
- [ ] **PAGE-B5 Ringkasan streak** Streak metrik dan check-in jatuh hari ini. Cek: tampil.
- [ ] **PAGE-B6 Halaman/panel Urgent** Daftar UrgentGroup (overdue + high-priority-hari-ini), badge jumlah di nav. Beda dari Butuh Perhatian: ini daftar task nyata untuk dikerjakan, bukan cuma angka. Tombol aksi cepat per baris ("→ besok" untuk overdue, "★" untuk high-today). Cek: task tidak dobel antar grup, empty state saat tidak ada yang urgent.
- [ ] **PAGE-B7 Produktivitas + rhythm chart** Chart jam kerja estimasi (turunan dari task selesai per hari, bukan input manual) dan chart 14 hari jumlah task selesai. Cek: angka konsisten dengan mock completed_at.

---

## Sprint C — Task views (PAGE)

- [ ] **PAGE-C1 List view** Task project aktif, filter status/priority, urut due. Overdue ditandai. Cek: filter jalan.
- [ ] **PAGE-C2 Board view** Kolom todo/doing/done, drag antar kolom. Cek: kartu pindah.
- [ ] **PAGE-C3 Task form** Judul, catatan, link, gambar (upload ke bucket attachments), project, priority, due (tanggal+jam opsional), recurring opsional. Validasi Zod. Cek: buat dan edit jalan.
- [ ] **PAGE-C4 Task detail drawer** Semua field (termasuk link + gambar) + tombol tandai fokus + ubah status + hapus (soft delete jadi status dropped) + shortcut "→ besok" (mobile). Cek: aksi jalan.
- [ ] **PAGE-C5 Today view per project** Versi Today yang discope ke project aktif. Cek: hanya project itu.

---

## Sprint D — Inbox

- [ ] **PAGE-D1 Capture cepat** Input satu baris di top bar, Enter membuat task Inbox tanpa project. Cek: cepat, tanpa form penuh.
- [ ] **PAGE-D2 Inbox list + triage** Daftar item tanpa project, aksi tetapkan project/due/priority. Cek: item pindah keluar Inbox.
- [ ] **PAGE-D3 Capture sheet mobile (Task/Idea)** Bottom sheet dengan toggle Task ⟷ Idea, field lengkap (judul, catatan/body, link, gambar, project, priority + tanggal/jam khusus Task). Cek: submit Task masuk Inbox/task list, submit Idea masuk Ideation.

---

## Sprint E — Recurring

- [ ] **PAGE-E1 Kelola aturan recurring** Form: title template, project, frequency, hari tertentu (multi weekday), day of month, jam. Cek: aturan tersimpan di mock.
- [ ] **PAGE-E2 Tanda instance recurring** Task hasil recurring diberi ikon pembeda. Cek: terlihat beda dari task manual.

---

## Sprint F — Reminder in-app

- [ ] **PAGE-F1 Notification center** Daftar reminder pending dari get_pending_reminders (mock), tampilkan langsung `title`/`sub` yang sudah dirender backend. Badge jumlah. Cek: muncul saat remind_at lewat.
- [ ] **PAGE-F2 Toast reminder** Reminder jatuh tempo tampil sebagai toast. Dismiss mengubah status. Cek: dismiss menghilangkan.
- [ ] **PAGE-F3 Digest pagi** Reminder target digest membuka panel Butuh Perhatian. Cek: klik membuka ringkasan.

---

## Sprint G — Metrics + Check-in

- [ ] **PAGE-G1 Kelola metrik** Form: nama, project, tipe (angka/boolean), unit, jadwal (harian atau hari tertentu). Cek: metrik tersimpan.
- [ ] **PAGE-G2 Prompt check-in** Saat jadwal jatuh, kartu check-in: isi angka atau ya/tidak + catatan. Cek: satu check-in per hari.
- [ ] **PAGE-G3 Tampilan streak + riwayat** Streak berjalan dan riwayat check-in per metrik. Chart ringan. Cek: streak dari mock benar.
- [ ] **PAGE-G4 Produktivitas per brand** Gabungan completion percent task + streak metrik per project. Tanpa skor tunggal. Cek: tampil per project.

---

## Sprint H — Weekly Review

- [ ] **PAGE-H1 Pilih minggu + auto counts** Minggu Senin-Minggu. Hitungan done vs meleset terisi otomatis (mock). Cek: angka ikut minggu.
- [ ] **PAGE-H2 Form review ringan** done_summary, missed_summary, carry_over, next_focus. Per project dan gabungan. Cek: simpan dan buka lagi.

---

## Sprint I — Kalender internal

- [ ] **PAGE-I1 Calendar view** Bulan dan minggu, tampilkan task ber-due dan instance recurring. Cek: task muncul di tanggalnya WIB.
- [ ] **PAGE-I2 Klik hari** Buka daftar task hari itu, bisa buat task langsung dengan due terisi. Cek: jalan.

---

## Sprint K — Ideation

Fitur baru: parkir ide mentah terpisah dari task. Ide punya riwayat versi manual (snapshot title/body saat user klik "Simpan versi") dan bisa dikonversi jadi task — konversi memindahkan isi (body+link+gambar jadi task baru), ide lama dihapus dari daftar, bukan disalin.

- [ ] **PAGE-K1 Form buat ide** Judul, body bebas, link opsional, gambar opsional, assign project opsional. Cek: ide tersimpan di mock.
- [ ] **PAGE-K2 Grid/list ide + filter per project** Kartu ide: tanggal, gambar (jika ada), judul, cuplikan body, link, project badge. Filter chip per project + "Belum di-assign". Cek: filter jalan.
- [ ] **PAGE-K3 Detail/edit ide** Buka kartu → edit judul/body/link/gambar/project langsung (autosave). Tombol "Simpan versi" (push snapshot ke riwayat), tombol "→ Jadikan task" (konversi + hapus ide), tombol hapus ide. Cek: snapshot muncul di riwayat, konversi memindahkan ide ke task list dan ide hilang dari Ideation.
- [ ] **PAGE-K4 Riwayat versi** Daftar snapshot (tanggal, judul, body) di bawah detail ide, hanya muncul kalau ada riwayat. Cek: kosong tidak tampil section riwayat.

---

## Sprint J — Polish (STATE)

- [ ] **STATE-1 Tiga state** Loading skeleton, empty state ramah, error state di semua halaman. Cek: verifikasi tiap halaman.
- [ ] **STATE-2 Skenario overdue banyak** Overdue tampil sebagai hitungan + akses cepat, bukan daftar panjang. Cek: tidak membanjiri.
- [ ] **STATE-3 Mobile pass** Semua halaman nyaman dari HP. Cek: uji layar kecil.
- [ ] **STATE-4 Tanpa kunci rahasia** Tidak ada key Supabase atau pemanggilan API di kode FE tahap ini. Cek: bersih.

---

## Gerbang selesai FE

Semua halaman render dengan mock, Focus Mode dan Top 3 jalan, tiga state ada, capture cepat berfungsi, panel Urgent dan Ideation jalan dengan mock, tidak ada yang bergantung backend. Setelah ini, mock diganti query dan RPC yang return-nya sudah cocok dengan Data Contract, tanpa ubah komponen.

## Catatan tidak wajib v1

Push notification browser sungguhan (service worker + subscription) — di mock hanya placeholder `Notification` API lokal, tidak persist antar reload. Ditunda ke v1.1, tidak menghalangi gerbang selesai FE.
