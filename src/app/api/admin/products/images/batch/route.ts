import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  getProductImageBatchStats,
  runProductImageBatch,
} from "@/lib/admin/product-image-batch";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby cap

async function requireAdminApi() {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return {
      error: NextResponse.json(
        {
          error:
            "Supabase\uac00 \uc124\uc815\ub418\uc9c0 \uc54a\uc544 \uc774\ubbf8\uc9c0 \ubc30\uce58\ub97c \uc2e4\ud589\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
        },
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

function parseLimit(request: Request): number | undefined {
  const url = new URL(request.url);
  const raw = url.searchParams.get("limit");
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase \ud074\ub77c\uc774\uc5b8\ud2b8\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const { stats, error } = await getProductImageBatchStats(supabase);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ stats });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.error) {
    return auth.error;
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase \ud074\ub77c\uc774\uc5b8\ud2b8\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const limit = parseLimit(request);
  const { result, error } = await runProductImageBatch(supabase, limit);

  if (error || !result) {
    return NextResponse.json(
      { error: error ?? "\ubc30\uce58 \ucc98\ub9ac\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/images");
  revalidatePath("/en/products");
  revalidatePath("/ko/products");

  const { stats } = await getProductImageBatchStats(supabase);

  return NextResponse.json({
    result,
    stats,
  });
}
