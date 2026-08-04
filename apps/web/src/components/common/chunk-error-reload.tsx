"use client";

import { useEffect } from "react";

const RELOAD_GUARD_KEY = "zen.chunkReloadedAt";
const GUARD_WINDOW_MS = 10_000;

function looksLikeStaleChunk(message: string | undefined | null): boolean {
  if (!message) return false;
  return /loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
    message,
  );
}

/**
 * Setelah tiap deploy baru, tab yang sudah lama terbuka (termasuk PWA yang
 * jarang ditutup) masih memegang referensi ke chunk JS versi lama yang sudah
 * digantikan di server → ChunkLoadError saat pindah halaman. Tombol "Coba
 * lagi" di error.tsx TIDAK menolong di kasus ini karena cuma me-render ulang
 * React tree, bukan reload — bundle usangnya tetap sama. Reload paksa sekali
 * (dengan guard biar tidak infinite loop) adalah satu-satunya perbaikan.
 */
export function ChunkErrorReload() {
  useEffect(() => {
    const reloadOnce = () => {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
      if (Date.now() - last < GUARD_WINDOW_MS) return; // sudah dicoba baru-baru ini, jangan loop
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      if (looksLikeStaleChunk(e.message) || looksLikeStaleChunk(e.error?.message)) reloadOnce();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
      if (looksLikeStaleChunk(msg)) reloadOnce();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
