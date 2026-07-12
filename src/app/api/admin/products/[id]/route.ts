import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { parseProductInventoryPatch, parseProductPatch } from "@/lib/admin/product-patch";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireAdminApi() {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return {
      error: NextResponse.json(
        { error: "Supabase가 설정되지 않아 저장할 수 없습니다." },
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

function revalidateProductPaths() {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/en/products");
  revalidatePath("/ko/products");
  revalidatePath("/ja/products");
  revalidatePath("/zh/products");
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const productId = id?.trim();
  if (!productId) {
    return NextResponse.json(
      { error: "상품 ID가 필요합니다." },
      { status: 400 },
    );
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

  const parsed = parseProductPatch(body);
  const inventoryParsed = parseProductInventoryPatch(body);

  if (inventoryParsed.ok) {
    const supabase = await createSafeClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase 클라이언트를 생성할 수 없습니다." },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("products")
      .update(inventoryParsed.patch)
      .eq("id", productId)
      .select("id, stock, sold_out")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    revalidateProductPaths();
    return NextResponse.json({ product: data });
  }

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 클라이언트를 생성할 수 없습니다." },
      { status: 500 },
    );
  }

  const imageUrlProvided = parsed.patch.image_url !== undefined;
  let existingDescription: string | null = null;
  let existingName: string | null = null;

  if (imageUrlProvided) {
    const { data: existing, error: fetchError } = await supabase
      .from("products")
      .select("description, name")
      .eq("id", productId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    existingDescription = existing.description;
    existingName = existing.name;
  }

  const updatePayload: Record<string, unknown> = {
    name: parsed.patch.name,
    barcode: parsed.patch.barcode,
    wholesale_price: parsed.patch.wholesale_price,
  };

  if (imageUrlProvided) {
    updatePayload.image_url = parsed.patch.image_url;
    updatePayload.needs_image = !parsed.patch.image_url;
    updatePayload.content_status =
      parsed.patch.image_url && existingDescription?.trim()
        ? "complete"
        : "pending";
  }

  const { data, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", productId)
    .select("id, name, barcode, wholesale_price, sku, slug, image_url")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "상품을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (imageUrlProvided) {
    await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId)
      .eq("is_primary", true);

    if (parsed.patch.image_url) {
      const { error: insertError } = await supabase.from("product_images").insert({
        product_id: productId,
        url: parsed.patch.image_url,
        alt_text: existingName ?? data.name,
        sort_order: 0,
        is_primary: true,
      });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  revalidateProductPaths();

  return NextResponse.json({ product: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  const supabase = await createSafeClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase \ud074\ub77c\uc774\uc5b8\ud2b8\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const { data: existing, error: deleteError } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", productId)
    .is("deleted_at", null)
    .select("id, name, sku")
    .maybeSingle();

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json(
      { error: "\uc0c1\ud488\uc744 \ucc3e\uc744 \uc218 \uc5c6\uac70\ub098 \uc774\ubbf8 \uc0ad\uc81c\ub418\uc5c8\uc2b5\ub2c8\ub2e4." },
      { status: 404 },
    );
  }

  revalidateProductPaths();

  return NextResponse.json({
    deleted: true,
    product: existing,
  });
}
