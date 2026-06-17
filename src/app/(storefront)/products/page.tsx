import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState } from "@/components/store/empty-state";
import { getCategories, getProducts } from "@/lib/supabase/products";

type ProductsPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category: categorySlug } = await searchParams;
  const [{ products, meta }, { categories }] = await Promise.all([
    getProducts({ categorySlug }),
    getCategories(),
  ]);

  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
            Catalog
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {activeCategory ? activeCategory.name : "전체 상품"}
          </h1>
          <p className="mt-2 text-zinc-600">
            {products.length}개 상품
            {activeCategory ? ` · ${activeCategory.name}` : ""}
          </p>
        </div>
        {!meta.configured ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            샘플 데이터 표시 중 (.env 미설정)
          </p>
        ) : null}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/products"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !categorySlug
              ? "bg-rose-600 text-white"
              : "bg-white text-zinc-600 ring-1 ring-rose-100 hover:text-rose-600"
          }`}
        >
          전체
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              categorySlug === cat.slug
                ? "bg-rose-600 text-white"
                : "bg-white text-zinc-600 ring-1 ring-rose-100 hover:text-rose-600"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="표시할 상품이 없습니다"
          description={
            meta.configured
              ? "supabase/seed.sql을 실행하거나 관리자 페이지에서 상품을 등록하세요."
              : ".env.local을 설정하고 seed SQL을 실행하면 DB 상품이 표시됩니다."
          }
        >
          <Link
            href="/categories"
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            카테고리로 돌아가기
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
