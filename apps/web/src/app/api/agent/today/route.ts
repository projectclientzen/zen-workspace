// Hermes: daftar task "hari ini" (due hari ini WIB / overdue / Top 3).
import { NextRequest, NextResponse } from "next/server";
import { agentContext, wibTodayRange } from "@/lib/agent/server";

export async function GET(request: NextRequest) {
  const ctx = await agentContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, uid } = ctx;
  const { start, end } = wibTodayRange();

  const { data, error } = await supabase
    .from("tasks_view")
    .select("id, title, notes, link, status, priority, due_at, is_focus_today, is_overdue, project_id, source")
    .eq("user_id", uid)
    .in("status", ["todo", "doing"])
    .or(`is_overdue.eq.true,is_focus_today.eq.true,and(due_at.gte.${start},due_at.lt.${end})`)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tasks: data });
}
