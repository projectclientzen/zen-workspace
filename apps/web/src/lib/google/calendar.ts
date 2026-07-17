// Helper server-only untuk Google Calendar sync (GCAL-4/5).
// Jangan pernah diimpor dari komponen client — token tidak boleh ke browser.
import type { SupabaseClient } from "@supabase/supabase-js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface GoogleTokens {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  google_email: string | null;
}

export function googleAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events openid email",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Tukar code gagal: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  };
}

/** Ambil email dari id_token (JWT) tanpa verifikasi — hanya untuk tampilan status. */
export function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

/** GCAL-5: refresh access token bila kedaluwarsa (margin 60 detik). */
export async function ensureFreshToken(
  supabase: SupabaseClient,
  tokens: GoogleTokens,
): Promise<string> {
  if (new Date(tokens.token_expiry).getTime() - 60_000 > Date.now()) {
    return tokens.access_token;
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Refresh token gagal: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  await supabase
    .from("google_calendar_tokens")
    .update({
      access_token: data.access_token,
      token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("user_id", tokens.user_id);
  return data.access_token;
}

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  link: string | null;
  status: string;
  due_at: string | null;
  google_event_id: string | null;
}

/**
 * GCAL-4: sinkronkan satu task ke Google Calendar (satu arah).
 * - due_at ada & task aktif -> buat/update event (durasi 30 menit).
 * - due_at dihapus atau task done/dropped -> hapus event.
 */
export async function syncTaskToCalendar(
  supabase: SupabaseClient,
  accessToken: string,
  task: TaskRow,
): Promise<"created" | "updated" | "deleted" | "skipped"> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const shouldHaveEvent = !!task.due_at && task.status !== "done" && task.status !== "dropped";

  if (!shouldHaveEvent) {
    if (!task.google_event_id) return "skipped";
    const res = await fetch(`${EVENTS_URL}/${task.google_event_id}`, {
      method: "DELETE",
      headers,
    });
    // 404/410 = event sudah tidak ada di Google, tetap bersihkan mapping
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`Hapus event gagal: ${res.status}`);
    }
    await supabase.from("tasks").update({ google_event_id: null }).eq("id", task.id);
    return "deleted";
  }

  const start = new Date(task.due_at!);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const body = JSON.stringify({
    summary: task.title,
    description: [task.notes, task.link].filter(Boolean).join("\n\n") || undefined,
    start: { dateTime: start.toISOString(), timeZone: "Asia/Jakarta" },
    end: { dateTime: end.toISOString(), timeZone: "Asia/Jakarta" },
  });

  if (task.google_event_id) {
    const res = await fetch(`${EVENTS_URL}/${task.google_event_id}`, {
      method: "PATCH",
      headers,
      body,
    });
    if (res.ok) return "updated";
    // Event dihapus manual di Google -> buat ulang di bawah
    if (res.status !== 404 && res.status !== 410) {
      throw new Error(`Update event gagal: ${res.status} ${await res.text()}`);
    }
  }

  const res = await fetch(EVENTS_URL, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`Buat event gagal: ${res.status} ${await res.text()}`);
  const event = (await res.json()) as { id: string };
  await supabase.from("tasks").update({ google_event_id: event.id }).eq("id", task.id);
  return "created";
}
