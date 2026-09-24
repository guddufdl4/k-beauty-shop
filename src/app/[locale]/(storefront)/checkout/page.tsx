import { getTranslations, getLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getUsdKrwRate } from "@/lib/currency";
import { getCart } from "@/lib/cart";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "checkout" });
  return buildStorefrontMetadata({
    locale,
    path: "/checkout",
    title: t("title"),
    robots: NOINDEX_FOLLOW,
  });
}

export default async function CheckoutPage() {
  const [cart, session, t, locale, usdKrwRate] = await Promise.all([
    getCart(),
    getSessionProfile(),
    getTranslations("checkout"),
    getLocale(),
    getUsdKrwRate(),
  ]);

  let defaultCompanyName = "";
  if (session.user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("id", session.user.id)
      .maybeSingle();
    defaultCompanyName = typeof data?.company_name === "string" ? data.company_name : "";
  }

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">{t("emptyCart")}</p>
          <Link
            href="/cart"
            className="mt-4 inline-block py-3 text-sm text-rose-600 hover:underline"
          >
            {t("backToCart")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href="/cart" className="text-sm text-rose-600 hover:underline">
        {t("backToCart")}
      </Link>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{t("titleWithOrder")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("quoteHint")}</p>
      <div className="mt-8">
        <CheckoutForm
          cart={cart}
          locale={locale}
          usdKrwRate={usdKrwRate}
          defaultCompanyName={defaultCompanyName}
          defaultContactName={session.profile?.full_name ?? ""}
          defaultEmail={session.profile?.email ?? session.user?.email ?? ""}
        />
      </div>
    </main>
  );
}
