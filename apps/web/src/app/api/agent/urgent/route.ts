// Hermes: daftar urgent — overdue + high-priority due hari ini (tanpa duplikat).
import { NextRequest, NextResponse } from "next/server";
import { agentContext, wibTodayRange } from "@/lib/agent/server";

export async function GET(request: NextRequest) {
  const ctx = await agentContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, uid } = ctx;
  const { start, end } = wibTodayRange();

  const { data, error } = await supabase
    .from("tasks_view")
    .select("id, title, status, priority, due_at, is_overdue, project_id")
    .eq("user_id", uid)
    .in("status", ["todo", "doing"])
    .or(`is_overdue.eq.true,and(priority.eq.high,due_at.gte.${start},due_at.lt.${end})`)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const overdue = (data ?? []).filter((t) => t.is_overdue);
  const highToday = (data ?? []).filter((t) => !t.is_overdue);
  return NextResponse.json({ ok: true, overdue, high_today: highToday });
}
