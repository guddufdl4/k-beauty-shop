"use client";

import Image from "next/image";
import { useState } from "react";

export function BrandLogo({ name, src }: { name: string; src: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <span className="line-clamp-2 text-center text-lg font-semibold tracking-tight text-zinc-800 sm:text-xl">{name}</span>;
  }
  if (src.endsWith("/jdew-verified.png")) {
    // Display the original wordmark in the supplier's product artwork without recreating it.
    return <span className="relative block h-12 w-[180px] max-w-full overflow-hidden rounded-md">
      <Image src={src} alt="" width={1000} height={1106} unoptimized
        style={{ position: "absolute", right: -10, bottom: -14, width: 650, height: "auto", maxWidth: "none" }}
        onError={() => setFailedSrc(src)} />
    </span>;
  }
  return (
    <Image
      src={src}
      alt=""
      width={180}
      height={56}
      sizes="(max-width: 640px) 140px, 180px"
      className="h-12 w-full max-w-[180px] object-contain"
      onError={() => setFailedSrc(src)}
    />
  );
}
