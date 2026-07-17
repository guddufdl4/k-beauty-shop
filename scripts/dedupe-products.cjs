'use strict';
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

(async () => {
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

const args = new Set(process.argv.slice(2));
const dryRun = !args.has("--apply");
const hardDelete = args.has("--hard");
const useSoftDelete = args.has("--soft") || (!hardDelete && args.has("--apply"));

function barcodeVariants(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return [String(value ?? "").trim()].filter(Boolean);
  const variants = new Set([String(value).trim(), digits]);
  const stripped = digits.replace(/^0+/, "");
  if (stripped) variants.add(stripped);
  if (digits.length === 12) variants.add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith("0")) variants.add(digits.slice(1));
  return [...variants];
}

function normalizeBarcode(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function canonicalBarcode(value) {
  const normalized = normalizeBarcode(value);
  if (!normalized) return null;
  return barcodeVariants(normalized).sort((a, b) => a.length - b.length)[0];
}

function dedupeKey(product) {
  const barcode = canonicalBarcode(product.barcode) ?? canonicalBarcode(product.sku);
  if (barcode) return `barcode:${barcode}`;
  return `sku:${product.sku.trim().toLowerCase()}`;
}

function scoreProduct(product) {
  let score = 0;
  if (Number(product.price) > 0) score += 4;
  if (product.image_url) score += 2;
  if (product.description) score += 1;
  if (product.barcode) score += 1;
  if (product.category_id) score += 1;
  const updatedAt = product.updated_at ?? product.created_at;
  if (updatedAt) score += new Date(updatedAt).getTime() / 1e15;
  return score;
}

function pickKeeper(products) {
  return [...products].sort((a, b) => scoreProduct(b) - scoreProduct(a))[0];
}

async function fetchAllProducts(supabase) {
  const PAGE = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id,sku,slug,barcode,name,brand,price,image_url,description,category_id,updated_at,created_at")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch products failed: ${error.message}`);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function probeSoftDeleteColumn(supabase) {
  const { error } = await supabase.from("products").select("deleted_at").limit(1);
  if (!error) return true;
  if (error.message?.toLowerCase().includes("deleted_at")) return false;
  throw new Error(`soft delete probe failed: ${error.message}`);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const hasSoftDelete = await probeSoftDeleteColumn(supabase);
const products = await fetchAllProducts(supabase);

const groups = new Map();
for (const product of products) {
  const key = dedupeKey(product);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(product);
}

const duplicateGroups = [...groups.entries()].filter(([, items]) => items.length > 1);
const toRemove = [];
const report = [];

for (const [key, items] of duplicateGroups) {
  const keeper = pickKeeper(items);
  const losers = items.filter((item) => item.id !== keeper.id);
  for (const loser of losers) {
    toRemove.push({
      id: loser.id,
      sku: loser.sku,
      slug: loser.slug,
      barcode: loser.barcode,
      name: loser.name,
      keeperId: keeper.id,
      keeperSku: keeper.sku,
      dedupeKey: key,
    });
  }
  report.push({
    dedupeKey: key,
    count: items.length,
    keeper: { id: keeper.id, sku: keeper.sku, slug: keeper.slug, barcode: keeper.barcode },
    removed: losers.map((p) => ({ id: p.id, sku: p.sku, slug: p.slug, barcode: p.barcode })),
  });
}

const summary = {
  mode: dryRun ? "dry-run" : useSoftDelete ? "soft-delete" : "hard-delete",
  hasSoftDeleteColumn: hasSoftDelete,
  totalProducts: products.length,
  uniqueDedupeKeys: groups.size,
  duplicateGroups: duplicateGroups.length,
  duplicatesToRemove: toRemove.length,
  dedupeKeyStrategy: "barcode (normalized) else sku",
};

console.log(JSON.stringify(summary, null, 2));

const reportPath = path.join(ROOT, "data", "dedupe-report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify({ summary, report }, null, 2),
  "utf8",
);
console.log(`Report written: ${reportPath}`);

if (dryRun) {
  console.log("Dry run only. Re-run with --apply --soft or --apply --hard.");
  process.exit(0);
}

if (useSoftDelete && !hasSoftDelete) {
  console.error("deleted_at column missing; use --apply --hard");
  process.exit(1);
}

const BATCH = 200;
let removed = 0;
for (let i = 0; i < toRemove.length; i += BATCH) {
  const batch = toRemove.slice(i, i + BATCH);
  const ids = batch.map((row) => row.id);

  if (useSoftDelete) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("products")
      .update({ deleted_at: now })
      .in("id", ids);
    if (error) {
      console.error("soft delete batch failed:", error.message);
      process.exit(1);
    }
  } else {
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) {
      console.error("delete batch failed:", error.message);
      process.exit(1);
    }
  }

  removed += batch.length;
  console.log(`Removed ${removed}/${toRemove.length}`);
}

const finalSummary = { ...summary, removed, remainingProducts: products.length - removed };
fs.writeFileSync(
  reportPath,
  JSON.stringify({ summary: finalSummary, report }, null, 2),
  "utf8",
);
console.log(JSON.stringify(finalSummary, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
