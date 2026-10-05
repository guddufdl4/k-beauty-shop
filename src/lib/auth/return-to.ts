const BLOCKED_PREFIXES = ["/admin", "/auth", "/api"];

export function safeStorefrontReturnTo(
  value: string | null | undefined,
  fallback = "/account",
): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  if (trimmed.includes("://")) {
    return fallback;
  }

  const path = trimmed.split("?")[0] ?? trimmed;
  if (BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return fallback;
  }

  return trimmed;
}

export function withReturnTo(href: string, returnTo?: string | null): string {
  if (!returnTo) {
    return href;
  }
  const safe = safeStorefrontReturnTo(returnTo, "");
  if (!safe) {
    return href;
  }
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}next=${encodeURIComponent(safe)}`;
}
