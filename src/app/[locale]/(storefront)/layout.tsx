import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { MaintenanceBanner } from "@/components/store/maintenance-banner";
import { StorefrontViewShell, ViewModeProvider } from "@/components/store/view-mode";
import { getSiteSettings } from "@/lib/site-settings";

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
