"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getMoqStep,
  snapToMoqQuantity,
  stepMoqQuantity,
} from "@/lib/store/moq-quantity";

type Props = {
  id?: string;
  name?: string;
  moq: number;
  defaultValue?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  productName?: string;
};

export function MoqQuantityInput({
  id = "quantity",
  name = "quantity",
  moq,
  defaultValue,
  max = 999999,
  disabled,
  productName,
  className = "w-24 rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-zinc-100",
}: Props) {
  const t = useTranslations("cart");
  const step = getMoqStep(moq);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() => {
    const initial = defaultValue ?? step;
    return Number.isFinite(initial) && initial > 0 ? initial : step;
  });

  function commit(next: number) {
    const snapped = snapToMoqQuantity(next, step, max);
    setValue(snapped);
    if (inputRef.current) {
      inputRef.current.value = String(snapped);
    }
    return snapped;
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={productName ? `${t("decreaseQuantity")} ${productName}` : t("decreaseQuantity")}
        disabled={disabled || value <= step}
        onClick={() => commit(stepMoqQuantity(value, step, -1, max))}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-lg leading-none text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={step}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(Number(event.target.value))}
        onBlur={(event) => commit(Number(event.target.value))}
        className={className}
      />
      <button
        type="button"
        aria-label={productName ? `${t("increaseQuantity")} ${productName}` : t("increaseQuantity")}
        disabled={disabled || value + step > max}
        onClick={() => commit(stepMoqQuantity(value, step, 1, max))}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-lg leading-none text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export function snapMoqFormQuantity(form: HTMLFormElement, moq: number, max = 999999) {
  const input = form.elements.namedItem("quantity");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const snapped = snapToMoqQuantity(Number(input.value), moq, max);
  input.value = String(snapped);
}
