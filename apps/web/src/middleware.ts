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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
