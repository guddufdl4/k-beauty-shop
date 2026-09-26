import { createServiceClient } from "@/lib/supabase/service";

export type AdminMemberRow = {
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

export type AdminMemberList = {
  members: AdminMemberRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  available: boolean;
  error: string | null;
};

export function parseAdminMembersPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(String(value ?? "1"), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function buildAdminMembersHref(query: string, page: number): string {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) {
    params.set("q", trimmed);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
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
  };
}

export async function listAdminMembers(
  query = "",
  page = 1,
): Promise<AdminMemberList> {
  const supabase = createServiceClient();
  if (!supabase) {
    return emptyList(false, "Supabase not configured");
  }

  const q = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, username, full_name, company_name, country_code, role, preferred_currency, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    return emptyList(false, error.message);
  }

  const members: AdminMemberRow[] = (data ?? []).map((row) => ({
    id: String((row as { id?: string }).id ?? ""),
    username: textOrNull((row as { username?: string }).username),
    email: String((row as { email?: string }).email ?? ""),
    fullName: textOrNull((row as { full_name?: string }).full_name),
    companyName: textOrNull((row as { company_name?: string }).company_name),
    countryCode: textOrNull((row as { country_code?: string }).country_code),
    role: String((row as { role?: string }).role ?? "customer"),
    preferredCurrency: textOrNull((row as { preferred_currency?: string }).preferred_currency),
    createdAt: textOrNull((row as { created_at?: string }).created_at),
  }));

  const filtered = q
    ? members.filter((member) =>
        [member.username, member.email, member.fullName, member.companyName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      )
    : members;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_MEMBERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * ADMIN_MEMBERS_PAGE_SIZE;
  const paged = filtered.slice(start, start + ADMIN_MEMBERS_PAGE_SIZE);

  return {
    members: paged,
    total,
    page: safePage,
    pageSize: ADMIN_MEMBERS_PAGE_SIZE,
    totalPages,
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
    return "도매";
  }
  return "회원";
}
