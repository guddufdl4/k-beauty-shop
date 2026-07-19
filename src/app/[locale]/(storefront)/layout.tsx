import type { Metadata } from "next";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { MaintenanceBanner } from "@/components/store/maintenance-banner";
import { StorefrontViewShell, ViewModeProvider } from "@/components/store/view-mode";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const storeName = settings.store_name.trim() || "K-Beauty Shop";

  return {
    title: storeName,
    description: `${storeName} — K-뷰티 수출 이커머스 · 스킨케어·메이크업 B2B·B2C`,
  };
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <ViewModeProvider>
      <StorefrontViewShell>
        <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-white">
          <MaintenanceBanner settings={settings} />
          <StoreHeader storeName={settings.store_name} />
          <main className="mx-auto min-w-0 w-full max-w-full flex-1 overflow-x-hidden">{children}</main>
          <StoreFooter contactEmail={settings.contact_email} storeName={settings.store_name} />
        </div>
      </StorefrontViewShell>
    </ViewModeProvider>
  );
}
