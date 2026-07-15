"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type Lang = "id" | "en";

const STORAGE_THEME = "zen.theme";
const STORAGE_LANG = "zen.lang";

/** Kamus UI. Sumber teks tetap Indonesia; en = terjemahan. */
const DICT = {
  settings: { id: "Pengaturan", en: "Settings" },
  appearance: { id: "Tampilan", en: "Appearance" },
  theme: { id: "Tema", en: "Theme" },
  light: { id: "Terang", en: "Light" },
  dark: { id: "Gelap", en: "Dark" },
  language: { id: "Bahasa", en: "Language" },
  manage_projects: { id: "Kelola project", en: "Manage projects" },
  add_project: { id: "+ Tambah project", en: "+ Add project" },
  archive: { id: "Arsipkan", en: "Archive" },
  activate: { id: "Aktifkan", en: "Activate" },
  no_projects: { id: "Belum ada project.", en: "No projects yet." },
  recurring_rules: { id: "Rutinitas", en: "Routines" },
  add_rule: { id: "+ Tambah rutinitas", en: "+ Add routine" },
  rule_saved: { id: "Rutinitas tersimpan ✓", en: "Routine saved ✓" },
  no_rules: { id: "Belum ada rutinitas.", en: "No routines yet." },
  title_template: { id: "Judul rutinitas", en: "Routine title" },
  no_project: { id: "Tanpa project", en: "No project" },
  daily: { id: "Harian", en: "Daily" },
  weekly: { id: "Mingguan", en: "Weekly" },
  monthly: { id: "Bulanan", en: "Monthly" },
  day_of_month: { id: "Tanggal (1-31)", en: "Day of month (1-31)" },
  push_title: { id: "Push notification", en: "Push notifications" },
  push_desc: {
    id: "Izinkan notifikasi untuk reminder & digest pagi. Reminder selalu tampil in-app juga.",
    en: "Allow notifications for reminders & the morning digest. Reminders always show in-app too.",
  },
  enable: { id: "Aktifkan", en: "Enable" },
  disable: { id: "Nonaktifkan", en: "Disable" },
  processing: { id: "Memproses…", en: "Processing…" },
  send_test: { id: "Kirim tes", en: "Send test" },
  push_active: { id: "Aktif ✓", en: "Active ✓" },
  push_granted: { id: "Izin diberikan — belum berlangganan.", en: "Permission granted — not subscribed yet." },
  push_denied: {
    id: "Diblokir browser — reminder tetap in-app.",
    en: "Browser blocked it — reminders still show in-app.",
  },
  push_unsupported: { id: "Browser tidak mendukung.", en: "Browser not supported." },
  push_inactive: { id: "Belum aktif", en: "Not active" },
  account: { id: "Akun", en: "Account" },
  sign_out: { id: "Keluar", en: "Sign out" },
} as const;

export type DictKey = keyof typeof DICT;

interface PrefsValue {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
}

const PrefsContext = createContext<PrefsValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_THEME) as Theme | null;
    const storedLang = localStorage.getItem(STORAGE_LANG) as Lang | null;
    if (storedTheme === "dark" || storedTheme === "light") {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    }
    if (storedLang === "id" || storedLang === "en") {
      setLangState(storedLang);
      document.documentElement.lang = storedLang;
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_THEME, t);
    applyTheme(t);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_LANG, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: DictKey) => DICT[key][lang], [lang]);

  return (
    <PrefsContext.Provider value={{ theme, lang, setTheme, setLang, t }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs harus dipakai di dalam PrefsProvider");
  return ctx;
}

/** Script inline anti-flash: terapkan tema tersimpan sebelum paint pertama. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${STORAGE_THEME}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
