// Presigned GET URL untuk attachment. Auth wajib; path harus milik user yang
// login (prefix {user_id}/...) supaya user A tak bisa minta URL milik B.
//
// Backward-compat: path lama (Supabase Storage) dan path baru (R2) berformat
// PERSIS sama — {user_id}/{kind}/{timestamp}-{filename} — jadi tidak bisa
// dibedakan dari bentuk string. Solusinya: cek dulu apakah objeknya ada di
// R2 (HEAD); kalau tidak ada (belum dimigrasikan / dibuat sebelum R2 aktif),
// fallback ke Supabase Storage createSignedUrl untuk path yang sama.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { r2Configured, r2ObjectExists, r2SignedGetUrl } from "@/lib/r2/client";

const SUPABASE_BUCKET = "attachments";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Query 'path' wajib diisi" }, { status: 400 });
  }
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Tidak berhak mengakses path ini" }, { status: 403 });
  }

  if (r2Configured()) {
    try {
      if (await r2ObjectExists(path)) {
        const url = await r2SignedGetUrl(path, 3600);
        return NextResponse.json({ url });
      }
    } catch (err) {
      console.error("r2 signed-url (cek R2):", err);
      // Lanjut ke fallback Supabase di bawah alih-alih gagal total.
    }
  }

  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(path, 3600);
  if (error || !data) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ url: data.signedUrl });
}
