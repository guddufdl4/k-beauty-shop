"use server";

import { revalidatePath } from "next/cache";
import { deleteAdminOrder, restoreAdminOrder } from "@/lib/admin/orders";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

async function requireAdmin(): Promise<boolean> {
  const { configured, profile } = await getSessionProfile();
  if (configured && profile?.role !== "admin") {
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
    return;
  }
  const orderNumber = String(formData.get("order_number") ?? "").trim();
  await deleteAdminOrder(orderNumber);
  revalidateOrders();
}

export async function restoreAdminOrderAction(formData: FormData) {
  if (!(await requireAdmin())) {
    return;
  }
  const orderNumber = String(formData.get("order_number") ?? "").trim();
  await restoreAdminOrder(orderNumber);
  revalidateOrders();
}
