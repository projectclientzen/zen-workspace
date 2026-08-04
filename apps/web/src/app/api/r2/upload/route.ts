// Upload attachment ke Cloudflare R2. Auth wajib (Supabase session cookie);
// R2 credentials tidak pernah menyentuh client — hanya dipakai di sini.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { r2PutObject } from "@/lib/r2/client";
import { checkUploadRateLimit } from "@/lib/r2/rate-limit";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_KINDS = new Set(["tasks", "ideas"]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  if (!checkUploadRateLimit(user.id)) {
    return NextResponse.json({ error: "Terlalu banyak upload — coba lagi nanti." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Body harus multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const kind = form.get("kind");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Field 'file' wajib diisi" }, { status: 400 });
  }
  if (typeof kind !== "string" || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "Field 'kind' harus 'tasks' atau 'ideas'" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Tipe file tidak didukung — hanya jpeg/png/webp/gif" },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File maksimal 10MB" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${kind}/${Date.now()}-${safeName}`;

  try {
    const buffer = await file.arrayBuffer();
    await r2PutObject(path, buffer, file.type);
  } catch (err) {
    console.error("r2 upload:", err);
    return NextResponse.json({ error: "Upload ke R2 gagal" }, { status: 502 });
  }

  return NextResponse.json({ path });
}
