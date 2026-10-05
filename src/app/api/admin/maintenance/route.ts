import { NextResponse } from "next/server";
import { getMaintenanceSettings, MAINTENANCE_BUCKET, MAINTENANCE_PATH, parseMaintenanceSettings } from "@/lib/maintenance";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function isAdmin() { const { user, profile } = await getSessionProfile(); return Boolean(user && profile?.role === "admin"); }
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  return NextResponse.json({ settings: await getMaintenanceSettings() }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  let settings;
  try { settings = parseMaintenanceSettings(await request.json()); } catch { settings = null; }
  if (!settings) return NextResponse.json({ error: "점검 설정을 확인해 주세요." }, { status: 400 });
  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "설정 저장 서비스가 준비되지 않았습니다." }, { status: 503 });
  const { error } = await service.storage.from(MAINTENANCE_BUCKET).upload(MAINTENANCE_PATH, JSON.stringify(settings), { upsert: true, contentType: "application/json", cacheControl: "0" });
  if (error) return NextResponse.json({ error: "점검 설정을 저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ settings }, { headers: { "Cache-Control": "no-store" } });
}
