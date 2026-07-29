"use client";

import { useState } from "react";

type Props = {
  src: string;
};

export function HeroBannerImage({ src }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="block h-auto w-full"
      fetchPriority="high"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
