const SUPABASE_URL_PATTERN = /https:\/\/[a-z0-9-]+\.supabase\.co/i;
const SUPABASE_OPAQUE_SECRET_KEY_PATTERN = /sb_secret_[A-Za-z0-9_-]+/;
const SUPABASE_OPAQUE_PUBLISHABLE_KEY_PATTERN = /sb_publishable_[A-Za-z0-9_-]+/;
const SUPABASE_JWT_KEY_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

export const SUPABASE_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export type SupabaseEnvVarName = (typeof SUPABASE_ENV_VARS)[number];

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

/** True when raw env still contains non-Latin-1 characters (e.g. copied "Settings →"). */
export function rawEnvHasNonAscii(raw: string | undefined): boolean {
  if (raw == null || !raw) {
    return false;
  }

  return raw !== toHttpHeaderValue(raw);
}

/** Which Supabase env var still contains pasted UI junk / non-ASCII (no secret values returned). */
export function findCorruptedSupabaseEnvVar(): SupabaseEnvVarName | null {
  if (rawEnvHasNonAscii(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return "NEXT_PUBLIC_SUPABASE_URL";
  }

  if (rawEnvHasNonAscii(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY";
  }

  if (rawEnvHasNonAscii(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return "SUPABASE_SERVICE_ROLE_KEY";
  }

  return null;
}

export function describeCorruptedSupabaseEnvVar(name: SupabaseEnvVarName): string {
  return `${name}에 "Settings →" 같은 UI 텍스트나 특수문자(→ 등)가 포함되어 있습니다. Vercel Environment Variables에서 해당 변수를 삭제한 뒤 Supabase Dashboard에서 값만 다시 붙여넣고 Production 재배포하세요.`;
}

/** Map Fetch ByteString failures to the likely corrupted env var (without exposing secrets). */
export function describeByteStringFetchError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  if (!/ByteString|greater than 255/i.test(message)) {
    return null;
  }

  const corrupted = findCorruptedSupabaseEnvVar();
  if (corrupted) {
    return `${describeCorruptedSupabaseEnvVar(corrupted)}\n${describeSupabaseEnvDiagnostics()}`;
  }

  const failing = SUPABASE_ENV_VARS.filter((name) => {
    const snapshot = describeSupabaseEnvVarSnapshot(name);
    return snapshot.configured && !snapshot.passesHeaderSafeCheck;
  });

  if (failing.length > 0) {
    return `Supabase env parse produced non-ASCII header values in: ${failing.join(", ")}. Vercel에서 값만 다시 붙여넣고 재배포하세요.\n${describeSupabaseEnvDiagnostics()}`;
  }

  return `Supabase fetch ByteString 오류 — 환경 변수에 비ASCII 문자(→ 등)가 남아 있을 수 있습니다.\n${describeSupabaseEnvDiagnostics()}`;
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

  value = stripLeadingUiJunk(value);

  const ascii = toHttpHeaderValue(value).trim();
  return ascii || null;
}

/** Drop Supabase Dashboard UI text copied before the real value (e.g. "Settings → sb_secret_..."). */
function stripLeadingUiJunk(value: string): string {
  const patterns = [
    SUPABASE_URL_PATTERN,
    SUPABASE_OPAQUE_SECRET_KEY_PATTERN,
    SUPABASE_OPAQUE_PUBLISHABLE_KEY_PATTERN,
    SUPABASE_JWT_KEY_PATTERN,
  ];

  let earliest: { index: number; token: string } | null = null;

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (!match?.[0]) {
      continue;
    }

    const index = match.index ?? value.indexOf(match[0]);
    if (index < 0) {
      continue;
    }

    if (!earliest || index < earliest.index) {
      earliest = { index, token: match[0] };
    }
  }

  if (earliest && earliest.index > 0) {
    return earliest.token;
  }

  return value;
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

export type SanitizedSupabaseConfig = {
  url: string;
  anonKey: string;
  serviceKey: string;
};

/** True when a value is safe for Fetch Headers (Latin-1 / ByteString only). */
export function isHttpHeaderSafe(value: string): boolean {
  return value === toHttpHeaderValue(value);
}

function requireHttpHeaderSafe(value: string | null): string | null {
  if (!value || !isHttpHeaderSafe(value)) {
    return null;
  }

  return value;
}

/**
 * Single source of truth for Supabase env — url and keys are ASCII-only and safe for Headers.set().
 * fetchWithAuth in @supabase/supabase-js calls Headers.set(apikey) before our custom fetch runs;
 * non-Latin-1 characters (e.g. pasted "Settings →") throw there unless values are sanitized first.
 */
export function getSanitizedSupabaseConfig(): SanitizedSupabaseConfig | null {
  const url = requireHttpHeaderSafe(getSupabaseProjectUrl());
  const anonKey = requireHttpHeaderSafe(getSupabaseAnonKey());
  const serviceKey = requireHttpHeaderSafe(getSupabaseServiceRoleKey());

  if (!url || !anonKey || !serviceKey) {
    return null;
  }

  return { url, anonKey, serviceKey };
}

/** Safe prefix + length for diagnostics (never exposes full secrets). */
export function describeSupabaseEnvVarSnapshot(name: SupabaseEnvVarName): {
  name: SupabaseEnvVarName;
  configured: boolean;
  rawLength: number;
  prefix: string;
  rawHasNonAscii: boolean;
  sanitizedLength: number | null;
  sanitizedPrefix: string | null;
  passesHeaderSafeCheck: boolean;
} {
  const raw = process.env[name]?.trim() ?? "";
  const sanitized =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? getSupabaseProjectUrl()
      : name === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        ? getSupabaseAnonKey()
        : getSupabaseServiceRoleKey();

  return {
    name,
    configured: raw.length > 0,
    rawLength: raw.length,
    prefix: raw.slice(0, 10),
    rawHasNonAscii: rawEnvHasNonAscii(raw),
    sanitizedLength: sanitized?.length ?? null,
    sanitizedPrefix: sanitized?.slice(0, 10) ?? null,
    passesHeaderSafeCheck: sanitized ? isHttpHeaderSafe(sanitized) : false,
  };
}

export function describeSupabaseEnvDiagnostics(): string {
  const snapshots = SUPABASE_ENV_VARS.map(describeSupabaseEnvVarSnapshot);
  const corrupted = findCorruptedSupabaseEnvVar();
  const lines = snapshots.map((snapshot) => {
    const status = snapshot.passesHeaderSafeCheck
      ? "ok"
      : snapshot.rawHasNonAscii
        ? "non-ascii in raw"
        : snapshot.configured
          ? "parse failed"
          : "missing";
    return `${snapshot.name}: ${status} (raw len=${snapshot.rawLength}, prefix="${snapshot.prefix}", sanitized prefix="${snapshot.sanitizedPrefix ?? "—"}")`;
  });

  if (corrupted) {
    lines.unshift(describeCorruptedSupabaseEnvVar(corrupted));
  }

  return lines.join("\n");
}

export function getSupabaseProjectUrl(): string | null {
  const url = parseEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    return null;
  }

  const match = url.match(SUPABASE_URL_PATTERN);
  return match?.[0] ?? null;
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
  const corrupted = findCorruptedSupabaseEnvVar();
  if (corrupted) {
    return describeCorruptedSupabaseEnvVar(corrupted);
  }

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

  if (!getSanitizedSupabaseConfig()) {
    return `Supabase 환경 변수를 HTTP 헤더로 사용할 수 없습니다 (비ASCII 문자 또는 파싱 실패).\n${describeSupabaseEnvDiagnostics()}`;
  }

  return "SUPABASE_SERVICE_ROLE_KEY는 설정되어 있으나 Supabase 클라이언트를 만들지 못했습니다.";
}
