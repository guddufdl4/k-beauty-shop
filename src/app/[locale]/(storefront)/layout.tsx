import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { JsonLd } from "@/components/store/json-ld";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { MaintenanceBanner } from "@/components/store/maintenance-banner";
import { StorefrontViewShell, ViewModeProvider } from "@/components/store/view-mode";
import { type AppLocale } from "@/i18n/routing";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { getHomeSeo } from "@/lib/seo/catalog-copy";
import { displayPublicStoreName } from "@/lib/site-url";
import { getSiteSettings, getPublicSiteContact } from "@/lib/site-settings";
import { StorefrontVisitTracker } from "@/components/store/storefront-visit-tracker";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const publicContact = getPublicSiteContact(settings);
  const locale = (await getLocale()) as AppLocale;
  const description = getHomeSeo(locale).description;

  return (
    <ViewModeProvider>
      <StorefrontVisitTracker />
      <StorefrontViewShell>
        <JsonLd data={organizationJsonLd(publicContact, description)} />
        <JsonLd data={websiteJsonLd(description)} />
        <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-white">
          <MaintenanceBanner settings={settings} />
          <Suspense fallback={<div className="h-[148px] border-b border-zinc-200 bg-white" />}>
            <StoreHeader storeName={displayPublicStoreName(settings.store_name)} />
          </Suspense>
          <div className="mx-auto min-w-0 w-full max-w-full flex-1 overflow-x-hidden">{children}</div>
          <StoreFooter {...publicContact} />
        </div>
      </StorefrontViewShell>
    </ViewModeProvider>
  );
}
