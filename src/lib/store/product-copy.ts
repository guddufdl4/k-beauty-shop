function normalizeComparable(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-/()[\].]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Strip characters that break Windows filenames and image matching (; | : * ? " < > \ /). */
export function sanitizeProductName(name: string): string {
  return String(name ?? "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/\uFFFD/g, "")
    .replace(/[;；|｜*?"<>\\/／:：]+/g, " ")
    .replace(/_{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-_,.]+|[-_,.]+$/g, "")
    .trim();
}

export function collapseRepeatedBrandPrefix(name: string, brand?: string | null): string {
  let result = sanitizeProductName(name);
  if (!result) {
    return result;
  }

  const collapseLeadingDuplicateWords = (value: string) => {
    const parts = value.split(/\s+/).filter(Boolean);
    while (
      parts.length >= 2 &&
      parts[0].toLowerCase() === parts[1].toLowerCase()
    ) {
      parts.splice(1, 1);
    }
    return parts.join(" ");
  };

  result = collapseLeadingDuplicateWords(result);

  const trimmedBrand = sanitizeProductName(String(brand ?? ""));
  if (trimmedBrand) {
    const doubledPrefix = `${trimmedBrand.toLowerCase()} ${trimmedBrand.toLowerCase()}`;
    while (
      result.toLowerCase() === doubledPrefix ||
      result.toLowerCase().startsWith(`${doubledPrefix} `)
    ) {
      result = result.slice(trimmedBrand.length).trim();
    }
    result = collapseLeadingDuplicateWords(result);
  }

  return result.replace(/\s+/g, " ").trim();
}

export function nameAlreadyIncludesBrand(name: string, brand?: string | null): boolean {
  const trimmedName = sanitizeProductName(name).toLowerCase();
  const trimmedBrand = sanitizeProductName(String(brand ?? "")).toLowerCase();
  if (!trimmedName || !trimmedBrand) {
    return false;
  }
  if (trimmedName === trimmedBrand || trimmedName.startsWith(`${trimmedBrand} `)) {
    return true;
  }
  const nameFirst = trimmedName.split(/\s+/)[0];
  const brandFirst = trimmedBrand.split(/\s+/)[0];
  return Boolean(nameFirst && brandFirst && brandFirst.length >= 3 && nameFirst === brandFirst);
}

export function formatProductDisplayName(name: string, brand?: string | null): string {
  const trimmedBrand = sanitizeProductName(String(brand ?? ""));
  const trimmedName = collapseRepeatedBrandPrefix(name, trimmedBrand);
  if (!trimmedBrand || nameAlreadyIncludesBrand(trimmedName, trimmedBrand)) {
    return collapseRepeatedBrandPrefix(trimmedName, trimmedBrand);
  }
  return collapseRepeatedBrandPrefix(`${trimmedBrand} ${trimmedName}`, trimmedBrand);
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