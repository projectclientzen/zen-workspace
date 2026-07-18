// Edge Function: send-push
// Dipanggil pg_cron tiap beberapa menit (via pg_net) untuk mengirim Web Push
// asli ke HP/browser yang sudah subscribe, berdasarkan reminders yang pending
// dan belum di-push (reminders.pushed_at is null).
//
// Proteksi: bukan verify_jwt (dipanggil server-to-server oleh pg_cron, bukan
// user login), tapi cek header x-cron-secret cocok dengan CRON_SECRET.
// Secret VAPID_* dan CRON_SECRET dibaca dari tabel private.app_secrets
// (schema private, tanpa grant ke anon/authenticated — hanya service role
// yang bisa baca). Env Deno tetap dipakai sebagai override kalau diisi.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_CONTACT = Deno.env.get("VAPID_CONTACT_EMAIL") || "mailto:admin@example.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function loadSecrets(): Promise<Record<string, string>> {
  // Schema private tidak diekspos PostgREST — baca lewat RPC security definer
  // get_app_secrets() (execute hanya untuk service_role).
  const { data, error } = await admin.rpc("get_app_secrets");
  if (error) throw new Error(`gagal baca app_secrets: ${error.message}`);
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.key] = row.value;
  for (const k of ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "CRON_SECRET"]) {
    const env = Deno.env.get(k);
    if (env) out[k] = env;
  }
  return out;
}

const secretsPromise = loadSecrets();

Deno.serve(async (req: Request) => {
  let secrets: Record<string, string>;
  try {
    secrets = await secretsPromise;
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }

  if (secrets.CRON_SECRET) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== secrets.CRON_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }
  }
  if (!secrets.VAPID_PUBLIC_KEY || !secrets.VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID keys belum diisi" }), { status: 500 });
  }
  webpush.setVapidDetails(VAPID_CONTACT, secrets.VAPID_PUBLIC_KEY, secrets.VAPID_PRIVATE_KEY);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: reminders, error } = await supabase.rpc("get_reminders_to_push");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const r of reminders ?? []) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", r.user_id);

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: r.title, body: r.sub, url: "/" }),
        );
        sent++;
      } catch (err) {
        failed++;
        console.error("push failed", sub.endpoint, err);
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    await supabase.rpc("mark_reminder_pushed", { p_reminder_id: r.reminder_id });
  }

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
