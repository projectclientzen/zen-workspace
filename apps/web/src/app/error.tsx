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

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="font-serif text-xl italic text-destructive">Ada yang tidak beres.</div>
      <div className="max-w-[360px] text-[12.5px] text-muted-foreground">
        Halaman ini gagal dimuat. Coba lagi — kalau berulang, catat langkah yang tadi dilakukan.
      </div>
      <Button variant="outline" onClick={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
