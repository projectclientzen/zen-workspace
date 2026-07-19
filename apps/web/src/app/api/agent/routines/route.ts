// Hermes: pantau pekerjaan rutin. Kembalikan definisi rutinitas (recurring
// rules) + instance yang jatuh hari ini (WIB) beserta status selesai/belum.
import { NextRequest, NextResponse } from "next/server";
import { agentContext, wibTodayRange } from "@/lib/agent/server";

export async function GET(request: NextRequest) {
  const ctx = await agentContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, uid } = ctx;
  const { start, end } = wibTodayRange();

  const [rules, instances] = await Promise.all([
    supabase
      .from("recurring_rules")
      .select("id, title_template, priority, frequency, weekdays, day_of_month, time_of_day, is_active, project_id")
      .eq("user_id", uid)
      .order("is_active", { ascending: false }),
    supabase
      .from("tasks_view")
      .select("id, title, status, priority, due_at, project_id, recurring_rule_id, is_overdue")
      .eq("user_id", uid)
      .eq("source", "recurring")
      .neq("status", "dropped")
      .gte("due_at", start)
      .lt("due_at", end)
      .order("due_at", { ascending: true }),
  ]);

  if (rules.error) return NextResponse.json({ ok: false, error: rules.error.message }, { status: 500 });
  if (instances.error)
    return NextResponse.json({ ok: false, error: instances.error.message }, { status: 500 });

  const today = instances.data ?? [];
  const done = today.filter((t) => t.status === "done").length;

  return NextResponse.json({
    ok: true,
    summary: { total_today: today.length, done_today: done, pending_today: today.length - done },
    today: today.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      done: t.status === "done",
      priority: t.priority,
      due_at: t.due_at,
      is_overdue: t.is_overdue,
      recurring_rule_id: t.recurring_rule_id,
    })),
    rules: rules.data,
  });
}
