/**
 * Match local image files to products by filename (SKU/barcode) or fuzzy product name,
 * upload to Supabase product-images bucket, and set products.image_url.
 *
 * Usage:
 *   node scripts/upload-folder-images-by-name.mjs --dir "C:\path\to\images"
 *   node scripts/upload-folder-images-by-name.mjs --dir "..." --dry-run
 *   node scripts/upload-folder-images-by-name.mjs --dir "..." --audit
 *   node scripts/upload-folder-images-by-name.mjs --dir "..." --excel "Brand 07 30.xlsx" [--dry-run]
 */

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
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
  let auditOnly = false;
  let imagesDir = null;
  let excelPath = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--overwrite") overwrite = true;
    else if (arg === "--audit") auditOnly = true;
    else if (arg === "--dir" && argv[i + 1]) imagesDir = argv[++i].trim();
    else if (arg.startsWith("--dir=")) imagesDir = arg.slice("--dir=".length).trim();
    else if (arg === "--excel" && argv[i + 1]) excelPath = argv[++i].trim();
    else if (arg.startsWith("--excel=")) excelPath = arg.slice("--excel=".length).trim();
  }
  return { dryRun, overwrite, auditOnly, imagesDir, excelPath };
}

function classifyImageUrl(url) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "empty";
  if (trimmed.startsWith("/images/categories/")) return "placeholder";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return "uploaded";
  return "other";
}

function productAuditSummary(product) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    image_url: product.image_url ?? null,
    imageStatus: classifyImageUrl(product.image_url),
    needs_image: product.needs_image ?? null,
  };
}

function buildAuditSummaryText(audit) {
  const lines = [];
  lines.push("Desktop Images Audit Summary");
  lines.push("=".repeat(60));
  lines.push(`Generated: ${audit.generatedAt}`);
  lines.push(`Folder: ${audit.imagesDir}`);
  lines.push("");
  lines.push("Counts");
  lines.push("-".repeat(40));
  lines.push(`Total image files scanned:        ${audit.summary.totalFilesScanned}`);
  lines.push(`Products in DB:                   ${audit.summary.productCount}`);
  lines.push(`Matched files (any product):      ${audit.summary.matchedFiles}`);
  lines.push(`Unique products matched:            ${audit.summary.uniqueProductsMatched}`);
  lines.push("");
  lines.push(`OK (matched + has uploaded image): ${audit.summary.okFiles}`);
  lines.push(`  unique products with image:      ${audit.summary.okProducts}`);
  lines.push(`Missing/wrong image (needs upload): ${audit.summary.missingFiles}`);
  lines.push(`  unique products missing image:   ${audit.summary.missingProducts}`);
  lines.push(`Unmatched (no product):             ${audit.summary.unmatchedFiles}`);
  lines.push(`Duplicate (same product, extra file): ${audit.summary.duplicateFiles}`);
  lines.push("");
  lines.push(`Coverage: ${audit.summary.coveragePercent}% of files map to products with real images`);
  lines.push(`Gap count (missing + unmatched): ${audit.summary.gapCount}`);
  lines.push("");

  if (audit.missingOrWrong.length) {
    lines.push("Missing / wrong image samples:");
    for (const item of audit.missingOrWrong.slice(0, 20)) {
      lines.push(`  - ${item.file}`);
      lines.push(`    -> ${item.product.sku} | ${item.product.name}`);
      lines.push(`    image: ${item.product.imageStatus} (${item.product.image_url ?? "null"})`);
    }
    lines.push("");
  }

  if (audit.unmatched.length) {
    lines.push("Unmatched filename samples:");
    for (const item of audit.unmatched.slice(0, 20)) {
      lines.push(`  - ${item.file} (${item.stem})`);
    }
    lines.push("");
  }

  if (audit.duplicates.length) {
    lines.push("Duplicate file samples:");
    for (const item of audit.duplicates.slice(0, 20)) {
      lines.push(`  - ${item.file}`);
      lines.push(`    -> ${item.matchedSku} | kept: ${item.keptFile}`);
    }
    lines.push("");
  }

  if (audit.summary.missingProducts > 10) {
    lines.push("Recommendation:");
    lines.push("  Significant missing-image gaps. Upload missing only (no --overwrite):");
    lines.push(`  node scripts/upload-folder-images-by-name.mjs --dir "${audit.imagesDir}"`);
  } else if (audit.summary.gapCount > 0) {
    lines.push("Recommendation:");
    lines.push("  Small gap count. Upload missing only:");
    lines.push(`  node scripts/upload-folder-images-by-name.mjs --dir "${audit.imagesDir}"`);
  } else {
    lines.push("All scanned files are accounted for. No upload action needed.");
  }

  return lines.join("\n");
}

function writeAuditReport({ imagesDir, allImages, fileMatches, bestByProduct, unmatchedAll, products }) {
  const unmatched = unmatchedAll.filter((u) => u.reason === "no-product-match");
  const duplicates = unmatchedAll.filter((u) => u.reason === "duplicate-product-match");

  const ok = [];
  const missingOrWrong = [];

  for (const { imageEntry, match } of bestByProduct.values()) {
    const product = match.product;
    const hasImage = hasRealImageUrl(product.image_url);
    const entry = {
      file: imageEntry.relativePath,
      filename: imageEntry.file,
      stem: imageEntry.cleanedStem,
      method: match.method,
      score: match.score,
      product: productAuditSummary(product),
    };
    if (hasImage) ok.push(entry);
    else {
      missingOrWrong.push({
        ...entry,
        issue: classifyImageUrl(product.image_url) === "placeholder" ? "placeholder-image" : "missing-image",
      });
    }
  }

  const duplicateOkCount = duplicates.filter((d) => {
    const kept = [...bestByProduct.values()].find((v) => v.imageEntry.relativePath === d.keptFile);
    return kept ? hasRealImageUrl(kept.match.product.image_url) : false;
  }).length;

  const okFiles = ok.length + duplicateOkCount;
  const gapCount = missingOrWrong.length + unmatched.length;
  const coveragePercent =
    allImages.length > 0 ? Math.round((okFiles / allImages.length) * 10000) / 100 : 100;

  const matchMethods = {};
  for (const { match } of bestByProduct.values()) {
    matchMethods[match.method] = (matchMethods[match.method] ?? 0) + 1;
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    imagesDir,
    summary: {
      totalFilesScanned: allImages.length,
      productCount: products.length,
      matchedFiles: fileMatches.length,
      uniqueProductsMatched: bestByProduct.size,
      okFiles,
      okProducts: ok.length,
      missingFiles: missingOrWrong.length,
      missingProducts: missingOrWrong.length,
      unmatchedFiles: unmatched.length,
      duplicateFiles: duplicates.length,
      gapCount,
      coveragePercent,
      matchMethods,
    },
    ok,
    missingOrWrong,
    unmatched,
    duplicates,
  };

  ensureLogsDir();
  const auditJson = path.join(LOGS_DIR, "desktop-images-audit.json");
  const auditSummary = path.join(LOGS_DIR, "desktop-images-audit-summary.txt");
  fs.writeFileSync(auditJson, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  fs.writeFileSync(auditSummary, `${buildAuditSummaryText(audit)}\n`, "utf8");
  return { auditJson, auditSummary, audit };
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
    .replace(/\s*\(\s*\d+\s*\)\s*$/g, "")
    .replace(/\s*_N\b/gi, "")
    .replace(/\s*_AD\b/gi, "")
    .replace(/\.NEW$/i, "")
    .replace(/\.\.+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function collapseRepeatedLeadingToken(text) {
  return String(text ?? "")
    .trim()
    .replace(/^(\S+)(?:\s+\1)+/i, "$1");
}

function stripTrailingVolumeLabel(text) {
  return String(text ?? "")
    .replace(/\s+\d+(?:\.\d+)?\s*(ml|g|mg|oz)\s*$/i, "")
    .trim();
}

function filenameSafeVariants(text) {
  const raw = String(text ?? "");
  const withoutForbidden = raw.replace(/[:/\\*?"<>|;；]/g, " ");
  const collapsedForbidden = raw.replace(/[:/\\*?"<>|;；]/g, "");
  return [raw, withoutForbidden, collapsedForbidden];
}

function extractVolumeTokens(text) {
  const t = String(text ?? "").toLowerCase();
  return [...t.matchAll(/(\d+(?:\.\d+)?)\s*(ml|g|mg|oz)\b/gi)].map(
    (m) => `${m[1]}${m[2].toLowerCase()}`,
  );
}

function extractShadeTokens(text) {
  const t = String(text ?? "").toLowerCase();
  const found = new Set();
  for (const m of t.matchAll(/#\s*(\d{1,3}[a-z]?)/g)) found.add(m[1]);
  for (const m of t.matchAll(/\b(?:no\.?|n0\.?|shade|호수)\s*(\d{1,3}[a-z]?)\b/g)) {
    found.add(m[1]);
  }
  return [...found];
}

function variantConflictScore(fileText, product) {
  const haystack = `${product.name ?? ""} ${product.sku ?? ""} ${product.brand ?? ""}`;
  const fileVols = extractVolumeTokens(fileText);
  const productVols = extractVolumeTokens(haystack);
  if (fileVols.length && productVols.length) {
    const productSet = new Set(productVols);
    if (!fileVols.some((v) => productSet.has(v))) return -1;
  }
  const fileShades = extractShadeTokens(fileText);
  const productShades = extractShadeTokens(haystack);
  if (fileShades.length && productShades.length) {
    const productSet = new Set(productShades);
    if (!fileShades.some((v) => productSet.has(v))) return -1;
  }
  let boost = 0;
  if (fileVols.length && productVols.some((v) => fileVols.includes(v))) boost += 0.08;
  if (fileShades.length && productShades.some((v) => fileShades.includes(v))) boost += 0.08;
  return boost;
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
    const nameVariants = [
      p.name,
      stripTrailingVolumeLabel(p.name),
      collapseRepeatedLeadingToken(p.name),
    ];
    const brandNameVariants = [
      `${p.brand ?? ""} ${p.name ?? ""}`.trim(),
      `${p.brand ?? ""} ${stripTrailingVolumeLabel(p.name ?? "")}`.trim(),
      collapseRepeatedLeadingToken(`${p.brand ?? ""} ${p.name ?? ""}`.trim()),
    ];
    for (const name of nameVariants) {
      const nameKey = normalizeKey(cleanFilenameStem(name));
      if (!nameKey) continue;
      if (!byName.has(nameKey)) byName.set(nameKey, []);
      if (!byName.get(nameKey).some((row) => row.id === p.id)) byName.get(nameKey).push(p);
      const item = { key: nameKey, product: p, kind: "name" };
      nameList.push(item);
      indexTokens(item);
    }
    for (const brandName of brandNameVariants) {
      const brandNameKey = normalizeKey(cleanFilenameStem(brandName));
      if (!brandNameKey) continue;
      if (!byBrandName.has(brandNameKey)) byBrandName.set(brandNameKey, []);
      if (!byBrandName.get(brandNameKey).some((row) => row.id === p.id)) {
        byBrandName.get(brandNameKey).push(p);
      }
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
    for (const variant of [
      raw,
      collapseRepeatedLeadingToken(raw),
      stripTrailingVolumeLabel(raw),
      stripTrailingVolumeLabel(collapseRepeatedLeadingToken(raw)),
      ...filenameSafeVariants(raw),
      cleanFilenameStem(raw),
      stripSizeAndSampleSuffixes(raw),
    ]) {
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

function resolveAmbiguous(matches, norm, fileText = "") {
  if (matches.length === 1) return matches[0];
  const scored = matches
    .map((product) => ({ product, conflict: variantConflictScore(fileText || norm, product) }))
    .filter((item) => item.conflict !== -1);
  if (!scored.length) return null;
  scored.sort((a, b) => {
    if (b.conflict !== a.conflict) return b.conflict - a.conflict;
    const aBrand = brandMatchBoost(a.product, norm) > 0 ? 1 : 0;
    const bBrand = brandMatchBoost(b.product, norm) > 0 ? 1 : 0;
    if (aBrand !== bBrand) return bBrand - aBrand;
    const aExact = normalizeKey(a.product.name) === norm ? 1 : 0;
    const bExact = normalizeKey(b.product.name) === norm ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return (a.product.name?.length ?? 0) - (b.product.name?.length ?? 0);
  });
  return scored[0].product;
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
    const product = resolveAmbiguous(matches, norm, candidate.raw);
    if (product) {
      return {
        product,
        method: matches.length === 1 ? "exact-name" : "exact-name-ambiguous",
        score: 0.99,
        matchedKey: norm,
        candidate,
      };
    }
  }

  if (norm && byBrandName.has(norm)) {
    const matches = byBrandName.get(norm);
    const product = resolveAmbiguous(matches, norm, candidate.raw);
    if (product) {
      return {
        product,
        method: matches.length === 1 ? "exact-brand-name" : "exact-brand-name-ambiguous",
        score: 0.985,
        matchedKey: norm,
        candidate,
      };
    }
  }

  let best = null;
  let bestScore = 0;
  const fuzzyItems = getFuzzyCandidates(norm, tokenIndex);

  for (const item of fuzzyItems) {
    const productKey = item.key;
    if (!productKey || !norm) continue;
    const conflict = variantConflictScore(candidate.raw, item.product);
    if (conflict === -1) continue;

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
        containScore * (item.kind === "name" ? 0.97 : 0.94) +
        brandMatchBoost(item.product, norm) +
        Math.max(0, conflict);
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
    overlap += Math.max(0, conflict);
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

async function triggerStorefrontRevalidation() {
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!serviceKey) {
    return;
  }

  const rawBase =
    process.env.REVALIDATE_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  const baseUrl = rawBase.startsWith("http") ? rawBase : `https://${rawBase}`;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/storefront/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}` },
    });
    if (!response.ok) {
      console.error(`Storefront revalidation failed: HTTP ${response.status}`);
    } else {
      console.error("Storefront cache revalidated.");
    }
  } catch (err) {
    console.error(
      `Storefront revalidation skipped: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

const EXCEL_SKIP_SHEETS = new Set(["REJURAN(NOT VALID)"]);
const BRAND_SHEET_ALIASES = {
  anuax: ["ANUA", "Anua"],
  medicubex: ["MEDICUBE", "Medicube"],
  medicube: ["Medicube(X)", "Medicube(XX)"],
  drjartfrom2507: ["Dr.Jart", "Dr Jart"],
  rejuranfrom202602: ["Rejuran", "REJURAN"],
};

function normalizeHeader(input) {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[\s_\-/()[\].\r\n]+/g, "");
}

function isMetadataHeaderRow(row) {
  const texts = (row ?? []).map((c) => String(c ?? "").trim().toLowerCase()).filter(Boolean);
  if (!texts.length) return true;
  const joined = texts.join(" ");
  if (joined.startsWith("moa:") || joined.startsWith("moa ")) return true;
  if (texts.some((t) => t.startsWith("updated"))) return true;
  if (texts.length <= 2 && texts.some((t) => t.includes("inbox"))) return true;
  return false;
}

function excelHeaderScore(row) {
  const keys = [
    "product",
    "name",
    "barcode",
    "price",
    "brand",
    "sku",
    "no",
    "바코드",
    "제품명",
    "상품명",
    "inbox",
  ];
  const texts = (row ?? []).map((c) => normalizeHeader(c));
  const nonEmpty = texts.filter(Boolean).length;
  let score = texts.filter((t) => keys.some((k) => t.includes(k))).length;
  if (nonEmpty >= 3) score += 1;
  if (nonEmpty >= 5) score += 1;
  if (isMetadataHeaderRow(row)) score -= 8;
  if (texts[0] === "no" || texts[0] === "no.") score += 2;
  return score;
}

function findExcelHeaderRow(rows) {
  let best = 0;
  let score = -999;
  for (let i = 0; i < Math.min(rows.length, 12); i += 1) {
    const s = excelHeaderScore(rows[i]);
    if (s > score) {
      score = s;
      best = i;
    }
  }
  return score > 0 ? best : 0;
}

function isMostlyEnglish(text) {
  const s = String(text ?? "").replace(/\r\n/g, " ");
  const latin = (s.match(/[a-zA-Z]/g) ?? []).length;
  const korean = (s.match(/[가-힣]/g) ?? []).length;
  return latin > korean;
}

function findNameColumnIndices(headers) {
  const cols = [];
  for (let i = 0; i < headers.length; i += 1) {
    const h = normalizeHeader(headers[i]);
    if (!h) continue;
    if (
      h.includes("productname") ||
      h === "name" ||
      h.includes("nameeng") ||
      h.includes("nameenglish") ||
      (h.includes("name") && h.includes("eng"))
    ) {
      cols.push(i);
    }
  }
  return cols;
}

function detectEnglishNameColumn(headers, dataRows) {
  for (let i = 0; i < headers.length; i += 1) {
    const h = normalizeHeader(headers[i]);
    if (
      h.includes("english") ||
      h.includes("nameeng") ||
      h.includes("nameenglish") ||
      (h.includes("name") && h.includes("eng"))
    ) {
      return i;
    }
  }

  const nameCols = findNameColumnIndices(headers);
  if (nameCols.length === 1) return nameCols[0];
  if (nameCols.length > 1) {
    let best = nameCols[0];
    let bestScore = -1;
    for (const col of nameCols) {
      let score = 0;
      for (const row of dataRows.slice(0, 40)) {
        if (isMostlyEnglish(row[col])) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = col;
      }
    }
    return best;
  }
  return -1;
}

function detectKoreanNameColumn(headers, dataRows, englishCol) {
  const nameCols = findNameColumnIndices(headers).filter((c) => c !== englishCol);
  if (!nameCols.length) return -1;
  if (nameCols.length === 1) return nameCols[0];
  let best = nameCols[0];
  let bestScore = -1;
  for (const col of nameCols) {
    let score = 0;
    for (const row of dataRows.slice(0, 40)) {
      if (!isMostlyEnglish(row[col])) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = col;
    }
  }
  return best;
}

function findExcelColumn(headers, aliases) {
  for (let i = 0; i < headers.length; i += 1) {
    const h = normalizeHeader(headers[i]);
    if (!h) continue;
    for (const alias of aliases) {
      const a = normalizeHeader(alias);
      if (h === a || h.includes(a) || a.includes(h)) return i;
    }
  }
  return -1;
}

function normalizeBarcode(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits || digits.length < 6) return null;
  return digits;
}

function normalizeSheetBrand(sheetName) {
  return String(sheetName ?? "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+from\s+.*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sheetBrandVariants(sheetName) {
  const raw = String(sheetName ?? "").trim();
  const normalized = normalizeSheetBrand(raw);
  const variants = new Set([raw, normalized]);
  const key = normalizeKey(raw);
  for (const alias of BRAND_SHEET_ALIASES[key] ?? []) variants.add(alias);
  if (normalized !== raw) variants.add(normalized);
  return [...variants];
}

function brandsCompatible(sheetBrand, productBrand) {
  const variants = sheetBrandVariants(sheetBrand).map((b) => normalizeKey(b)).filter(Boolean);
  const productKey = normalizeKey(productBrand);
  if (!variants.length || !productKey) return true;
  return variants.some(
    (v) => v === productKey || v.includes(productKey) || productKey.includes(v),
  );
}

function cleanExcelName(name) {
  return String(name ?? "")
    .replace(/\r\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBrandPriorityExcel(excelPath) {
  const buffer = fs.readFileSync(excelPath);
  const wb = XLSX.read(buffer, { type: "buffer" });
  const entries = [];

  for (const sheetName of wb.SheetNames) {
    if (EXCEL_SKIP_SHEETS.has(sheetName)) continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      defval: "",
      blankrows: false,
    });
    if (rows.length < 2) continue;

    const headerIdx = findExcelHeaderRow(rows);
    const headers = (rows[headerIdx] ?? []).map((c) => String(c ?? "").trim());
    const dataRows = rows.slice(headerIdx + 1).filter((row) => row?.some((c) => String(c ?? "").trim()));
    const englishCol = detectEnglishNameColumn(headers, dataRows);
    if (englishCol < 0) continue;

    const koreanCol = detectKoreanNameColumn(headers, dataRows, englishCol);
    const barcodeCol = findExcelColumn(headers, [
      "ea barcode",
      "barcode(ean)",
      "barcode",
      "ean",
      "바코드",
    ]);
    const skuCol = findExcelColumn(headers, ["sku", "product code", "상품코드", "품번"]);
    const brandCol = findExcelColumn(headers, ["brand", "브랜드"]);

    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx += 1) {
      const row = dataRows[rowIdx];
      const englishName = cleanExcelName(row[englishCol]);
      if (!englishName) continue;

      const koreanName = koreanCol >= 0 ? cleanExcelName(row[koreanCol]) : "";
      const brand =
        (brandCol >= 0 ? cleanExcelName(row[brandCol]) : "") || normalizeSheetBrand(sheetName);
      const barcode =
        normalizeBarcode(barcodeCol >= 0 ? row[barcodeCol] : "") ??
        normalizeBarcode(skuCol >= 0 ? row[skuCol] : "");

      entries.push({
        sheet: sheetName,
        brand,
        englishName,
        koreanName,
        barcode,
        rowNumber: headerIdx + rowIdx + 2,
      });
    }
  }

  return entries;
}

function buildExcelNameCandidates(entry) {
  const seen = new Set();
  const candidates = [];
  const add = (text, source) => {
    const raw = cleanExcelName(text);
    if (!raw) return;
    for (const variant of [
      raw,
      collapseRepeatedLeadingToken(raw),
      stripTrailingVolumeLabel(raw),
      stripTrailingVolumeLabel(collapseRepeatedLeadingToken(raw)),
      ...filenameSafeVariants(raw),
      cleanFilenameStem(raw),
      stripSizeAndSampleSuffixes(raw),
    ]) {
      const cleaned = cleanFilenameStem(variant);
      const norm = normalizeKey(cleaned);
      if (!norm || seen.has(`${source}:${norm}`)) continue;
      seen.add(`${source}:${norm}`);
      candidates.push({ raw: variant, cleaned, norm, source });
    }
  };

  add(entry.englishName, "excel-en");
  if (entry.koreanName) add(entry.koreanName, "excel-kr");
  add(`${entry.brand} ${entry.englishName}`, "excel-brand-en");
  if (entry.barcode) {
    candidates.push({
      raw: entry.barcode,
      cleaned: entry.barcode,
      norm: entry.barcode,
      source: "excel-barcode",
    });
  }
  return candidates;
}

function findDbProductForExcelEntry(entry, lookups) {
  const { bySku, byBarcode, byName, byBrandName, tokenIndex } = lookups;

  if (entry.barcode) {
    for (const map of [byBarcode, bySku]) {
      for (const key of [entry.barcode, normalizeKey(entry.barcode)]) {
        if (key && map.has(key)) {
          const product = map.get(key);
          if (brandsCompatible(entry.sheet, product.brand)) {
            return { product, method: "excel-barcode", score: 1, matchedKey: key };
          }
        }
      }
    }
  }

  const candidates = buildExcelNameCandidates(entry);
  let best = null;

  for (const candidate of candidates) {
    const match = scoreCandidateAgainstProducts(candidate, lookups);
    if (!match?.product) continue;
    if (!brandsCompatible(entry.sheet, match.product.brand)) continue;
    const boosted = { ...match, score: match.score + (candidate.source.startsWith("excel-en") ? 0.01 : 0) };
    if (!best || boosted.score > best.score) best = boosted;
  }

  if (best && best.score >= 0.62) return best;

  const englishNorm = normalizeKey(cleanFilenameStem(entry.englishName));
  if (englishNorm && byName.has(englishNorm)) {
    const matches = byName.get(englishNorm).filter((p) => brandsCompatible(entry.sheet, p.brand));
    if (matches.length === 1) {
      return {
        product: matches[0],
        method: "excel-exact-name",
        score: 0.99,
        matchedKey: englishNorm,
      };
    }
    if (matches.length > 1) {
      return {
        product: resolveAmbiguous(matches, englishNorm, entry.englishName),
        method: "excel-exact-name-ambiguous",
        score: 0.98,
        matchedKey: englishNorm,
      };
    }
  }

  const brandNameNorm = normalizeKey(cleanFilenameStem(`${entry.brand} ${entry.englishName}`));
  if (brandNameNorm && byBrandName.has(brandNameNorm)) {
    const matches = byBrandName
      .get(brandNameNorm)
      .filter((p) => brandsCompatible(entry.sheet, p.brand));
    if (matches.length >= 1) {
      return {
        product: resolveAmbiguous(matches, brandNameNorm, `${entry.brand} ${entry.englishName}`),
        method: "excel-exact-brand-name",
        score: 0.985,
        matchedKey: brandNameNorm,
      };
    }
  }

  return best;
}

function scoreImageAgainstNameNorm(imageNorm, nameNorm, brand) {
  if (!imageNorm || !nameNorm) return 0;
  if (imageNorm === nameNorm) return 0.99;
  if (imageNorm.includes(nameNorm) || nameNorm.includes(imageNorm)) {
    const shorter = Math.min(imageNorm.length, nameNorm.length);
    const longer = Math.max(imageNorm.length, nameNorm.length);
    return (shorter / longer) * 0.97;
  }
  let score = tokenOverlapScore(nameNorm, imageNorm);
  const brandKey = normalizeKey(brand);
  if (brandKey && imageNorm.includes(brandKey)) score += 0.03;
  if (score < 0.72) {
    const ratio = levenshteinRatio(nameNorm, imageNorm);
    if (ratio >= 0.82) score = Math.max(score, ratio * 0.96);
  }
  return score;
}

function buildImageLookups(allImages, imagesDir) {
  const byNorm = new Map();
  const entries = [];
  const tokenIndex = new Map();

  const indexTokens = (norm, imageEntry, source) => {
    const tokens = norm.match(/[a-z0-9가-힣]{2,}/g) ?? [];
    for (const token of tokens) {
      if (!tokenIndex.has(token)) tokenIndex.set(token, []);
      tokenIndex.get(token).push({ norm, imageEntry, source });
    }
  };

  for (const imageEntry of allImages) {
    for (const candidate of buildMatchCandidates(imageEntry, imagesDir)) {
      if (!candidate.norm) continue;
      if (!byNorm.has(candidate.norm)) byNorm.set(candidate.norm, []);
      byNorm.get(candidate.norm).push({ imageEntry, candidate });
      entries.push({ norm: candidate.norm, imageEntry, candidate });
      indexTokens(candidate.norm, imageEntry, candidate.source);
    }
  }

  return { byNorm, entries, tokenIndex };
}

function getImageFuzzyCandidates(norm, tokenIndex) {
  const tokens = norm.match(/[a-z0-9가-힣]{2,}/g) ?? [];
  if (!tokens.length) return [];
  const seen = new Set();
  const items = [];
  for (const token of tokens) {
    for (const item of tokenIndex.get(token) ?? []) {
      const key = `${item.imageEntry.full}:${item.norm}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  return items;
}

function findImageForExcelEntry(entry, imageLookups, imagesDir) {
  const { byNorm, tokenIndex } = imageLookups;
  const nameCandidates = buildExcelNameCandidates(entry);
  let best = null;

  for (const nameCandidate of nameCandidates) {
    if (nameCandidate.source === "excel-barcode") {
      for (const key of [nameCandidate.norm, nameCandidate.raw]) {
        for (const hit of byNorm.get(key) ?? []) {
          const score = 1;
          if (!best || score > best.score) {
            best = {
              imageEntry: hit.imageEntry,
              method: "excel-barcode-filename",
              score,
              matchedKey: key,
            };
          }
        }
      }
      continue;
    }

    const exactHits = byNorm.get(nameCandidate.norm) ?? [];
    for (const hit of exactHits) {
      const score = 0.99;
      if (!best || score > best.score) {
        best = {
          imageEntry: hit.imageEntry,
          method: "excel-exact-filename",
          score,
          matchedKey: nameCandidate.norm,
          nameSource: nameCandidate.source,
        };
      }
    }

    const fuzzyItems = getImageFuzzyCandidates(nameCandidate.norm, tokenIndex);
    for (const item of fuzzyItems) {
      const score = scoreImageAgainstNameNorm(item.norm, nameCandidate.norm, entry.brand);
      if (score >= 0.62 && (!best || score > best.score)) {
        best = {
          imageEntry: item.imageEntry,
          method: "excel-name-to-file",
          score,
          matchedKey: `${nameCandidate.norm}~${item.norm}`,
          nameSource: nameCandidate.source,
        };
      }
    }
  }

  return best;
}

async function runExcelDrivenUpload({
  excelPath,
  imagesDir,
  dryRun,
  overwrite,
  supabase,
  products,
  lookups,
  allImages,
}) {
  const excelEntries = parseBrandPriorityExcel(excelPath);
  const imageLookups = buildImageLookups(allImages, imagesDir);
  const report = {
    mode: "excel",
    dryRun,
    overwrite,
    excelPath,
    imagesDir,
    excelRows: excelEntries.length,
    productCount: products.length,
    totalImageFiles: allImages.length,
    matchedDb: 0,
    matchedImage: 0,
    selectedForUpload: 0,
    uploaded: 0,
    skippedHasImage: 0,
    skippedNoDb: 0,
    skippedNoImage: 0,
    skippedDuplicate: 0,
    invalidImage: [],
    uploadErrors: [],
    updatedProducts: [],
    noDbProduct: [],
    noImageFile: [],
    matchMethods: {},
  };

  const planned = [];

  console.error(
    `Excel mode: ${excelEntries.length} rows from ${excelPath}, ${allImages.length} local images, ${products.length} DB products`,
  );

  for (const entry of excelEntries) {
    const dbMatch = findDbProductForExcelEntry(entry, lookups);
    if (!dbMatch?.product) {
      report.skippedNoDb += 1;
      report.noDbProduct.push({
        sheet: entry.sheet,
        brand: entry.brand,
        englishName: entry.englishName,
        barcode: entry.barcode,
        rowNumber: entry.rowNumber,
      });
      continue;
    }
    report.matchedDb += 1;

    const imageMatch = findImageForExcelEntry(entry, imageLookups, imagesDir);
    if (!imageMatch?.imageEntry) {
      report.skippedNoImage += 1;
      report.noImageFile.push({
        sheet: entry.sheet,
        brand: entry.brand,
        englishName: entry.englishName,
        productSku: dbMatch.product.sku,
        productName: dbMatch.product.name,
        rowNumber: entry.rowNumber,
      });
      continue;
    }
    report.matchedImage += 1;

    planned.push({ entry, dbMatch, imageMatch });
  }

  const bestByProduct = new Map();
  for (const item of planned) {
    const productId = item.dbMatch.product.id;
    const existing = bestByProduct.get(productId);
    if (!existing) {
      bestByProduct.set(productId, item);
      continue;
    }
    report.skippedDuplicate += 1;
    const better =
      item.imageMatch.score > existing.imageMatch.score ||
      (item.imageMatch.score === existing.imageMatch.score &&
        fileQuality(item.imageMatch.imageEntry) > fileQuality(existing.imageMatch.imageEntry))
        ? item
        : existing;
    bestByProduct.set(productId, better);
  }

  report.selectedForUpload = bestByProduct.size;
  console.error(
    `Excel match summary: db=${report.matchedDb}, image=${report.matchedImage}, upload candidates=${report.selectedForUpload}, noDb=${report.skippedNoDb}, noImage=${report.skippedNoImage}`,
  );

  let uploadProgress = 0;
  for (const { entry, dbMatch, imageMatch } of bestByProduct.values()) {
    const product = dbMatch.product;
    const imageEntry = imageMatch.imageEntry;
    report.matchMethods[dbMatch.method] = (report.matchMethods[dbMatch.method] ?? 0) + 1;

    const hadImage = hasRealImageUrl(product.image_url);
    if (!overwrite && hadImage) {
      report.skippedHasImage += 1;
      continue;
    }

    if (dryRun) {
      report.updatedProducts.push({
        sheet: entry.sheet,
        sku: product.sku,
        name: product.name,
        excelName: entry.englishName,
        file: imageEntry.relativePath,
        dbMethod: dbMatch.method,
        imageMethod: imageMatch.method,
        score: imageMatch.score,
        wouldOverwrite: hadImage,
      });
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
      report.updatedProducts.push({
        sheet: entry.sheet,
        sku: product.sku,
        name: product.name,
        excelName: entry.englishName,
        file: imageEntry.relativePath,
        dbMethod: dbMatch.method,
        imageMethod: imageMatch.method,
        score: imageMatch.score,
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
  const reportPath = path.join(LOGS_DIR, "upload-excel-images.log");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (!dryRun && report.uploaded > 0) {
    await triggerStorefrontRevalidation();
  }

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        dryRun: report.dryRun,
        excelPath: report.excelPath,
        imagesDir: report.imagesDir,
        excelRows: report.excelRows,
        matchedDb: report.matchedDb,
        matchedImage: report.matchedImage,
        selectedForUpload: report.selectedForUpload,
        uploaded: report.uploaded,
        skippedHasImage: report.skippedHasImage,
        skippedNoDb: report.skippedNoDb,
        skippedNoImage: report.skippedNoImage,
        skippedDuplicate: report.skippedDuplicate,
        invalidImageCount: report.invalidImage.length,
        uploadErrorCount: report.uploadErrors.length,
        matchMethods: report.matchMethods,
        noDbSample: report.noDbProduct.slice(0, 20),
        noImageSample: report.noImageFile.slice(0, 20),
        uploadErrors: report.uploadErrors.slice(0, 20),
        sampleUpdated: report.updatedProducts.slice(0, 20),
        reportPath,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const { dryRun, overwrite, auditOnly, imagesDir, excelPath } = parseCliArgs(process.argv.slice(2));
  if (!imagesDir) {
    console.error(
      "Usage: node scripts/upload-folder-images-by-name.mjs --dir <folder> [--excel <file.xlsx>] [--dry-run] [--overwrite] [--audit]",
    );
    process.exit(1);
  }
  if (!fs.existsSync(imagesDir)) {
    console.error(`Folder not found: ${imagesDir}`);
    process.exit(1);
  }
  if (excelPath && !fs.existsSync(excelPath)) {
    console.error(`Excel file not found: ${excelPath}`);
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

  if (excelPath) {
    await runExcelDrivenUpload({
      excelPath,
      imagesDir,
      dryRun,
      overwrite,
      supabase,
      products,
      lookups,
      allImages,
    });
    return;
  }

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

  if (auditOnly) {
    const { auditJson, auditSummary, audit } = writeAuditReport({
      imagesDir,
      allImages,
      fileMatches,
      bestByProduct,
      unmatchedAll: report.unmatched,
      products,
    });
    console.log(
      JSON.stringify(
        {
          auditJson,
          auditSummary,
          ...audit.summary,
          unmatchedSample: audit.unmatched.slice(0, 20),
          missingSample: audit.missingOrWrong.slice(0, 20),
          duplicateSample: audit.duplicates.slice(0, 20),
        },
        null,
        2,
      ),
    );
    return;
  }

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

  if (!dryRun && report.uploaded > 0) {
    await triggerStorefrontRevalidation();
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
