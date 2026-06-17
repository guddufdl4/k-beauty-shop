import Link from "next/link";
import { createProduct } from "@/app/actions/products";
import { AdminProductForm } from "@/components/admin/admin-product-form";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { getCategories, getProducts } from "@/lib/supabase/products";
import { formatKRW } from "@/lib/utils";

export default async function AdminProductsPage() {
  const { configured, user, profile } = await getSessionProfile();
  const [{ categories }, { products }] = await Promise.all([
    getCategories(),
    getProducts({ includeDraft: true }),
  ]);

  if (!configured) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 상품 관리</h1>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabase가 설정되지 않았습니다.{" "}
          <code className="text-xs">.env.local</code>에 URL과 anon key를
          추가한 뒤 다시 시도하세요.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-rose-600 hover:underline">
          ← 홈으로
        </Link>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 상품 관리</h1>
        <p className="mt-4 text-zinc-600">
          상품을 관리하려면 관리자 계정으로 로그인해야 합니다.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          로그인
        </Link>
      </main>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 상품 관리</h1>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          접근 권한이 없습니다. 관리자(role=admin) 프로필이 필요합니다.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Supabase SQL Editor에서{" "}
          <code className="text-xs">
            update profiles set role = &apos;admin&apos; where email = &apos;your@email.com&apos;;
          </code>
        </p>
        <Link href="/account" className="mt-6 inline-block text-sm text-rose-600 hover:underline">
          마이페이지로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">상품 관리</h1>
        </div>
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-rose-600">
          ← 대시보드
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <AdminProductForm action={createProduct} categories={categories} />
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-rose-100 bg-white shadow-sm">
            <div className="border-b border-rose-50 px-6 py-4">
              <h2 className="font-semibold text-zinc-900">
                등록 상품 ({products.length})
              </h2>
            </div>
            <div className="divide-y divide-rose-50">
              {products.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-zinc-500">
                  등록된 상품이 없습니다. seed SQL을 실행하거나 폼으로 추가하세요.
                </p>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium uppercase text-rose-500">
                        {product.brand}
                      </p>
                      <Link
                        href={`/products/${product.slug}`}
                        className="font-semibold text-zinc-900 hover:text-rose-700"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        SKU {product.sku} · MOQ {product.moq} · 재고 {product.stock}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900">
                        {formatKRW(product.price)}
                      </p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          product.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : product.status === "draft"
                              ? "bg-zinc-100 text-zinc-600"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
