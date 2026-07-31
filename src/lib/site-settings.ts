import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describeServiceClientMisconfiguration } from "@/lib/supabase/config";
import { createPublicClient, createServiceClient } from "@/lib/supabase/service";
import type { HeroSlide, SiteSettings } from "@/types/database";
import { normalizeHeroSlideLayout } from "@/lib/admin/hero-image-spec";

const HERO_SETTINGS_BUCKET = "site-config";
const HERO_SETTINGS_PATH = "hero.json";

const HERO_SETTING_KEYS = [
  "hero_image_url",
  "hero_slides",
  "hero_badge",
  "hero_title",
  "hero_subtitle",
  "hero_button_text",
  "hero_button_link",
] as const satisfies readonly (keyof SiteSettings)[];

type HeroSettingKey = (typeof HERO_SETTING_KEYS)[number];
type HeroSettingsRecord = Pick<SiteSettings, HeroSettingKey>;
export type HeroSettingsPatch = Partial<HeroSettingsRecord>;

type StoredHeroSettings = HeroSettingsRecord & { updated_at: string };

function normalizeHeroSlides(raw: unknown, legacyImageUrl: string | null): HeroSlide[] {
  const slides: HeroSlide[] = [];

  if (Array.isArray(raw)) {
    for (const [index, item] of raw.entries()) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const record = item as Record<string, unknown>;
      const imageUrl =
        typeof record.image_url === "string" && record.image_url.trim()
          ? record.image_url.trim()
          : null;

      if (!imageUrl) {
        continue;
      }

      const id =
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : `slide-${index}`;

      const order =
        typeof record.order === "number" && Number.isFinite(record.order)
          ? record.order
          : index;

      slides.push({
        id,
        image_url: imageUrl,
        order,
        layout: normalizeHeroSlideLayout(record.layout),
      });
    }
  }

  slides.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  if (slides.length === 0 && legacyImageUrl) {
    return [{ id: "legacy", image_url: legacyImageUrl, order: 0 }];
  }

  return slides.map((slide, index) => ({ ...slide, order: index }));
}

function parseHeroSlidesPatch(raw: unknown): HeroSlide[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const slides: HeroSlide[] = [];

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const record = item as Record<string, unknown>;
    const imageUrl =
      typeof record.image_url === "string" && record.image_url.trim()
        ? record.image_url.trim()
        : null;

    if (!imageUrl) {
      return null;
    }

    const id =
      typeof record.id === "string" && record.id.trim() ? record.id.trim() : `slide-${index}`;

    const order =
      typeof record.order === "number" && Number.isFinite(record.order) ? record.order : index;

    slides.push({
      id,
      image_url: imageUrl,
      order,
      layout: normalizeHeroSlideLayout(record.layout),
    });
  }

  slides.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return slides.map((slide, index) => ({ ...slide, order: index }));
}

export function getHeroSlides(settings: Pick<SiteSettings, "hero_slides" | "hero_image_url">): HeroSlide[] {
  if (settings.hero_slides.length > 0) {
    return [...settings.hero_slides].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  const legacyUrl = settings.hero_image_url?.trim();
  if (legacyUrl) {
    return [{ id: "legacy", image_url: legacyUrl, order: 0 }];
  }

  return [];
}

const DEFAULT_STORED_HERO: StoredHeroSettings = {
  hero_image_url: null,
  hero_slides: [],
  hero_badge: null,
  hero_title: null,
  hero_subtitle: null,
  hero_button_text: null,
  hero_button_link: null,
  updated_at: new Date(0).toISOString(),
};

function normalizeStoredHero(raw: unknown): StoredHeroSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STORED_HERO };
  }

  const record = raw as Record<string, unknown>;
  const trimOrNull = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  const heroImageUrl = trimOrNull(record.hero_image_url);
  const heroSlides = normalizeHeroSlides(record.slides ?? record.hero_slides, heroImageUrl);

  return {
    hero_image_url: heroSlides[0]?.image_url ?? heroImageUrl,
    hero_slides: heroSlides,
    hero_badge: trimOrNull(record.hero_badge),
    hero_title: trimOrNull(record.hero_title),
    hero_subtitle: trimOrNull(record.hero_subtitle),
    hero_button_text: trimOrNull(record.hero_button_text),
    hero_button_link: trimOrNull(record.hero_button_link),
    updated_at:
      typeof record.updated_at === "string" && record.updated_at
        ? record.updated_at
        : DEFAULT_STORED_HERO.updated_at,
  };
}

let heroBucketEnsurePromise: Promise<boolean> | null = null;

async function ensureHeroSettingsBucket(): Promise<boolean> {
  if (!heroBucketEnsurePromise) {
    heroBucketEnsurePromise = ensureHeroSettingsBucketOnce().catch((error) => {
      heroBucketEnsurePromise = null;
      throw error;
    });
  }

  return heroBucketEnsurePromise;
}

function findStorageBucket(
  buckets: Array<{ id: string; name: string; public?: boolean }> | null | undefined,
  bucketId: string,
) {
  return buckets?.find((bucket) => bucket.id === bucketId || bucket.name === bucketId);
}

async function ensureHeroSettingsBucketOnce(): Promise<boolean> {
  const service = createServiceClient();
  if (!service) {
    return false;
  }

  const { data: buckets, error: listError } = await service.storage.listBuckets();
  const existing = !listError ? findStorageBucket(buckets, HERO_SETTINGS_BUCKET) : undefined;

  if (existing) {
    if (!existing.public) {
      const { error: updateError } = await service.storage.updateBucket(HERO_SETTINGS_BUCKET, {
        public: true,
      });
      if (updateError) {
        console.error("[site-settings] ensureHeroSettingsBucket public update failed:", updateError.message);
      }
    }
    return true;
  }

  const { error: createError } = await service.storage.createBucket(HERO_SETTINGS_BUCKET, {
    public: true,
    fileSizeLimit: 65536,
    allowedMimeTypes: ["application/json"],
  });

  if (!createError) {
    return true;
  }

  const message = createError.message.toLowerCase();
  if (message.includes("already exists") || message.includes("duplicate")) {
    return true;
  }

  console.error("[site-settings] ensureHeroSettingsBucket failed:", listError?.message ?? createError.message);
  return false;
}

async function readHeroSettingsPayload(raw: unknown): Promise<StoredHeroSettings | null> {
  if (raw instanceof Blob) {
    try {
      return normalizeStoredHero(JSON.parse(await raw.text()) as unknown);
    } catch (error) {
      console.error("[site-settings] hero.json parse failed:", error);
      return null;
    }
  }

  if (typeof raw === "string") {
    try {
      return normalizeStoredHero(JSON.parse(raw) as unknown);
    } catch (error) {
      console.error("[site-settings] hero.json parse failed:", error);
      return null;
    }
  }

  return normalizeStoredHero(raw);
}

async function fetchHeroSettings(supabase: SupabaseClient): Promise<StoredHeroSettings> {
  const { data: blob, error: downloadError } = await supabase.storage
    .from(HERO_SETTINGS_BUCKET)
    .download(HERO_SETTINGS_PATH);

  if (!downloadError && blob) {
    const parsed = await readHeroSettingsPayload(blob);
    if (parsed) {
      return parsed;
    }
  } else if (downloadError && !/not found|object not found/i.test(downloadError.message)) {
    console.error("[site-settings] hero.json download failed:", downloadError.message);
  }

  const { data: publicData } = supabase.storage
    .from(HERO_SETTINGS_BUCKET)
    .getPublicUrl(HERO_SETTINGS_PATH);

  const publicUrl = publicData.publicUrl?.trim();
  if (!publicUrl) {
    return { ...DEFAULT_STORED_HERO };
  }

  try {
    const response = await fetch(publicUrl, { cache: "no-store" });
    if (!response.ok) {
      console.error("[site-settings] hero.json public fetch failed:", response.status, publicUrl);
      return { ...DEFAULT_STORED_HERO };
    }

    const parsed = await readHeroSettingsPayload(await response.json());
    return parsed ?? { ...DEFAULT_STORED_HERO };
  } catch (error) {
    console.error("[site-settings] hero.json public fetch error:", error);
    return { ...DEFAULT_STORED_HERO };
  }
}

async function fetchHeroSettingsForServer(): Promise<StoredHeroSettings> {
  const service = createServiceClient();
  if (service) {
    return fetchHeroSettings(service);
  }

  const publicClient = createPublicClient();
  if (publicClient) {
    return fetchHeroSettings(publicClient);
  }

  return { ...DEFAULT_STORED_HERO };
}

export async function saveHeroSettings(
  patch: HeroSettingsPatch,
): Promise<{ data: StoredHeroSettings | null; error: string | null }> {
  const service = createServiceClient();
  if (!service) {
    return {
      data: null,
      error: describeServiceClientMisconfiguration(),
    };
  }

  const bucketReady = await ensureHeroSettingsBucket();
  if (!bucketReady) {
    return {
      data: null,
      error:
        "Storage 버킷(site-config)을 준비하지 못했습니다. SUPABASE_SERVICE_ROLE_KEY 권한과 Vercel 재배포 여부를 확인하세요.",
    };
  }

  const current = await fetchHeroSettings(service);
  const mergedSlides =
    patch.hero_slides !== undefined
      ? patch.hero_slides
      : patch.hero_image_url !== undefined && patch.hero_image_url === null
        ? []
        : current.hero_slides;

  const next: StoredHeroSettings = {
    ...current,
    ...patch,
    hero_slides: mergedSlides,
    hero_image_url:
      patch.hero_image_url !== undefined
        ? patch.hero_image_url
        : mergedSlides[0]?.image_url ?? current.hero_image_url,
    updated_at: new Date().toISOString(),
  };

  const payloadObject = {
    hero_image_url: next.hero_image_url,
    slides: next.hero_slides,
    hero_badge: next.hero_badge,
    hero_title: next.hero_title,
    hero_subtitle: next.hero_subtitle,
    hero_button_text: next.hero_button_text,
    hero_button_link: next.hero_button_link,
    updated_at: next.updated_at,
  };

  const payload = Buffer.from(JSON.stringify(payloadObject), "utf-8");
  const { error } = await service.storage
    .from(HERO_SETTINGS_BUCKET)
    .upload(HERO_SETTINGS_PATH, payload, {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: next, error: null };
}

function mergeHeroIntoSiteSettings(
  settings: SiteSettings,
  hero: StoredHeroSettings,
): SiteSettings {
  const heroUpdatedAt = hero.updated_at;
  const settingsUpdatedAt = settings.updated_at;
  const updatedAt =
    new Date(heroUpdatedAt).getTime() >= new Date(settingsUpdatedAt).getTime()
      ? heroUpdatedAt
      : settingsUpdatedAt;

  return {
    ...settings,
    hero_image_url: hero.hero_image_url,
    hero_slides: hero.hero_slides,
    hero_badge: hero.hero_badge,
    hero_title: hero.hero_title,
    hero_subtitle: hero.hero_subtitle,
    hero_button_text: hero.hero_button_text,
    hero_button_link: hero.hero_button_link,
    updated_at: updatedAt,
  };
}

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
  hero_slides: [],
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
    hero_slides: Array.isArray(row.hero_slides)
      ? normalizeHeroSlides(row.hero_slides, row.hero_image_url?.trim() || null)
      : normalizeHeroSlides([], row.hero_image_url?.trim() || null),
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

  const [{ data, error }, heroSettings] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    fetchHeroSettingsForServer(),
  ]);

  if (error || !data) {
    return mergeHeroIntoSiteSettings({ ...DEFAULT_SITE_SETTINGS }, heroSettings);
  }

  return mergeHeroIntoSiteSettings(normalizeSettings(data as SiteSettings), heroSettings);
}

/** Bypasses Next.js data cache — use after admin writes in the same request. */
export async function getSiteSettingsFresh(): Promise<SiteSettings> {
  return fetchSiteSettingsFromSource();
}

export function splitSiteSettingsPatch(patch: SiteSettingsPatch): {
  dbPatch: SiteSettingsDbPatch;
  heroPatch: HeroSettingsPatch;
} {
  const dbPatch = { ...patch } as Record<string, unknown>;
  const heroPatch: HeroSettingsPatch = {};

  for (const key of HERO_SETTING_KEYS) {
    if (key in patch) {
      (heroPatch as Record<string, unknown>)[key] = patch[key];
      delete dbPatch[key];
    }
  }

  return {
    dbPatch: dbPatch as SiteSettingsDbPatch,
    heroPatch,
  };
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
    | "hero_slides"
    | "hero_badge"
    | "hero_title"
    | "hero_subtitle"
    | "hero_button_text"
    | "hero_button_link"
  >
>;

export type SiteSettingsDbPatch = Omit<
  SiteSettingsPatch,
  | "hero_image_url"
  | "hero_slides"
  | "hero_badge"
  | "hero_title"
  | "hero_subtitle"
  | "hero_button_text"
  | "hero_button_link"
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

  if ("hero_slides" in record || "slides" in record) {
    const rawSlides = "hero_slides" in record ? record.hero_slides : record.slides;
    if (rawSlides === null) {
      patch.hero_slides = [];
    } else {
      const parsedSlides = parseHeroSlidesPatch(rawSlides);
      if (!parsedSlides) {
        return null;
      }
      patch.hero_slides = parsedSlides;
    }
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