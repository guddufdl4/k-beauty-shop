/** Trim env values and strip optional wrapping quotes (common Vercel copy/paste mistake). */
export function parseEnvSecret(raw: string | undefined): string | null {
  if (raw == null) {
    return null;
  }

  let value = raw.trim();
  if (!value) {
    return null;
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value || null;
}

export function getSupabaseProjectUrl(): string | null {
  const url = parseEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url || !url.includes("supabase.co")) {
    return null;
  }

  return url;
}

export function getSupabaseAnonKey(): string | null {
  return parseEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey(): string | null {
  return parseEnvSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** True for Supabase's opaque `sb_secret_` / legacy JWT `eyJ` service keys. */
export function isOpaqueSupabaseSecretKey(key: string): boolean {
  return key.startsWith("sb_secret_");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseProjectUrl() && getSupabaseAnonKey());
}

/** Human-readable reason when `createServiceClient()` cannot run. */
export function describeServiceClientMisconfiguration(): string {
  const url = parseEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    return "NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.";
  }

  if (!url.includes("supabase.co")) {
    return `NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다 (예: https://<project-ref>.supabase.co). 현재 값: ${url}`;
  }

  if (!parseEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.";
  }

  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
    return "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Vercel Environment Variables에 추가한 뒤 Production/Preview 재배포가 필요합니다.";
  }

  if (
    !serviceKey.startsWith("sb_secret_") &&
    !serviceKey.startsWith("eyJ")
  ) {
    return "SUPABASE_SERVICE_ROLE_KEY 형식을 확인하세요. Supabase Dashboard → API Keys의 sb_secret_... 또는 Legacy service_role(JWT) 키를 사용해야 합니다.";
  }

  return "SUPABASE_SERVICE_ROLE_KEY는 설정되어 있으나 Supabase 클라이언트를 만들지 못했습니다.";
}
