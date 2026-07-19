import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildProductImageStoragePath,
  PRODUCT_IMAGE_BUCKET,
  readProductImageUploadEntry,
} from "@/lib/admin/product-image-upload";
import { parseProductImageNormalizeOptions } from "@/lib/admin/product-image-normalize-options";
import { readAndValidateProductImageFile } from "@/lib/product-image-normalize";
import { updateProductImageUrl } from "@/lib/admin/product-image-update";
import { revalidateStorefrontHome } from "@/lib/store/revalidate-storefront";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

function revalidateProductPaths() {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/en/products");
  revalidatePath("/ko/products");
  revalidatePath("/ja/products");
  revalidatePath("/zh/products");
  revalidateStorefrontHome();
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const productId = id?.trim();
  if (!productId) {
    return NextResponse.json(
      { error: "\uc0c1\ud488 ID\uac00 \ud544\uc694\ud569\ub2c8\ub2e4." },
      { status: 400 },
    );
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

  const normalizeOptions = parseProductImageNormalizeOptions({
    canvasSize: formData.get("canvasSize"),
    fit: formData.get("fit"),
    background: formData.get("background"),
    trimEnabled: formData.get("trimEnabled"),
  });

  const previewOnly = String(formData.get("preview") ?? "").trim() === "true";
  const removeBackground = String(formData.get("removeBackground") ?? "").trim() === "true";

  const validated = await readAndValidateProductImageFile(file, normalizeOptions, {
    removeBackground,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  if (previewOnly) {
    return new NextResponse(new Uint8Array(validated.buffer), {
      status: 200,
      headers: {
        "Content-Type": validated.mimeType,
        "Cache-Control": "no-store",
      },
    });
  }

  const { data: productExists, error: existsError } = await serviceClient
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (existsError) {
    return NextResponse.json({ error: existsError.message }, { status: 500 });
  }

  if (!productExists) {
    return NextResponse.json(
      { error: "\uc0c1\ud488\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 404 },
    );
  }

  const storagePath = buildProductImageStoragePath(productId, validated.mimeType);

  const { error: uploadError } = await serviceClient.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(storagePath, validated.buffer, {
      contentType: validated.mimeType,
      upsert: true,
    });

  if (uploadError) {
    const message = uploadError.message.toLowerCase();
    const error =
      message.includes("bucket") && message.includes("not found")
        ? "Supabase Storage 버킷(product-images)이 없습니다. 006_product_images_storage.sql을 실행하세요."
        : uploadError.message;
    return NextResponse.json({ error }, { status: 500 });
  }

  const { data: publicData } = serviceClient.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = publicData.publicUrl?.trim();
  if (!publicUrl) {
    return NextResponse.json(
      { error: "\uc5c5\ub85c\ub4dc\ub41c \uc774\ubbf8\uc9c0 URL\uc744 \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const { product, error: updateError } = await updateProductImageUrl(
    serviceClient,
    productId,
    publicUrl,
  );

  if (updateError || !product) {
    await serviceClient.storage.from(PRODUCT_IMAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: updateError ?? "\uc0c1\ud488 \uc774\ubbf8\uc9c0\ub97c \uc800\uc7a5\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  revalidateProductPaths();

  return NextResponse.json({
    image_url: publicUrl,
    product,
  });
}
