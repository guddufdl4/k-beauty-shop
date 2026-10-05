"use server";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function setBusinessApproval(formData: FormData) {
  const session = await getSessionProfile();
  if (!session.user || session.profile?.role !== "admin") throw new Error("Admin access required");
  const ids = [...new Set(formData.getAll("member_id").map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  const decision = formData.get("decision");
  if (!ids.length || ids.length > 2000 || !["approve", "revoke"].includes(String(decision))) throw new Error("Invalid member selection");
  const client = createServiceClient();
  if (!client) throw new Error("Service unavailable");
  const { error } = await client.from("profiles").update({ role: decision === "approve" ? "wholesale" : "customer" }).in("id", ids).neq("role", "admin");
  if (error) throw new Error("Could not update business approval");
  revalidatePath("/admin/members");
  revalidatePath("/", "layout");
}
