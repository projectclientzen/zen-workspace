// GCAL-3: selesaikan consent flow — tukar code jadi token, simpan server-side.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailFromIdToken, exchangeCode } from "@/lib/google/calendar";

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/settings", request.nextUrl.origin);
  const fail = (reason: string) => {
    settingsUrl.searchParams.set("gcal", `error:${reason}`);
    return NextResponse.redirect(settingsUrl);
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("gcal_oauth_state")?.value;
  if (!code) return fail("no_code");
  if (!state || state !== cookieState) return fail("bad_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("not_logged_in");

  try {
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    if (!tokens.refresh_token) return fail("no_refresh_token");

    const { error } = await supabase.from("google_calendar_tokens").upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      google_email: emailFromIdToken(tokens.id_token),
    });
    if (error) throw error;

    settingsUrl.searchParams.set("gcal", "connected");
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete("gcal_oauth_state");
    return res;
  } catch (err) {
    console.error("gcal callback:", err);
    return fail("exchange_failed");
  }
}
