import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/service";
import type { SiteSettings } from "@/types/database";

const CACHE_REVALIDATE_SECONDS = 300;

/** Data cache tag for `unstable_cache`; invalidate via `revalidateTag` after admin saves. */
export const SITE_SETTINGS_CACHE_TAG = "site-settings";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  store_name: "HMT",
  contact_email: null,
  maintenance_enabled: false,
  maintenance_message: "",
  wholesale_price_label: null,
  moq_label: null,
  min_order_note: null,
  hero_image_url: null,
  hero_badge: null,
  hero_title: null,
  hero_subtitle: null,
  hero_button_text: null,
  hero_button_link: null,
  updated_at: new Date(0).toISOString(),
};

function normalizeSettings(row: Partial<SiteSettings> | null): SiteSettings {
  if (!row) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  return {
    id: 1,
    store_name: row.store_name?.trim() || DEFAULT_SITE_SETTINGS.store_name,
    contact_email: row.contact_email?.trim() || null,
    maintenance_enabled: Boolean(row.maintenance_enabled),
    maintenance_message: row.maintenance_message?.trim() ?? "",
    wholesale_price_label: row.wholesale_price_label?.trim() || null,
    moq_label: row.moq_label?.trim() || null,
    min_order_note: row.min_order_note?.trim() || null,
    hero_image_url: row.hero_image_url?.trim() || null,
    hero_badge: row.hero_badge?.trim() || null,
    hero_title: row.hero_title?.trim() || null,
    hero_subtitle: row.hero_subtitle?.trim() || null,
    hero_button_text: row.hero_button_text?.trim() || null,
    hero_button_link: row.hero_button_link?.trim() || null,
    updated_at: row.updated_at ?? DEFAULT_SITE_SETTINGS.updated_at,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return unstable_cache(
    fetchSiteSettingsFromSource,
    [SITE_SETTINGS_CACHE_TAG],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [SITE_SETTINGS_CACHE_TAG] },
  )();
}

async function fetchSiteSettingsFromSource(): Promise<SiteSettings> {
  const supabase = createPublicClient();
  if (!supabase) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  return normalizeSettings(data as SiteSettings);
}

export type SiteSettingsPatch = Partial<
  Pick<
    SiteSettings,
    | "store_name"
    | "contact_email"
    | "maintenance_enabled"
    | "maintenance_message"
    | "wholesale_price_label"
    | "moq_label"
    | "min_order_note"
    | "hero_image_url"
    | "hero_badge"
    | "hero_title"
    | "hero_subtitle"
    | "hero_button_text"
    | "hero_button_link"
  >
>;

function isValidHeroButtonLink(value: string | null): boolean {
  if (value === null) {
    return true;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseSiteSettingsPatch(body: unknown): SiteSettingsPatch | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const patch: SiteSettingsPatch = {};

  if ("store_name" in record) {
    if (typeof record.store_name !== "string" || !record.store_name.trim()) {
      return null;
    }
    patch.store_name = record.store_name.trim();
  }

  if ("contact_email" in record) {
    if (record.contact_email === null || record.contact_email === "") {
      patch.contact_email = null;
    } else if (typeof record.contact_email === "string") {
      patch.contact_email = record.contact_email.trim() || null;
    } else {
      return null;
    }
  }

  if ("maintenance_enabled" in record) {
    if (typeof record.maintenance_enabled !== "boolean") {
      return null;
    }
    patch.maintenance_enabled = record.maintenance_enabled;
  }

  if ("maintenance_message" in record) {
    if (typeof record.maintenance_message !== "string") {
      return null;
    }
    patch.maintenance_message = record.maintenance_message;
  }

  if ("wholesale_price_label" in record) {
    if (record.wholesale_price_label === null || record.wholesale_price_label === "") {
      patch.wholesale_price_label = null;
    } else if (typeof record.wholesale_price_label === "string") {
      patch.wholesale_price_label = record.wholesale_price_label.trim() || null;
    } else {
      return null;
    }
  }

  if ("moq_label" in record) {
    if (record.moq_label === null || record.moq_label === "") {
      patch.moq_label = null;
    } else if (typeof record.moq_label === "string") {
      patch.moq_label = record.moq_label.trim() || null;
    } else {
      return null;
    }
  }

  if ("min_order_note" in record) {
    if (record.min_order_note === null || record.min_order_note === "") {
      patch.min_order_note = null;
    } else if (typeof record.min_order_note === "string") {
      patch.min_order_note = record.min_order_note.trim() || null;
    } else {
      return null;
    }
  }

  if (
    "hero_image_url" in record &&
    (record.hero_image_url === null ||
      record.hero_image_url === "" ||
      typeof record.hero_image_url === "string")
  ) {
    patch.hero_image_url =
      record.hero_image_url === null || record.hero_image_url === ""
        ? null
        : String(record.hero_image_url).trim() || null;
  } else if ("hero_image_url" in record) {
    return null;
  }

  if (
    "hero_badge" in record &&
    (record.hero_badge === null || record.hero_badge === "" || typeof record.hero_badge === "string")
  ) {
    patch.hero_badge =
      record.hero_badge === null || record.hero_badge === ""
        ? null
        : String(record.hero_badge).trim() || null;
  } else if ("hero_badge" in record) {
    return null;
  }

  if (
    "hero_title" in record &&
    (record.hero_title === null || record.hero_title === "" || typeof record.hero_title === "string")
  ) {
    patch.hero_title =
      record.hero_title === null || record.hero_title === ""
        ? null
        : String(record.hero_title).trim() || null;
  } else if ("hero_title" in record) {
    return null;
  }

  if (
    "hero_subtitle" in record &&
    (record.hero_subtitle === null ||
      record.hero_subtitle === "" ||
      typeof record.hero_subtitle === "string")
  ) {
    patch.hero_subtitle =
      record.hero_subtitle === null || record.hero_subtitle === ""
        ? null
        : String(record.hero_subtitle).trim() || null;
  } else if ("hero_subtitle" in record) {
    return null;
  }

  if (
    "hero_button_text" in record &&
    (record.hero_button_text === null ||
      record.hero_button_text === "" ||
      typeof record.hero_button_text === "string")
  ) {
    patch.hero_button_text =
      record.hero_button_text === null || record.hero_button_text === ""
        ? null
        : String(record.hero_button_text).trim() || null;
  } else if ("hero_button_text" in record) {
    return null;
  }

  if ("hero_button_link" in record) {
    if (record.hero_button_link === null || record.hero_button_link === "") {
      patch.hero_button_link = null;
    } else if (typeof record.hero_button_link === "string") {
      const trimmed = record.hero_button_link.trim();
      patch.hero_button_link = trimmed || null;
      if (!isValidHeroButtonLink(patch.hero_button_link)) {
        return null;
      }
    } else {
      return null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  return patch;
}