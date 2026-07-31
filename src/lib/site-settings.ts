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

function parseHeroSlideCopy(raw: unknown): HeroSlide["copy"] | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  const trimOrNull = (value: unknown): string | null | undefined => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value === "") {
      return null;
    }
    return typeof value === "string" ? value.trim() || null : undefined;
  };

  const copy = {
    badge: trimOrNull(record.badge),
    title: trimOrNull(record.title),
    subtitle: trimOrNull(record.subtitle),
    button_text: trimOrNull(record.button_text),
    button_link: trimOrNull(record.button_link),
    wholesale_label: trimOrNull(record.wholesale_label),
    wholesale_link: trimOrNull(record.wholesale_link),
  };

  const hasValue = Object.values(copy).some((value) => value !== undefined);
  return hasValue ? copy : undefined;
}

function parseSlideRecord(record: Record<string, unknown>, index: number): HeroSlide | null {
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

  const mobileImageUrl =
    typeof record.mobile_image_url === "string" && record.mobile_image_url.trim()
      ? record.mobile_image_url.trim()
      : null;

  const copy = parseHeroSlideCopy(record.copy);

  return {
    id,
    image_url: imageUrl,
    mobile_image_url: mobileImageUrl,
    order,
    layout: normalizeHeroSlideLayout(record.layout),
    ...(copy ? { copy } : {}),
  };
}

function normalizeHeroSlides(raw: unknown, legacyImageUrl: string | null): HeroSlide[] {
  const slides: HeroSlide[] = [];

  if (Array.isArray(raw)) {
    for (const [index, item] of raw.entries()) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const parsed = parseSlideRecord(item as Record<string, unknown>, index);
      if (parsed) {
        slides.push(parsed);
      }
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

    const parsed = parseSlideRecord(item as Record<string, unknown>, index);
    if (!parsed) {
      return null;
    }

    slides.push(parsed);
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
  store_name: "HMT KOREA",
  contact_email: null,
  public_email: null,
  public_phone: null,
  public_whatsapp: null,
  company_address: null,
  business_hours: null,
  avg_lead_time: null,
  company_registration: null,
  instagram_url: null,
  facebook_url: null,
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

function trimOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function normalizeSettings(row: Partial<SiteSettings> | null): SiteSettings {
  if (!row) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  return {
    id: 1,
    store_name: row.store_name?.trim() || DEFAULT_SITE_SETTINGS.store_name,
    contact_email: trimOrNull(row.contact_email),
    public_email: trimOrNull(row.public_email),
    public_phone: trimOrNull(row.public_phone),
    public_whatsapp: trimOrNull(row.public_whatsapp),
    company_address: trimOrNull(row.company_address),
    business_hours: trimOrNull(row.business_hours),
    avg_lead_time: trimOrNull(row.avg_lead_time),
    company_registration: trimOrNull(row.company_registration),
    instagram_url: trimOrNull(row.instagram_url),
    facebook_url: trimOrNull(row.facebook_url),
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

export type PublicSiteContact = {
  store_name: string;
  public_email: string | null;
  public_phone: string | null;
  public_whatsapp: string | null;
  company_address: string | null;
  business_hours: string | null;
  avg_lead_time: string | null;
  company_registration: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
};

/** Public storefront contact fields — never exposes internal contact_email. */
export function getPublicSiteContact(settings: SiteSettings): PublicSiteContact {
  return {
    store_name: settings.store_name?.trim() || DEFAULT_SITE_SETTINGS.store_name,
    public_email: settings.public_email?.trim() || null,
    public_phone: settings.public_phone?.trim() || null,
    public_whatsapp: settings.public_whatsapp?.trim() || null,
    company_address: settings.company_address?.trim() || null,
    business_hours: settings.business_hours?.trim() || null,
    avg_lead_time: settings.avg_lead_time?.trim() || null,
    company_registration: settings.company_registration?.trim() || null,
    instagram_url: settings.instagram_url?.trim() || null,
    facebook_url: settings.facebook_url?.trim() || null,
  };
}

export type SiteSettingsPatch = Partial<
  Pick<
    SiteSettings,
    | "store_name"
    | "contact_email"
    | "public_email"
    | "public_phone"
    | "public_whatsapp"
    | "company_address"
    | "business_hours"
    | "avg_lead_time"
    | "company_registration"
    | "instagram_url"
    | "facebook_url"
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

function parseNullableStringField(
  record: Record<string, unknown>,
  key: keyof SiteSettingsPatch,
  patch: SiteSettingsPatch,
): boolean {
  if (!(key in record)) {
    return true;
  }

  const value = record[key];
  if (value === null || value === "") {
    patch[key] = null as never;
    return true;
  }

  if (typeof value === "string") {
    patch[key] = (value.trim() || null) as never;
    return true;
  }

  return false;
}

const NULLABLE_STRING_PATCH_KEYS = [
  "contact_email",
  "public_email",
  "public_phone",
  "public_whatsapp",
  "company_address",
  "business_hours",
  "avg_lead_time",
  "company_registration",
  "instagram_url",
  "facebook_url",
  "wholesale_price_label",
  "moq_label",
  "min_order_note",
] as const satisfies readonly (keyof SiteSettingsPatch)[];

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

  for (const key of NULLABLE_STRING_PATCH_KEYS) {
    if (!parseNullableStringField(record, key, patch)) {
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

const HOME_SETTINGS_PATH = "home.json";
export const HOME_SETTINGS_CACHE_TAG = "home-settings";

export type HomeSettings = {
  trending_skus: string[];
  updated_at: string;
};

const DEFAULT_HOME_SETTINGS: HomeSettings = {
  trending_skus: [],
  updated_at: new Date(0).toISOString(),
};

function normalizeHomeSettings(raw: unknown): HomeSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_HOME_SETTINGS };
  }

  const record = raw as Record<string, unknown>;
  const trendingSkus = Array.isArray(record.trending_skus)
    ? record.trending_skus
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  return {
    trending_skus: trendingSkus,
    updated_at:
      typeof record.updated_at === "string" && record.updated_at.trim()
        ? record.updated_at.trim()
        : DEFAULT_HOME_SETTINGS.updated_at,
  };
}

async function fetchHomeSettings(client: SupabaseClient): Promise<HomeSettings> {
  const { data: downloadData, error: downloadError } = await client.storage
    .from(HERO_SETTINGS_BUCKET)
    .download(HOME_SETTINGS_PATH);

  if (!downloadError && downloadData) {
    try {
      const parsed = normalizeHomeSettings(JSON.parse(await downloadData.text()));
      return parsed;
    } catch {
      return { ...DEFAULT_HOME_SETTINGS };
    }
  }

  const { data: publicData } = client.storage
    .from(HERO_SETTINGS_BUCKET)
    .getPublicUrl(HOME_SETTINGS_PATH);

  const publicUrl = publicData.publicUrl?.trim();
  if (!publicUrl) {
    return { ...DEFAULT_HOME_SETTINGS };
  }

  try {
    const response = await fetch(publicUrl, { cache: "no-store" });
    if (!response.ok) {
      return { ...DEFAULT_HOME_SETTINGS };
    }
    return normalizeHomeSettings(await response.json());
  } catch {
    return { ...DEFAULT_HOME_SETTINGS };
  }
}

export async function getHomeSettings(): Promise<HomeSettings> {
  return unstable_cache(
    async () => {
      const service = createServiceClient();
      if (service) {
        return fetchHomeSettings(service);
      }
      const publicClient = createPublicClient();
      if (publicClient) {
        return fetchHomeSettings(publicClient);
      }
      return { ...DEFAULT_HOME_SETTINGS };
    },
    [HOME_SETTINGS_CACHE_TAG],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: [HOME_SETTINGS_CACHE_TAG] },
  )();
}

export async function getHomeSettingsFresh(): Promise<HomeSettings> {
  const service = createServiceClient();
  if (service) {
    return fetchHomeSettings(service);
  }
  const publicClient = createPublicClient();
  if (publicClient) {
    return fetchHomeSettings(publicClient);
  }
  return { ...DEFAULT_HOME_SETTINGS };
}

export async function saveHomeSettings(
  patch: Partial<Pick<HomeSettings, "trending_skus">>,
): Promise<{ data: HomeSettings | null; error: string | null }> {
  const service = createServiceClient();
  if (!service) {
    return { data: null, error: describeServiceClientMisconfiguration() };
  }

  const current = await fetchHomeSettings(service);
  const next: HomeSettings = {
    ...current,
    ...patch,
    trending_skus: patch.trending_skus ?? current.trending_skus,
    updated_at: new Date().toISOString(),
  };

  const payload = Buffer.from(JSON.stringify(next), "utf-8");
  const { error } = await service.storage.from(HERO_SETTINGS_BUCKET).upload(HOME_SETTINGS_PATH, payload, {
    contentType: "application/json",
    upsert: true,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: next, error: null };
}