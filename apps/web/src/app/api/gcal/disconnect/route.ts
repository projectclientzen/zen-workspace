// GCAL-FE-2: putuskan koneksi — revoke token (best effort) + hapus baris.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data } = await supabase
    .from("google_calendar_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.refresh_token) {
    // Best effort — kalau gagal pun baris tetap dihapus.
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(data.refresh_token)}`, {
      method: "POST",
    }).catch(() => {});
  }

  await supabase.from("google_calendar_tokens").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
