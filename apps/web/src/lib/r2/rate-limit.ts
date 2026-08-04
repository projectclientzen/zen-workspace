// Rate limit sederhana per user, in-memory. Caveat: reset tiap cold start
// serverless (tidak persisten lintas instance) — cukup untuk single-user app,
// bukan pertahanan utama.
const WINDOW_MS = 60 * 60 * 1000; // 1 jam
const MAX_UPLOADS_PER_WINDOW = 20;

const hits = new Map<string, number[]>();

export function checkUploadRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_UPLOADS_PER_WINDOW) {
    hits.set(userId, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(userId, timestamps);
  return true;
}
