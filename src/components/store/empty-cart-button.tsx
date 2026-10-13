"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { emptyCart, type CartActionState } from "@/app/actions/cart";

export function EmptyCartButton() {
  const t = useTranslations("cart");
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<CartActionState, FormData>(emptyCart, {});
  return <div className="mt-5">
    {!confirming ? <button type="button" onClick={() => setConfirming(true)} className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-pink-400 hover:text-pink-600">{t("clearCart")}</button> :
      <form action={action} className="rounded-xl border border-pink-200 bg-pink-50 p-4">
        <p className="text-sm font-medium text-zinc-900">{t("clearConfirm")}</p>
        <input type="hidden" name="confirmed" value="yes" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? t("clearing") : t("clearCart")}</button>
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm">{t("clearCancel")}</button>
        </div>
      </form>}
    {state.error ? <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p> : null}
  </div>;
}
