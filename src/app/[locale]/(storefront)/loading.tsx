export default function StorefrontLoading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 h-8 w-48 rounded bg-zinc-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="min-w-0 rounded-xl border border-zinc-100 p-3">
            <div className="aspect-square rounded-lg bg-zinc-100" />
            <div className="mt-4 h-4 w-3/4 rounded bg-zinc-100" />
            <div className="mt-2 h-4 w-1/2 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </main>
  );
}
