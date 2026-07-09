"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProjectFormDialog } from "@/components/layout/project-form-dialog";
import { useAppState } from "@/lib/app-state";
import { createClient } from "@/lib/supabase/client";
import type { RecurringFrequency } from "@/lib/types";

const NONE = "__none__";
const WEEKDAY_LABEL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

type PushStatus = "idle" | "granted" | "subscribed" | "denied" | "unsupported";

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
      icon: "/icons/icon-192.png",
    });
  };

  return { status, loading, enable, disable, sendTest };
}

export default function SettingsPage() {
  const { dataset, addRule, toggleRule, updateProject, pushToast, signOut } = useAppState();
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const push = usePushNotification();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(NONE);
  const [frequency, setFrequency] = useState<RecurringFrequency>("daily");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [time, setTime] = useState("09:00");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addRule({
      title_template: trimmed,
      project_id: projectId === NONE ? null : projectId,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : null,
      day_of_month: frequency === "monthly" ? Number(dayOfMonth) : null,
      time_of_day: time,
    });
    pushToast("Aturan recurring tersimpan.");
    setTitle("");
    setWeekdays([]);
  };

  return (
    <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-7">
      <div className="font-serif text-2xl font-medium">Settings</div>

      <Card className="mt-5 gap-3 p-4">
        <div className="text-[13px] font-bold">Recurring rules</div>
        <div className="flex flex-col gap-2.5">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title template" />
          <div className="grid grid-cols-3 gap-2">
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? NONE)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Tanpa project</SelectItem>
                {dataset.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={frequency} onValueChange={(v) => setFrequency((v ?? "daily") as RecurringFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
              </SelectContent>
            </Select>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          {frequency === "weekly" && (
            <div className="flex gap-1.5">
              {WEEKDAY_LABEL.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setWeekdays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]))
                  }
                  className={`flex-1 rounded-md border py-1.5 text-[11px] font-semibold ${
                    weekdays.includes(idx)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {frequency === "monthly" && (
            <Input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              placeholder="Tanggal (1-31)"
            />
          )}

          <Button onClick={submit}>+ Tambah aturan</Button>
        </div>

        <div className="mt-1 flex flex-col gap-1">
          {dataset.recurringRules.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 border-t border-border py-2.5 first:border-t-0">
              <span className="text-[13px] text-primary">↻</span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold">{r.title_template}</div>
                <div className="text-[10.5px] text-muted-foreground">
                  {r.frequency}
                  {r.frequency === "weekly" && r.weekdays && ` · ${r.weekdays.map((d) => WEEKDAY_LABEL[d]).join(", ")}`}
                  {r.frequency === "monthly" && r.day_of_month && ` · tanggal ${r.day_of_month}`}
                  {r.time_of_day && ` · ${r.time_of_day}`}
                </div>
              </div>
              <Switch checked={r.is_active} onCheckedChange={() => toggleRule(r.id)} />
            </div>
          ))}
          {dataset.recurringRules.length === 0 && (
            <div className="py-4 text-center text-[12px] text-muted-foreground">Belum ada aturan recurring.</div>
          )}
        </div>
      </Card>

      <Card className="mt-3.5 gap-2 p-4">
        <div className="flex items-center">
          <span className="text-[13px] font-bold">Project</span>
          <Button size="sm" className="ml-auto" onClick={() => setProjectDialogOpen(true)}>
            + Project baru
          </Button>
        </div>
        <div className="mt-1 flex flex-col gap-1">
          {dataset.projects.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 border-t border-border py-2.5 first:border-t-0">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: p.color ?? "#8A857A" }} />
              <Input
                value={p.name}
                onChange={(e) => updateProject(p.id, { name: e.target.value })}
                className="h-8 flex-1 border-transparent bg-transparent text-[12.5px] font-semibold shadow-none focus-visible:border-border focus-visible:bg-background"
              />
              <span className="flex-none text-[10.5px] uppercase tracking-wide text-muted-foreground">{p.type}</span>
              <Switch
                checked={p.is_active}
                onCheckedChange={(v) => updateProject(p.id, { is_active: v })}
                title="Aktif"
              />
            </div>
          ))}
          {dataset.projects.length === 0 && (
            <div className="py-4 text-center text-[12px] text-muted-foreground">Belum ada project.</div>
          )}
        </div>
      </Card>

      <Card className="mt-3.5 gap-3 p-4">
        <div className="text-[13px] font-bold">Push Notification</div>
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          Izinkan notifikasi untuk reminder &amp; digest pagi. Reminder selalu tampil in-app juga.
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {(push.status === "idle" || push.status === "denied" || push.status === "granted") && (
            <Button size="sm" onClick={push.enable} disabled={push.loading || push.status === "denied"}>
              {push.loading ? "Memproses…" : "Aktifkan"}
            </Button>
          )}
          {push.status === "subscribed" && (
            <>
              <Button size="sm" variant="outline" onClick={push.sendTest}>Kirim tes</Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={push.disable} disabled={push.loading}>
                {push.loading ? "Memproses…" : "Nonaktifkan"}
              </Button>
            </>
          )}
          <span className={`text-[11px] font-semibold ${
            push.status === "subscribed" ? "text-primary" :
            push.status === "denied" ? "text-destructive" : "text-muted-foreground"
          }`}>
            {push.status === "subscribed" ? "Aktif ✓" :
             push.status === "granted" ? "Izin diberikan — belum berlangganan." :
             push.status === "denied" ? "Diblokir browser — reminder tetap in-app." :
             push.status === "unsupported" ? "Browser tidak mendukung." : "Belum aktif"}
          </span>
        </div>
      </Card>

      <Card className="mt-3.5 gap-2 p-4">
        <div className="text-[13px] font-bold">Akun</div>
        <Button variant="outline" className="w-fit text-destructive" onClick={signOut}>
          Keluar
        </Button>
      </Card>

      <ProjectFormDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
    </div>
  );
}
