"use client";

type Props = {
  disabled?: boolean;
};

export function AddToCartButton({ disabled = true }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      title="Phase 4에서 장바구니 기능이 추가됩니다"
      className="w-full rounded-xl bg-rose-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
    >
      장바구니 담기 (준비 중)
    </button>
  );
}
