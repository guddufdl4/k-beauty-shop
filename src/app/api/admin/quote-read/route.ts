import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const session = await getSessionProfile();
  if (!session.user || session.profile?.role !== "admin") return new Response(null, { status: 403 });
  let orderNumber: unknown;
  try { ({ orderNumber } = await request.json()); } catch { return new Response(null, { status: 400 }); }
  if (typeof orderNumber !== "string" || !/^[A-Za-z0-9-]{4,64}$/.test(orderNumber)) return new Response(null, { status: 400 });
  const client = createServiceClient();
  if (!client) return new Response(null, { status: 503 });
  // Compare the whole snapshot before writing so simultaneous reviews cannot overwrite other edits.
  for (let attempt = 0; attempt < 3; attempt++) {
    let result = await client.from("orders").select("shipping_address,payment_provider").eq("order_number", orderNumber).is("deleted_at", null).maybeSingle();
    if (result.error && /deleted_at/i.test(result.error.message) && /does not exist|could not find/i.test(result.error.message)) {
      result = await client.from("orders").select("shipping_address,payment_provider").eq("order_number", orderNumber).maybeSingle();
    }
    const { data, error } = result;
    if (error) return new Response(null, { status: 503 });
    if (!data || data.payment_provider !== "quote") return new Response(null, { status: 404 });
    const previous = data.shipping_address;
    if (!previous || typeof previous !== "object" || Array.isArray(previous)) return new Response(null, { status: 409 });
    if (typeof previous.quote_reviewed_at === "string") return Response.json({ reviewedAt: previous.quote_reviewed_at });
    const reviewedAt = new Date().toISOString();
    const updated = await client.from("orders").update({ shipping_address: { ...previous, quote_reviewed_at: reviewedAt } })
      .eq("order_number", orderNumber).eq("shipping_address", JSON.stringify(previous)).select("order_number");
    if (updated.error) return new Response(null, { status: 503 });
    if (updated.data?.length) return Response.json({ reviewedAt });
  }
  return new Response(null, { status: 409 });
}
