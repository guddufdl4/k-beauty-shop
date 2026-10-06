export type MemberAccess = { role?: string; staff_scope?: string | null; member_grade?: string | null } | null | undefined;

export function canManageMembers(profile: MemberAccess): boolean {
  return profile?.role === "admin" || profile?.staff_scope === "members";
}

export function canManageMemberTarget(actor: MemberAccess, target: MemberAccess): boolean {
  if (!canManageMembers(actor) || target?.role === "admin") return false;
  return actor?.role === "admin" || target?.staff_scope !== "members";
}

export function memberGradeLabel(profile: MemberAccess): string {
  if (profile?.role === "admin") return "관리자";
  if (profile?.staff_scope === "members") return "회원관리 담당자";
  return profile?.member_grade === "vip" ? "VIP" : "일반회원";
}
