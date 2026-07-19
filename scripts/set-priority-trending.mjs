// Usage: node scripts/set-priority-trending.mjs [--dry-run]
﻿import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const PRIORITY_SKUS_PATH = path.join(ROOT, "data/brand-priority-skus.json");
const DRY_RUN = process.argv.includes("--dry-run");
const PAGE_SIZE = 1000;
const BATCH_SIZE = 200;
const DEMO_PRODUCT_SLUGS = new Set(["hydra-serum", "lumiere-rose-hydrating-essence", "han-river-velvet-lip-tint-set", "jeju-dew-green-tea-sleep-mask", "seoul-glow-airy-sun-fluid", "peach-blossom-snail-ampoule"]);
const DEMO_PRODUCT_SKUS = new Set(["SG-HS-50", "LS-RE-150", "HRB-LT-SET", "JDC-GT-80", "SGL-SF-50", "PBK-SA-50"]);

function loadPrioritySkus() {
  if (!fs.existsSync(PRIORITY_SKUS_PATH)) return new Set();
  const raw = JSON.parse(fs.readFileSync(PRIORITY_SKUS_PATH, "utf8"));
  return new Set(Array.isArray(raw) ? raw.map(String) : []);
}

function barcodeVariants(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return [String(value ?? "").trim()];
  const variants = new Set([String(value ?? "").trim(), digits]);
  const stripped = digits.replace(/^0+/, "");
  if (stripped) variants.add(stripped);
  if (digits.length === 12) variants.add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith("0")) variants.add(digits.slice(1));
  return [...variants];
}

function isDemoProduct(product) {
  return DEMO_PRODUCT_SLUGS.has(product.slug) || DEMO_PRODUCT_SKUS.has(product.sku);
}

function productMatchesBrandPriority(product, priorityKeys) {
  if (priorityKeys.size === 0) return false;
  const candidates = [...barcodeVariants(product.sku), ...(product.barcode ? barcodeVariants(product.barcode) : [])];
  return candidates.some((candidate) => priorityKeys.has(candidate));
}

async function fetchAllProducts(supabase) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from("products").select("id, sku, barcode, slug, is_featured, status").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const priorityKeys = loadPrioritySkus();
console.log(JSON.stringify({ mode: DRY_RUN ? "dry-run" : "apply", priorityKeyCount: priorityKeys.size, field: "is_featured" }));

const products = await fetchAllProducts(sb);
const activeProducts = products.filter((p) => p.status !== "deleted");
const matched = activeProducts.filter((product) => !isDemoProduct(product) && productMatchesBrandPriority(product, priorityKeys));
const toUpdate = matched.filter((p) => !p.is_featured);
const nonPriorityFeatured = activeProducts.filter((product) => !isDemoProduct(product) && !productMatchesBrandPriority(product, priorityKeys) && product.is_featured);

console.log(JSON.stringify({
  totalProducts: products.length,
  activeProducts: activeProducts.length,
  matchedPriorityProducts: matched.length,
  alreadyFeatured: matched.filter((p) => p.is_featured).length,
  toUpdate: toUpdate.length,
  nonPriorityCurrentlyFeatured: nonPriorityFeatured.length,
}));

if (DRY_RUN) {
  console.log("Dry run complete. Re-run without --dry-run to apply.");
  process.exit(0);
}

let updated = 0;
for (const batch of chunkArray(toUpdate, BATCH_SIZE)) {
  const ids = batch.map((p) => p.id);
  const { error } = await sb.from("products").update({ is_featured: true }).in("id", ids);
  if (error) {
    console.error("Update batch failed:", error.message);
    process.exit(1);
  }
  updated += batch.length;
  console.log(`Updated ${updated}/${toUpdate.length}`);
}

const { count: featuredCount, error: countError } = await sb.from("products").select("*", { count: "exact", head: true }).eq("is_featured", true);
if (countError) {
  console.error("Verification count failed:", countError.message);
  process.exit(1);
}

console.log(JSON.stringify({ updated, matchedPriorityProducts: matched.length, activeFeaturedTotal: featuredCount, field: "is_featured" }));

