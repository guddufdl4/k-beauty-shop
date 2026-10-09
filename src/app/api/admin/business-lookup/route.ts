import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { canManageMembers } from "@/lib/auth/member-access";

const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "요청 출처를 확인해 주세요." }, 403);
  const { user, profile } = await getSessionProfile();
  if (!user || !canManageMembers(profile)) return reply({ error: "회원관리 권한이 필요합니다." }, 403);
  if (Number(request.headers.get("content-length")) > 4096) return reply({ error: "입력값이 너무 큽니다." }, 413);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "입력값을 확인해 주세요." }, 400); }
  const number = typeof body?.number === "string" ? body.number.replace(/[-\s]/g, "") : "";
  if (!/^\d{10}$/.test(number)) return reply({ error: "대한민국 사업자등록번호 10자리를 입력해 주세요." }, 400);
  const key = process.env.NTS_API_KEY?.trim();
  if (!key) return reply({ error: "국세청 조회 연결 준비 중입니다. 관리자에게 공공데이터 API 키 설정을 요청하거나 아래 홈택스에서 조회해 주세요.", code: "NOT_CONFIGURED" }, 503);
  try {
    const url = new URL("https://api.odcloud.kr/api/nts-businessman/v1/status");
    url.searchParams.set("serviceKey", key);
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ b_no: [number] }), signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) return reply({ error: "국세청 조회가 원활하지 않습니다. 잠시 후 다시 시도해 주세요." }, 502);
    const data = await response.json();
    const item = data?.data?.[0];
    if (data?.status_code !== "OK" || !item || item.b_no !== number) return reply({ error: "국세청 조회 결과를 확인하지 못했습니다." }, 502);
    return reply({ number, status: item.b_stt || "등록 정보 없음", taxType: item.tax_type || "", closedAt: item.end_dt || null, checkedAt: new Date().toISOString(), source: "국세청 사업자등록 상태조회" });
  } catch { return reply({ error: "조회 연결이 지연되었습니다. 잠시 후 다시 시도해 주세요." }, 504); }
}
