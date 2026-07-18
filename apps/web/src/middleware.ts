import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // API agen eksternal (Hermes) pakai x-agent-key, bukan sesi cookie —
  // jangan redirect ke /login. Validasi key terjadi di route handler.
  if (request.nextUrl.pathname.startsWith("/api/agent")) {
    return;
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Kecualikan aset statis + file PWA (manifest.json & sw.js WAJIB bisa
    // diakses tanpa login — kalau kena redirect, install PWA & push gagal).
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
