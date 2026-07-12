import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/supabase/products";

type Props = {
  category: Category;
};

const iconBySlug: Record<string, string> = {
  skincare: "SK",
  makeup: "MU",
  "mask-pack": "MP",
  suncare: "SC",
  "body-care": "BC",
};

export async function CategoryCard({ category }: Props) {
  const t = await getTranslations("categories");
  const icon = iconBySlug[category.slug] ?? "CT";

  return (
    <Link
      href={`/products?category=${category.slug}`}
      className="group flex flex-col rounded-2xl border border-rose-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-sm font-semibold">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-rose-700">{category.name}</h3>
      {category.description ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500">{category.description}</p>
      ) : null}
      <span className="mt-4 text-sm font-medium text-rose-600">{t("viewProducts")}</span>
    </Link>
  );
}
