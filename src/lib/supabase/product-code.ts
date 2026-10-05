import type { SupabaseClient } from "@supabase/supabase-js";

const PRODUCT_CODE_PATTERN = /^HMT-\d{6}$/;

/** null = not probed yet, true/false = column presence cached for this process. */
let productCodeColumnExists: boolean | null = null;

export function isMissingProductCodeColumnError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  if (!normalized.includes("product_code")) {
    return false;
  }

  return (
    normalized.includes("does not exist") ||
    normalized.includes("could not find") ||
    normalized.includes("permission denied") ||
    normalized.includes("not authorized") ||
    normalized.includes("42501")
  );
}

export function markProductCodeColumnMissing(): void {
  productCodeColumnExists = false;
}

export function markProductCodeColumnPresent(): void {
  productCodeColumnExists = true;
}

export function isProductCodeColumnAvailable(): boolean {
  return productCodeColumnExists !== false;
}

export async function ensureProductCodeColumnProbed(
  supabase: SupabaseClient,
): Promise<boolean> {
  if (productCodeColumnExists !== null) {
    return productCodeColumnExists;
  }

  const { error } = await supabase.from("products").select("product_code").limit(1);

  if (!error) {
    productCodeColumnExists = true;
    return true;
  }

  if (isMissingProductCodeColumnError(error.message)) {
    productCodeColumnExists = false;
    return false;
  }

  productCodeColumnExists = true;
  return true;
}

export function formatHmtProductCode(sequence: number): string {
  return `HMT-${String(sequence).padStart(6, "0")}`;
}

export function isValidHmtProductCode(value: string | null | undefined): value is string {
  return Boolean(value && PRODUCT_CODE_PATTERN.test(value));
}

export function parseHmtProductCodeDigits(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  const full = trimmed.match(/^HMT-?(\d{1,6})$/);
  if (full?.[1]) {
    return full[1].padStart(6, "0");
  }
  if (/^\d{1,6}$/.test(trimmed)) {
    return trimmed.padStart(6, "0");
  }
  return null;
}

export function productCodeSearchVariants(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const variants = new Set<string>([trimmed]);
  const digits = parseHmtProductCodeDigits(trimmed);
  if (digits) {
    variants.add(formatHmtProductCode(Number(digits)));
    variants.add(digits);
    variants.add(String(Number(digits)));
  }

  return [...variants];
}

export function readProductCode(row: Record<string, unknown> | null | undefined): string | null {
  if (!row || !("product_code" in row)) {
    return null;
  }
  const value = row.product_code;
  return typeof value === "string" && isValidHmtProductCode(value) ? value : null;
}
