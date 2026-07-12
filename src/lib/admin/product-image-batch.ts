import {
  resolveProductImage,
  type ImageResolveSource,
} from "@/lib/admin/product-image-resolver";
import { applyDeletedAtFilter, fetchExactCount } from "@/lib/supabase/products";
import { createPublicClient, createServiceClient } from "@/lib/supabase/service";
import { ensureSoftDeleteColumnProbed } from "@/lib/supabase/soft-delete";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

const DEFAULT_BATCH_LIMIT = 1000;
const MAX_BATCH_LIMIT = 1000;

export type ProductImageFillRun = {
  id: string;
  batch_number: number;
  limit_count: number;
  processed_count: number;
  from_source_row: number;
  from_category_image: number;
  from_placeholder: number;
  remaining_count: number;
  status: "success" | "partial" | "failed";
  created_at: string;
};

export type ProductImageBatchStats = {
  totalProducts: number;
  withImage: number;
  withoutImage: number;
  estimatedBatches: number;
  defaultBatchSize: number;
  lastRun: ProductImageFillRun | null;
};

export type ProductImageBatchResult = ProductImageFillRun & {
  skippedAlreadyHasImage: number;
  sample: Array<{
    sku: string;
    name: string;
    source: ImageResolveSource;
    url: string;
  }>;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  status: string;
  image_url: string | null;
  description: string | null;
  source_row: Record<string, unknown> | null;
  category: {
    slug: string;
    name: string;
    image_url: string | null;
  } | null;
  images: Array<{ id: string; is_primary: boolean }> | null;
};

function clampLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) {
    return DEFAULT_BATCH_LIMIT;
  }

  return Math.min(MAX_BATCH_LIMIT, Math.max(1, Math.floor(limit)));
}

function hasExistingImage(product: ProductRow): boolean {
  if (product.image_url?.trim()) {
    return true;
  }

  return (product.images?.length ?? 0) > 0;
}

function mapFillRun(row: Record<string, unknown>): ProductImageFillRun {
  const status = String(row.status ?? "success");
  return {
    id: String(row.id),
    batch_number: Number(row.batch_number ?? 0),
    limit_count: Number(row.limit_count ?? 0),
    processed_count: Number(row.processed_count ?? 0),
    from_source_row: Number(row.from_source_row ?? 0),
    from_category_image: Number(row.from_category_image ?? 0),
    from_placeholder: Number(row.from_placeholder ?? 0),
    remaining_count: Number(row.remaining_count ?? 0),
    status:
      status === "partial" || status === "failed" || status === "success"
        ? status
        : "success",
    created_at: String(row.created_at),
  };
}

function emptyStats(): ProductImageBatchStats {
  return {
    totalProducts: 0,
    withImage: 0,
    withoutImage: 0,
    estimatedBatches: 0,
    defaultBatchSize: DEFAULT_BATCH_LIMIT,
    lastRun: null,
  };
}

export async function getProductImageBatchStats(
  supabase: SupabaseClient,
): Promise<{ stats: ProductImageBatchStats; error: string | null }> {
  await ensureSoftDeleteColumnProbed(supabase);

  const { count: totalProducts, error: totalError } = await fetchExactCount(
    supabase,
    "products",
    (query) => applyDeletedAtFilter(query, "active"),
  );

  if (totalError) {
    return { stats: emptyStats(), error: totalError };
  }

  const { count: withoutImage, error: missingError } = await fetchExactCount(
    supabase,
    "products",
    (query) => {
      const filtered = applyDeletedAtFilter(query, "active") as unknown as {
        or: (filter: string) => ReturnType<SupabaseClient["from"]>;
      };
      return filtered.or("image_url.is.null,image_url.eq.");
    },
  );

  if (missingError) {
    return { stats: emptyStats(), error: missingError };
  }

  const missing = withoutImage ?? 0;
  const total = totalProducts ?? 0;
  const withImage = Math.max(0, total - missing);

  const { data: lastRunRow, error: lastRunError } = await supabase
    .from("product_image_fill_runs")
    .select("*")
    .order("batch_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRunError) {
    return { stats: emptyStats(), error: lastRunError.message };
  }

  return {
    stats: {
      totalProducts: total,
      withImage,
      withoutImage: missing,
      estimatedBatches: Math.ceil(missing / DEFAULT_BATCH_LIMIT),
      defaultBatchSize: DEFAULT_BATCH_LIMIT,
      lastRun: lastRunRow
        ? mapFillRun(lastRunRow as Record<string, unknown>)
        : null,
    },
    error: null,
  };
}

const IMAGE_BATCH_STATS_CACHE_SECONDS = 60;

export async function getCachedProductImageBatchStats(): Promise<{
  stats: ProductImageBatchStats;
  error: string | null;
}> {
  return unstable_cache(
    async () => {
      const supabase = createServiceClient() ?? createPublicClient();
      if (!supabase) {
        return { stats: emptyStats(), error: "Supabase not configured" };
      }

      return getProductImageBatchStats(supabase);
    },
    ["admin-product-image-batch-stats"],
    { revalidate: IMAGE_BATCH_STATS_CACHE_SECONDS },
  )();
}

export async function runProductImageBatch(
  supabase: SupabaseClient,
  limitInput?: number,
): Promise<{ result: ProductImageBatchResult | null; error: string | null }> {
  const limit = clampLimit(limitInput);

  await ensureSoftDeleteColumnProbed(supabase);

  const { data: candidates, error: selectError } = await applyDeletedAtFilter(
    supabase
      .from("products")
      .select(
        `
      id,
      sku,
      name,
      brand,
      status,
      image_url,
      description,
      source_row,
      category:categories(slug, name, image_url),
      images:product_images(id, is_primary)
    `,
      )
      .or("image_url.is.null,image_url.eq.")
      .order("sku", { ascending: true })
      .limit(limit * 2),
    "active",
  );

  if (selectError) {
    return { result: null, error: selectError.message };
  }

  const rows = (candidates ?? []) as unknown as ProductRow[];
  const toProcess = rows.filter((row) => !hasExistingImage(row)).slice(0, limit);

  const { count: previousRuns } = await supabase
    .from("product_image_fill_runs")
    .select("*", { count: "exact", head: true });

  const batchNumber = (previousRuns ?? 0) + 1;

  if (toProcess.length === 0) {
    const { stats } = await getProductImageBatchStats(supabase);
    const runPayload = {
      batch_number: batchNumber,
      limit_count: limit,
      processed_count: 0,
      from_source_row: 0,
      from_category_image: 0,
      from_placeholder: 0,
      remaining_count: stats.withoutImage,
      status: "success" as const,
    };

    const { data: runRow, error: runError } = await supabase
      .from("product_image_fill_runs")
      .insert(runPayload)
      .select("*")
      .single();

    if (runError) {
      return { result: null, error: runError.message };
    }

    return {
      result: {
        ...mapFillRun(runRow as Record<string, unknown>),
        skippedAlreadyHasImage: rows.length - toProcess.length,
        sample: [],
      },
      error: null,
    };
  }

  let fromSourceRow = 0;
  let fromCategoryImage = 0;
  let fromPlaceholder = 0;
  const sample: ProductImageBatchResult["sample"] = [];
  const imageJobs: Array<{ productId: string; name: string; imageUrl: string }> =
    [];

  for (const product of toProcess) {
    const resolved = resolveProductImage({
      sourceRow: product.source_row,
      categorySlug: product.category?.slug,
      categoryImageUrl: product.category?.image_url,
    });

    if (resolved.source === "source_row") {
      fromSourceRow += 1;
    } else if (resolved.source === "category_image") {
      fromCategoryImage += 1;
    } else {
      fromPlaceholder += 1;
    }

    if (sample.length < 5) {
      sample.push({
        sku: product.sku,
        name: product.name,
        source: resolved.source,
        url: resolved.url,
      });
    }

    const contentComplete = Boolean(product.description?.trim());
    const updatePayload: Record<string, unknown> = {
      image_url: resolved.url,
      needs_image: false,
      content_status: contentComplete ? "complete" : "pending",
    };

    if (product.status === "draft") {
      updatePayload.status = "active";
    }

    const { error: updateError } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", product.id);

    if (updateError) {
      return { result: null, error: updateError.message };
    }

    imageJobs.push({
      productId: product.id,
      name: product.name,
      imageUrl: resolved.url,
    });
  }

  const productIds = imageJobs.map((job) => job.productId);
  await supabase
    .from("product_images")
    .delete()
    .in("product_id", productIds)
    .eq("is_primary", true);

  const { error: insertError } = await supabase.from("product_images").insert(
    imageJobs.map((job) => ({
      product_id: job.productId,
      url: job.imageUrl,
      alt_text: job.name,
      sort_order: 0,
      is_primary: true,
    })),
  );

  if (insertError) {
    return { result: null, error: insertError.message };
  }

  const { count: remainingCount, error: remainingError } = await fetchExactCount(
    supabase,
    "products",
    (query) =>
      (query as unknown as { or: (filter: string) => ReturnType<SupabaseClient["from"]> }).or(
        "image_url.is.null,image_url.eq.",
      ),
  );

  if (remainingError) {
    return { result: null, error: remainingError };
  }

  const processedCount = toProcess.length;
  const status =
    processedCount === limit ? "success" : processedCount > 0 ? "partial" : "failed";

  const { data: runRow, error: runError } = await supabase
    .from("product_image_fill_runs")
    .insert({
      batch_number: batchNumber,
      limit_count: limit,
      processed_count: processedCount,
      from_source_row: fromSourceRow,
      from_category_image: fromCategoryImage,
      from_placeholder: fromPlaceholder,
      remaining_count: remainingCount ?? 0,
      status,
    })
    .select("*")
    .single();

  if (runError) {
    return { result: null, error: runError.message };
  }

  return {
    result: {
      ...mapFillRun(runRow as Record<string, unknown>),
      skippedAlreadyHasImage: rows.length - toProcess.length,
      sample,
    },
    error: null,
  };
}
