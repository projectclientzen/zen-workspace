"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // ChunkLoadError (bundle JS usang setelah deploy baru) tidak bisa
  // diperbaiki dengan reset() React — itu cuma render ulang, bukan reload,
  // jadi bundle usangnya tetap sama dan error berulang terus. Untuk kasus
  // ini satu-satunya jalan adalah reload penuh.
  const isStaleChunk = /loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
    error.message ?? "",
  );

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="font-serif text-xl italic text-destructive">Ada yang tidak beres.</div>
      <div className="max-w-[360px] text-[12.5px] text-muted-foreground">
        {isStaleChunk
          ? "Versi aplikasi di perangkat ini sudah usang (ada update baru). Muat ulang untuk memperbarui."
          : "Halaman ini gagal dimuat. Coba lagi — kalau berulang, catat langkah yang tadi dilakukan."}
      </div>
      <Button
        variant="outline"
        onClick={() => (isStaleChunk ? window.location.reload() : reset())}
      >
        {isStaleChunk ? "Muat ulang" : "Coba lagi"}
      </Button>
    </div>
  );
}
