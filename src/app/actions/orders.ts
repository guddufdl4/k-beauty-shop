"use server";

import { revalidatePath } from "next/cache";
import { deleteAdminOrder, restoreAdminOrder } from "@/lib/admin/orders";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

async function requireAdmin(): Promise<boolean> {
  const { configured, user, profile } = await getSessionProfile();
  if (configured && (!user || profile?.role !== "admin")) {
    return false;
  }
  return true;
}

function revalidateOrders() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function deleteAdminOrderAction(formData: FormData) {
  if (!(await requireAdmin())) {
    return { error: "관리자 권한이 필요합니다." };
  }
  const orderNumber = String(formData.get("order_number") ?? "").trim();
  const result = await deleteAdminOrder(orderNumber);
  if (!result.ok) return { error: result.error ?? "삭제하지 못했습니다. 다시 시도해 주세요." };
  revalidateOrders();
  return { success: "삭제했습니다. 삭제된 주문에서 복원할 수 있습니다." };
}

export async function restoreAdminOrderAction(formData: FormData) {
  if (!(await requireAdmin())) {
    return { error: "관리자 권한이 필요합니다." };
  }
  const orderNumber = String(formData.get("order_number") ?? "").trim();
  const result = await restoreAdminOrder(orderNumber);
  if (!result.ok) return { error: result.error ?? "복원하지 못했습니다. 다시 시도해 주세요." };
  revalidateOrders();
  return { success: "복원했습니다." };
}
