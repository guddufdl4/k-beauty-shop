import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "./config";
import { createSsrSupabaseFetch } from "./service";

export async function updateSession(
  request: NextRequest,
  response?: NextResponse,
) {
  const supabaseResponse = response ?? NextResponse.next({ request });

  const url = getSupabaseProjectUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    global: { fetch: createSsrSupabaseFetch(key) },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return supabaseResponse;
}
