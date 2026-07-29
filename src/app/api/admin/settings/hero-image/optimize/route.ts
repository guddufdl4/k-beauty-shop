import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildHeroImageStoragePath,
  HERO_IMAGE_BUCKET,
  optimizeHeroImageBuffer,
  parseHeroStoragePathFromPublicUrl,
} from "@/lib/admin/hero-image-upload";
import {
  ensureProductImagesBucket,
  formatStorageAuthHint,
  toBinaryUploadBody,
  verifyPublicImageUrl,
  verifyStoredImageObject,
} from "@/lib/admin/product-image-upload";
import {
  getHeroSlides,
  getSiteSettingsFresh,
  saveHeroSettings,
  SITE_SETTINGS_CACHE_TAG,
} from "@/lib/site-settings";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { describeServiceClientMisconfiguration } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireAdminApi() {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return {
      error: NextResponse.json(
        { error: "Supabase\uac00 \uc124\uc815\ub418\uc9c0 \uc54a\uc544 \ucc98\ub9ac\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
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
  revalidateTag(SITE_SETTINGS_CACHE_TAG, { expire: 0 });
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

  let body: { slideId?: string };
  try {
    body = (await request.json()) as { slideId?: string };
  } catch {
    return NextResponse.json({ error: "JSON \uc694\uccad \ubcf8\ubb38\uc774 \ud544\uc694\ud569\ub2c8\ub2e4." }, { status: 400 });
  }

  const slideId = body.slideId?.trim();
  if (!slideId) {
    return NextResponse.json({ error: "slideId\uac00 \ud544\uc694\ud569\ub2c8\ub2e4." }, { status: 400 });
  }

  const currentSettings = await getSiteSettingsFresh();
  const slides = getHeroSlides(currentSettings);
  const slide = slides.find((entry) => entry.id === slideId);
  if (!slide) {
    return NextResponse.json({ error: "\ud574\ub2f9 \uc2ac\ub77c\uc774\ub4dc\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." }, { status: 404 });
  }

  const imageUrl = slide.image_url?.trim();
  if (!imageUrl) {
    return NextResponse.json({ error: "\uc2ac\ub77c\uc774\ub4dc\uc5d0 \uc774\ubbf8\uc9c0 URL\uc774 \uc5c6\uc2b5\ub2c8\ub2e4." }, { status: 400 });
  }

  let inputBuffer: Buffer;
  const storagePath = parseHeroStoragePathFromPublicUrl(imageUrl);

  if (storagePath) {
    const { data, error } = await serviceClient.storage.from(HERO_IMAGE_BUCKET).download(storagePath);
    if (error || !data) {
      return NextResponse.json(
        { error: "\uae30\uc874 \ubc30\ub108 \uc774\ubbf8\uc9c0\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4." },
        { status: 500 },
      );
    }

    inputBuffer = Buffer.from(await data.arrayBuffer());
  } else {
    try {
      const response = await fetch(imageUrl, { cache: "no-store" });
      if (!response.ok) {
        return NextResponse.json(
          { error: "\uae30\uc874 \ubc30\ub108 \uc774\ubbf8\uc9c0\ub97c \ub2e4\uc6b4\ub85c\ub4dc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4." },
          { status: 502 },
        );
      }

      inputBuffer = Buffer.from(await response.arrayBuffer());
    } catch {
      return NextResponse.json(
        { error: "\uae30\uc874 \ubc30\ub108 \uc774\ubbf8\uc9c0\ub97c \ub2e4\uc6b4\ub85c\ub4dc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4." },
        { status: 502 },
      );
    }
  }

  const validated = await optimizeHeroImageBuffer(inputBuffer);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const newStoragePath = buildHeroImageStoragePath(validated.mimeType);

  const { error: uploadError } = await serviceClient.storage
    .from(HERO_IMAGE_BUCKET)
    .upload(newStoragePath, toBinaryUploadBody(validated.buffer), {
      contentType: validated.mimeType,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: formatStorageAuthHint(uploadError.message) },
      { status: 500 },
    );
  }

  const verified = await verifyStoredImageObject(() =>
    serviceClient.storage.from(HERO_IMAGE_BUCKET).download(newStoragePath),
  );
  if (!verified.ok) {
    await serviceClient.storage.from(HERO_IMAGE_BUCKET).remove([newStoragePath]);
    return NextResponse.json(
      {
        error: `\ucc98\ub9ac\ub41c \uc774\ubbf8\uc9c0\uac00 \uc190\uc0c1\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.${verified.error ? ` ${verified.error}` : ""}`,
      },
      { status: 500 },
    );
  }

  const { data: publicData } = serviceClient.storage
    .from(HERO_IMAGE_BUCKET)
    .getPublicUrl(newStoragePath);

  const publicUrl = publicData.publicUrl?.trim();
  if (!publicUrl) {
    await serviceClient.storage.from(HERO_IMAGE_BUCKET).remove([newStoragePath]);
    return NextResponse.json(
      { error: "\ucc98\ub9ac\ub41c \uc774\ubbf8\uc9c0 URL\uc744 \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const publicVerified = await verifyPublicImageUrl(publicUrl, { retries: 6, delayMs: 500 });
  if (!publicVerified.ok) {
    console.warn(
      "[hero-image/optimize] public URL not yet serving image bytes:",
      publicVerified.status ?? publicVerified.error,
    );
  }

  const nextSlides = slides.map((entry) =>
    entry.id === slideId ? { ...entry, image_url: publicUrl } : entry,
  );

  const { error: heroSaveError } = await saveHeroSettings({
    hero_slides: nextSlides,
    hero_image_url: nextSlides[0]?.image_url ?? publicUrl,
  });

  if (heroSaveError) {
    await serviceClient.storage.from(HERO_IMAGE_BUCKET).remove([newStoragePath]);
    return NextResponse.json(
      { error: heroSaveError ?? "\ubc30\ub108 \uc774\ubbf8\uc9c0 URL \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  if (storagePath && storagePath !== newStoragePath) {
    await serviceClient.storage.from(HERO_IMAGE_BUCKET).remove([storagePath]);
  }

  revalidateHeroPaths();

  const settings = await getSiteSettingsFresh();

  return NextResponse.json({
    hero_image_url: publicUrl,
    hero_slide: nextSlides.find((entry) => entry.id === slideId),
    settings,
  });
}
