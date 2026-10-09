export type MemberAccess = { id?: string; role?: string; staff_scope?: string | null; member_grade?: string | null } | null | undefined;

export const MASTER_ADMIN_ID = "6e248669-cf5f-46fa-b440-5fe6640e9ea9";
export function isMasterAdmin(profile: MemberAccess): boolean { return profile?.id === MASTER_ADMIN_ID && profile?.role === "admin"; }

export function canManageMembers(profile: MemberAccess): boolean {
  return profile?.role === "admin" || profile?.staff_scope === "members";
}

export function canManageInquiries(profile: MemberAccess): boolean {
  return profile?.role === "admin" || profile?.staff_scope === "members";
}

export function canManageMemberTarget(actor: MemberAccess, target: MemberAccess): boolean {
  if (!canManageMembers(actor) || target?.role === "admin") return false;
  return actor?.role === "admin" || target?.staff_scope !== "members";
}

export function memberGradeLabel(profile: MemberAccess): string {
  if (isMasterAdmin(profile)) return "마스터 관리자";
  if (profile?.role === "admin") return "관리자";
  if (profile?.staff_scope === "members") return "회원관리 담당자";
  return profile?.member_grade === "vip" ? "VIP" : "일반회원";
}
