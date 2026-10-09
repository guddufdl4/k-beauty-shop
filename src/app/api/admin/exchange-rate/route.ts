import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { readExchangeRate, refreshExchangeRate } from "@/lib/exchange-rate";
export const dynamic = "force-dynamic";
export async function GET() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "admin") return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  try { return NextResponse.json(await readExchangeRate(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "환율 정보를 읽지 못했습니다." }, { status: 503 }); }
}
export async function POST() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "admin") return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  try { const state = await refreshExchangeRate(true); return NextResponse.json(state, { status: state.error ? 502 : 200, headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "환율 갱신을 완료하지 못했습니다. 기존 환율을 유지합니다." }, { status: 503 }); }
}
