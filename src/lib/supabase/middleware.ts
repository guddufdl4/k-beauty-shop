import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSanitizedSupabaseConfig } from "./config";
import { createSsrSupabaseFetch } from "./service";

export async function updateSession(
  request: NextRequest,
  response?: NextResponse,
) {
  const supabaseResponse = response ?? NextResponse.next({ request });

  const config = getSanitizedSupabaseConfig();
  if (!config) {
    return supabaseResponse;
  }

  const { url, anonKey } = config;

  const supabase = createServerClient(url, anonKey, {
    global: {
      headers: { apikey: anonKey },
      fetch: createSsrSupabaseFetch(anonKey),
    },
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

// Validate the authenticated user and database role; metadata/cookie claims are never trusted.
export async function isMaintenanceAdmin(request: NextRequest, response: NextResponse): Promise<boolean> {
  const config = getSanitizedSupabaseConfig();
  if (!config) return false;
  const supabase = createServerClient(config.url, config.anonKey, {
    global: { headers: { apikey: config.anonKey }, fetch: createSsrSupabaseFetch(config.anonKey) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => {
        request.cookies.set(name, value);
        response.cookies.set(name, value, options);
      }),
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin";
}
