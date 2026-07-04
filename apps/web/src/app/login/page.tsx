"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmSent(false);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || email } },
        });
        if (error) throw error;
        if (data.session) {
          // Konfirmasi email dimatikan di project ini — langsung ada sesi.
          router.replace("/");
          router.refresh();
        } else {
          // Konfirmasi email aktif — user harus klik link di email dulu sebelum bisa masuk.
          setConfirmSent(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk, coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[380px] gap-5 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-serif text-sm font-semibold text-primary-foreground">
            Z
          </div>
          <div className="font-serif text-lg font-semibold">
            zen<span className="text-[#C97B54]">.</span>
          </div>
        </div>
        <div>
          <div className="font-serif text-xl font-medium">
            {mode === "signin" ? "Masuk" : "Buat akun"}
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Dashboard produktivitas pribadi — single user.
          </p>
        </div>

        {confirmSent ? (
          <div className="rounded-lg bg-muted/60 p-3.5 text-[12.5px] leading-relaxed">
            Link konfirmasi sudah dikirim ke <span className="font-semibold">{email}</span>. Klik link
            di email itu, baru bisa masuk.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nama</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-[12px] text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Memproses…" : mode === "signin" ? "Masuk" : "Daftar"}
            </Button>
          </form>
        )}

        <button
          className="text-[12px] text-muted-foreground underline"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setConfirmSent(false);
            setError(null);
          }}
        >
          {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </Card>
    </div>
  );
}
