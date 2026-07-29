import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildHeroImageStoragePath,
  HERO_IMAGE_BUCKET,
  readAndValidateHeroImageFile,
} from "@/lib/admin/hero-image-upload";
import {
  ensureProductImagesBucket,
  formatStorageAuthHint,
  readProductImageUploadEntry,
} from "@/lib/admin/product-image-upload";
import {
  getSiteSettingsFresh,
  saveHeroSettings,
  SITE_SETTINGS_CACHE_TAG,
} from "@/lib/site-settings";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import {
  describeServiceClientMisconfiguration,
  describeSupabaseEnvDiagnostics,
  describeSupabaseEnvVarSnapshot,
  SUPABASE_ENV_VARS,
} from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireAdminApi() {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return {
      error: NextResponse.json(
        { error: "Supabase\uac00 \uc124\uc815\ub418\uc9c0 \uc54a\uc544 \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
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

function revalidateHeroPaths() {
  revalidateTag(SITE_SETTINGS_CACHE_TAG, "max");
  revalidatePath("/admin/settings/hero");
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/en", "layout");
  revalidatePath("/ko", "layout");
  revalidatePath("/ja", "layout");
  revalidatePath("/zh", "layout");
  revalidatePath("/en");
  revalidatePath("/ko");
  revalidatePath("/ja");
  revalidatePath("/zh");
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("diagnostic") !== "supabase") {
    return NextResponse.json(
      { error: "Add ?diagnostic=supabase for env diagnostics." },
      { status: 400 },
    );
  }

  const serviceClient = createServiceClient();
  let bucketProbe: { ok: boolean; error?: string } = { ok: false, error: "service client unavailable" };

  if (serviceClient) {
    try {
      const { error } = await serviceClient.storage.listBuckets();
      bucketProbe = error ? { ok: false, error: error.message } : { ok: true };
    } catch (error) {
      bucketProbe = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return NextResponse.json({
    env: SUPABASE_ENV_VARS.map((name) => describeSupabaseEnvVarSnapshot(name)),
    diagnostics: describeSupabaseEnvDiagnostics(),
    serviceClientReady: Boolean(serviceClient),
    bucketListProbe: bucketProbe,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: describeServiceClientMisconfiguration() },
      { status: 500 },
    );
  }

  const bucketReady = await ensureProductImagesBucket();
  if (!bucketReady.ok) {
    return NextResponse.json({ error: bucketReady.error }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "multipart/form-data \uc694\uccad\uc774 \ud544\uc694\ud569\ub2c8\ub2e4." },
      { status: 400 },
    );
  }

  const file = readProductImageUploadEntry(formData.get("file"));
  if (!file) {
    return NextResponse.json(
      { error: "\uc5c5\ub85c\ub4dc\ud560 \uc774\ubbf8\uc9c0 \ud30c\uc77c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4." },
      { status: 400 },
    );
  }

  const validated = await readAndValidateHeroImageFile(file);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const storagePath = buildHeroImageStoragePath(validated.mimeType);

  const { error: uploadError } = await serviceClient.storage
    .from(HERO_IMAGE_BUCKET)
    .upload(storagePath, validated.buffer, {
      contentType: validated.mimeType,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: formatStorageAuthHint(uploadError.message) },
      { status: 500 },
    );
  }

  const { data: publicData } = serviceClient.storage
    .from(HERO_IMAGE_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = publicData.publicUrl?.trim();
  if (!publicUrl) {
    return NextResponse.json(
      { error: "\uc5c5\ub85c\ub4dc\ub41c \uc774\ubbf8\uc9c0 URL\uc744 \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const { error: heroSaveError } = await saveHeroSettings({ hero_image_url: publicUrl });

  if (heroSaveError) {
    await serviceClient.storage.from(HERO_IMAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: heroSaveError ?? "배너 이미지 URL 저장에 실패했습니다." },
      { status: 500 },
    );
  }

  revalidateHeroPaths();

  const settings = await getSiteSettingsFresh();

  return NextResponse.json({
    hero_image_url: publicUrl,
    settings,
  });
}
