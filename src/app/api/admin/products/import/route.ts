import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils";
import { enrichImportRowsWithCategories, buildHanmiCategoryLookup, parseHanmiWorkbook, parseImportPrice } from "@/lib/admin/parse-hanmi-workbook";
import {
  normalizeCategoryKey,
  resolveHanmiCategory,
} from "@/lib/admin/hanmi-category-map";
import {
  barcodeVariants,
  canonicalBarcode,
  normalizeImportSku,
} from "@/lib/admin/product-dedupe";
import { fetchAllPages } from "@/lib/supabase/products";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";

export const runtime = "nodejs";
/** Large Hanmi workbooks (~18k rows) need several minutes even with batch upsert. */
export const maxDuration = 60; // Vercel Hobby cap; use chunked import or Pro for longer runs

const UPSERT_BATCH_SIZE = 500;
const IMAGE_BATCH_SIZE = 500;
const HANMI_REFERENCE_PATH = resolve("data/hanmi-brand-price-list.xlsx");

function loadHanmiCategoryLookup(): Map<string, string> {
  if (!existsSync(HANMI_REFERENCE_PATH)) {
    return new Map();
  }

  try {
    const buffer = readFileSync(HANMI_REFERENCE_PATH);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    return buildHanmiCategoryLookup(arrayBuffer);
  } catch {
    return new Map();
  }
}

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type ProductRow = {
  id: string;
  sku: string;
  slug: string;
  barcode: string | null;
};

type ProductPayload = {
  name: string;
  brand: string;
  sku: string;
  slug: string;
  category_id: string | null;
  barcode: string | null;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  price: number;
  compare_at_price?: number | null;
  moq: number;
  stock: number;
  status: "active" | "draft";
  import_batch_id: string;
  external_sku: string;
  source_row: Record<string, unknown>;
  content_status: "complete" | "pending";
  needs_image: boolean;
  needs_description: boolean;
};

function buildUniqueSlug(
  name: string,
  sku: string,
  reservedSlugs: Set<string>,
  currentSlug?: string,
): string {
  if (currentSlug) {
    return currentSlug;
  }

  const base = slugify(name) || slugify(sku) || `product-${Date.now()}`;
  if (!reservedSlugs.has(base)) {
    reservedSlugs.add(base);
    return base;
  }

  let suffix = 2;
  while (reservedSlugs.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  const generated = `${base}-${suffix}`;
  reservedSlugs.add(generated);
  return generated;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function scorePayload(payload: ProductPayload): number {
  let score = 0;
  if (payload.price > 0) {
    score += 4;
  }
  if (payload.image_url) {
    score += 2;
  }
  if (payload.description) {
    score += 1;
  }
  if (payload.barcode) {
    score += 1;
  }
  return score;
}

function dedupePayloadsBySku(payloads: ProductPayload[]): ProductPayload[] {
  const bySku = new Map<string, ProductPayload>();

  for (const payload of payloads) {
    const sku = payload.sku.trim();
    if (!sku) {
      continue;
    }

    const existing = bySku.get(sku);
    if (!existing || scorePayload(payload) >= scorePayload(existing)) {
      bySku.set(sku, payload);
    }
  }

  return Array.from(bySku.values());
}

function registerExistingProduct(
  product: ProductRow,
  productsBySku: Map<string, ProductRow>,
  productsByBarcode: Map<string, ProductRow>,
) {
  productsBySku.set(product.sku.trim(), product);

  const barcode =
    canonicalBarcode(product.barcode) ?? canonicalBarcode(product.sku);
  if (!barcode) {
    return;
  }

  for (const variant of barcodeVariants(barcode)) {
    productsByBarcode.set(variant, product);
  }
}

function lookupExistingProduct(
  sku: string,
  barcode: string | null,
  productsBySku: Map<string, ProductRow>,
  productsByBarcode: Map<string, ProductRow>,
): ProductRow | undefined {
  const normalizedSku = normalizeImportSku(sku, barcode);
  const directMatch = productsBySku.get(normalizedSku);
  if (directMatch) {
    return directMatch;
  }

  const canonical =
    canonicalBarcode(barcode) ?? canonicalBarcode(sku);
  if (canonical) {
    for (const variant of barcodeVariants(canonical)) {
      const match = productsByBarcode.get(variant);
      if (match) {
        return match;
      }
    }
  }

  return productsBySku.get(sku.trim());
}

export async function POST(request: Request) {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return NextResponse.json(
      { error: "Supabase\uac00 \uc124\uc815\ub418\uc9c0 \uc54a\uc544 \uc5d1\uc140 import\ub97c \uc2e4\ud589\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 503 },
    );
  }

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "\uad00\ub9ac\uc790 \uad8c\ud55c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "\uc5d1\uc140 \ud30c\uc77c\uc744 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694." },
      { status: 400 },
    );
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase \ud074\ub77c\uc774\uc5b8\ud2b8\ub97c \uc0dd\uc131\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const parsed = parseHanmiWorkbook(await file.arrayBuffer());
  const hanmiCategoryLookup = loadHanmiCategoryLookup();
  const rows = enrichImportRowsWithCategories(parsed.rows, hanmiCategoryLookup);
  const { sheetStats } = parsed;

  if (!rows.length) {
    return NextResponse.json(
      { error: "\uc720\ud6a8\ud55c \uc0c1\ud488 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4. brand-priority-list \ub610\ub294 Hanmi Price list \ud615\uc2dd\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694." },
      { status: 400 },
    );
  }

  const categoryPreview = [
    ...new Set(
      rows
        .map((row) => row.category?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ]
    .slice(0, 12)
    .map((raw) => {
      const resolved = resolveHanmiCategory(raw);
      return resolved ? { raw, slug: resolved.slug, name: resolved.name } : { raw };
    });

  const { data: batch, error: batchInsertError } = await supabase
    .from("product_import_batches")
    .insert({
      filename: file.name,
      row_count: rows.length,
      status: "processing",
    })
    .select("id")
    .single();

  if (batchInsertError || !batch) {
    return NextResponse.json(
      { error: batchInsertError?.message ?? "import \ubc30\uce58 \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4." },
      { status: 500 },
    );
  }

  const [existingProductsResult, categoriesResult] = await Promise.all([
    fetchAllPages<ProductRow>(async (from, to) => {
      const result = await supabase
        .from("products")
        .select("id, sku, slug, barcode")
        .range(from, to);
      return { data: (result.data ?? []) as ProductRow[], error: result.error };
    }),
    supabase.from("categories").select("id, name, slug"),
  ]);

  if (existingProductsResult.error) {
    return NextResponse.json(
      { error: `\uae30\uc874 \uc0c1\ud488 \uc870\ud68c \uc2e4\ud328: ${existingProductsResult.error}` },
      { status: 500 },
    );
  }

  const existingProducts = existingProductsResult.data;
  const categories = (categoriesResult.data ?? []) as CategoryRow[];

  const productsBySku = new Map<string, ProductRow>();
  const productsByBarcode = new Map<string, ProductRow>();
  const reservedSlugs = new Set<string>();
  for (const product of existingProducts) {
    registerExistingProduct(product, productsBySku, productsByBarcode);
    reservedSlugs.add(product.slug);
  }

  const categoryMap = new Map<string, string>();
  const categoryBySlug = new Map<string, CategoryRow>();
  for (const category of categories) {
    categoryBySlug.set(category.slug, category);
    categoryMap.set(normalizeCategoryKey(category.name), category.id);
    categoryMap.set(normalizeCategoryKey(category.slug), category.id);
  }

  const pendingCategories = new Map<string, { slug: string; name: string }>();
  for (const row of rows) {
    if (!row.category?.trim()) {
      continue;
    }

    const rawKey = normalizeCategoryKey(row.category);
    if (categoryMap.has(rawKey)) {
      continue;
    }

    const resolved = resolveHanmiCategory(row.category);
    if (!resolved) {
      continue;
    }

    const slugKey = normalizeCategoryKey(resolved.slug);
    if (categoryMap.has(slugKey) || categoryBySlug.has(resolved.slug)) {
      const existing = categoryBySlug.get(resolved.slug);
      if (existing) {
        categoryMap.set(slugKey, existing.id);
        categoryMap.set(normalizeCategoryKey(existing.name), existing.id);
      }
      continue;
    }

    pendingCategories.set(resolved.slug, {
      slug: resolved.slug,
      name: resolved.name,
    });
  }

  let categoriesCreated = 0;
  if (pendingCategories.size > 0) {
    const toInsert = Array.from(pendingCategories.values()).map(
      (category, index) => ({
        name: category.name,
        slug: category.slug,
        sort_order: 50 + index,
        is_active: true,
      }),
    );

    const { data: insertedCategories, error: categoryInsertError } =
      await supabase
        .from("categories")
        .upsert(toInsert, { onConflict: "slug" })
        .select("id, name, slug");

    if (categoryInsertError) {
      return NextResponse.json(
        {
          error: `\uce74\ud14c\uace0\ub9ac \uc0dd\uc131 \uc2e4\ud328: ${categoryInsertError.message}`,
        },
        { status: 500 },
      );
    }

    for (const category of (insertedCategories ?? []) as CategoryRow[]) {
      categoryBySlug.set(category.slug, category);
      categoryMap.set(normalizeCategoryKey(category.name), category.id);
      categoryMap.set(normalizeCategoryKey(category.slug), category.id);
      categoriesCreated += 1;
    }
  }

  function lookupCategoryId(raw: string | null | undefined): string | null {
    if (!raw?.trim()) {
      return null;
    }

    const rawKey = normalizeCategoryKey(raw);
    const directMatch = categoryMap.get(rawKey);
    if (directMatch) {
      return directMatch;
    }

    const resolved = resolveHanmiCategory(raw);
    if (!resolved) {
      return null;
    }

    return categoryMap.get(normalizeCategoryKey(resolved.slug)) ?? null;
  }

  let failedCount = 0;
  const errors: string[] = [];
  const payloads: ProductPayload[] = [];

  for (const row of rows) {
    const {
      name,
      sku,
      brand,
      category,
      barcode,
      description,
      image_url,
      price,
      msrp,
      moq,
      stock,
      volume,
    } = row;

    if (!name || !sku) {
      failedCount += 1;
      if (errors.length < 50) {
        errors.push("\uc0c1\ud488\uba85 \ub610\ub294 SKU \ub204\ub77d \ud589\uc740 \uac74\ub108\ub700\uc5c8\uc2b5\ub2c8\ub2e4.");
      }
      continue;
    }

    const resolvedPrice = parseImportPrice(price);
    if (resolvedPrice == null) {
      failedCount += 1;
      if (errors.length < 50) {
        errors.push(
          `${sku}: \ub3c4\ub9e4\uac00(PRICE) \uceec\ub7fc \uac12\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. MSRP/Retail\uc740 \ucc38\uace0\uac00\uc774\uba70 import \uac00\uaca9\uc73c\ub85c \uc0ac\uc6a9\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.`,
        );
      }
      continue;
    }

    const normalizedSku = normalizeImportSku(sku, barcode);
    const normalizedBarcode = canonicalBarcode(barcode) ?? barcode;
    const existing = lookupExistingProduct(
      sku,
      barcode,
      productsBySku,
      productsByBarcode,
    );
    const categoryId = lookupCategoryId(category);
    const resolvedSlug = buildUniqueSlug(
      name,
      normalizedSku,
      reservedSlugs,
      existing?.slug,
    );

    payloads.push({
      name,
      brand,
      sku: normalizedSku,
      slug: resolvedSlug,
      category_id: categoryId,
      barcode: normalizedBarcode,
      description,
      short_description: volume,
      image_url,
      price: resolvedPrice,
      compare_at_price: parseImportPrice(msrp),
      moq,
      stock,
      status: "active",
      import_batch_id: batch.id,
      external_sku: sku,
      source_row: {
        ...row.sourceRow,
        __sheet: row.sourceSheet,
      },
      content_status: image_url && description ? "complete" : "pending",
      needs_image: !image_url,
      needs_description: !description,
    });

    if (!existing) {
      const placeholder: ProductRow = {
        id: "",
        sku: normalizedSku,
        slug: resolvedSlug,
        barcode: normalizedBarcode,
      };
      registerExistingProduct(placeholder, productsBySku, productsByBarcode);
    }
  }

  const dedupedPayloads = dedupePayloadsBySku(payloads);
  let importedCount = 0;
  const imageJobs: Array<{ productId: string; name: string; imageUrl: string }> =
    [];

  for (const [batchIndex, payloadBatch] of chunkArray(
    dedupedPayloads,
    UPSERT_BATCH_SIZE,
  ).entries()) {
    const uniqueBatch = dedupePayloadsBySku(payloadBatch);
    const { data: upsertedRows, error: upsertError } = await supabase
      .from("products")
      .upsert(uniqueBatch, { onConflict: "sku" })
      .select("id, sku, slug, name, image_url, barcode");

    if (upsertError || !upsertedRows?.length) {
      failedCount += uniqueBatch.length;
      if (errors.length < 50) {
        errors.push(
          `\ubc30\uce58 ${batchIndex + 1} \uc5c5\uc11c\ud2b8 \uc2e4\ud328: ${upsertError?.message ?? "\uc54c \uc218 \uc5c6\ub294 \uc624\ub958"}`,
        );
      }
      continue;
    }

    importedCount += upsertedRows.length;

    for (const upserted of upsertedRows as Array<{
      id: string;
      sku: string;
      slug: string;
      name: string;
      image_url: string | null;
      barcode: string | null;
    }>) {
      registerExistingProduct(
        {
          id: upserted.id,
          sku: upserted.sku,
          slug: upserted.slug,
          barcode: upserted.barcode,
        },
        productsBySku,
        productsByBarcode,
      );
      reservedSlugs.add(upserted.slug);

      if (upserted.image_url) {
        imageJobs.push({
          productId: upserted.id,
          name: upserted.name,
          imageUrl: upserted.image_url,
        });
      }
    }

    await supabase
      .from("product_import_batches")
      .update({
        imported_count: importedCount,
        failed_count: failedCount,
      })
      .eq("id", batch.id);
  }

  for (const imageBatch of chunkArray(imageJobs, IMAGE_BATCH_SIZE)) {
    const productIds = imageBatch.map((job) => job.productId);

    await supabase
      .from("product_images")
      .delete()
      .in("product_id", productIds)
      .eq("is_primary", true);

    await supabase.from("product_images").insert(
      imageBatch.map((job) => ({
        product_id: job.productId,
        url: job.imageUrl,
        alt_text: job.name,
        sort_order: 0,
        is_primary: true,
      })),
    );
  }

  const finalStatus =
    failedCount === 0 ? "success" : importedCount > 0 ? "partial" : "failed";

  await supabase
    .from("product_import_batches")
    .update({
      imported_count: importedCount,
      failed_count: failedCount,
      status: finalStatus,
      imported_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  revalidatePath("/admin/products");
  revalidatePath("/en/products");
  revalidatePath("/ko/products");
  revalidatePath("/en/categories");
  revalidatePath("/ko/categories");

  const categorizedCount = rows.filter((row) => row.category?.trim()).length;

  return NextResponse.json({
    batchId: batch.id,
    rowCount: rows.length,
    importedCount,
    failedCount,
    categoriesCreated,
    categorizedCount,
    categoryPreview,
    status: finalStatus,
    sheetStats: sheetStats.slice(0, 20),
    errors: errors.slice(0, 15),
  });
}
