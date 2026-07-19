import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildHeroImageStoragePath,
  HERO_IMAGE_BUCKET,
  readAndValidateHeroImageFile,
} from "@/lib/admin/hero-image-upload";
import { readProductImageUploadEntry } from "@/lib/admin/product-image-upload";
import { SITE_SETTINGS_CACHE_TAG } from "@/lib/site-settings";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";
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
  revalidatePath("/en");
  revalidatePath("/ko");
  revalidatePath("/ja");
  revalidatePath("/zh");
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY\uac00 \uc124\uc815\ub418\uc9c0 \uc54a\uc544 Storage \uc5c5\ub85c\ub4dc\ub97c \ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
      },
      { status: 500 },
    );
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
    const message = uploadError.message.toLowerCase();
    const error =
      message.includes("bucket") && message.includes("not found")
        ? "Supabase Storage \ubc84\ud2b7(site-assets)\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. 009_hero_settings.sql\uc744 \uc2e4\ud589\ud558\uc138\uc694."
        : uploadError.message;
    return NextResponse.json({ error }, { status: 500 });
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

  const supabase = await createSafeClient();
  if (!supabase) {
    await serviceClient.storage.from(HERO_IMAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "Supabase \ud074\ub77c\uc774\uc5b8\ud2b8\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("site_settings")
    .update({ hero_image_url: publicUrl })
    .eq("id", 1)
    .select("*")
    .single();

  if (error || !data) {
    await serviceClient.storage.from(HERO_IMAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: error?.message ?? "\ubc30\ub108 \uc774\ubbf8\uc9c0 URL \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  revalidateHeroPaths();

  return NextResponse.json({
    hero_image_url: publicUrl,
    settings: data,
  });
}