"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  removeFromCart,
  updateQuantity,
  type CartActionState,
} from "@/app/actions/cart";
import { MoqQuantityInput, snapMoqFormQuantity } from "@/components/store/moq-quantity-input";
import { getMoqStep } from "@/lib/store/moq-quantity";
import { quoteBoxCount } from "@/lib/store/quote-list";
import { formatLocalePrice } from "@/lib/utils";
import type { CartItemView } from "@/types/cart";

const initialState: CartActionState = {};

function CartItemRow({
  item,
  locale,
  usdKrwRate,
  showPrices,
}: {
  item: CartItemView;
  locale: string;
  usdKrwRate: number;
  showPrices: boolean;
}) {
  const t = useTranslations("cart");
  const [updateState, updateAction, updatePending] = useActionState(updateQuantity, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeFromCart, initialState);
  const step = getMoqStep(item.moq);
  const boxes = quoteBoxCount(item.quantity, step);
  const error = updateState.error ?? removeState.error;

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          {item.imageUrl ? (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">{item.brand}</p>
            <Link href={`/products/${item.slug}`} className="mt-1 block break-words font-semibold text-zinc-900 hover:text-violet-700">
              {item.name}
            </Link>
            {item.productCode ? (
              <p className="mt-1 break-all font-mono text-xs text-zinc-500">{t("productCode", { code: item.productCode })}</p>
            ) : null}
            {item.barcode ? (
              <p className="break-all font-mono text-xs text-zinc-500">{t("barcode", { code: item.barcode })}</p>
            ) : null}
            <p className="mt-1 text-sm text-zinc-500">
              {t("boxQuantity", { count: step })} · {t("orderQuantity", { count: item.quantity })} ·{" "}
              {t("totalUnits", { count: item.quantity })}
              {boxes ? ` · ${t("boxCount", { count: boxes })}` : ""}
            </p>
            {showPrices ? (
              <p className="mt-2 text-lg font-bold">{formatLocalePrice(item.lineTotal, locale, usdKrwRate)}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <form
            action={updateAction}
            noValidate
            className="flex max-w-full flex-wrap items-center gap-2"
            onSubmit={(event) => snapMoqFormQuantity(event.currentTarget, step)}
          >
            <input type="hidden" name="productId" value={item.productId} />
            <MoqQuantityInput
              id={`quantity-${item.productId}`}
              moq={step}
              defaultValue={item.quantity}
              productName={item.name}
              className="w-20 rounded-lg border border-zinc-300 px-2 py-2 text-center text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={updatePending}
              className="rounded-lg border border-zinc-300 px-3 py-3 text-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              {t("change")}
            </button>
          </form>

          <form action={removeAction}>
            <input type="hidden" name="productId" value={item.productId} />
            <button
              type="submit"
              disabled={removePending}
              className="py-3 text-sm text-zinc-500 hover:text-red-600 disabled:opacity-60"
            >
              {t("remove")}
            </button>
          </form>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function CartItemList({
  items,
  locale,
  usdKrwRate,
  showPrices = true,
}: {
  items: CartItemView[];
  locale: string;
  usdKrwRate: number;
  showPrices?: boolean;
}) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <CartItemRow
          key={item.productId}
          item={item}
          locale={locale}
          usdKrwRate={usdKrwRate}
          showPrices={showPrices}
        />
      ))}
    </ul>
  );
}
