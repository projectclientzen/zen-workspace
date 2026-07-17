// GCAL-3: mulai consent flow Google.
import { NextRequest, NextResponse } from "next/server";
import { googleAuthUrl } from "@/lib/google/calendar";

export async function GET(request: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID belum diset" }, { status: 500 });
  }
  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(googleAuthUrl(redirectUri, state));
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
