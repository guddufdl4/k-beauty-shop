export default function AdminLoading() {
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-8" aria-busy="true" aria-label="관리 화면 불러오는 중">
    <p role="status" className="text-sm text-zinc-500">관리 화면을 불러오는 중입니다.</p>
    <div className="h-8 w-40 rounded-lg bg-zinc-200" />
    <div className="grid gap-4 sm:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-white" />)}</div>
    <div className="h-80 rounded-2xl bg-white" />
  </main>;
}
