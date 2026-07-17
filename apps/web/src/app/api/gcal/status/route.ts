// GCAL-FE-2: status koneksi Google Calendar user saat ini.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false }, { status: 401 });

  const { data } = await supabase
    .from("google_calendar_tokens")
    .select("google_email")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    connected: !!data,
    email: data?.google_email ?? null,
  });
}
