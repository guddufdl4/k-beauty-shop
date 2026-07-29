const SUPABASE_URL_PATTERN = /https:\/\/[a-z0-9-]+\.supabase\.co/i;
const SUPABASE_OPAQUE_SECRET_KEY_PATTERN = /sb_secret_[A-Za-z0-9_-]+/;
const SUPABASE_OPAQUE_PUBLISHABLE_KEY_PATTERN = /sb_publishable_[A-Za-z0-9_-]+/;
const SUPABASE_JWT_KEY_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

/** HTTP headers must be ByteString (Latin-1). Strip characters Fetch rejects. */
export function toHttpHeaderValue(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 255) {
      result += value[index]!;
    }
  }
  return result;
}

/** Trim env values and strip optional wrapping quotes (common Vercel copy/paste mistake). */
export function parseEnvSecret(raw: string | undefined): string | null {
  if (raw == null) {
    return null;
  }

  let value = raw.trim();
  if (!value) {
    return null;
  }

  if (value.charCodeAt(0) === 0xfeff) {
    value = value.slice(1).trim();
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  const ascii = toHttpHeaderValue(value).trim();
  return ascii || null;
}

function extractSupabaseApiKey(
  raw: string | undefined,
  patterns: RegExp[],
): string | null {
  const parsed = parseEnvSecret(raw);
  if (!parsed) {
    return null;
  }

  for (const pattern of patterns) {
    const match = parsed.match(pattern);
    if (match?.[0]) {
      return match[0];
    }
  }

  return parsed;
}

export function getSupabaseProjectUrl(): string | null {
  const url = parseEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    return null;
  }

  const match = url.match(SUPABASE_URL_PATTERN);
  if (match?.[0]) {
    return match[0];
  }

  if (url.includes("supabase.co")) {
    return url;
  }

  return null;
}

export function getSupabaseAnonKey(): string | null {
  return extractSupabaseApiKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, [
    SUPABASE_OPAQUE_PUBLISHABLE_KEY_PATTERN,
    SUPABASE_JWT_KEY_PATTERN,
  ]);
}

export function getSupabaseServiceRoleKey(): string | null {
  return extractSupabaseApiKey(process.env.SUPABASE_SERVICE_ROLE_KEY, [
    SUPABASE_OPAQUE_SECRET_KEY_PATTERN,
    SUPABASE_JWT_KEY_PATTERN,
  ]);
}

/** True for Supabase's opaque `sb_secret_` keys (not legacy JWT `eyJ`). */
export function isOpaqueSupabaseSecretKey(key: string): boolean {
  return SUPABASE_OPAQUE_SECRET_KEY_PATTERN.test(key);
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

  if (!getSupabaseProjectUrl()) {
    return `NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다 (예: https://<project-ref>.supabase.co). 현재 값: ${url}`;
  }

  if (!getSupabaseAnonKey()) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.";
  }

  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
    return "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Vercel Environment Variables에 추가한 뒤 Production/Preview 재배포가 필요합니다.";
  }

  if (
    !isOpaqueSupabaseSecretKey(serviceKey) &&
    !serviceKey.startsWith("eyJ")
  ) {
    return "SUPABASE_SERVICE_ROLE_KEY 형식을 확인하세요. Supabase Dashboard > API Keys의 sb_secret_... 또는 Legacy service_role(JWT) 키를 사용해야 합니다.";
  }

  return "SUPABASE_SERVICE_ROLE_KEY는 설정되어 있으나 Supabase 클라이언트를 만들지 못했습니다.";
}
