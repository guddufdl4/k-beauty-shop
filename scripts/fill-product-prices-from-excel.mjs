// Usage: npx tsx scripts/fill-product-prices-from-excel.mjs [--dry-run]
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseHanmiWorkbook } from "../src/lib/admin/parse-hanmi-workbook.ts";
import { collapseRepeatedBrandPrefix } from "../src/lib/store/product-copy.ts";

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const WORKBOOKS = [
  path.join(ROOT, "data/hanmi-brand-price-list.xlsx"),
  path.join(ROOT, "data/brand-priority-list.xlsx"),
];

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

function firstBarcode(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.length <= 14) return digits;
  const korean = digits.match(/88\d{11}/);
  if (korean) return korean[0];
  const any13 = digits.match(/\d{13}/);
  return any13 ? any13[0] : digits.slice(0, 13);
}

function usablePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 1 ? Math.round(n) : null;
}

async function fetchAll(supabase, table, columns) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select(columns).range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

loadEnvLocal();
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const byKey = new Map();
for (const filePath of WORKBOOKS) {
  if (!fs.existsSync(filePath)) {
    console.log("skip missing", filePath);
    continue;
  }
  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  const { rows } = parseHanmiWorkbook(arrayBuffer);
  for (const row of rows) {
    const keys = [
      firstBarcode(row.barcode),
      firstBarcode(row.sku),
      String(row.sku ?? "").trim(),
    ].filter(Boolean);
    for (const keyValue of keys) {
      const existing = byKey.get(keyValue);
      if (!existing || (usablePrice(row.price) ?? 0) > (usablePrice(existing.price) ?? 0)) {
        byKey.set(keyValue, row);
      }
    }
  }
  console.log("parsed", path.basename(filePath), rows.length);
}

const supabase = createClient(url, key);
const products = (
  await fetchAll(
    supabase,
    "products",
    "id, sku, barcode, name, brand, price, wholesale_price, deleted_at",
  )
).filter((row) => !row.deleted_at);

const updates = [];
let pricedOk = 0;
let unmatchedPrice = 0;
let namesOnly = 0;

for (const product of products) {
  const keys = [
    firstBarcode(product.barcode),
    firstBarcode(product.sku),
    String(product.sku ?? "").trim(),
  ].filter(Boolean);
  let excel = null;
  for (const keyValue of keys) {
    const match = byKey.get(keyValue);
    if (match) {
      excel = match;
      break;
    }
  }

  const payload = {};
  const cleaned = collapseRepeatedBrandPrefix(product.name, product.brand);
  if (cleaned && cleaned !== product.name) {
    payload.name = cleaned;
  }

  const excelWholesale = excel ? usablePrice(excel.price) : null;
  const excelRetail = excel ? usablePrice(excel.msrp) : null;
  const currentWholesale = usablePrice(product.wholesale_price);
  const currentRetail = usablePrice(product.price);

  if (excelWholesale && !currentWholesale) {
    payload.wholesale_price = excelWholesale;
    payload.price = excelRetail ?? excelWholesale;
  } else if (excelWholesale && currentWholesale && !currentRetail) {
    payload.price = excelRetail ?? excelWholesale;
  }

  if (Object.keys(payload).length === 0) {
    if (currentWholesale || currentRetail) pricedOk += 1;
    else unmatchedPrice += 1;
    continue;
  }
  if (!payload.wholesale_price && !payload.price) namesOnly += 1;
  updates.push({ id: product.id, payload });
}

console.log(
  JSON.stringify(
    {
      products: products.length,
      excelKeys: byKey.size,
      updates: updates.length,
      namesOnly,
      pricedOk,
      stillUnpriced: unmatchedPrice,
      sample: updates.slice(0, 8).map((entry) => ({ id: entry.id, ...entry.payload })),
    },
    null,
    2,
  ),
);

if (DRY_RUN) {
  console.log("dry run");
  process.exit(0);
}

const batchSize = 80;
let updated = 0;
let failed = 0;
for (let i = 0; i < updates.length; i += batchSize) {
  const batch = updates.slice(i, i + batchSize);
  const results = await Promise.all(
    batch.map(async (entry) => {
      const { error } = await supabase.from("products").update(entry.payload).eq("id", entry.id);
      return error;
    }),
  );
  for (const error of results) {
    if (error) failed += 1;
    else updated += 1;
  }
  console.log(`updated ${Math.min(i + batch.length, updates.length)}/${updates.length}`);
}
console.log({ updated, failed });
