function normalizeComparable(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-/()[\].]+/g, " ")
    .replace(/\s+/g, " ");
}

export function collapseRepeatedBrandPrefix(name: string, brand?: string | null): string {
  let result = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!result) {
    return result;
  }

  result = result.replace(/^([A-Za-z0-9][A-Za-z0-9.&'’-]*)\s+\1\b/gi, "$1");

  const trimmedBrand = String(brand ?? "").replace(/\s+/g, " ").trim();
  if (!trimmedBrand) {
    return result;
  }

  const escapedBrand = trimmedBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  result = result.replace(new RegExp(`^(${escapedBrand})(?:\\s+\\1)+\\b`, "i"), "$1");

  const firstWord = trimmedBrand.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 3) {
    const escapedFirst = firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`^(${escapedFirst})(?:\\s+\\1)+\\b`, "i"), "$1");
  }

  return result.replace(/\s+/g, " ").trim();
}

export function nameAlreadyIncludesBrand(name: string, brand?: string | null): boolean {
  const trimmedName = String(name ?? "").trim();
  const trimmedBrand = String(brand ?? "").trim();
  if (!trimmedName || !trimmedBrand) {
    return false;
  }
  const nameLower = trimmedName.toLowerCase();
  const brandLower = trimmedBrand.toLowerCase();
  return nameLower === brandLower || nameLower.startsWith(`${brandLower} `);
}

export function formatProductDisplayName(name: string, brand?: string | null): string {
  const trimmedName = collapseRepeatedBrandPrefix(name, brand);
  const trimmedBrand = brand?.trim();
  if (!trimmedBrand || nameAlreadyIncludesBrand(trimmedName, trimmedBrand)) {
    return trimmedName;
  }
  return `${trimmedBrand} ${trimmedName}`;
}

export function isRedundantProductDescription(
  description: string | null | undefined,
  name: string,
  brand?: string | null,
): boolean {
  const text = description?.trim();
  if (!text) {
    return true;
  }

  const normalizedText = normalizeComparable(text);
  const normalizedName = normalizeComparable(name);
  if (!normalizedText || normalizedText === normalizedName) {
    return true;
  }

  const brandName = brand?.trim();
  if (brandName) {
    const combined = normalizeComparable(`${brandName} ${name}`);
    if (normalizedText === combined || normalizedText === normalizeComparable(brandName)) {
      return true;
    }
  }

  return false;
}