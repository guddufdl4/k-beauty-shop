import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CustomerOrderRow = { order_number: string; status: string; total: number; currency: string; created_at: string; shipping_address: { quote_reviewed_at?: string } | null };
export async function getCustomerOrders(userId: string): Promise<CustomerOrderRow[]> {
  const client = await createClient();
  const query = () => client.from("orders").select("order_number,status,total,currency,created_at,shipping_address")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1000);
  let result = await query().is("deleted_at", null);
  if (result.error && /deleted_at/i.test(result.error.message) && /does not exist|could not find/i.test(result.error.message)) {
    result = await query();
  }
  if (result.error) throw new Error("Order history unavailable");
  return (result.data ?? []) as CustomerOrderRow[];
}
