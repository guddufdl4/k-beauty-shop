import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { MaintenanceBanner } from "@/components/store/maintenance-banner";
import { StorefrontViewShell, ViewModeProvider } from "@/components/store/view-mode";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildStorefrontMetadata, GOOGLE_LISTING_SEO } from "@/lib/seo/metadata";
import { PUBLIC_STORE_NAME, displayPublicStoreName, resolveSiteUrl } from "@/lib/site-url";
import { getSiteSettings, getPublicSiteContact } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const resolvedLocale = routing.locales.includes(locale) ? locale : routing.defaultLocale;
  const metadata = buildStorefrontMetadata({
    locale: resolvedLocale,
    path: "",
  });

  return {
    ...metadata,
    title: GOOGLE_LISTING_SEO.title,
    description: GOOGLE_LISTING_SEO.description,
  };
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const publicContact = getPublicSiteContact(settings);
  const siteUrl = resolveSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PUBLIC_STORE_NAME,
    url: siteUrl,
    description: GOOGLE_LISTING_SEO.description,
  };

  return (
    <ViewModeProvider>
      <StorefrontViewShell>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-white">
          <MaintenanceBanner settings={settings} />
          <StoreHeader storeName={displayPublicStoreName(settings.store_name)} />
          <div className="mx-auto min-w-0 w-full max-w-full flex-1 overflow-x-hidden">{children}</div>
          <StoreFooter {...publicContact} />
        </div>
      </StorefrontViewShell>
    </ViewModeProvider>
  );
}
