import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  getSiteSettings,
  getSiteSettingsFresh,
  parseSiteSettingsPatch,
  saveHeroSettings,
  saveSiteSettingsDbPatch,
  saveSiteSettingsSocialPatch,
  SITE_SETTINGS_CACHE_TAG,
  splitSiteSettingsPatch,
} from "@/lib/site-settings";
import { validateHeroSlidesForSave } from "@/lib/store/storefront-href";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

export const runtime = "nodejs";

async function requireAdminApi() {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return {
      error: NextResponse.json(
        { error: "Supabase가 설정되지 않아 설정을 저장할 수 없습니다." },
        { status: 503 },
      ),
    };
  }

  if (!profile || profile.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 },
      ),
    };
  }

  return { error: null };
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const settings = await getSiteSettings();
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
    return NextResponse.json(
      { error: "JSON 본문을 파싱할 수 없습니다." },
      { status: 400 },
    );
  }

  const patch = parseSiteSettingsPatch(body);
  if (!patch) {
    return NextResponse.json(
      { error: "유효하지 않은 설정 값입니다." },
      { status: 400 },
    );
  }

  const { dbPatch, heroPatch } = splitSiteSettingsPatch(patch);
  const socialPatch = {
    instagram_url: dbPatch.instagram_url,
    facebook_url: dbPatch.facebook_url,
  };
  const hasSocialPatch =
    socialPatch.instagram_url !== undefined || socialPatch.facebook_url !== undefined;

  if (heroPatch.hero_slides !== undefined) {
    const validation = validateHeroSlidesForSave(heroPatch.hero_slides);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "히어로 슬라이드 링크 검증에 실패했습니다.",
          fieldErrors: validation.errors,
        },
        { status: 400 },
      );
    }
    heroPatch.hero_slides = validation.slides;
  }

  if (Object.keys(dbPatch).length > 0) {
    const { error } = await saveSiteSettingsDbPatch(dbPatch);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
  }

  if (hasSocialPatch) {
    const { error } = await saveSiteSettingsSocialPatch(socialPatch);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
  }

  if (Object.keys(heroPatch).length > 0) {
    const { error: heroError } = await saveHeroSettings(heroPatch);
    if (heroError) {
      return NextResponse.json({ error: heroError }, { status: 500 });
    }
  }

  revalidateTag(SITE_SETTINGS_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/hero");
  revalidatePath("/admin");
  revalidatePath("/en", "layout");
  revalidatePath("/ko", "layout");
  revalidatePath("/ja", "layout");
  revalidatePath("/zh", "layout");
  revalidatePath("/en");
  revalidatePath("/ko");
  revalidatePath("/ja");
  revalidatePath("/zh");

  const settings = await getSiteSettingsFresh();
  return NextResponse.json({ settings });
}
