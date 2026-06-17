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
          移댄뀒怨좊━
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600">
          K-酉고떚 ?섏텧 移댄뀒怨좊━蹂꾨줈 ?곹뭹???먯깋?섏꽭?? B2B쨌B2C 紐⑤몢 吏?먰빀?덈떎.
        </p>
        {!meta.configured ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Supabase 誘몄뿰寃????섑뵆 移댄뀒怨좊━瑜??쒖떆?⑸땲??{" "}
            <code className="text-xs">.env.local</code> ?ㅼ젙 ??seed SQL??            ?ㅽ뻾?섎㈃ DB ?곗씠?곌? ?쒖떆?⑸땲??
          </p>
        ) : meta.source === "static" && !meta.error ? (
          <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            DB??移댄뀒怨좊━媛 ?놁뒿?덈떎.{" "}
            <code className="text-xs">supabase/seed.sql</code>???ㅽ뻾??二쇱꽭??
          </p>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="?깅줉??移댄뀒怨좊━媛 ?놁뒿?덈떎"
          description="愿由ъ옄 ?섏씠吏?먯꽌 移댄뀒怨좊━瑜?異붽??섍굅??seed SQL???ㅽ뻾?섏꽭??"
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
          ?꾩껜 ?곹뭹 蹂닿린
        </Link>
      </div>
    </main>
  );
}

