// Hermes: reminder pending hari ini (WIB) — siap diteruskan ke WhatsApp/Telegram.
import { NextRequest, NextResponse } from "next/server";
import { agentContext, wibTodayRange } from "@/lib/agent/server";

export async function GET(request: NextRequest) {
  const ctx = await agentContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, uid } = ctx;
  const { start } = wibTodayRange();

  const { data, error } = await supabase
    .from("reminders")
    .select("id, target_type, target_id, remind_at, status, payload")
    .eq("user_id", uid)
    .eq("status", "pending")
    .gte("remind_at", start)
    .lte("remind_at", new Date().toISOString())
    .order("remind_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, reminders: data });
}
