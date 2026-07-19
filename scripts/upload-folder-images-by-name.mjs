/**
 * Match local image files to products by filename (SKU/barcode) or fuzzy product name,
 * upload to Supabase product-images bucket, and set products.image_url.
 *
 * Usage:
 *   node scripts/upload-folder-images-by-name.mjs --dir "C:\path\to\images"
 *   node scripts/upload-folder-images-by-name.mjs --dir "..." --dry-run
 *   node scripts/upload-folder-images-by-name.mjs --dir "..." --overwrite
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { normalizeProductImageBuffer } from "./lib/normalize-product-image.mjs";

const ROOT = process.cwd();
const BUCKET = "product-images";
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".jfif",
  ".avif",
  ".gif",
]);

function parseCliArgs(argv) {
  let dryRun = false;
  let overwrite = false;
  let imagesDir = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--overwrite") overwrite = true;
    else if (arg === "--dir" && argv[i + 1]) imagesDir = argv[++i].trim();
    else if (arg.startsWith("--dir=")) imagesDir = arg.slice("--dir=".length).trim();
  }
  return { dryRun, overwrite, imagesDir };
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function normalizeKey(input) {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s_\-/()[\].,\r\n]+/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9가-힣]/g, "");
}

function cleanFilenameStem(stem) {
  return stem
    .replace(/\(\d+\)$/g, "")
    .replace(/\s*\(R\d+\)\s*$/i, "")
    .replace(/\s*\(REFILL\)\s*$/i, "")
    .replace(/\s*\(VEGAN\)\s*$/i, "")
    .replace(/\s*\[Duty Free\]\s*/i, "")
    .replace(/\s*\(S\)\s*/i, "")
    .replace(/\s*\(F\)\s*$/i, "")
    .replace(/\.NEW$/i, "")
    .replace(/\.\.+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectMimeType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  if (buffer.length >= 6) {
    const head = buffer.slice(0, 6).toString("ascii");
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  return "image/jpeg";
}

function extensionScore(ext) {
  const e = ext.toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return 5;
  if (e === ".webp") return 4;
  if (e === ".png") return 3;
  if (e === ".jfif") return 2;
  if (e === ".avif") return 1;
  return 0;
}

function collectLocalImages(imagesDir) {
  const entries = [];

  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      const ext = path.extname(name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      const rawStem = path.basename(name, ext);
      const cleanedStem = cleanFilenameStem(rawStem);
      entries.push({
        file: name,
        full,
        ext,
        rawStem,
        cleanedStem,
        normalizedStem: normalizeKey(cleanedStem),
        size: stat.size,
        duplicateHint: /\(\d+\)$/.test(rawStem.trim()),
      });
    }
  }

  walk(imagesDir);

  const byNormalized = new Map();
  for (const entry of entries) {
    const key = entry.normalizedStem;
    if (!key) continue;
    if (!byNormalized.has(key)) byNormalized.set(key, []);
    byNormalized.get(key).push(entry);
  }

  const chosen = new Map();
  for (const [key, group] of byNormalized) {
    group.sort((a, b) => {
      if (a.duplicateHint !== b.duplicateHint) return a.duplicateHint ? 1 : -1;
      const extDiff = extensionScore(b.ext) - extensionScore(a.ext);
      if (extDiff !== 0) return extDiff;
      return b.size - a.size;
    });
    chosen.set(key, group[0]);
  }

  return { all: entries, chosen };
}

async function fetchAllProducts(supabase) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, barcode, slug, name, brand, description, image_url, needs_image")
      .range(from, to);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function buildProductLookups(products) {
  const bySku = new Map();
  const byBarcode = new Map();
  const bySlug = new Map();
  const byName = new Map();
  const byBrandName = new Map();
  const nameList = [];

  for (const p of products) {
    const nameKey = normalizeKey(p.name);
    const brandNameKey = normalizeKey(`${p.brand ?? ""}${p.name ?? ""}`);
    if (nameKey) {
      if (!byName.has(nameKey)) byName.set(nameKey, []);
      byName.get(nameKey).push(p);
      nameList.push({ key: nameKey, product: p, kind: "name" });
    }
    if (brandNameKey) {
      if (!byBrandName.has(brandNameKey)) byBrandName.set(brandNameKey, []);
      byBrandName.get(brandNameKey).push(p);
      nameList.push({ key: brandNameKey, product: p, kind: "brandName" });
    }
    for (const [field, map] of [
      [p.sku, bySku],
      [p.barcode, byBarcode],
      [p.slug, bySlug],
    ]) {
      if (!field) continue;
      const val = String(field).trim();
      map.set(val, p);
      map.set(val.toLowerCase(), p);
    }
  }

  return { bySku, byBarcode, bySlug, byName, byBrandName, nameList };
}

function tokenOverlapScore(a, b) {
  const ta = a.match(/[a-z0-9가-힣]{2,}/g) ?? [];
  const tb = b.match(/[a-z0-9가-힣]{2,}/g) ?? [];
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  let overlap = 0;
  for (const t of ta) if (setB.has(t)) overlap += 1;
  return overlap / Math.max(ta.length, tb.length);
}

function findProductForImage(imageEntry, lookups) {
  const { bySku, byBarcode, bySlug, byName, byBrandName, nameList } = lookups;
  const candidates = [
    imageEntry.rawStem,
    imageEntry.cleanedStem,
    imageEntry.normalizedStem,
  ];

  for (const candidate of candidates) {
    const trimmed = String(candidate ?? "").trim();
    if (!trimmed) continue;
    for (const map of [bySku, byBarcode, bySlug]) {
      if (map.has(trimmed)) return { product: map.get(trimmed), method: "exact-id" };
      if (map.has(trimmed.toLowerCase())) {
        return { product: map.get(trimmed.toLowerCase()), method: "exact-id" };
      }
    }
  }

  const norm = imageEntry.normalizedStem;
  if (!norm) return null;

  if (byName.has(norm)) {
    const matches = byName.get(norm);
    if (matches.length === 1) return { product: matches[0], method: "exact-name" };
    return { product: matches[0], method: "exact-name-ambiguous", ambiguous: matches };
  }
  if (byBrandName.has(norm)) {
    const matches = byBrandName.get(norm);
    if (matches.length === 1) return { product: matches[0], method: "exact-brand-name" };
    return { product: matches[0], method: "exact-brand-name-ambiguous", ambiguous: matches };
  }

  let best = null;
  let bestScore = 0;
  for (const item of nameList) {
    const productKey = item.key;
    if (!productKey) continue;
    if (productKey.includes(norm) || norm.includes(productKey)) {
      const shorter = Math.min(productKey.length, norm.length);
      const longer = Math.max(productKey.length, norm.length);
      const containScore = shorter / longer;
      const score = containScore * (item.kind === "name" ? 0.98 : 0.95);
      if (score > bestScore) {
        bestScore = score;
        best = { product: item.product, method: "contains-name", score };
      }
    }
  }

  if (best && bestScore >= 0.72) return best;

  for (const item of nameList) {
    const score = tokenOverlapScore(norm, item.key);
    if (score > bestScore && score >= 0.75) {
      bestScore = score;
      best = { product: item.product, method: "token-overlap", score };
    }
  }

  if (best && bestScore >= 0.72) return best;
  return null;
}

function sanitizeStorageKey(sku) {
  return String(sku ?? "product").replace(/[/\\?%*:|"<>]/g, "-");
}

function hasRealImageUrl(url) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/images/categories/")) return false;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

async function updateProductImage(supabase, product, publicUrl) {
  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("description, name")
    .eq("id", product.id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("product not found");

  const { error: updateError } = await supabase
    .from("products")
    .update({
      image_url: publicUrl,
      needs_image: false,
      content_status:
        publicUrl && existing.description?.trim() ? "complete" : "pending",
    })
    .eq("id", product.id);
  if (updateError) throw new Error(updateError.message);

  await supabase
    .from("product_images")
    .delete()
    .eq("product_id", product.id)
    .eq("is_primary", true);

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: product.id,
    url: publicUrl,
    alt_text: existing.name ?? product.name,
    sort_order: 0,
    is_primary: true,
  });
  if (insertError) throw new Error(insertError.message);
}

async function main() {
  const { dryRun, overwrite, imagesDir } = parseCliArgs(process.argv.slice(2));
  if (!imagesDir) {
    console.error("Usage: node scripts/upload-folder-images-by-name.mjs --dir <folder> [--dry-run] [--overwrite]");
    process.exit(1);
  }
  if (!fs.existsSync(imagesDir)) {
    console.error(`Folder not found: ${imagesDir}`);
    process.exit(1);
  }

  loadEnvLocal();
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { all, chosen } = collectLocalImages(imagesDir);
  const products = await fetchAllProducts(supabase);
  const lookups = buildProductLookups(products);

  const report = {
    dryRun,
    overwrite,
    imagesDir,
    totalImageFiles: all.length,
    uniqueNameKeys: chosen.size,
    matched: 0,
    uploaded: 0,
    skippedHasImage: 0,
    skippedNoMatch: [],
    invalidImage: [],
    uploadErrors: [],
    updatedProducts: [],
    matchMethods: {},
  };

  const usedProductIds = new Set();

  for (const [normalizedStem, imageEntry] of chosen) {
    const match = findProductForImage(imageEntry, lookups);
    if (!match?.product) {
      report.skippedNoMatch.push({
        file: imageEntry.file,
        stem: imageEntry.cleanedStem,
        normalizedStem,
      });
      continue;
    }

    report.matched += 1;
    report.matchMethods[match.method] = (report.matchMethods[match.method] ?? 0) + 1;

    const product = match.product;
    if (usedProductIds.has(product.id)) {
      report.skippedNoMatch.push({
        file: imageEntry.file,
        stem: imageEntry.cleanedStem,
        reason: "duplicate-product-match",
        product: product.name,
      });
      continue;
    }

    if (!overwrite && hasRealImageUrl(product.image_url)) {
      report.skippedHasImage += 1;
      continue;
    }

    const rawBuffer = fs.readFileSync(imageEntry.full);
    const mimeType = detectMimeType(rawBuffer);
    if (!mimeType) {
      report.invalidImage.push({ file: imageEntry.file, reason: "unknown mime" });
      continue;
    }

    let buffer;
    try {
      buffer = await normalizeProductImageBuffer(rawBuffer);
    } catch {
      report.invalidImage.push({ file: imageEntry.file, reason: "normalize failed" });
      continue;
    }

    const storagePath = `${sanitizeStorageKey(product.sku || product.barcode || product.id)}.jpg`;

    if (dryRun) {
      usedProductIds.add(product.id);
      report.updatedProducts.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.file,
        method: match.method,
        storagePath,
      });
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      report.uploadErrors.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.file,
        error: uploadError.message,
      });
      continue;
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicData.publicUrl?.trim();
    if (!publicUrl) {
      report.uploadErrors.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.file,
        error: "public URL missing",
      });
      continue;
    }

    try {
      await updateProductImage(supabase, product, publicUrl);
      usedProductIds.add(product.id);
      report.uploaded += 1;
      report.updatedProducts.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.file,
        method: match.method,
        image_url: publicUrl,
      });
    } catch (err) {
      report.uploadErrors.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.file,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: report.dryRun,
        imagesDir: report.imagesDir,
        totalImageFiles: report.totalImageFiles,
        uniqueNameKeys: report.uniqueNameKeys,
        matched: report.matched,
        uploaded: report.uploaded,
        skippedHasImage: report.skippedHasImage,
        unmatchedCount: report.skippedNoMatch.length,
        invalidImageCount: report.invalidImage.length,
        uploadErrorCount: report.uploadErrors.length,
        matchMethods: report.matchMethods,
        unmatchedSample: report.skippedNoMatch.slice(0, 30),
        uploadErrors: report.uploadErrors,
        sampleUpdated: report.updatedProducts.slice(0, 15),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
