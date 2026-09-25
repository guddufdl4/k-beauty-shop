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

export type AdminMemberList = {
  members: AdminMemberRow[];
  total: number;
  available: boolean;
  error: string | null;
};

function textOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function listAdminMembers(query = ""): Promise<AdminMemberList> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { members: [], total: 0, available: false, error: "Supabase not configured" };
  }

  const q = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, username, full_name, company_name, country_code, role, preferred_currency, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return { members: [], total: 0, available: false, error: error.message };
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

  return { members: filtered, total: filtered.length, available: true, error: null };
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
