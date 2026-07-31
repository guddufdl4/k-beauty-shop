import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  getSiteSettings,
  getSiteSettingsFresh,
  parseSiteSettingsPatch,
  saveHeroSettings,
  SITE_SETTINGS_CACHE_TAG,
  splitSiteSettingsPatch,
} from "@/lib/site-settings";
import { validateHeroSlidesForSave } from "@/lib/store/storefront-href";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";

export const runtime = "nodejs";

async function requireAdminApi() {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return {
      error: NextResponse.json(
        { error: "Supabase\uac00 \uc124\uc815\ub418\uc9c0 \uc54a\uc544 \uc124\uc815\uc744 \uc800\uc7a5\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
        { status: 503 },
      ),
    };
  }

  if (!profile || profile.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "\uad00\ub9ac\uc790 \uad8c\ud55c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4." },
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
      { error: "JSON \ubcf8\ubb38\uc744 \ud30c\uc2f1\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 400 },
    );
  }

  const patch = parseSiteSettingsPatch(body);
  if (!patch) {
    return NextResponse.json(
      { error: "\uc720\ud6a8\ud558\uc9c0 \uc54a\uc740 \uc124\uc815 \uac12\uc785\ub2c8\ub2e4." },
      { status: 400 },
    );
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase \ud074\ub77c\uc774\uc5b8\ud2b8\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const { dbPatch, heroPatch } = splitSiteSettingsPatch(patch);

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
    const { error } = await supabase.from("site_settings").update(dbPatch).eq("id", 1);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "\uc124\uc815 \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4." },
        { status: 500 },
      );
    }
  }

  if (Object.keys(heroPatch).length > 0) {
    const { error: heroError } = await saveHeroSettings(heroPatch);

    if (heroError) {
      return NextResponse.json(
        { error: heroError ?? "\ubc30\ub108 \uc124\uc815 \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4." },
        { status: 500 },
      );
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