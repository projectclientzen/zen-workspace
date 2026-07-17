// GCAL-4: sinkronkan satu task ke Google Calendar. Dipanggil FE
// fire-and-forget setelah task ber-due dibuat/diubah. No-op bila
// user belum menghubungkan Google Calendar.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureFreshToken, syncTaskToCalendar, type GoogleTokens } from "@/lib/google/calendar";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { taskId } = (await request.json().catch(() => ({}))) as { taskId?: string };
  if (!taskId) return NextResponse.json({ ok: false, error: "taskId wajib" }, { status: 400 });

  const { data: tokens } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<GoogleTokens>();
  if (!tokens) return NextResponse.json({ ok: true, result: "not_connected" });

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, notes, link, status, due_at, google_event_id")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!task) return NextResponse.json({ ok: false, error: "task tidak ditemukan" }, { status: 404 });

  try {
    const accessToken = await ensureFreshToken(supabase, tokens);
    const result = await syncTaskToCalendar(supabase, accessToken, task);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("gcal sync:", err);
    return NextResponse.json({ ok: false, error: "sync gagal" }, { status: 502 });
  }
}
