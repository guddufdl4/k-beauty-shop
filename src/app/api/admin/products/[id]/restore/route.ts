import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
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
        { error: "Supabase\uac00 \uc124\uc815\ub418\uc9c0 \uc54a\uc544 \uc800\uc7a5\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
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
}

export async function POST(_request: Request, context: RouteContext) {
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

  const { data, error } = await supabase
    .from("products")
    .update({ deleted_at: null })
    .eq("id", productId)
    .not("deleted_at", "is", null)
    .select("id, name, sku, slug")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "\uc0ad\uc81c\ub41c \uc0c1\ud488\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 404 },
    );
  }

  revalidateProductPaths();

  return NextResponse.json({
    restored: true,
    product: data,
  });
}