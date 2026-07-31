// Usage: node scripts/seed-category-subtree.mjs [--dry-run]
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");

const STOREFRONT_NAV_SLUGS = ["skincare", "makeup", "mask-pack", "suncare", "haircare", "bodycare"];

const CATEGORY_TAXONOMY = {
  skincare: [
    { slug: "skin-toner", name: "스킨/토너", sortOrder: 1 },
    { slug: "lotion-emulsion", name: "로션/에멀전", sortOrder: 2 },
    { slug: "essence-serum-ampoule", name: "에센스/세럼/앰플", sortOrder: 3 },
    {
      slug: "cream",
      name: "크림",
      sortOrder: 4,
      children: [
        { slug: "moisture-cream", name: "수분크림", sortOrder: 1 },
        { slug: "nutrition-cream", name: "영양크림", sortOrder: 2 },
      ],
    },
    { slug: "basic-set", name: "기초세트", sortOrder: 5 },
    { slug: "eye-care", name: "아이케어", sortOrder: 6 },
    { slug: "cleansing", name: "클렌징", sortOrder: 7 },
    { slug: "skincare-suncare", name: "선케어", sortOrder: 8 },
  ],
  makeup: [
    { slug: "makeup-base", name: "베이스", sortOrder: 1 },
    { slug: "lip-makeup", name: "립", sortOrder: 2 },
    { slug: "eye-makeup", name: "아이", sortOrder: 3 },
    { slug: "cheek", name: "치크", sortOrder: 4 },
  ],
  "mask-pack": [
    { slug: "sheet-mask", name: "시트마스크", sortOrder: 1 },
    { slug: "sleeping-mask", name: "슬리핑마스크", sortOrder: 2 },
    { slug: "wash-off-mask", name: "워시오프팩", sortOrder: 3 },
  ],
  suncare: [
    { slug: "sunscreen", name: "선크림", sortOrder: 1 },
    { slug: "sun-stick", name: "선스틱", sortOrder: 2 },
    { slug: "after-sun", name: "애프터선", sortOrder: 3 },
  ],
  haircare: [
    { slug: "shampoo", name: "샴푸", sortOrder: 1 },
    { slug: "treatment", name: "트리트먼트", sortOrder: 2 },
    { slug: "hair-styling", name: "스타일링", sortOrder: 3 },
  ],
  bodycare: [
    { slug: "body-wash", name: "바디워시", sortOrder: 1 },
    { slug: "body-lotion", name: "바디로션", sortOrder: 2 },
    { slug: "hand-foot-care", name: "핸드&풋", sortOrder: 3 },
  ],
};

const RE_PARENT_SLUG_MAP = {
  "face-serum": "skincare",
  "face-cream": "skincare",
  "toner-pad": "skincare",
  "eye-cream": "skincare",
  "eye-patch": "skincare",
  "cleansing-foam": "skincare",
  "soothing-gel": "skincare",
  "acne-patch": "skincare",
  "tone-up-line": "skincare",
  "hydra-line": "skincare",
  "miracle-white-line": "skincare",
  "vegan-collagen-line": "skincare",
  "pine-line": "skincare",
  "calm-ampule-line": "skincare",
  "dermatic-clear-line": "skincare",
  "rice-series": "skincare",
  "make-up-base": "makeup",
  "bb-cream": "makeup",
  "multi-stick": "makeup",
  "liquid-cheek": "makeup",
  "dual-liner": "makeup",
  "lip-tint-glow": "makeup",
  "lip-tint-matte": "makeup",
  "lip-care": "makeup",
  "lip-essence": "makeup",
  men: "makeup",
  "hydrogel-mask": "mask-pack",
  "lifting-mask": "mask-pack",
  "bubble-mask": "mask-pack",
  "sheetgel-mask": "mask-pack",
  "sun-cream": "suncare",
  "hand-cream": "bodycare",
  "hand-lotion": "bodycare",
  "hand-wash": "bodycare",
  soap: "bodycare",
  "show-ball": "bodycare",
  "bath-body": "bodycare",
  perfume: "bodycare",
  "beauty-device": "bodycare",
  "oil-control-paper": "bodycare",
};

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

async function upsertSubcategory(supabase, parentId, node, parentSortBase, summary) {
  const { data: existing, error: fetchError } = await supabase
    .from("categories")
    .select("id, slug, parent_id, name")
    .eq("slug", node.slug)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  let categoryId = existing?.id ?? null;

  if (!existing) {
    summary.created.push({ slug: node.slug, parentId });
    if (!DRY_RUN) {
      const { data: inserted, error: insertError } = await supabase
        .from("categories")
        .insert({
          name: node.name,
          slug: node.slug,
          parent_id: parentId,
          sort_order: parentSortBase + node.sortOrder,
          is_active: true,
        })
        .select("id")
        .single();
      if (insertError) throw new Error(`Insert ${node.slug}: ${insertError.message}`);
      categoryId = inserted.id;
    }
  } else if (existing.parent_id !== parentId) {
    summary.reparented.push({ slug: node.slug, from: existing.parent_id, to: parentId });
    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from("categories")
        .update({
          parent_id: parentId,
          name: node.name,
          sort_order: parentSortBase + node.sortOrder,
          is_active: true,
        })
        .eq("id", existing.id);
      if (updateError) throw new Error(`Update ${node.slug}: ${updateError.message}`);
    }
    categoryId = existing.id;
  } else {
    summary.unchanged.push(node.slug);
    categoryId = existing.id;
  }

  for (const child of node.children ?? []) {
    if (categoryId) {
      await upsertSubcategory(supabase, categoryId, child, node.sortOrder * 100, summary);
    }
  }
}

async function main() {
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

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order, is_active");
  if (catError) throw new Error(catError.message);

  const bySlug = new Map((categories ?? []).map((c) => [c.slug, c]));
  const summary = { created: [], reparented: [], unchanged: [], flatReparented: [] };

  for (const parentSlug of STOREFRONT_NAV_SLUGS) {
    const parent = bySlug.get(parentSlug);
    if (!parent) {
      console.warn(`Parent category missing: ${parentSlug}`);
      continue;
    }

    const nodes = CATEGORY_TAXONOMY[parentSlug] ?? [];
    for (const node of nodes) {
      await upsertSubcategory(supabase, parent.id, node, parent.sort_order * 100, summary);
    }
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order, is_active");
  if (refreshError) throw new Error(refreshError.message);
  const refreshedBySlug = new Map((refreshed ?? []).map((c) => [c.slug, c]));

  for (const [slug, parentSlug] of Object.entries(RE_PARENT_SLUG_MAP)) {
    const category = refreshedBySlug.get(slug);
    const parent = refreshedBySlug.get(parentSlug);
    if (!category || !parent) continue;
    if (category.parent_id === parent.id) continue;
    if (STOREFRONT_NAV_SLUGS.includes(slug)) continue;

    summary.flatReparented.push({ slug, parentSlug });
    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from("categories")
        .update({ parent_id: parent.id })
        .eq("id", category.id);
      if (updateError) throw new Error(`Re-parent ${slug}: ${updateError.message}`);
    }
  }

  const { data: finalCategories } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("sort_order");

  const tree = {};
  for (const parentSlug of STOREFRONT_NAV_SLUGS) {
    const parent = (finalCategories ?? []).find((c) => c.slug === parentSlug);
    if (!parent) continue;
    tree[parentSlug] = {
      name: parent.name,
      children: (finalCategories ?? [])
        .filter((c) => c.parent_id === parent.id)
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          children: (finalCategories ?? [])
            .filter((child) => child.parent_id === c.id)
            .map((child) => ({ slug: child.slug, name: child.name })),
        })),
    };
  }

  console.log(JSON.stringify({ dryRun: DRY_RUN, summary, tree }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
