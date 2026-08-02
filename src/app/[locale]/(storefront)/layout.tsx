import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { MaintenanceBanner } from "@/components/store/maintenance-banner";
import { StorefrontViewShell, ViewModeProvider } from "@/components/store/view-mode";
import { routing, type AppLocale } from "@/i18n/routing";
import { getSiteSettings, getPublicSiteContact } from "@/lib/site-settings";

const STOREFRONT_SEO: Record<AppLocale, { title: string; description: string }> = {
  en: {
    title: "HMT Korea | Korean Cosmetics Wholesale & K-Beauty Export",
    description:
      "Wholesale Korean cosmetics supplied directly from Korea. Discover authentic K-Beauty brands with competitive pricing and worldwide shipping.",
  },
  ko: {
    title: "HMT Korea | 한국 화장품 도매 · K-Beauty 수출",
    description:
      "한국에서 직접 공급하는 정품 K-Beauty 도매. 경쟁력 있는 가격과 전 세계 배송으로 다양한 한국 화장품 브랜드를 만나보세요.",
  },
  ja: {
    title: "HMT Korea | 韓国コスメ卸売 · K-Beauty輸出",
    description:
      "韓国から直送する正規K-Beauty卸売。競争力のある価格と世界各国への配送で、本物の韓国コスメブランドをご提供します。",
  },
  zh: {
    title: "HMT Korea | 韩国化妆品批发 · K-Beauty出口",
    description:
      "韩国直供正品K-Beauty批发。以具有竞争力的价格和全球配送，为您提供多样化的韩国美妆品牌。",
  },
};

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "https://hmtkorea.com";
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const resolvedLocale = routing.locales.includes(locale) ? locale : routing.defaultLocale;
  const seo = STOREFRONT_SEO[resolvedLocale];
  const siteUrl = resolveSiteUrl();

  return {
    title: {
      default: seo.title,
      template: `%s | HMT Korea`,
    },
    description: seo.description,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((entry) => [entry, `${siteUrl}/${entry}`]),
      ),
    },
  };
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const publicContact = getPublicSiteContact(settings);

  return (
    <ViewModeProvider>
      <StorefrontViewShell>
        <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-white">
          <MaintenanceBanner settings={settings} />
          <StoreHeader storeName={settings.store_name} />
          <div className="mx-auto min-w-0 w-full max-w-full flex-1 overflow-x-hidden">{children}</div>
          <StoreFooter {...publicContact} />
        </div>
      </StorefrontViewShell>
    </ViewModeProvider>
  );
}
