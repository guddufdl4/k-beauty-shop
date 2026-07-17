const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = process.cwd();
const envPath = path.join(ROOT, ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i <= 0) continue;
  const key = t.slice(0, i).trim();
  let val = t.slice(i + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

const PLACEHOLDER_PREFIX = "/images/categories/";
const SOURCE_ROW_IMAGE_KEYS = ["image_url", "imageurl", "image", "img", "photo", "picture"];
const PAGE_SIZE = 500;
const dryRun = process.argv.includes("--dry-run");

function normalizeKey(input) {
  return input.toLowerCase().replace(/[\s_\-/()[\].\r\n]+/g, "");
}

function isRealImageUrl(url) {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.startsWith(PLACEHOLDER_PREFIX)) return false;
  return true;
}

function extractSourceRowImageUrl(sourceRow) {
  if (!sourceRow || typeof sourceRow !== "object") return null;
  const entries = new Map();
  for (const [key, value] of Object.entries(sourceRow)) {
    if (key.startsWith("__")) continue;
    entries.set(normalizeKey(key), value);
  }
  for (const key of SOURCE_ROW_IMAGE_KEYS) {
    const value = entries.get(normalizeKey(key));
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function resolveNeedsImage(product, images) {
  if ((images || []).some((image) => isRealImageUrl(image.url))) return false;
  if (isRealImageUrl(product.image_url)) return false;
  if (isRealImageUrl(extractSourceRowImageUrl(product.source_row))) return false;
  return true;
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  let scanned = 0;
  let needsImageUpdated = 0;
  let batchBackfilled = 0;
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await sb
      .from("products")
      .select("id, sku, image_url, source_row, needs_image, import_batch_id, created_at, images:product_images(url)")
      .range(from, to);
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const product of data) {
      scanned += 1;
      const shouldNeedImage = resolveNeedsImage(product, product.images || []);
      if (product.needs_image !== shouldNeedImage) {
        if (!dryRun) {
          const { error: updateError } = await sb
            .from("products")
            .update({ needs_image: shouldNeedImage })
            .eq("id", product.id);
          if (updateError) throw new Error(updateError.message);
        }
        needsImageUpdated += 1;
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const { data: orphanProducts } = await sb
    .from("products")
    .select("id, sku, created_at")
    .is("import_batch_id", null);

  const { data: batches } = await sb
    .from("product_import_batches")
    .select("id, filename, created_at, imported_at")
    .order("created_at", { ascending: true });

  for (const product of orphanProducts || []) {
    const createdAt = new Date(product.created_at).getTime();
    let bestBatch = null;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const batch of batches || []) {
      const batchTime = new Date(batch.imported_at || batch.created_at).getTime();
      const delta = Math.abs(createdAt - batchTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestBatch = batch;
      }
    }
    if (!bestBatch || bestDelta > 1000 * 60 * 60 * 24 * 7) continue;
    if (!dryRun) {
      const { error: updateError } = await sb
        .from("products")
        .update({ import_batch_id: bestBatch.id })
        .eq("id", product.id);
      if (updateError) throw new Error(updateError.message);
    }
    batchBackfilled += 1;
  }

  const { count: withBatch } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .not("import_batch_id", "is", null);
  const { count: needsImageTrue } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("needs_image", true);
  const { count: needsImageFalse } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("needs_image", false);
  const { data: page1Sort } = await sb
    .from("products")
    .select("id, sku, needs_image, image_url")
    .order("needs_image", { ascending: true })
    .order("created_at", { ascending: false })
    .range(0, 9);

  console.log(JSON.stringify({
    dryRun,
    scanned,
    needsImageUpdated,
    batchBackfilled,
    withBatch,
    needsImageTrue,
    needsImageFalse,
    page1Sort,
  }, null, 2));
})();
