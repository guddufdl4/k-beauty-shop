"use client";

import { useState } from "react";

import { Link } from "@/i18n/navigation";

type ObjectPosition = "left" | "center" | "right";

type Props = {
  src: string;
  href: string;
  priority?: boolean;
  objectPosition?: ObjectPosition;
  label: string;
};

const objectPositionClass: Record<ObjectPosition, string> = {
  left: "object-left",
  center: "object-center",
  right: "object-right",
};

export function HeroBannerImage({
  src,
  href,
  priority = false,
  objectPosition = "center",
  label,
}: Props) {
  const [failed, setFailed] = useState(false);

  const imageContent = !failed ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt=""
      width={1200}
      height={750}
      sizes="(max-width: 1024px) 100vw, 50vw"
      className={`absolute inset-0 block h-full w-full object-contain ${objectPositionClass[objectPosition]} lg:object-center`}
      fetchPriority={priority ? "high" : "auto"}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className="absolute inset-0 bg-[#f4f2ef]"
      role="img"
      aria-label="Banner image unavailable"
    />
  );

  return (
    <Link
      href={href}
      aria-label={label}
      className="relative block aspect-[16/10] w-full overflow-hidden bg-[#f4f2ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:aspect-[16/9] lg:aspect-[4/3]"
    >
      {imageContent}
    </Link>
  );
}
