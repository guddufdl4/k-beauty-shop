import { getTranslations } from "next-intl/server";
import { MIN_ORDER_USD } from "@/lib/currency";

export async function TradeNotes() {
  const t = await getTranslations("checkout");
  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
      <h2 className="font-semibold text-zinc-900">{t("tradeNoteTitle")}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>{t("minOrderUsd", { amount: MIN_ORDER_USD })}</li>
        <li>{t("shippingSeparate")}</li>
        <li>{t("shippingCalculated")}</li>
        <li>{t("brandMinimum")}</li>
        <li>{t("vatExcluded")}</li>
      </ul>
    </section>
  );
}
