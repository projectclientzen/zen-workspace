import { createClient } from "@/lib/supabase/client";

const BUCKET = "attachments";

/** Upload gambar ke bucket privat "attachments", path {user_id}/{kind}/{timestamp}-{filename}. */
export async function uploadAttachment(
  file: File,
  kind: "tasks" | "ideas",
): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${kind}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  return path;
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/** Resolve path storage jadi signed URL sementara (di-cache 50 menit, expiry asli 60 menit). */
export async function getSignedImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  // Data lama dari mock FE sebelum backend nyambung masih base64 data URL — tampilkan apa adanya.
  if (path.startsWith("data:")) return path;

  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) return null;

  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
