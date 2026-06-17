export function PlaceholderButton({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white ${className}`}
      disabled
    >
      {children}
    </button>
  );
}
