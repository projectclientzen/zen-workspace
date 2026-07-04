"use client";

import { useEffect } from "react";

/** Daftarkan service worker sekali di client — syarat PWA installable + prasyarat Web Push. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Gagal daftar service worker", err);
    });
  }, []);

  return null;
}
