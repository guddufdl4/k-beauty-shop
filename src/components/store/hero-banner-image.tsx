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
      className="block h-auto min-h-[280px] w-full object-cover sm:min-h-[320px] lg:min-h-[380px]"
      fetchPriority="high"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}