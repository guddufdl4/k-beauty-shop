import { BrandLogo } from "@/components/store/brand-logo";
import { Link } from "@/i18n/navigation";
import { buildBrandHref } from "@/lib/store/brand-url";
import type { BrandDirectoryItem } from "@/lib/supabase/brand-hub";

type Props = {
  brand: BrandDirectoryItem;
  viewBrandLabel: string;
};

export function OrderBrandCard({ brand, viewBrandLabel }: Props) {
  return (
    <Link
      href={buildBrandHref(brand.slug)}
      aria-label={viewBrandLabel}
      className="flex h-24 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-center shadow-sm transition-colors hover:border-accent hover:bg-accent-soft/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <BrandLogo name={brand.displayName} src={brand.logoUrl} />
    </Link>
  );
}
