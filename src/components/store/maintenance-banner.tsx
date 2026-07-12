import type { SiteSettings } from "@/types/database";

type Props = {
  settings: SiteSettings;
};

export function MaintenanceBanner({ settings }: Props) {
  if (!settings.maintenance_enabled || !settings.maintenance_message.trim()) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
    >
      {settings.maintenance_message.trim()}
    </div>
  );
}