// Hermes: buat task baru. Body: { title, notes?, link?, priority?, due_at?, project_name? }
// project_name di-resolve ke project aktif dengan nama paling cocok (case-insensitive).
import { NextRequest, NextResponse } from "next/server";
import { agentContext } from "@/lib/agent/server";

export async function POST(request: NextRequest) {
  const ctx = await agentContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, uid } = ctx;

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    notes?: string;
    link?: string;
    priority?: "low" | "medium" | "high";
    due_at?: string;
    project_name?: string;
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, error: "title wajib" }, { status: 400 });
  }

  let project_id: string | null = null;
  if (body.project_name) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", uid)
      .eq("is_active", true)
      .ilike("name", `%${body.project_name}%`)
      .limit(1)
      .maybeSingle();
    if (!project) {
      return NextResponse.json(
        { ok: false, error: `project '${body.project_name}' tidak ditemukan` },
        { status: 404 },
      );
    }
    project_id = project.id;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: uid,
      title: body.title.trim(),
      notes: body.notes ?? null,
      link: body.link ?? null,
      priority: body.priority ?? "medium",
      due_at: body.due_at ?? null,
      project_id,
      source: project_id ? "manual" : "inbox",
    })
    .select("id, title, due_at, project_id, source")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, task: data }, { status: 201 });
}
