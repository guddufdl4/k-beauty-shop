"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { AddToCartForm } from "@/components/store/add-to-cart-form";
import { getLocalizedCategoryName } from "@/lib/store/localized-category";
import { isProductSoldOut } from "@/lib/store/products-url";
import { formatLocalePrice, formatLocaleProductPrice } from "@/lib/utils";
import type { Category, ProductWithRelations } from "@/lib/supabase/products";

type ProductAdminDetailPanelProps = {
  product: ProductWithRelations;
  categories: Category[];
  locale: string;
  wholesaleLabel: string;
  moqLabel: string;
  usdKrwRate: number;
  minOrderNote?: string | null;
};

type EditableProduct = Pick<
  ProductWithRelations,
  | "id"
  | "name"
  | "brand"
  | "price"
  | "wholesale_price"
  | "moq"
  | "stock"
  | "sold_out"
  | "sku"
  | "slug"
  | "description"
  | "short_description"
  | "country_of_origin"
  | "category_id"
  | "category"
>;

function normalizeCategory(
  raw:
    | Pick<Category, "id" | "name" | "slug">
    | Pick<Category, "id" | "name" | "slug">[]
    | null,
  categories: Category[],
  categoryId: string | null,
): EditableProduct["category"] {
  if (Array.isArray(raw)) {
    return raw[0] ?? categories.find((cat) => cat.id === categoryId) ?? null;
  }
  return raw ?? categories.find((cat) => cat.id === categoryId) ?? null;
}

function toEditable(product: ProductWithRelations): EditableProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: product.price,
    wholesale_price: product.wholesale_price,
    moq: product.moq,
    stock: product.stock,
    sold_out: product.sold_out,
    sku: product.sku,
    slug: product.slug,
    description: product.description,
    short_description: product.short_description,
    country_of_origin: product.country_of_origin,
    category_id: product.category_id,
    category: product.category,
  };
}

export function ProductAdminDetailPanel({
  product: initialProduct,
  categories,
  locale,
  wholesaleLabel,
  moqLabel,
  usdKrwRate,
  minOrderNote,
}: ProductAdminDetailPanelProps) {
  const t = useTranslations("products");
  const tAdmin = useTranslations("products.adminEdit");
  const router = useRouter();

  const [product, setProduct] = useState<EditableProduct>(() => toEditable(initialProduct));
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand);
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [wholesalePrice, setWholesalePrice] = useState(
    String(product.wholesale_price ?? product.price),
  );
  const [moq, setMoq] = useState(String(product.moq));
  const [stock, setStock] = useState(String(product.stock));
  const [soldOut, setSoldOut] = useState(product.sold_out);
  const [shortDescription, setShortDescription] = useState(product.short_description ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(product.country_of_origin ?? "");
  const [description, setDescription] = useState(product.description ?? "");

  const resetDraft = useCallback((source: EditableProduct) => {
    setName(source.name);
    setBrand(source.brand);
    setCategoryId(source.category_id ?? "");
    setPrice(String(source.price));
    setWholesalePrice(String(source.wholesale_price ?? source.price));
    setMoq(String(source.moq));
    setStock(String(source.stock));
    setSoldOut(source.sold_out);
    setShortDescription(source.short_description ?? "");
    setCountryOfOrigin(source.country_of_origin ?? "");
    setDescription(source.description ?? "");
  }, []);

  const startEditing = () => {
    resetDraft(product);
    setIsEditing(true);
    setMessage(null);
    setError(null);
  };

  const cancelEditing = () => {
    resetDraft(product);
    setIsEditing(false);
    setMessage(null);
    setError(null);
  };

  const handleSave = async () => {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim(),
          category_id: categoryId.trim() || null,
          price: price.trim(),
          wholesale_price: wholesalePrice.trim(),
          moq: moq.trim(),
          stock: Number(stock),
          sold_out: soldOut,
          short_description: shortDescription.trim() || null,
          country_of_origin: countryOfOrigin.trim() || null,
          description: description.trim() || null,
          barcode: initialProduct.barcode ?? null,
        }),
      });

      const data = (await response.json()) as {
        product?: {
          id: string;
          name: string;
          brand: string;
          price: number;
          wholesale_price: number | null;
          moq: number;
          stock: number;
          sold_out: boolean;
          slug: string;
          description: string | null;
          short_description: string | null;
          country_of_origin: string | null;
          category_id: string | null;
          category:
            | { id: string; name: string; slug: string }
            | { id: string; name: string; slug: string }[]
            | null;
        };
        error?: string;
      };

      if (!response.ok || !data.product) {
        setError(data.error ?? tAdmin("saveError"));
        return;
      }

      const saved = data.product;
      const categoryRaw = saved.category as
        | { id: string; name: string; slug: string }
        | { id: string; name: string; slug: string }[]
        | null;
      const resolvedCategory = normalizeCategory(
        categoryRaw,
        categories,
        saved.category_id,
      );

      const updated: EditableProduct = {
        id: saved.id,
        name: saved.name,
        brand: saved.brand,
        price: saved.price,
        wholesale_price: saved.wholesale_price,
        moq: saved.moq,
        stock: saved.stock,
        sold_out: saved.sold_out,
        sku: product.sku,
        slug: saved.slug,
        description: saved.description,
        short_description: saved.short_description,
        country_of_origin: saved.country_of_origin,
        category_id: saved.category_id,
        category: resolvedCategory,
      };

      setProduct(updated);
      resetDraft(updated);
      setIsEditing(false);
      setMessage(tAdmin("saved"));
      router.refresh();
    } catch {
      setError(tAdmin("networkError"));
    } finally {
      setPending(false);
    }
  };

  const inStock = !isProductSoldOut(product);
  const localizedCategory = product.category
    ? getLocalizedCategoryName(product.category, locale)
    : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {tAdmin("badge")}
          </span>
          <p className="text-sm text-amber-900">{tAdmin("hint")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={pending}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-300 disabled:opacity-50"
              >
                {tAdmin("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={pending}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {pending ? tAdmin("saving") : tAdmin("save")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              {tAdmin("edit")}
            </button>
          )}
        </div>
      </div>

      {message ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="admin-edit-brand" className="block text-xs font-medium text-zinc-500">
                {t("brandCatalog")}
              </label>
              <input
                id="admin-edit-brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                maxLength={120}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm uppercase tracking-widest text-rose-500"
              />
            </div>
            <div>
              <label htmlFor="admin-edit-name" className="block text-xs font-medium text-zinc-500">
                {tAdmin("nameLabel")}
              </label>
              <input
                id="admin-edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-lg font-bold"
              />
            </div>
            <div>
              <label htmlFor="admin-edit-category" className="block text-xs font-medium text-zinc-500">
                {t("categoryFilter")}
              </label>
              <select
                id="admin-edit-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">{tAdmin("noCategory")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {getLocalizedCategoryName(cat, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="admin-edit-short-desc"
                className="block text-xs font-medium text-zinc-500"
              >
                {t("volume")}
              </label>
              <input
                id="admin-edit-short-desc"
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-rose-500">
              {product.brand}
            </p>
            <h1 className="mt-2 text-balance break-words text-3xl font-bold tracking-tight text-zinc-900">
              {product.name}
            </h1>
            {product.short_description ? (
              <p className="mt-3 break-words text-lg text-zinc-600">{product.short_description}</p>
            ) : null}
            {localizedCategory ? (
              <p className="mt-2 text-sm text-zinc-500">
                {t("categoryFilter")}: {localizedCategory}
              </p>
            ) : null}
          </>
        )}

        <div
          className={`mt-8 min-w-0 space-y-4 rounded-2xl border p-6 ${
            isEditing ? "border-amber-200 bg-amber-50/30" : "border-rose-100 bg-white"
          }`}
        >
          {isEditing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="admin-edit-price" className="block text-xs font-medium text-zinc-500">
                  {t("retailPrice")}
                </label>
                <input
                  id="admin-edit-price"
                  type="number"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-edit-wholesale"
                  className="block text-xs font-medium text-zinc-500"
                >
                  {wholesaleLabel}
                </label>
                <input
                  id="admin-edit-wholesale"
                  type="number"
                  min={0}
                  step={1}
                  value={wholesalePrice}
                  onChange={(event) => setWholesalePrice(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="admin-edit-moq" className="block text-xs font-medium text-zinc-500">
                  {moqLabel}
                </label>
                <input
                  id="admin-edit-moq"
                  type="number"
                  min={1}
                  step={1}
                  value={moq}
                  onChange={(event) => setMoq(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="admin-edit-stock" className="block text-xs font-medium text-zinc-500">
                  {t("stock")}
                </label>
                <input
                  id="admin-edit-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-edit-sold-out"
                  className="block text-xs font-medium text-zinc-500"
                >
                  {tAdmin("soldOutLabel")}
                </label>
                <select
                  id="admin-edit-sold-out"
                  value={soldOut ? "sold_out" : "available"}
                  onChange={(event) => setSoldOut(event.target.value === "sold_out")}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="available">{tAdmin("available")}</option>
                  <option value="sold_out">{t("outOfStock")}</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-edit-origin" className="block text-xs font-medium text-zinc-500">
                  {t("origin")}
                </label>
                <input
                  id="admin-edit-origin"
                  value={countryOfOrigin}
                  onChange={(event) => setCountryOfOrigin(event.target.value)}
                  maxLength={500}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="admin-edit-sku" className="block text-xs font-medium text-zinc-500">
                  {t("sku")}
                </label>
                <input
                  id="admin-edit-sku"
                  value={product.sku}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-500"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {t("retailPrice")}
                  </p>
                  <p className="text-2xl font-bold text-zinc-900">
                    {formatLocaleProductPrice(product.price, locale, usdKrwRate)}
                  </p>
                  {initialProduct.compare_at_price ? (
                    <p className="text-sm text-zinc-400 line-through">
                      {formatLocalePrice(initialProduct.compare_at_price, locale, usdKrwRate)}
                    </p>
                  ) : null}
                </div>
                {product.wholesale_price ? (
                  <div className="min-w-0 text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {wholesaleLabel}
                    </p>
                    <p className="text-xl font-bold text-rose-700">
                      {formatLocaleProductPrice(product.wholesale_price, locale, usdKrwRate)}
                    </p>
                  </div>
                ) : null}
              </div>

              <dl className="grid min-w-0 grid-cols-2 gap-4 border-t border-rose-50 pt-4 text-sm">
                <div className="min-w-0">
                  <dt className="text-zinc-500">{moqLabel}</dt>
                  <dd className="font-semibold text-zinc-900">
                    {t("moqUnit", { count: product.moq })}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-zinc-500">{t("stock")}</dt>
                  <dd className={`font-semibold ${inStock ? "text-emerald-600" : "text-red-600"}`}>
                    {inStock ? t("inStock", { count: product.stock }) : t("outOfStock")}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-zinc-500">{t("sku")}</dt>
                  <dd className="break-all font-mono text-zinc-800">{product.sku}</dd>
                </div>
                {product.short_description ? (
                  <div className="min-w-0">
                    <dt className="text-zinc-500">{t("volume")}</dt>
                    <dd className="break-words font-semibold text-zinc-900">
                      {product.short_description}
                    </dd>
                  </div>
                ) : null}
                {product.country_of_origin ? (
                  <div className="min-w-0">
                    <dt className="text-zinc-500">{t("origin")}</dt>
                    <dd className="break-words font-semibold text-zinc-900">
                      {product.country_of_origin}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </>
          )}
        </div>

        <AddToCartForm
          productId={product.id}
          moq={product.moq}
          stock={product.stock}
          soldOut={product.sold_out}
        />

        {minOrderNote ? (
          <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50/50 px-4 py-3 text-sm text-zinc-600">
            {minOrderNote}
          </p>
        ) : null}

        {isEditing ? (
          <section className="mt-10 min-w-0">
            <label htmlFor="admin-edit-description" className="text-lg font-semibold text-zinc-900">
              {t("description")}
            </label>
            <textarea
              id="admin-edit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={8}
              maxLength={10000}
              className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-relaxed"
            />
          </section>
        ) : product.description ? (
          <section className="mt-10 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900">{t("description")}</h2>
            <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-zinc-600">
              {product.description}
            </p>
          </section>
        ) : null}

        {!isEditing && initialProduct.ingredients ? (
          <section className="mt-8 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900">{t("ingredients")}</h2>
            <p className="mt-3 break-words text-sm leading-relaxed text-zinc-600">
              {initialProduct.ingredients}
            </p>
          </section>
        ) : null}

        {!isEditing && initialProduct.how_to_use ? (
          <section className="mt-8 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900">{t("howToUse")}</h2>
            <p className="mt-3 break-words text-sm leading-relaxed text-zinc-600">
              {initialProduct.how_to_use}
            </p>
          </section>
        ) : null}
      </div>
    </>
  );
}
