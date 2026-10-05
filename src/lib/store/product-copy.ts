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

export function stripCatalogNoiseFromName(name: string): string {
  const sanitized = sanitizeProductName(name);
  const withoutCodes = sanitized
    .replace(/(^|[\s_/-])\d{8,14}(?=$|[\s_/-])/g, "$1")
    .replace(
      /(^|[\s_/-])(\d{6,7})(?=$|[\s_/-])/g,
      (full, prefix: string, num: string) => {
        if (/^(19|20)\d{2}$/.test(num)) {
          return full;
        }
        return prefix;
      },
    )
    .replace(/\s+/g, " ")
    .trim();
  const letterCount = withoutCodes.replace(/[^a-zA-Z가-힣]/g, "").length;
  return letterCount >= 16 ? withoutCodes : sanitized;
}

export function collapseRepeatedBrandPrefix(name: string, brand?: string | null): string {
  let result = stripCatalogNoiseFromName(name);
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
  const nameFirst = trimmedName.split(/\s+/)[0]?.replace(/[^a-z0-9가-힣]/g, "") ?? "";
  const compactBrand = trimmedBrand.replace(/[^a-z0-9가-힣]/g, "");
  if (nameFirst && compactBrand && nameFirst === compactBrand) {
    return true;
  }
  if (
    (nameFirst === "tfs" || nameFirst === "fmgt" || nameFirst === "thefaceshop") &&
    compactBrand.includes("faceshop")
  ) {
    return true;
  }
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

const OBVIOUS_IMPORT_SUFFIX =
  /(?:\s+|\s*[-–—]\s*)(?:import(?:ed)?(?:\s+from\s+excel)?|from\s+excel|xlsx|csv|sheet\s*\d*)\s*$/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** UI-only catalog title: spaces, duplicate brand, duplicate size. Never mutates SKU/slug. */
export function formatStorefrontDisplayTitle(
  name: string,
  brand?: string | null,
  size?: string | null,
): string {
  const original = String(name ?? "").trim();
  let result = original.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!result) {
    return original;
  }

  result = result.replace(OBVIOUS_IMPORT_SUFFIX, "").replace(/\s+/g, " ").trim();
  result = collapseRepeatedBrandPrefix(result, brand);

  const brandName = sanitizeProductName(String(brand ?? ""));
  if (brandName) {
    const lower = result.toLowerCase();
    const brandLower = brandName.toLowerCase();
    // Only strip an exact leading brand token. Fuzzy alias / first-word matches
    // (TFS vs THE FACE SHOP, "The …" vs "The Face Shop") change product meaning.
    if (lower === brandLower || lower.startsWith(`${brandLower} `)) {
      const stripped = result.slice(brandName.length).replace(/^[\s\-–—:,]+/, "").trim();
      if (stripped.length >= 3) {
        result = stripped;
      }
    }
  }

  const sizeLabel = String(size ?? "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (sizeLabel && result.toLowerCase() !== sizeLabel.toLowerCase()) {
    const sizePattern = new RegExp(`\\b${escapeRegExp(sizeLabel)}\\b`, "gi");
    const matches = result.match(sizePattern);
    if (matches && matches.length >= 2) {
      result = result.replace(new RegExp(`(?:\\s*${escapeRegExp(sizeLabel)})+$`, "i"), "").trim();
    }
  }

  result = result.replace(/\s+/g, " ").trim();
  return result || original;
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