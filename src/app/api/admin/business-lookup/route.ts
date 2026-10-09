import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { canManageMembers } from "@/lib/auth/member-access";
import { COUNTRY_REGIONS } from "@/lib/auth/country-regions";

const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "요청 출처를 확인해 주세요." }, 403);
  const { user, profile } = await getSessionProfile();
  if (!user || !canManageMembers(profile)) return reply({ error: "회원관리 권한이 필요합니다." }, 403);
  if (Number(request.headers.get("content-length")) > 4096) return reply({ error: "입력값이 너무 큽니다." }, 413);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "입력값을 확인해 주세요." }, 400); }
  const country = typeof body?.country === "string" ? body.country.toUpperCase() : "KR";
  if (!COUNTRY_REGIONS.some(item => item.code === country)) return reply({ error: "국가를 선택해 주세요." }, 400);
  if (country !== "KR") {
    const number = typeof body?.number === "string" ? body.number.trim() : "";
    if (number.length < 2 || number.length > 80 || /[<>\x00-\x1f]/.test(number)) return reply({ error: "현지 사업자 등록번호를 확인해 주세요." }, 400);
    const token = process.env.OPENCORPORATES_API_TOKEN?.trim();
    if (!token) return reply({ error: "해외 등록정보 조회 API 연결이 필요합니다. 현재는 아래 국가별 공식 조회처를 이용해 주세요.", code: "NOT_CONFIGURED" }, 503);
    try {
      const url = new URL("https://api.opencorporates.com/v0.4/companies/search");
      url.searchParams.set("api_token", token); url.searchParams.set("q", number);
      url.searchParams.set("country_code", country.toLowerCase()); url.searchParams.set("fields", "company_number,native_company_number"); url.searchParams.set("per_page", "10");
      const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (!response.ok) return reply({ error: "해외 등록정보 제공기관에 연결하지 못했습니다. 이용 권한과 국가 지원 범위를 확인해 주세요." }, 502);
      const data = await response.json();
      if (!Array.isArray(data?.results?.companies)) return reply({ error: "해외 조회 결과를 확인하지 못했습니다." }, 502);
      const companies = data.results.companies.slice(0, 10).map((row: { company?: Record<string, unknown> }) => {
        const c = row.company || {};
        const text = (key: string) => typeof c[key] === "string" ? (c[key] as string).slice(0, 500) : "";
        return { name: text("name"), number: text("company_number"), jurisdiction: text("jurisdiction_code"), status: text("current_status"), address: text("registered_address_in_full"), retrievedAt: text("retrieved_at") };
      }).filter((c: { jurisdiction: string }) => c.jurisdiction === country.toLowerCase() || c.jurisdiction.startsWith(country.toLowerCase() + "_"));
      return reply({ number, companies, checkedAt: new Date().toISOString(), source: "OpenCorporates 등록기관 수집 데이터" });
    } catch { return reply({ error: "해외 조회 연결이 지연되었습니다. 잠시 후 다시 시도해 주세요." }, 504); }
  }
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
