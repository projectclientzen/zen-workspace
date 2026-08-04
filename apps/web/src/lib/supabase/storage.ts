/**
 * Upload gambar. Media baru masuk ke Cloudflare R2 lewat POST /api/r2/upload
 * (kredensial R2 tidak pernah ke client — hanya dipakai server-side di route
 * itu). Return path format {user_id}/{kind}/{timestamp}-{filename}, sama
 * persis dengan skema path Supabase lama supaya kompatibel di kedua sisi.
 */
export async function uploadAttachment(
  file: File,
  kind: "tasks" | "ideas",
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);

  const res = await fetch("/api/r2/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Upload gagal");
  return data.path as string;
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolve path storage jadi signed URL sementara (di-cache 50 menit, expiry
 * asli 60 menit).
 *  - "data:" → data URL lama dari mock FE, tampilkan apa adanya.
 *  - selain itu → lewat GET /api/r2/signed-url, yang di server-nya sendiri
 *    coba R2 dulu lalu fallback ke Supabase Storage untuk path lama (path
 *    lama & baru berformat identik, jadi tidak bisa dibedakan di client).
 */
export async function getSignedImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("data:")) return path;

  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const res = await fetch(`/api/r2/signed-url?path=${encodeURIComponent(path)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) return null;

  const url = data.url as string;
  signedUrlCache.set(path, { url, expiresAt: Date.now() + 50 * 60 * 1000 });
  return url;
}
