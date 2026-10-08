import { canManageMembers } from "@/lib/auth/member-access";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminMemberRow = {
  memberGrade: string;
  staffScope: string;
  phoneNumber?: string | null;
  businessNumber?: string | null;
  id: string;
  username: string | null;
  email: string;
  fullName: string | null;
  companyName: string | null;
  countryCode: string | null;
  role: string;
  preferredCurrency: string | null;
  createdAt: string | null;
};

export const ADMIN_MEMBERS_PAGE_SIZE = 20;

export type NewMemberOptions = { view?: "all" | "new"; days?: 1 | 7 | 30; sort?: "priority" | "latest"; now?: Date };
const DAY_MS = 86_400_000;
export function memberPeriodStart(days: 1 | 7 | 30, now = new Date()): number {
  // Calendar days in Korea, including today; not a rolling UTC-day cutoff.
  const koreaDay = Math.floor((now.getTime() + 9 * 3_600_000) / DAY_MS);
  return (koreaDay - days + 1) * DAY_MS - 9 * 3_600_000;
}
export function isRecentMember(createdAt: string | null, days: 1 | 7 | 30 = 7, now = new Date()): boolean {
  const joined = createdAt ? Date.parse(createdAt) : NaN;
  return Number.isFinite(joined) && joined >= memberPeriodStart(days, now) && joined <= now.getTime();
}

export type AdminMemberList = {
  members: AdminMemberRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  available: boolean;
  error: string | null;
  newCounts: { today: number; week: number; month: number };
  evidenceCounts: { all: number; submitted: number; missing: number; pending: number; vip: number };
};

export function parseAdminMembersPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(String(value ?? "1"), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function buildAdminMembersHref(query: string, page: number, evidence = "all", options: NewMemberOptions = {}): string {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) {
    params.set("q", trimmed);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  if (evidence === "submitted" || evidence === "missing") params.set("evidence", evidence);
  if (options.view === "new") {
    params.set("view", "new");
    params.set("days", String(options.days ?? 7));
  }
  if (options.sort === "latest") params.set("sort", "latest");
  const qs = params.toString();
  return qs ? `/admin/members?${qs}` : "/admin/members";
}

function textOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function emptyList(available: boolean, error: string | null): AdminMemberList {
  return {
    members: [],
    total: 0,
    page: 1,
    pageSize: ADMIN_MEMBERS_PAGE_SIZE,
    totalPages: 1,
    available,
    error,
    newCounts: { today: 0, week: 0, month: 0 },
    evidenceCounts: { all: 0, submitted: 0, missing: 0, pending: 0, vip: 0 },
  };
}

export async function listAdminMembers(
  query = "",
  page = 1,
  evidenceFilter = "all",
  options: NewMemberOptions = {},
): Promise<AdminMemberList> {
  if (!canManageMembers((await getSessionProfile()).profile)) return emptyList(false, "Admin access required");
  const supabase = createServiceClient();
  if (!supabase) {
    return emptyList(false, "Supabase not configured");
  }

  const q = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, username, full_name, company_name, country_code, phone, business_number, role, preferred_currency, created_at, member_grade, staff_scope",
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return emptyList(false, error.message);
  }

  const documents = await supabase.from("business_documents")
    .select("user_id,file_path,submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(2000);
  if (documents.error) return emptyList(false, documents.error.message);
  const submitted = new Map<string,string>((documents.data ?? [])
    .filter(row=>Boolean(row.file_path))
    .map(row=>[String(row.user_id),String(row.submitted_at || "")]));

  const members: AdminMemberRow[] = (data ?? []).map((row) => ({
    memberGrade: String((row as { member_grade?: string }).member_grade ?? "normal"),
    staffScope: String((row as { staff_scope?: string }).staff_scope ?? "none"),
    id: String((row as { id?: string }).id ?? ""),
    username: textOrNull((row as { username?: string }).username),
    email: String((row as { email?: string }).email ?? ""),
    phoneNumber: textOrNull((row as { phone?: string }).phone),
    businessNumber: textOrNull((row as { business_number?: string }).business_number),
    fullName: textOrNull((row as { full_name?: string }).full_name),
    companyName: textOrNull((row as { company_name?: string }).company_name),
    countryCode: textOrNull((row as { country_code?: string }).country_code),
    role: String((row as { role?: string }).role ?? "customer"),
    preferredCurrency: textOrNull((row as { preferred_currency?: string }).preferred_currency),
    createdAt: textOrNull((row as { created_at?: string }).created_at),
  }));

  const searched = q
    ? members.filter((member) =>
        [member.username, member.email, member.fullName, member.companyName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      )
    : members;

  const now = options.now ?? new Date();
  const newCounts = { today: searched.filter(m=>isRecentMember(m.createdAt,1,now)).length, week: searched.filter(m=>isRecentMember(m.createdAt,7,now)).length, month: searched.filter(m=>isRecentMember(m.createdAt,30,now)).length };
  const scoped = options.view === "new" ? searched.filter(m=>isRecentMember(m.createdAt,options.days ?? 7,now)) : searched;
  const submittedCount = scoped.filter(member => submitted.has(member.id)).length;
  const evidenceCounts = { all: scoped.length, submitted: submittedCount, missing: scoped.length - submittedCount, pending: scoped.filter(member => member.role === "customer").length, vip: scoped.filter(member => member.memberGrade === "vip").length };
  const filtered = evidenceFilter === "submitted" ? scoped.filter(member => submitted.has(member.id))
    : evidenceFilter === "missing" ? scoped.filter(member => !submitted.has(member.id)) : scoped;

  // Sort the complete search result before pagination so older submissions
  // appear on page one, rather than only moving within their existing page.
  filtered.sort((a,b)=>{
    if (options.view === "new" || options.sort === "latest") return (b.createdAt || "").localeCompare(a.createdAt || "") || a.id.localeCompare(b.id);
    const rank=(member:AdminMemberRow)=>submitted.has(member.id)
      ? member.role === "customer" ? 0 : 1 : 2;
    const priority=rank(a)-rank(b);
    if(priority)return priority;
    const dateA=submitted.get(a.id)||a.createdAt||"";
    const dateB=submitted.get(b.id)||b.createdAt||"";
    return dateB.localeCompare(dateA)||a.id.localeCompare(b.id);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_MEMBERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * ADMIN_MEMBERS_PAGE_SIZE;
  // The list renders profile fields only. Legacy Auth metadata is resolved
  // by the individual edit page, rather than issuing up to 20 Auth requests.
  const paged = filtered.slice(start, start + ADMIN_MEMBERS_PAGE_SIZE);

  return {
    members: paged,
    total,
    page: safePage,
    pageSize: ADMIN_MEMBERS_PAGE_SIZE,
    totalPages,
    evidenceCounts,
    newCounts,
    available: true,
    error: null,
  };
}

export function formatMemberJoinedAt(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function memberRoleLabel(role: string): string {
  if (role === "admin") {
    return "관리자";
  }
  if (role === "wholesale") {
    return "사업자 승인 완료";
  }
  return "승인 대기";
}
