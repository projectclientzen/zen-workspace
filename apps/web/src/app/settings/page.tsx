"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProjectFormDialog } from "@/components/layout/project-form-dialog";
import { useAppState } from "@/lib/app-state";
import { usePrefs, type Lang, type Theme } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/client";

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type PushStatus = "idle" | "granted" | "subscribed" | "denied" | "unsupported";

type GcalState =
  | { phase: "loading" }
  | { phase: "disconnected" }
  | { phase: "connected"; email: string | null };

function useGoogleCalendar(pushToast: (msg: string) => void) {
  const [state, setState] = useState<GcalState>({ phase: "loading" });

  const load = () =>
    fetch("/api/gcal/status")
      .then((r) => r.json())
      .then((d) =>
        setState(d.connected ? { phase: "connected", email: d.email } : { phase: "disconnected" }),
      )
      .catch(() => setState({ phase: "disconnected" }));

  useEffect(() => {
    load();
    // Feedback hasil redirect OAuth (?gcal=connected / error:*)
    const flag = new URLSearchParams(window.location.search).get("gcal");
    if (flag === "connected") pushToast("Google Calendar terhubung ✓");
    else if (flag?.startsWith("error:")) pushToast(`Gagal menghubungkan Google (${flag.slice(6)}).`);
    if (flag) window.history.replaceState(null, "", "/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = async () => {
    await fetch("/api/gcal/disconnect", { method: "POST" }).catch(() => {});
    pushToast("Google Calendar diputuskan.");
    load();
  };

  return { state, disconnect };
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function usePushNotification() {
  const [status, setStatus] = useState<PushStatus>("idle");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      setStatus("granted");
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => { if (sub) setStatus("subscribed"); })
        .catch(() => {});
    }
  }, []);

  const enable = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) { setStatus("granted"); return; }

      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subJson = sub.toJSON();
        await supabase.from("push_subscriptions").upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: subJson.keys?.p256dh ?? "",
          auth: subJson.keys?.auth ?? "",
        }, { onConflict: "endpoint" });
      }
      setStatus("subscribed");
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const supabase = createClient();
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("granted");
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    if (status !== "granted" && status !== "subscribed") return;
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification("Zen · Test Notifikasi", {
      body: "Push notification aktif dan berjalan.",
      icon: "/icon-192.png",
    });
  };

  return { status, loading, enable, disable, sendTest };
}

export default function SettingsPage() {
  const { dataset, updateProject, pushToast, signOut } = useAppState();
  const { theme, lang, setTheme, setLang, t } = usePrefs();
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const push = usePushNotification();
  const gcal = useGoogleCalendar(pushToast);


  return (
    <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-7">
      <div className="font-serif text-2xl font-medium">{t("settings")}</div>

      <Card className="mt-5 gap-4 p-4">
        <div className="text-[13px] font-bold">{t("appearance")}</div>
        <div className="flex items-center gap-6">
          <span className="w-16 text-[12.5px] text-muted-foreground">{t("theme")}</span>
          <SegmentedToggle<Theme>
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: t("light") },
              { value: "dark", label: t("dark") },
            ]}
          />
        </div>
        <div className="flex items-center gap-6">
          <span className="w-16 text-[12.5px] text-muted-foreground">{t("language")}</span>
          <SegmentedToggle<Lang>
            value={lang}
            onChange={setLang}
            options={[
              { value: "id", label: "Indonesia" },
              { value: "en", label: "English" },
            ]}
          />
        </div>
      </Card>


      <Card className="mt-3.5 gap-2 p-4">
        <div className="flex items-center">
          <span className="text-[13px] font-bold">{t("manage_projects")}</span>
          <button
            className="ml-auto text-[12.5px] font-semibold text-primary hover:underline"
            onClick={() => setProjectDialogOpen(true)}
          >
            {t("add_project")}
          </button>
        </div>
        <div className="mt-1 flex flex-col gap-1">
          {dataset.projects.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 border-t border-border py-2.5 first:border-t-0">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: p.color ?? "#8A857A" }} />
              <Input
                value={p.name}
                onChange={(e) => updateProject(p.id, { name: e.target.value })}
                className={`h-8 w-auto min-w-0 flex-none field-sizing-content border-transparent bg-transparent text-[13.5px] font-semibold shadow-none focus-visible:border-border focus-visible:bg-background ${
                  p.is_active ? "" : "text-muted-foreground line-through"
                }`}
              />
              <span className="flex-none rounded-md border border-border px-2 py-0.5 text-[10.5px] text-muted-foreground">
                {p.type}
              </span>
              <button
                className="ml-auto flex-none text-[12px] font-semibold text-muted-foreground underline hover:text-foreground"
                onClick={() => updateProject(p.id, { is_active: !p.is_active })}
              >
                {p.is_active ? t("archive") : t("activate")}
              </button>
            </div>
          ))}
          {dataset.projects.length === 0 && (
            <div className="py-4 text-center text-[12px] text-muted-foreground">{t("no_projects")}</div>
          )}
        </div>
      </Card>

      <Card className="mt-3.5 gap-3 p-4">
        <div className="text-[13px] font-bold">{t("push_title")}</div>
        <div className="text-[11px] leading-relaxed text-muted-foreground">{t("push_desc")}</div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {(push.status === "idle" || push.status === "denied" || push.status === "granted") && (
            <Button size="sm" onClick={push.enable} disabled={push.loading || push.status === "denied"}>
              {push.loading ? t("processing") : t("enable")}
            </Button>
          )}
          {push.status === "subscribed" && (
            <>
              <Button size="sm" variant="outline" onClick={push.sendTest}>{t("send_test")}</Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={push.disable} disabled={push.loading}>
                {push.loading ? t("processing") : t("disable")}
              </Button>
            </>
          )}
          <span className={`text-[11px] font-semibold ${
            push.status === "subscribed" ? "text-primary" :
            push.status === "denied" ? "text-destructive" : "text-muted-foreground"
          }`}>
            {push.status === "subscribed" ? t("push_active") :
             push.status === "granted" ? t("push_granted") :
             push.status === "denied" ? t("push_denied") :
             push.status === "unsupported" ? t("push_unsupported") : t("push_inactive")}
          </span>
        </div>
      </Card>

      <Card className="mt-3.5 gap-3 p-4">
        <div className="text-[13px] font-bold">Google Calendar</div>
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          Task ber-due otomatis dibuatkan event di kalender utama Google Anda (satu arah).
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {gcal.state.phase === "loading" && (
            <span className="text-[11px] font-semibold text-muted-foreground">Memeriksa status…</span>
          )}
          {gcal.state.phase === "disconnected" && (
            <Button size="sm" onClick={() => (window.location.href = "/api/auth/google/start")}>
              Hubungkan Google Calendar
            </Button>
          )}
          {gcal.state.phase === "connected" && (
            <>
              <span className="text-[11px] font-semibold text-primary">
                Terhubung ✓{gcal.state.email ? ` — ${gcal.state.email}` : ""}
              </span>
              <Button size="sm" variant="outline" className="text-destructive" onClick={gcal.disconnect}>
                Putuskan
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card className="mt-3.5 gap-2 p-4">
        <div className="text-[13px] font-bold">{t("account")}</div>
        <Button variant="outline" className="w-fit text-destructive" onClick={signOut}>
          {t("sign_out")}
        </Button>
      </Card>

      <ProjectFormDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
    </div>
  );
}
