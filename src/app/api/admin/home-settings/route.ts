import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  getHomeSettingsFresh,
  HOME_SETTINGS_CACHE_TAG,
  saveHomeSettings,
} from "@/lib/site-settings";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

export const runtime = "nodejs";

async function requireAdminApi() {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return {
      error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }),
    };
  }

  if (!profile || profile.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Admin access required." }, { status: 403 }),
    };
  }

  return { error: null };
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const settings = await getHomeSettingsFresh();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const rawSkus = record.trending_skus;

  if (!Array.isArray(rawSkus)) {
    return NextResponse.json({ error: "trending_skus must be an array." }, { status: 400 });
  }

  const trendingSkus = rawSkus
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const { data, error } = await saveHomeSettings({ trending_skus: trendingSkus });
  if (error || !data) {
    return NextResponse.json({ error: error ?? "Failed to save home settings." }, { status: 500 });
  }

  revalidateTag(HOME_SETTINGS_CACHE_TAG, { expire: 0 });
  revalidatePath("/en");
  revalidatePath("/ko");
  revalidatePath("/ja");
  revalidatePath("/zh");

  return NextResponse.json({ settings: data });
}
