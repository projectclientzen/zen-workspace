// Fondasi API agen eksternal (Hermes): autentikasi API key + client Supabase
// service-role. Server-only — jangan diimpor dari komponen client.
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export function misconfigured(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 500 });
}

/** Validasi header x-agent-key terhadap env AGENT_API_KEY (timing-safe sederhana). */
export function checkAgentKey(request: NextRequest): boolean {
  const expected = process.env.AGENT_API_KEY;
  const got = request.headers.get("x-agent-key");
  if (!expected || !got || got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

/** Client service-role (bypass RLS) — butuh env SUPABASE_SECRET_KEY. */
export function adminClient(): SupabaseClient | null {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return null;
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { persistSession: false },
  });
}

/** App single-user: ambil id pemilik (profil satu-satunya). */
export async function ownerId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}

/** Rentang "hari ini" WIB dalam UTC ISO — untuk filter due_at. */
export function wibTodayRange() {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 3600_000);
  const y = wib.getUTCFullYear();
  const m = wib.getUTCMonth();
  const d = wib.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, -7, 0, 0)); // 00:00 WIB
  const end = new Date(Date.UTC(y, m, d, 17, 0, 0)); // 24:00 WIB
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Gerbang standar semua route agen: key valid + env lengkap + owner ada. */
export async function agentContext(request: NextRequest) {
  if (!checkAgentKey(request)) return { error: unauthorized() } as const;
  const supabase = adminClient();
  if (!supabase) return { error: misconfigured("SUPABASE_SECRET_KEY belum diset") } as const;
  const uid = await ownerId(supabase);
  if (!uid) return { error: misconfigured("profil pemilik tidak ditemukan") } as const;
  return { supabase, uid } as const;
}
