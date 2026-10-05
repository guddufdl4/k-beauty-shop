import { QuoteReadStatus } from "@/components/store/quote-read-status";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getCustomerOrders } from "@/lib/account-orders";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type OrderRow = {
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  shipping_address: { quote_reviewed_at?: string } | null;
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
  let loadError = false;
  const ui = await getTranslations("accountDesign");

  if (configured && user) {
    try {
      orders = await getCustomerOrders(user.id);
    } catch {
      loadError = true;
      console.error("[account/orders] query failed");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-pink-100 bg-gradient-to-br from-rose-50 via-white to-violet-50 p-7 sm:p-10">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-accent">HMT KOREA</p>
          <h1 className="text-3xl font-bold">{ui("history")}</h1>
          <p className="mt-2 text-zinc-600">{ui("historyHelp")}</p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-accent-hover hover:text-accent">
          {tAccount("title")}
        </Link>
      </div>

      {orders.length > 0 ? <div className="mb-5 flex justify-end"><a href="/api/account/orders/export" download className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-hover">{ui("downloadHistory")}</a></div> : null}

      {loadError ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{ui("historyError")}</p> : !isSupabaseConfigured() ? (
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
              {order.order_number.startsWith("QT-") ? <div className="px-5"><QuoteReadStatus orderNumber={order.order_number} reviewedAt={order.shipping_address?.quote_reviewed_at} /></div> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
