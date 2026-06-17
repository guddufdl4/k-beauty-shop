import Link from "next/link";
import { ProductCard } from "@/components/store/product-card";
import { StoreHeader } from "@/components/store/header";
import { getProducts } from "@/lib/supabase/products";

export default async function HomePage() {
  const { products: allProducts, meta } = await getProducts();
  const products = allProducts.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <StoreHeader />

      <main className="flex-1">
        <section className="border-b border-rose-100 bg-gradient-to-br from-rose-50 via-white to-zinc-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="text-sm font-semibold uppercase tracking-widest text-rose-500">
              Premium K-Beauty Export
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              한국 화장품 B2B·B2C
              <br />
              수출 쇼핑몰
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
              스킨케어·메이크업 브랜드를 해외 바이어와 소비자에게 소개합니다.
              MOQ·도매가·소매가를 한곳에서 확인하세요.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/products"
                className="inline-flex min-h-[48px] items-center rounded-xl bg-rose-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                상품 보기
              </Link>
              <Link
                href="/categories"
                className="inline-flex min-h-[48px] items-center rounded-xl border border-rose-200 bg-white px-8 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                카테고리
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">추천 상품</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {products.length}개 상품 · B2B 도매·B2C 소매
              </p>
            </div>
            <Link
              href="/products"
              className="text-sm font-semibold text-rose-600 hover:underline"
            >
              전체 보기 →
            </Link>
          </div>

          {!meta.configured ? (
            <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase 미연결 — 샘플 상품을 표시합니다.
            </p>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
            <div>
              <h3 className="font-semibold text-zinc-900">B2B 도매</h3>
              <p className="mt-2 text-sm text-zinc-600">
                MOQ 기준 도매가·재고 확인, 바이어 문의 대응
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">B2C 소매</h3>
              <p className="mt-2 text-sm text-zinc-600">
                해외 소비자 대상 소매가·장바구니·주문
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">수출 지원</h3>
              <p className="mt-2 text-sm text-zinc-600">
                한국 화장품 수출·유통 파트너십
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-zinc-50 py-8 text-center text-xs text-zinc-500">
        © K-Beauty Shop · 한국 화장품 수출 플랫폼
      </footer>
    </div>
  );
}
