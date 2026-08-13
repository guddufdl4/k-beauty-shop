import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type OrderRow = {
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
};

export default async function AccountOrdersPage() {
  const [{ configured, user }, t, tAccount] = await Promise.all([
    getSessionProfile(),
    getTranslations("account.orders"),
    getTranslations("account"),
  ]);

  if (configured && !user) {
    redirect("/login");
  }

  let orders: OrderRow[] = [];

  if (configured && user) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("order_number, status, total, currency, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[account/orders] query failed");
    } else {
      orders = (data ?? []) as OrderRow[];
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-zinc-600">{t("description")}</p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-accent-hover hover:text-accent">
          {tAccount("title")}
        </Link>
      </div>

      {!isSupabaseConfigured() ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("unavailable")}
        </p>
      ) : orders.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-zinc-600">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {orders.map((order) => (
            <li key={order.order_number}>
              <Link
                href={`/orders/${order.order_number}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-zinc-50"
              >
                <div>
                  <p className="font-semibold text-zinc-900">{order.order_number}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {new Date(order.created_at).toLocaleDateString()} · {t("status", { status: order.status })}
                  </p>
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  {order.total.toLocaleString()} {order.currency}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
