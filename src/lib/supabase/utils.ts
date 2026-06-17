import type { UserRole } from "@/types/database";

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function isWholesale(role: UserRole, approved: boolean): boolean {
  return role === "wholesale" && approved;
}

export function canViewWholesalePrice(role: UserRole, approved: boolean): boolean {
  return isAdmin(role) || isWholesale(role, approved);
}
