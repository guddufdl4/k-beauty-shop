type Props = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function EmptyState({ title, description, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 px-6 py-16 text-center">
      <span className="mb-4 text-4xl opacity-60">📦</span>
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
