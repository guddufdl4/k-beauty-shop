import {
  BrandHubAvailableCategories,
  BrandHubWholesaleCta,
} from "@/components/store/brand-hub-seo-sections";

type BrandLink = {
  href: string;
  label: string;
};

type Props = {
  intro?: string;
  brandsLabel: string;
  brands: BrandLink[];
  needQuoteLabel: string;
  requestQuoteLabel: string;
};

export function CategoryLandingSeo({
  intro,
  brandsLabel,
  brands,
  needQuoteLabel,
  requestQuoteLabel,
}: Props) {
  const trimmedIntro = intro?.trim() ?? "";

  return (
    <div className="mb-8 space-y-4">
      {trimmedIntro ? (
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          {trimmedIntro}
        </p>
      ) : null}
      <BrandHubWholesaleCta
        needQuoteLabel={needQuoteLabel}
        requestQuoteLabel={requestQuoteLabel}
      />
      <BrandHubAvailableCategories label={brandsLabel} links={brands} />
    </div>
  );
}