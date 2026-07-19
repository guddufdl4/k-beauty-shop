import { getSearchSuggestions } from "@/lib/supabase/product-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return Response.json({ products: [], brands: [] });
  }

  const suggestions = await getSearchSuggestions(query);
  return Response.json(suggestions);
}
