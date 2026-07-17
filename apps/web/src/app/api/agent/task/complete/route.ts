// Hermes: tandai task selesai. Body: { id } atau { title } (pencocokan longgar,
// hanya di task todo/doing — kalau ambigu, kembalikan kandidatnya).
import { NextRequest, NextResponse } from "next/server";
import { agentContext } from "@/lib/agent/server";

export async function POST(request: NextRequest) {
  const ctx = await agentContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, uid } = ctx;

  const body = (await request.json().catch(() => ({}))) as { id?: string; title?: string };
  let taskId = body.id ?? null;

  if (!taskId && body.title?.trim()) {
    const { data: matches } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("user_id", uid)
      .in("status", ["todo", "doing"])
      .ilike("title", `%${body.title.trim()}%`)
      .limit(5);
    if (!matches || matches.length === 0) {
      return NextResponse.json({ ok: false, error: "task tidak ditemukan" }, { status: 404 });
    }
    if (matches.length > 1) {
      return NextResponse.json(
        { ok: false, error: "ambigu — kirim id salah satu", candidates: matches },
        { status: 409 },
      );
    }
    taskId = matches[0].id;
  }
  if (!taskId) {
    return NextResponse.json({ ok: false, error: "id atau title wajib" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", uid)
    .select("id, title, status, completed_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, task: data });
}
