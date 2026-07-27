import { NextResponse } from "next/server";
import { revalidateStorefrontCatalog } from "@/lib/store/revalidate-storefront";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

export const runtime = "nodejs";

async function isAuthorized(request: Request): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
    return true;
  }

  const { profile } = await getSessionProfile();
  return profile?.role === "admin";
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  revalidateStorefrontCatalog();
  return NextResponse.json({ revalidated: true });
}
