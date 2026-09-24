import { routing } from "@/i18n/routing";
import { SEO_BRAND_NAME } from "@/lib/seo/constants";
import { PUBLIC_STORE_NAME, absoluteLocaleUrl, resolveSiteUrl } from "@/lib/site-url";
import type { PublicSiteContact } from "@/lib/site-settings";

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(contact: PublicSiteContact, description: string): JsonLd {
  const siteUrl = resolveSiteUrl();
  const sameAs = [contact.instagram_url, contact.facebook_url].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: contact.store_name?.trim() || PUBLIC_STORE_NAME,
    alternateName: SEO_BRAND_NAME,
    url: siteUrl,
    description,
  };

  if (contact.public_email) {
    jsonLd.email = contact.public_email;
  }
  if (contact.public_phone) {
    jsonLd.telephone = contact.public_phone;
  }
  if (contact.company_address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: contact.company_address,
      addressCountry: "KR",
    };
  }
  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs;
  }

  return jsonLd;
}

export function websiteJsonLd(description: string): JsonLd {
  const siteUrl = resolveSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: SEO_BRAND_NAME,
    url: siteUrl,
    description,
    inLanguage: [...routing.locales],
    publisher: {
      "@id": `${siteUrl}/#organization`,
    },
  };
}

export function breadcrumbJsonLd(
  locale: string,
  items: Array<{ name: string; path: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteLocaleUrl(locale, item.path),
    })),
  };
}

export function productJsonLd(input: {
  locale: string;
  name: string;
  brand: string;
  description: string;
  slug: string;
  sku?: string | null;
  image?: string | null;
  categoryName?: string | null;
  origin?: string | null;
  volume?: string | null;
  moq?: number | null;
}): JsonLd {
  const url = absoluteLocaleUrl(input.locale, `/products/${input.slug}`);
  const additionalProperty: JsonLd[] = [];

  if (input.volume?.trim()) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Size",
      value: input.volume.trim(),
    });
  }
  if (input.moq != null && Number.isFinite(input.moq) && input.moq > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "MOQ",
      value: String(input.moq),
    });
  }

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url,
    brand: {
      "@type": "Brand",
      name: input.brand,
    },
  };

  if (input.image) {
    jsonLd.image = [input.image];
  }
  if (input.sku?.trim()) {
    jsonLd.sku = input.sku.trim();
  }
  if (input.categoryName?.trim()) {
    jsonLd.category = input.categoryName.trim();
  }
  if (input.origin?.trim()) {
    jsonLd.countryOfOrigin = input.origin.trim();
  }
  if (additionalProperty.length > 0) {
    jsonLd.additionalProperty = additionalProperty;
  }

  return jsonLd;
}
