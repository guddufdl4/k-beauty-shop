type Props = {
  brand: string;
  name: string;
  className?: string;
  ariaLabel?: string;
};

export function ProductImagePlaceholder({ brand, name, className, ariaLabel }: Props) {
  return (
    <div
      className={`flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-rose-100 via-rose-50 to-zinc-100 p-8 text-center ${className ?? ""}`}
      aria-label={ariaLabel ?? `${brand} ${name}`}
    >
      <span className="text-5xl opacity-50">✨</span>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">
        {brand}
      </p>
      <p className="max-w-xs text-sm font-medium text-zinc-500">{name}</p>
    </div>
  );
}
