import { NextResponse } from "next/server";
import { resolveSiteUrl } from "@/lib/site-url";
import {
  getPublicProductSitemapCount,
  SITEMAP_PRODUCTS_PER_FILE,
} from "@/lib/supabase/products";

export async function GET() {
  const siteUrl = resolveSiteUrl();
  const productCount = await getPublicProductSitemapCount();
  const productChunks = Math.ceil(productCount / SITEMAP_PRODUCTS_PER_FILE);
  const sitemapCount = 1 + productChunks;
  const entries = Array.from({ length: sitemapCount }, (_, id) => {
    return `  <sitemap><loc>${siteUrl}/sitemap/${id}.xml</loc></sitemap>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900",
    },
  });
}