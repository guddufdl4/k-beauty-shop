"use server";

import { revalidatePath } from "next/cache";
import { deleteAdminOrder } from "@/lib/admin/orders";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";

export async function deleteAdminOrderAction(formData: FormData) {
  const { configured, profile } = await getSessionProfile();
  if (configured && profile?.role !== "admin") {
    return;
  }

  const orderNumber = String(formData.get("order_number") ?? "").trim();
  await deleteAdminOrder(orderNumber);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}
