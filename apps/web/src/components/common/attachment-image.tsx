"use client";

import { useEffect, useState } from "react";
import { getSignedImageUrl } from "@/lib/supabase/storage";

/**
 * Render gambar dari path bucket Storage privat "attachments" (resolve jadi signed URL),
 * atau langsung tampilkan kalau masih data URL base64 (peninggalan sebelum upload asli terpasang).
 */
export function AttachmentImage({
  path,
  alt = "",
  className,
}: {
  path: string | null;
  alt?: string;
  className?: string;
}) {
  const isDataUrl = !!path && path.startsWith("data:");
  const needsSignedUrl = !!path && !isDataUrl;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!needsSignedUrl || !path) return;
    let cancelled = false;
    getSignedImageUrl(path).then((resolved) => {
      if (!cancelled) setSignedUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [path, needsSignedUrl]);

  const url = isDataUrl ? path : needsSignedUrl ? signedUrl : null;
  if (!url) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}
