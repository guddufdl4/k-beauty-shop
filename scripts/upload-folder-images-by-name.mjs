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
const LOGS_DIR = path.join(ROOT, "logs");
const UNMATCHED_LOG = path.join(LOGS_DIR, "unmatched-desktop-images.json");
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".jfif",
  ".avif",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
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

function stripEmbeddedExtensions(stem) {
  return String(stem ?? "").replace(
    /\.(jpe?g|png|webp|jfif|gif|avif|bmp|tiff?|heic|heif)$/i,
    "",
  );
}

function stripSizeAndSampleSuffixes(stem) {
  return stripEmbeddedExtensions(stem)
    .replace(/\(\s*\d+\s*pcs?\s*\)/gi, "")
    .replace(/\(\s*\d+\s*\)/g, "")
    .replace(/\b\d+\s*pcs?\b/gi, "")
    .replace(/\b\d+\s*ea\b/gi, "")
    .replace(/\b\d+(\.\d+)?\s*ml\b/gi, "")
    .replace(/\b\d+(\.\d+)?\s*g\b/gi, "")
    .replace(/[_\s-]+\d+(\.\d+)?\s*ml\b/gi, "")
    .replace(/\s*\(\s*S\s*\)\s*/gi, " ")
    .replace(/\s*\(\s*F\s*\)\s*$/gi, "")
    .replace(/\s*\(\s*GWP\s*\)\s*/gi, " ")
    .replace(/\s*\(\s*R\d+\s*\)\s*$/gi, "")
    .replace(/\s*\(\s*REFILL\s*\)\s*$/gi, "")
    .replace(/\s*\(\s*VEGAN\s*\)\s*$/gi, "")
    .replace(/\s*\[\s*Duty\s*Free\s*\]\s*/gi, " ")
    .replace(/\s*_N\b/gi, "")
    .replace(/\s*_AD\b/gi, "")
    .replace(/\.NEW$/i, "")
    .replace(/\.\.+$/g, "")
    .replace(/\s+[FR]\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFilenameStem(stem) {
  return stripSizeAndSampleSuffixes(stem)
    .replace(/\(\d+\)$/g, "")
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

function fileQuality(entry) {
  return extensionScore(entry.ext) * 1_000_000_000 + entry.size;
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
      const relativePath = path.relative(imagesDir, full);
      entries.push({
        file: name,
        full,
        relativePath,
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
  return entries;
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
  const tokenIndex = new Map();

  const indexTokens = (item) => {
    const tokens = item.key.match(/[a-z0-9가-힣]{2,}/g) ?? [];
    for (const token of tokens) {
      if (!tokenIndex.has(token)) tokenIndex.set(token, []);
      tokenIndex.get(token).push(item);
    }
  };

  for (const p of products) {
    const nameKey = normalizeKey(cleanFilenameStem(p.name));
    const brandNameKey = normalizeKey(
      cleanFilenameStem(`${p.brand ?? ""} ${p.name ?? ""}`.trim()),
    );
    if (nameKey) {
      if (!byName.has(nameKey)) byName.set(nameKey, []);
      byName.get(nameKey).push(p);
      const item = { key: nameKey, product: p, kind: "name" };
      nameList.push(item);
      indexTokens(item);
    }
    if (brandNameKey && brandNameKey !== nameKey) {
      if (!byBrandName.has(brandNameKey)) byBrandName.set(brandNameKey, []);
      byBrandName.get(brandNameKey).push(p);
      const item = { key: brandNameKey, product: p, kind: "brandName" };
      nameList.push(item);
      indexTokens(item);
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
      map.set(normalizeKey(val), p);
    }
  }

  return { bySku, byBarcode, bySlug, byName, byBrandName, nameList, tokenIndex };
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

function levenshteinRatio(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const rows = b.length + 1;
  const cols = a.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  const distance = matrix[b.length][a.length];
  return 1 - distance / Math.max(a.length, b.length);
}

function buildMatchCandidates(imageEntry, imagesDir) {
  const seen = new Set();
  const candidates = [];

  const addText = (text, source) => {
    const raw = String(text ?? "").trim();
    if (!raw) return;
    for (const variant of [raw, cleanFilenameStem(raw), stripSizeAndSampleSuffixes(raw)]) {
      const cleaned = cleanFilenameStem(variant);
      const norm = normalizeKey(cleaned);
      if (!norm || seen.has(`${source}:${norm}`)) continue;
      seen.add(`${source}:${norm}`);
      candidates.push({ raw: variant, cleaned, norm, source });
    }
    for (const num of raw.match(/\d{8,14}/g) ?? []) {
      if (seen.has(`${source}:id:${num}`)) continue;
      seen.add(`${source}:id:${num}`);
      candidates.push({ raw: num, cleaned: num, norm: num, source: `${source}-numeric` });
    }
  };

  addText(imageEntry.rawStem, "filename");
  addText(imageEntry.cleanedStem, "filename-clean");

  const relDir = path.dirname(imageEntry.relativePath);
  if (relDir && relDir !== ".") {
    for (const part of relDir.split(path.sep).filter(Boolean)) {
      addText(part, "folder");
    }
  }

  return candidates;
}

function brandMatchBoost(product, norm) {
  const brandKey = normalizeKey(String(product.brand ?? ""));
  if (!brandKey || brandKey.length < 2) return 0;
  if (norm.startsWith(brandKey)) return 0.05;
  if (norm.includes(brandKey)) return 0.03;
  return 0;
}

function resolveAmbiguous(matches, norm) {
  if (matches.length === 1) return matches[0];
  const sorted = [...matches].sort((a, b) => {
    const aBrand = brandMatchBoost(a, norm) > 0 ? 1 : 0;
    const bBrand = brandMatchBoost(b, norm) > 0 ? 1 : 0;
    if (aBrand !== bBrand) return bBrand - aBrand;
    const aExact = normalizeKey(a.name) === norm ? 1 : 0;
    const bExact = normalizeKey(b.name) === norm ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return (a.name?.length ?? 0) - (b.name?.length ?? 0);
  });
  return sorted[0];
}

function getFuzzyCandidates(norm, tokenIndex) {
  const tokens = norm.match(/[a-z0-9가-힣]{2,}/g) ?? [];
  if (!tokens.length) return [];
  const seen = new Set();
  const items = [];
  for (const token of tokens) {
    for (const item of tokenIndex.get(token) ?? []) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      items.push(item);
    }
  }
  return items;
}

function scoreCandidateAgainstProducts(candidate, lookups) {
  const { bySku, byBarcode, bySlug, byName, byBrandName, tokenIndex } = lookups;
  const trimmed = String(candidate.raw ?? "").trim();
  const norm = candidate.norm;

  for (const map of [bySku, byBarcode, bySlug]) {
    for (const key of [trimmed, trimmed.toLowerCase(), norm]) {
      if (key && map.has(key)) {
        return {
          product: map.get(key),
          method: "exact-id",
          score: 1,
          matchedKey: key,
          candidate,
        };
      }
    }
  }

  if (norm && byName.has(norm)) {
    const matches = byName.get(norm);
    return {
      product: resolveAmbiguous(matches, norm),
      method: matches.length === 1 ? "exact-name" : "exact-name-ambiguous",
      score: 0.99,
      matchedKey: norm,
      candidate,
    };
  }

  if (norm && byBrandName.has(norm)) {
    const matches = byBrandName.get(norm);
    return {
      product: resolveAmbiguous(matches, norm),
      method: matches.length === 1 ? "exact-brand-name" : "exact-brand-name-ambiguous",
      score: 0.985,
      matchedKey: norm,
      candidate,
    };
  }

  let best = null;
  let bestScore = 0;
  const fuzzyItems = getFuzzyCandidates(norm, tokenIndex);

  for (const item of fuzzyItems) {
    const productKey = item.key;
    if (!productKey || !norm) continue;

    if (productKey === norm) {
      return {
        product: item.product,
        method: "normalized-equality",
        score: 0.98,
        matchedKey: productKey,
        candidate,
      };
    }

    if (productKey.includes(norm) || norm.includes(productKey)) {
      const shorter = Math.min(productKey.length, norm.length);
      const longer = Math.max(productKey.length, norm.length);
      const containScore = shorter / longer;
      const score =
        containScore * (item.kind === "name" ? 0.97 : 0.94) + brandMatchBoost(item.product, norm);
      if (score > bestScore) {
        bestScore = score;
        best = {
          product: item.product,
          method: "contains-name",
          score,
          matchedKey: productKey,
          candidate,
        };
      }
    }

    let overlap = tokenOverlapScore(norm, productKey);
    overlap += brandMatchBoost(item.product, norm);
    if (overlap > bestScore) {
      bestScore = overlap;
      best = {
        product: item.product,
        method: "token-overlap",
        score: overlap,
        matchedKey: productKey,
        candidate,
      };
    }

    if (bestScore < 0.72) {
      const ratio = levenshteinRatio(norm, productKey);
      const ratioScore = ratio * 0.96;
      if (ratioScore > bestScore && ratio >= 0.82) {
        bestScore = ratioScore;
        best = {
          product: item.product,
          method: "fuzzy-ratio",
          score: ratioScore,
          matchedKey: productKey,
          candidate,
        };
      }
    }
  }

  if (best && bestScore >= 0.62) return best;
  return null;
}

function findProductForImage(imageEntry, lookups, imagesDir) {
  const candidates = buildMatchCandidates(imageEntry, imagesDir);
  let best = null;

  for (const candidate of candidates) {
    const match = scoreCandidateAgainstProducts(candidate, lookups);
    if (!match) continue;
    const sourceBoost =
      candidate.source.startsWith("filename") ? 0.02 : candidate.source.startsWith("folder") ? -0.01 : 0;
    match.score += sourceBoost;
    if (!best || match.score > best.score) best = match;
  }

  return best;
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

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
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

  const allImages = collectLocalImages(imagesDir);
  const products = await fetchAllProducts(supabase);
  const lookups = buildProductLookups(products);

  const report = {
    dryRun,
    overwrite,
    imagesDir,
    totalImageFiles: allImages.length,
    productCount: products.length,
    matchedFiles: 0,
    selectedForUpload: 0,
    uploaded: 0,
    overwritten: 0,
    skippedHasImage: 0,
    duplicateProductMatches: 0,
    unmatched: [],
    invalidImage: [],
    uploadErrors: [],
    updatedProducts: [],
    matchMethods: {},
  };

  const fileMatches = [];
  console.error(`Matching ${allImages.length} files against ${products.length} products...`);
  let processed = 0;
  for (const imageEntry of allImages) {
    const match = findProductForImage(imageEntry, lookups, imagesDir);
    if (!match?.product) {
      report.unmatched.push({
        file: imageEntry.relativePath,
        filename: imageEntry.file,
        stem: imageEntry.cleanedStem,
        normalizedStem: imageEntry.normalizedStem,
        reason: "no-product-match",
        triedCandidates: buildMatchCandidates(imageEntry, imagesDir).slice(0, 8).map((c) => ({
          source: c.source,
          cleaned: c.cleaned,
          norm: c.norm,
        })),
      });
      continue;
    }

    report.matchedFiles += 1;
    fileMatches.push({ imageEntry, match });
    processed += 1;
    if (processed % 250 === 0) {
      console.error(`  matched pass: ${processed}/${allImages.length}`);
    }
  }
  console.error(`Match pass done: ${report.matchedFiles} matched, ${report.unmatched.length} unmatched`);

  const bestByProduct = new Map();
  for (const item of fileMatches) {
    const productId = item.match.product.id;
    const existing = bestByProduct.get(productId);
    if (!existing) {
      bestByProduct.set(productId, item);
      continue;
    }

    report.duplicateProductMatches += 1;
    const better =
      item.match.score > existing.match.score ||
      (item.match.score === existing.match.score &&
        fileQuality(item.imageEntry) > fileQuality(existing.imageEntry))
        ? item
        : existing;
    const worse = better === item ? existing : item;
    bestByProduct.set(productId, better);
    report.unmatched.push({
      file: worse.imageEntry.relativePath,
      filename: worse.imageEntry.file,
      stem: worse.imageEntry.cleanedStem,
      reason: "duplicate-product-match",
      matchedProduct: worse.match.product.name,
      matchedSku: worse.match.product.sku,
      score: worse.match.score,
      method: worse.match.method,
      keptFile: better.imageEntry.relativePath,
    });
  }

  report.selectedForUpload = bestByProduct.size;
  console.error(`Uploading ${report.selectedForUpload} products...`);
  let uploadProgress = 0;

  for (const { imageEntry, match } of bestByProduct.values()) {
    const product = match.product;
    report.matchMethods[match.method] = (report.matchMethods[match.method] ?? 0) + 1;

    const hadImage = hasRealImageUrl(product.image_url);
    if (!overwrite && hadImage) {
      report.skippedHasImage += 1;
      continue;
    }

    if (dryRun) {
      report.updatedProducts.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.relativePath,
        method: match.method,
        score: match.score,
        storagePath: `${sanitizeStorageKey(product.sku || product.barcode || product.id)}.jpg`,
        wouldOverwrite: hadImage,
      });
      if (hadImage) report.overwritten += 1;
      continue;
    }

    const rawBuffer = fs.readFileSync(imageEntry.full);
    const mimeType = detectMimeType(rawBuffer);
    if (!mimeType) {
      report.invalidImage.push({ file: imageEntry.relativePath, reason: "unknown mime" });
      continue;
    }

    let buffer;
    try {
      buffer = await normalizeProductImageBuffer(rawBuffer);
    } catch {
      report.invalidImage.push({ file: imageEntry.relativePath, reason: "normalize failed" });
      continue;
    }

    const storagePath = `${sanitizeStorageKey(product.sku || product.barcode || product.id)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      report.uploadErrors.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.relativePath,
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
        file: imageEntry.relativePath,
        error: "public URL missing",
      });
      continue;
    }

    try {
      await updateProductImage(supabase, product, publicUrl);
      report.uploaded += 1;
      if (hadImage) report.overwritten += 1;
      report.updatedProducts.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.relativePath,
        method: match.method,
        score: match.score,
        image_url: publicUrl,
        overwritten: hadImage,
      });
      uploadProgress += 1;
      if (uploadProgress % 50 === 0) {
        console.error(`  uploaded ${uploadProgress}/${report.selectedForUpload}`);
      }
    } catch (err) {
      report.uploadErrors.push({
        sku: product.sku,
        name: product.name,
        file: imageEntry.relativePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  ensureLogsDir();
  const unmatchedOnly = report.unmatched.filter((u) => u.reason === "no-product-match");
  const unmatchedPayload = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      imagesDir,
      totalImageFiles: report.totalImageFiles,
      unmatchedCount: unmatchedOnly.length,
      duplicateProductMatchCount: report.duplicateProductMatches,
      items: report.unmatched,
    },
    null,
    2,
  );
  try {
    fs.writeFileSync(UNMATCHED_LOG, unmatchedPayload, "utf8");
  } catch (err) {
    const fallback = path.join(
      LOGS_DIR,
      `unmatched-desktop-images-${Date.now()}.json`,
    );
    fs.writeFileSync(fallback, unmatchedPayload, "utf8");
    console.error(`Wrote unmatched log to ${fallback}: ${err instanceof Error ? err.message : err}`);
  }

  const reportPayload = `${JSON.stringify(report, null, 2)}\n`;
  const reportPath = path.join(LOGS_DIR, "upload-desktop-images.log");
  try {
    fs.writeFileSync(reportPath, reportPayload, "utf8");
  } catch (err) {
    const fallback = path.join(LOGS_DIR, `upload-desktop-images-${Date.now()}.log`);
    fs.writeFileSync(fallback, reportPayload, "utf8");
    console.error(`Wrote report log to ${fallback}: ${err instanceof Error ? err.message : err}`);
  }

  console.log(
    JSON.stringify(
      {
        dryRun: report.dryRun,
        overwrite: report.overwrite,
        imagesDir: report.imagesDir,
        totalImageFiles: report.totalImageFiles,
        productCount: report.productCount,
        matchedFiles: report.matchedFiles,
        selectedForUpload: report.selectedForUpload,
        uploaded: report.uploaded,
        overwritten: report.overwritten,
        skippedHasImage: report.skippedHasImage,
        duplicateProductMatches: report.duplicateProductMatches,
        unmatchedCount: unmatchedOnly.length,
        invalidImageCount: report.invalidImage.length,
        uploadErrorCount: report.uploadErrors.length,
        matchMethods: report.matchMethods,
        unmatchedSample: unmatchedOnly.slice(0, 30),
        uploadErrors: report.uploadErrors.slice(0, 20),
        sampleUpdated: report.updatedProducts.slice(0, 15),
        unmatchedLog: UNMATCHED_LOG,
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
