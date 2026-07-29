import type { ReactElement } from "react";

type IconProps = {
  className?: string;
};

const iconClass = "h-7 w-7";

function SkincareIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M9 3h6l1 4v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V7l1-4z" strokeLinejoin="round" />
      <path d="M9 7h6" strokeLinecap="round" />
      <circle cx="12" cy="14" r="2" />
    </svg>
  );
}

function MakeupIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M8 20h8" strokeLinecap="round" />
      <path d="M10 20V8l2-4 2 4v12" strokeLinejoin="round" />
      <path d="M10 8h4" strokeLinecap="round" />
    </svg>
  );
}

function MaskPackIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M5 8c0-2 2.5-4 7-4s7 2 7 4v8c0 2-2.5 4-7 4s-7-2-7-4V8z" strokeLinejoin="round" />
      <ellipse cx="9.5" cy="11" rx="1" ry="1.5" />
      <ellipse cx="14.5" cy="11" rx="1" ry="1.5" />
      <path d="M10 15c.7.5 1.5.75 2 .75s1.3-.25 2-.75" strokeLinecap="round" />
    </svg>
  );
}

function SuncareIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function HaircareIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M8 4c0 3 1.5 5 4 5s4-2 4-5" strokeLinecap="round" />
      <path d="M12 9v3" strokeLinecap="round" />
      <rect x="9" y="12" width="6" height="8" rx="1" strokeLinejoin="round" />
      <path d="M10 15h4" strokeLinecap="round" />
    </svg>
  );
}

function BodycareIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M9 3h6v4H9V3z" strokeLinejoin="round" />
      <path d="M8 7h8v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V7z" strokeLinejoin="round" />
      <path d="M10 11h4M10 15h4" strokeLinecap="round" />
    </svg>
  );
}

function DefaultCategoryIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" strokeLinejoin="round" />
      <path d="M8 12h8M12 8v8" strokeLinecap="round" />
    </svg>
  );
}

type IconComponent = (props: IconProps) => ReactElement;

const ICON_BY_SLUG: Record<string, IconComponent> = {
  skincare: SkincareIcon,
  makeup: MakeupIcon,
  "mask-pack": MaskPackIcon,
  suncare: SuncareIcon,
  haircare: HaircareIcon,
  bodycare: BodycareIcon,
  "body-care": BodycareIcon,
  "tools-accessories": DefaultCategoryIcon,
  nail: MakeupIcon,
  set: DefaultCategoryIcon,
  promotion: DefaultCategoryIcon,
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICON_BY_SLUG[slug] ?? DefaultCategoryIcon;
  return <Icon className={className} />;
}

function DownArrowIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export { DownArrowIcon };
