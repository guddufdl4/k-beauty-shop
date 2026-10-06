"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  addToCart,
  type CartActionState,
} from "@/app/actions/cart";
import { MoqQuantityInput, snapMoqFormQuantity } from "@/components/store/moq-quantity-input";
import { getMoqStep } from "@/lib/store/moq-quantity";
import { quoteBoxCount } from "@/lib/store/quote-list";
import { withReturnTo } from "@/lib/auth/return-to";
import { isProductSoldOut } from "@/lib/store/products-url";
import { useState } from "react";

type Props = {
  productId: string;
  productSlug: string;
  productName: string;
  moq: number;
  stock: number;
  soldOut?: boolean;
  disabled?: boolean;
  canAdd?: boolean;
  approvalPending?: boolean;
  defaultQuantity?: number;
};

const initialState: CartActionState = {};

export function AddToCartForm({
  productId,
  productSlug,
  productName,
  moq,
  stock,
  soldOut = false,
  disabled,
  canAdd = true,
  approvalPending = false,
  defaultQuantity,
}: Props) {
  const t = useTranslations("cart");
  const [state, formAction, pending] = useActionState(addToCart, initialState);
  const unavailable = isProductSoldOut({ sold_out: soldOut, stock });
  const safeMoq = getMoqStep(moq);
  const maxQuantity = 999999;
  const [quantity, setQuantity] = useState(defaultQuantity && defaultQuantity >= safeMoq ? defaultQuantity : safeMoq);
  const boxes = quoteBoxCount(quantity, safeMoq);
  const returnTo = `/products/${productSlug}?qty=${quantity}`;


  if (!canAdd) {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm font-medium text-zinc-700">{t("orderQuantityLabel")}</p>
        <MoqQuantityInput
          moq={safeMoq}
          defaultValue={quantity}
          productName={productName}
          disabled
        />
        <div className="flex flex-wrap gap-3">
          <Link
            href={withReturnTo("/login", returnTo)}
            className="inline-flex rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-800"
          >
            {t("loginToQuote")}
          </Link>
          <Link
            href={withReturnTo("/signup", returnTo)}
            className="inline-flex rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800 hover:border-violet-700"
          >
            {t("createWholesaleAccount")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      className="mt-6 space-y-3"
      onSubmit={(event) => snapMoqFormQuantity(event.currentTarget, safeMoq, maxQuantity)}
    >
      {approvalPending ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{t("approvalPending")}</p> : null}
      <input type="hidden" name="productId" value={productId} />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="quantity" className="text-sm font-medium text-zinc-700">
          {t("orderQuantityLabel")}
        </label>
        <MoqQuantityInput
          moq={safeMoq}
          defaultValue={quantity}
          max={unavailable ? safeMoq : maxQuantity}
          disabled={unavailable || disabled}
          productName={productName}
          className="w-20 rounded-lg border border-zinc-300 px-2 py-2 text-center text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-zinc-100"
        />
        <p className="text-sm text-zinc-600">
          {boxes
            ? t("boxesAndUnits", { boxes, units: quantity })
            : t("totalUnits", { count: quantity })}
        </p>
      </div>
      <button
        type="submit"
        disabled={pending || unavailable || disabled}
        className="w-full rounded-xl bg-violet-700 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
        onClick={() => {
          const input = document.getElementById("quantity");
          if (input instanceof HTMLInputElement) {
            setQuantity(Number(input.value) || safeMoq);
          }
        }}
      >
        {pending ? t("adding") : unavailable ? t("outOfStock") : t("addToQuote")}
      </button>
      <p className="sr-only" aria-live="polite">
        {state.success ?? state.error ?? ""}
      </p>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700" role="status">
          <span>{state.success}</span>
          <Link href="/cart" className="font-semibold text-violet-700 underline">
            {t("viewQuoteList")}
          </Link>
        </div>
      ) : null}
    </form>
  );
}
