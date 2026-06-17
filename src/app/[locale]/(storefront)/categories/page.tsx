import { CategoryCard } from "@/components/store/category-card";
import { EmptyState } from "@/components/store/empty-state";
import { getCategories } from "@/lib/supabase/products";
import { Link } from "@/i18n/navigation";

export default async function CategoriesPage() {
  const { categories, meta } = await getCategories();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-10">
        <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
          Browse
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          카테고리
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600">
          K-뷰티 수출 카테고리별로 상품을 탐색하세요. B2B·B2C 모두 지원합니다.
        </p>
        {!meta.configured ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Supabase 미연결 — 샘플 카테고리를 표시합니다.{" "}
            <code className="text-xs">.env.local</code> 설정 후 seed SQL을
            실행하면 DB 데이터가 표시됩니다.
          </p>
        ) : meta.source === "static" && !meta.error ? (
          <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            DB에 카테고리가 없습니다.{" "}
            <code className="text-xs">supabase/seed.sql</code>을 실행해 주세요.
          </p>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="등록된 카테고리가 없습니다"
          description="관리자 페이지에서 카테고리를 추가하거나 seed SQL을 실행하세요."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/products"
          className="inline-flex items-center rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          전체 상품 보기
        </Link>
      </div>
    </main>
  );
}
