export function hasBusinessApproval(profile: { role?: string } | null | undefined): boolean {
  return profile?.role === "admin" || profile?.role === "wholesale";
}
