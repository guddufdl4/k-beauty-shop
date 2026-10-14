import { routing } from "@/i18n/routing";
import { getSearchSuggestions } from "@/lib/supabase/product-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().slice(0, 160) ?? "";

  if (query.length < 2) {
    return Response.json({ products: [], brands: [] });
  }

  const requestedLocale = searchParams.get("locale") ?? "en";
  const locale = (routing.locales as readonly string[]).includes(requestedLocale) ? requestedLocale : "en";
  const suggestions = await getSearchSuggestions(query, undefined, locale);
  return Response.json(suggestions, { headers: { "Cache-Control": "public, max-age=15, s-maxage=60, stale-while-revalidate=60" } });
}
