import "server-only";
import { getLocale } from "next-intl/server";
import { getMaintenanceSettings, MAINTENANCE_COPY, type MaintenanceLocale } from "@/lib/maintenance";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

export async function maintenanceActionError(): Promise<string | null> {
  const settings = await getMaintenanceSettings();
  if (!settings.enabled || (await getSessionProfile()).profile?.role === "admin") return null;
  const locale = await getLocale();
  return MAINTENANCE_COPY[locale as MaintenanceLocale]?.title ?? MAINTENANCE_COPY.en.title;
}
