import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/store/add-to-cart-form";
import { ProductImagePlaceholder } from "@/components/store/product-image-placeholder";
import { getProductBySlug } from "@/lib/supabase/products";
import { formatKRW } from "@/lib/utils";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const { product, meta } = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const primaryImage =
    product.images.find((img) => img.is_primary) ?? product.images[0];
  const inStock = product.stock > 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      {!meta.configured ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabase 미연결 — 샘플 상품 데이터를 표시합니다.
        </p>
      ) : null}

      <nav className="mb-8 text-sm text-zinc-500">
        <Link href="/products" className="hover:text-rose-600">
          상품
        </Link>
        {product.category ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-rose-600"
            >
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-zinc-800">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage.url}
              alt={primaryImage.alt_text ?? product.name}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ) : (
            <ProductImagePlaceholder
              brand={product.brand}
              name={product.name}
            />
          )}
          {product.images.length > 1 ? (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {product.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.alt_text ?? product.name}
                  className="aspect-square rounded-lg object-cover ring-1 ring-rose-100"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-500">
            {product.brand}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
            {product.name}
          </h1>
          {product.short_description ? (
            <p className="mt-3 text-lg text-zinc-600">
              {product.short_description}
            </p>
          ) : null}

          <div className="mt-8 space-y-4 rounded-2xl border border-rose-100 bg-white p-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  소매가 (B2C)
                </p>
                <p className="text-2xl font-bold text-zinc-900">
                  {formatKRW(product.price)}
                </p>
                {product.compare_at_price ? (
                  <p className="text-sm text-zinc-400 line-through">
                    {formatKRW(product.compare_at_price)}
                  </p>
                ) : null}
              </div>
              {product.wholesale_price ? (
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    도매가 (B2B)
                  </p>
                  <p className="text-xl font-bold text-rose-700">
                    {formatKRW(product.wholesale_price)}
                  </p>
                </div>
              ) : null}
            </div>

            <dl className="grid grid-cols-2 gap-4 border-t border-rose-50 pt-4 text-sm">
              <div>
                <dt className="text-zinc-500">MOQ</dt>
                <dd className="font-semibold text-zinc-900">
                  {product.moq}개 이상
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">재고</dt>
                <dd
                  className={`font-semibold ${inStock ? "text-emerald-600" : "text-red-600"}`}
                >
                  {inStock ? `${product.stock}개` : "품절"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">SKU</dt>
                <dd className="font-mono text-zinc-800">{product.sku}</dd>
              </div>
              {product.country_of_origin ? (
                <div>
                  <dt className="text-zinc-500">원산지</dt>
                  <dd className="font-semibold text-zinc-900">
                    {product.country_of_origin}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <AddToCartForm
            productId={product.id}
            moq={product.moq}
            stock={product.stock}
          />

          {product.description ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-zinc-900">상품 설명</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-zinc-600">
                {product.description}
              </p>
            </section>
          ) : null}

          {product.ingredients ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-900">전성분</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                {product.ingredients}
              </p>
            </section>
          ) : null}

          {product.how_to_use ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-900">사용법</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                {product.how_to_use}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
