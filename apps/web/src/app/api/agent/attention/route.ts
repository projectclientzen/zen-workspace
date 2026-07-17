// Hermes: ringkasan angka "Butuh Perhatian" (overdue, due today, recurring, check-in).
import { NextRequest, NextResponse } from "next/server";
import { agentContext, wibTodayRange } from "@/lib/agent/server";

export async function GET(request: NextRequest) {
  const ctx = await agentContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, uid } = ctx;
  const { start, end } = wibTodayRange();

  const [overdue, dueToday, recurringToday] = await Promise.all([
    supabase
      .from("tasks_view")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("is_overdue", true),
    supabase
      .from("tasks_view")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .in("status", ["todo", "doing"])
      .gte("due_at", start)
      .lt("due_at", end),
    supabase
      .from("tasks_view")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("source", "recurring")
      .gte("due_at", start)
      .lt("due_at", end),
  ]);

  return NextResponse.json({
    ok: true,
    attention: {
      overdue: overdue.count ?? 0,
      due_today: dueToday.count ?? 0,
      recurring_today: recurringToday.count ?? 0,
    },
  });
}
