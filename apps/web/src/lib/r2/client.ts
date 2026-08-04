// Client S3-compatible untuk Cloudflare R2. SERVER-ONLY — env di sini tidak
// pernah boleh diekspos ke bundle client (tidak ada prefix NEXT_PUBLIC_).
import { AwsClient } from "aws4fetch";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET = process.env.R2_BUCKET || "zen-media";
export const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || "";

export function r2Configured(): boolean {
  return !!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
}

export function r2Endpoint(): string {
  return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

let cachedClient: AwsClient | null = null;

/** aws4fetch AwsClient, region "auto" (syarat R2), path-style implisit lewat endpoint di atas. */
export function r2Client(): AwsClient {
  if (!r2Configured()) {
    throw new Error("R2 belum dikonfigurasi — isi R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY di env.");
  }
  if (!cachedClient) {
    cachedClient = new AwsClient({
      accessKeyId: ACCESS_KEY_ID!,
      secretAccessKey: SECRET_ACCESS_KEY!,
      service: "s3",
      region: "auto",
    });
  }
  return cachedClient;
}

export function r2ObjectUrl(key: string): string {
  return `${r2Endpoint()}/${R2_BUCKET}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

/** Upload objek langsung ke R2 lewat PUT ber-signature SigV4. */
export async function r2PutObject(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  const client = r2Client();
  const res = await client.fetch(r2ObjectUrl(key), {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) {
    throw new Error(`R2 upload gagal: ${res.status} ${await res.text().catch(() => "")}`);
  }
}

/** Presigned GET URL (default 1 jam) — dibuat via query-signing, tanpa request nyata ke R2. */
export async function r2SignedGetUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const client = r2Client();
  const url = new URL(r2ObjectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  const signed = await client.sign(
    new Request(url, { method: "GET" }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

/**
 * Cek apakah objek ada di R2 (HEAD ber-signature). Dipakai untuk membedakan
 * path lama Supabase Storage dari path baru R2 — keduanya berformat identik
 * ({user_id}/{kind}/{timestamp}-{filename}) sehingga tidak bisa dibedakan
 * dari bentuk string saja.
 */
export async function r2ObjectExists(key: string): Promise<boolean> {
  const client = r2Client();
  const res = await client.fetch(r2ObjectUrl(key), { method: "HEAD" });
  return res.ok;
}
