import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { refreshExchangeRate } from "@/lib/exchange-rate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const state = await refreshExchangeRate(); return NextResponse.json(state, { status: state.error ? 502 : 200, headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Exchange rate update failed" }, { status: 503 }); }
}
