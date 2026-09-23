import * as XLSX from "xlsx";
import { resolveHanmiCategory, looksLikeSetBundleName } from "@/lib/admin/hanmi-category-map";
import {
  MISSING_BARCODE_SKU,
  isMissingBarcodeSku,
} from "@/lib/admin/product-dedupe";
import { collapseRepeatedBrandPrefix } from "@/lib/store/product-copy";

export type ImportField =
  | "name"
  | "brand"
  | "sku"
  | "price"
  | "moq"
  | "stock"
  | "barcode"
  | "category"
  | "description"
  | "image_url"
  | "volume"
  | "color";

const HEADER_ALIASES: Record<ImportField, string[]> = {
  name: [
    "상품명",
    "제품명",
    "productname",
    "productnamekr",
    "productnameeng",
    "productnamekorean",
    "productnameenglish",
    "productkor",
    "producteng",
    "product(kor)",
    "product(eng)",
    "name",
    "description",
  ],
  brand: ["brand", "브랜드", "maker", "제조사"],
  sku: ["sku", "상품코드", "품번", "model", "상품번호"],
  price: [
    "price",
    "wholesaleprice",
    "whlolesaleprice",
    "wholesale",
    "supplyprice",
    "공급가",
    "도매가",
  ],
  moq: [
    "moq",
    "minimumorder",
    "최소주문수량",
    "최소주문",
    "최소수량",
    "inbox",
    "inner",
    "carton",
    "ctn",
    "outbox",
    "boxquantity",
    "qty1box",
    "qtyperbox",
    "unitsperbox",
    "perbox",
    "box",
    "ta",
    "박스",
    "박스수량",
  ],
  stock: ["qty", "quantity", "stock", "재고", "재고수량"],
  barcode: [
    "barcode",
    "barcdoes",
    "barcodes",
    "barcdode",
    "eabarcode",
    "boxbarcode",
    "바코드",
    "ean",
    "upc",
  ],
  category: ["category", "classification", "카테고리", "분류"],
  description: ["desc", "상세설명", "설명"],
  image_url: ["image", "imageurl", "대표이미지", "이미지"],
  volume: ["volume", "용량", "size", "netwt", "netweight", "capacity", "spec", "규격"],
  color: ["color", "colour", "색상"],
};

const HEADER_KEYWORDS = [
  "product",
  "name",
  "barcode",
  "price",
  "brand",
  "category",
  "retail",
  "qty",
  "sku",
  "classification",
  "msrp",
  "상품",
  "바코드",
  "가격",
  "브랜드",
];

export type ParsedHanmiRow = {
  name: string;
  brand: string;
  sku: string;
  /** B2B wholesale unit price (개당 도매가) from PRICE / wholesale columns only. */
  price: number | null;
  /** MSRP / retail reference price (참고가), never used as shop price. */
  msrp: number | null;
  moq: number;
  stock: number;
  barcode: string | null;
  category: string | null;
  description: string | null;
  /** Product capacity from Volume / 용량 / size columns (e.g. 30ml, 1Box(34g*4ea)). */
  volume: string | null;
  image_url: string | null;
  sourceSheet: string;
  sourceRow: Record<string, unknown>;
};

export type ParseHanmiResult = {
  headers: string[];
  rows: ParsedHanmiRow[];
  sheetStats: Array<{ sheet: string; imported: number; skipped: number }>;
};

function normalizeHeader(input: string): string {
  return input.toLowerCase().replace(/[\s_\-/()[\].\r\n]+/g, "");
}

function coerceScientificBarcode(input: string): string | null {
  const trimmed = input.trim();
  if (!/[eE][+-]?\d+$/.test(trimmed)) {
    return null;
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 10_000_000) {
    return null;
  }
  const rounded = String(Math.round(numeric));
  return rounded.length >= 8 && rounded.length <= 14 ? rounded : null;
}

function normalizeBarcode(input: string): string | null {
  const scientific = coerceScientificBarcode(String(input ?? ""));
  if (scientific) {
    return scientific;
  }

  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length < 8) {
    return null;
  }
  if (digits.length <= 14) {
    return digits;
  }

  const koreanEan = digits.match(/88\d{11}/);
  if (koreanEan) {
    return koreanEan[0];
  }

  if (digits.length % 13 === 0) {
    return digits.slice(0, 13);
  }

  const any13 = digits.match(/\d{13}/);
  return any13 ? any13[0] : digits.slice(0, 13);
}

export function parseNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }

  if (typeof input !== "string") {
    return null;
  }

  const cleaned = input.trim().replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

const DEFAULT_IMPORT_USD_KRW_RATE = 1300;
let importUsdKrwRate = DEFAULT_IMPORT_USD_KRW_RATE;

function looksLikeUsdPrice(raw: string): boolean {
  return /(?:us\s*\$|usd|\$)/i.test(raw) && !/(?:₩|krw|원)/i.test(raw);
}

function looksLikeKrwPrice(raw: string): boolean {
  return /(?:₩|krw|원)/i.test(raw);
}

/** Convert Excel money cells to KRW. US$ list prices use the import FX rate. */
export function parseMoneyToKrw(
  input: unknown,
  usdKrwRate = importUsdKrwRate,
): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    if (input <= 0) {
      return null;
    }
    // Bare USD-looking amounts (e.g. 40) stay as KRW only when they are wholesale-scale.
    return Math.round(input);
  }

  if (typeof input !== "string") {
    return null;
  }

  const raw = input.trim();
  if (!raw) {
    return null;
  }

  const amount = parseNumber(raw);
  if (amount == null || amount <= 0) {
    return null;
  }

  const rate =
    Number.isFinite(usdKrwRate) && usdKrwRate > 0
      ? usdKrwRate
      : DEFAULT_IMPORT_USD_KRW_RATE;

  if (looksLikeUsdPrice(raw)) {
    return Math.round(amount * rate);
  }

  return Math.round(amount);
}

/** Valid wholesale price only; missing/zero/negative returns null (never a fake 1 won). */
export function parseImportPrice(price: number | null | undefined): number | null {
  if (price == null || !Number.isFinite(price)) {
    return null;
  }

  const rounded = Math.round(price);
  return rounded > 0 ? rounded : null;
}

function scoreParsedRow(row: ParsedHanmiRow): number {
  let score = 0;
  if (row.price != null && row.price > 0) {
    score += 4;
  }
  if (row.price != null && row.price >= 200) {
    score += 3;
  }
  if (row.msrp != null && row.msrp >= 200) {
    score += 2;
  }
  if ((row.moq ?? 1) > 1) {
    score += 4;
  }
  if (row.image_url) {
    score += 2;
  }
  if (row.description) {
    score += 1;
  }
  if (row.barcode) {
    score += 1;
  }
  if (!isPlaceholderProductName(row.name, row.brand, row.sku, row.barcode)) {
    score += 5;
  }
  score += medicubeSheetRank(row.sourceSheet);
  return score;
}

function medicubeSheetRank(sheetName: string): number {
  const normalized = normalizeHeader(sheetName);
  if (normalized === "medicube") {
    return 12;
  }
  if (normalized === "medicubexx") {
    return 8;
  }
  if (normalized === "medicubex") {
    return 2;
  }
  return 0;
}

function pickBetterParsedRow(
  current: ParsedHanmiRow,
  candidate: ParsedHanmiRow,
): ParsedHanmiRow {
  const currentScore = scoreParsedRow(current);
  const candidateScore = scoreParsedRow(candidate);
  if (candidateScore > currentScore) {
    return candidate;
  }
  return current;
}

function buildUniqueHeaders(headerRow: (string | number | null)[]): string[] {
  const counts = new Map<string, number>();
  return headerRow.map((cell, index) => {
    const base = String(cell ?? "").trim();
    if (!base) {
      return `__unnamed_${index}`;
    }

    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}__${count}`;
  });
}

function isCurrencySubHeader(text: string): boolean {
  return ["usd", "krw"].includes(text.toLowerCase());
}

function isBoxSubHeader(text: string): boolean {
  return ["inner", "carton"].includes(text.toLowerCase());
}

function mergeHeaderWithSubRow(
  headerRow: (string | number | null)[],
  subRow: (string | number | null)[],
): { headers: string[]; hasSubHeader: boolean } {
  const subTexts = subRow.map((cell) => String(cell ?? "").trim());
  const hasSubHeader = subTexts.some(
    (text) => isBoxSubHeader(text) || isCurrencySubHeader(text),
  );

  if (!hasSubHeader) {
    return { headers: buildUniqueHeaders(headerRow), hasSubHeader: false };
  }

  const merged = headerRow.map((cell, index) => {
    const main = String(cell ?? "").trim();
    const sub = subTexts[index] ?? "";

    if (isBoxSubHeader(sub)) {
      return sub;
    }

    return main || sub;
  });

  return { headers: buildUniqueHeaders(merged), hasSubHeader: true };
}

const RETAIL_PRICE_HEADER_TOKENS = [
  "msrp",
  "kmsrp",
  "retail",
  "rrp",
  "srp",
  "compare",
  "판매가",
  "소비자가",
  "정가",
];

function isRetailPriceHeader(normalized: string): boolean {
  return RETAIL_PRICE_HEADER_TOKENS.some(
    (token) => normalized === token || normalized.includes(token),
  );
}

function isWholesalePriceHeader(normalized: string): boolean {
  if (isRetailPriceHeader(normalized)) {
    return false;
  }

  if (normalized === "price") {
    return true;
  }

  if (
    (normalized.includes("supply") || normalized.includes("공급")) &&
    !normalized.includes("rate") &&
    !normalized.includes("율")
  ) {
    return true;
  }

  if (
    normalized.includes("wholesale") ||
    normalized.includes("whlolesale") ||
    normalized.includes("fob") ||
    normalized.includes("도매")
  ) {
    return true;
  }

  return false;
}

function wholesalePriceHeaderPriority(header: string): number {
  const normalized = normalizeHeader(header);

  if (normalized === "price") {
    return 0;
  }
  if (
    (normalized.includes("supply") || normalized.includes("공급")) &&
    !normalized.includes("rate")
  ) {
    return 1;
  }
  if (normalized.includes("wholesale") || normalized.includes("whlolesale")) {
    return 2;
  }
  if (normalized.includes("fob")) {
    return 3;
  }
  if (normalized.includes("도매")) {
    return 4;
  }

  return 9;
}

function getWholesalePriceValue(
  row: Record<string, unknown>,
  lookup: Record<ImportField, string[]>,
): number | null {
  const headers = [...lookup.price].sort(
    (left, right) =>
      wholesalePriceHeaderPriority(left) - wholesalePriceHeaderPriority(right),
  );

  for (const header of headers) {
    const parsed = parseImportPrice(parseMoneyToKrw(row[header]));
    if (parsed != null) {
      return parsed;
    }
  }

  return null;
}

function getMsrpValue(
  row: Record<string, unknown>,
  headers: string[],
): number | null {
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (!isRetailPriceHeader(normalized)) {
      continue;
    }

    const parsed = parseImportPrice(parseMoneyToKrw(row[header]));
    if (parsed != null) {
      return parsed;
    }
  }

  return null;
}

function moqHeaderPriority(header: string): number {
  const normalized = normalizeHeader(header);

  if (normalized === "inbox" || normalized.startsWith("inbox")) {
    return normalized === "inbox" ? 1 : 0;
  }
  if (normalized === "inner" || normalized === "outinbox") {
    return 2;
  }
  if (normalized.startsWith("outbox")) {
    return 3;
  }
  if (/qty.*box|box.*qty|qty\/1box/.test(normalized)) {
    return 4;
  }
  if (normalized === "boxquantity") {
    return 5;
  }
  if (normalized === "box" || normalized === "박스") {
    return 6;
  }
  if (normalized === "ta") {
    return 7;
  }
  if (normalized === "carton" || normalized === "ctn") {
    return 8;
  }
  if (
    normalized === "moq" ||
    normalized.includes("minimumorder") ||
    normalized.includes("최소")
  ) {
    return 9;
  }

  return 10;
}

function getMoqValue(
  row: Record<string, unknown>,
  lookup: Record<ImportField, string[]>,
): number {
  const headers = [...lookup.moq].sort(
    (left, right) => moqHeaderPriority(left) - moqHeaderPriority(right),
  );

  for (const header of headers) {
    const parsed = parseMoqCell(row[header]);
    if (parsed != null) {
      return parsed;
    }
  }

  return 1;
}

function scoreHeaderRow(row: (string | number | null)[]): number {
  const cells = row.map((cell) => normalizeHeader(String(cell ?? "")));
  let score = 0;

  for (const cell of cells) {
    if (!cell) {
      continue;
    }

    if (HEADER_KEYWORDS.some((keyword) => cell.includes(normalizeHeader(keyword)))) {
      score += 2;
    }
  }

  if (row.filter((cell) => String(cell ?? "").trim()).length >= 3) {
    score += 1;
  }

  return score;
}

function findHeaderRowIndex(rows: (string | number | null)[][]): number {
  let bestIndex = 0;
  let bestScore = 0;

  for (let index = 0; index < Math.min(8, rows.length); index += 1) {
    const score = scoreHeaderRow(rows[index] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore > 0 ? bestIndex : 0;
}

function parseMoqCell(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    if (input >= 5000) {
      return null;
    }
    return Math.max(1, Math.round(input));
  }

  const text = String(input ?? "").trim();
  if (!text) {
    return null;
  }
  if (/(ml|㎖|mg|\bkg\b|oz|\bg\b|ℓ|\bl\b)\b/i.test(text) && !/^\d+$/.test(text)) {
    return null;
  }

  const nested = text.match(/^(\d+)\s*\(\s*(\d+)\s*\)$/);
  if (nested) {
    const inner = Number(nested[2]);
    if (Number.isFinite(inner) && inner > 0 && inner < 5000) {
      return Math.max(1, Math.round(inner));
    }
  }

  const parsed = parseNumber(text);
  if (parsed == null || parsed <= 0 || parsed >= 5000) {
    return null;
  }
  return Math.max(1, Math.round(parsed));
}

function isBoxMoqHeader(normalized: string): boolean {
  if (/^qty$|^quantity$|^stock$|^재고|^rate$|^moa$/.test(normalized)) {
    return false;
  }
  if (/boxbarcode|eabarcode|barcode/.test(normalized)) {
    return false;
  }

  return (
    normalized === "inbox" ||
    normalized.startsWith("inbox") ||
    normalized === "inner" ||
    normalized === "carton" ||
    normalized === "ctn" ||
    normalized === "outbox" ||
    normalized.startsWith("outbox") ||
    normalized === "outinbox" ||
    normalized === "boxquantity" ||
    normalized === "unitsperbox" ||
    normalized === "qtyperbox" ||
    normalized === "perbox" ||
    normalized === "box" ||
    normalized === "ta" ||
    normalized === "박스" ||
    normalized === "박스수량" ||
    /qty.*box|box.*qty|qty\/1box/.test(normalized)
  );
}

function headerMatchesField(
  normalized: string,
  alias: string,
  field: ImportField,
): boolean {
  const normalizedAlias = normalizeHeader(alias);
  if (normalized === normalizedAlias) {
    return true;
  }

  if (field === "moq") {
    if (isBoxMoqHeader(normalized)) {
      return true;
    }
    return (
      normalized === "moq" ||
      normalized.includes("minimumorder") ||
      normalized.includes("최소주문") ||
      normalized.includes("최소수량") ||
      (normalized.includes("moq") && !normalized.includes("moa"))
    );
  }

  if (field === "stock") {
    if (/box|inbox|carton|ctn|inner|outbox|perbox|moq/.test(normalized)) {
      return false;
    }
    if (/qty.*box|box.*qty/.test(normalized)) {
      return false;
    }
    return normalized === "qty" || normalized === "quantity";
  }

  if (field === "price") {
    return isWholesalePriceHeader(normalized);
  }

  if (field === "barcode") {
    if (/boxbarcode|eabarcode/.test(normalized)) {
      return true;
    }
    if (/^barc/.test(normalized) && !normalized.includes("inbox")) {
      return true;
    }
  }

  return (
    normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)
  );
}

function buildHeaderLookup(headers: string[]): Record<ImportField, string[]> {
  const lookup = Object.fromEntries(
    (Object.keys(HEADER_ALIASES) as ImportField[]).map((field) => [field, []]),
  ) as unknown as Record<ImportField, string[]>;

  for (const header of headers) {
    if (!header) {
      continue;
    }

    const normalized = normalizeHeader(header);
    for (const field of Object.keys(HEADER_ALIASES) as ImportField[]) {
      const matched = HEADER_ALIASES[field].some((alias) =>
        headerMatchesField(normalized, alias, field),
      );

      if (matched && !lookup[field].includes(header)) {
        lookup[field].push(header);
      }
    }
  }

  return lookup;
}

function getFieldValues(
  row: Record<string, unknown>,
  headers: string[],
): string[] {
  return headers
    .map((header) => String(row[header] ?? "").trim())
    .filter(Boolean);
}

function getFieldValue(
  row: Record<string, unknown>,
  lookup: Record<ImportField, string[]>,
  field: ImportField,
): string {
  return getFieldValues(row, lookup[field])[0] ?? "";
}

function pickNormalizedBarcode(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeBarcode(String(Math.round(value)));
  }
  return normalizeBarcode(String(value ?? ""));
}

function pickBarcodeFromRecord(
  record: Record<string, unknown>,
  lookup: Record<ImportField, string[]>,
): string | null {
  for (const value of getFieldValues(record, lookup.barcode)) {
    const normalized = pickNormalizedBarcode(value);
    if (normalized && normalized.length <= 14) {
      return normalized;
    }
  }

  const skuNormalized = pickNormalizedBarcode(getFieldValue(record, lookup, "sku"));
  if (skuNormalized && skuNormalized.length <= 14) {
    return skuNormalized;
  }

  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith("__") || value == null) {
      continue;
    }
    const normalized = pickNormalizedBarcode(value);
    if (
      normalized &&
      normalized.startsWith("88") &&
      normalized.length >= 12 &&
      normalized.length <= 14
    ) {
      return normalized;
    }
  }

  return null;
}

/** Read a unit barcode from a stored import row or raw Excel record. */
export function extractBarcodeFromSourceRow(
  record: Record<string, unknown> | null | undefined,
): string | null {
  if (!record || typeof record !== "object") {
    return null;
  }
  const headers = Object.keys(record).filter((key) => !key.startsWith("__"));
  if (headers.length === 0) {
    return null;
  }
  return pickBarcodeFromRecord(record, buildHeaderLookup(headers));
}

/** Read volume/capacity from a stored import row or raw Excel record. */
export function extractVolumeFromSourceRow(
  record: Record<string, unknown>,
): string | null {
  const headers = Object.keys(record).filter(
    (key) => !key.startsWith("__") && record[key] != null && String(record[key]).trim(),
  );
  if (headers.length === 0) {
    return null;
  }

  const lookup = buildHeaderLookup(headers);
  const volume = getFieldValue(record, lookup, "volume").trim();
  return volume || null;
}

function containsHangul(text: string): boolean {
  return /[\u3131-\u318E\uAC00-\uD7A3]/.test(text);
}

function isLatinProductName(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (containsHangul(trimmed)) {
    return false;
  }
  return /[A-Za-z]/.test(trimmed);
}

/** Pull the English line out of Hanmi cells that mix Korean + English. */
export function extractEnglishProductName(text: string): string | null {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const chunks = trimmed
    .split(/[\r\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const latinChunks = chunks.filter((part) => isLatinProductName(part));
  if (latinChunks.length > 0) {
    return latinChunks.reduce((best, current) =>
      current.length > best.length ? current : best,
    );
  }

  if (containsHangul(trimmed)) {
    const latinRuns = trimmed.match(/[A-Za-z][A-Za-z0-9][A-Za-z0-9 .,'&+/()%*®™-]{2,}/g);
    if (latinRuns) {
      const best = latinRuns
        .map((part) => part.trim().replace(/[.,;:]+$/g, ""))
        .filter((part) => isLatinProductName(part) && (part.split(/\s+/).length >= 2 || part.length >= 8))
        .sort((a, b) => b.length - a.length)[0];
      if (best) {
        return best;
      }
    }
  }

  return isLatinProductName(trimmed) ? trimmed : null;
}

/** Hanmi often uses "English brand / Korean product" in one cell. */
export function composeSlashSeparatedProductName(text: string): string | null {
  const raw = String(text ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw.includes("/")) {
    return extractEnglishProductName(raw);
  }

  const [leftRaw, ...rightParts] = raw.split("/");
  const left = extractEnglishProductName(leftRaw) || leftRaw.replace(/\s+/g, " ").trim();
  const right = rightParts
    .join(" ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (left && right && containsHangul(right)) {
    return `${left.replace(/[/\s]+$/g, "")} ${right}`.trim();
  }

  if (right && isLatinProductName(right)) {
    const prefix = left && isLatinProductName(left) ? `${left} ${right}` : right;
    return prefix.replace(/\s+/g, " ").trim();
  }

  return extractEnglishProductName(raw);
}

export { collapseRepeatedBrandPrefix };

export function compactVolumeText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s*/()[\].,·•_:：-]+/g, "");
}

export function isCapacityOnlyLabel(volume: string | null | undefined): boolean {
  const trimmed = String(volume ?? "").trim();
  if (!trimmed || trimmed.length > 40) {
    return false;
  }
  if (/^\d{6,}$/.test(trimmed.replace(/\D/g, "")) && !/[a-z가-힣]/i.test(trimmed)) {
    return false;
  }
  if (
    !/\d+(?:[.,]\d+)?\s*(ml|㎖|g|kg|oz|fl\.?\s*oz|l|ℓ|mg|ea|pcs|sheet|sheets)/i.test(
      trimmed,
    )
  ) {
    return false;
  }

  const leftover = trimmed
    .replace(
      /\d+(?:[.,]\d+)?\s*(ml|㎖|g|kg|oz|fl\.?\s*oz|l|ℓ|mg|ea|pcs|sheet|sheets)/gi,
      " ",
    )
    .replace(/[*x×/()[\]:,._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const leftoverWords = leftover
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word) =>
        !/^(and|with|of|set|kit|pack|box|ea|x|capsule|ampoule)$/i.test(word),
    );
  return !leftoverWords.some((word) => /[a-z가-힣]{3,}/i.test(word));
}

export function appendVolumeIfMissing(name: string, volume: string | null): string {
  const trimmedName = String(name ?? "").trim();
  const trimmedVolume = String(volume ?? "").trim();
  if (!trimmedName || !trimmedVolume || !isCapacityOnlyLabel(trimmedVolume)) {
    return trimmedName;
  }
  if (/\d+(?:[.,]\d+)?\s*(ml|㎖|g|kg|oz|l|ℓ)\b/i.test(trimmedName)) {
    return trimmedName;
  }
  if (/^\d{8,}$/.test(trimmedVolume.replace(/\D/g, "")) && !/[a-z가-힣]/i.test(trimmedVolume)) {
    return trimmedName;
  }

  const compactName = compactVolumeText(trimmedName);
  const compactVolume = compactVolumeText(trimmedVolume);
  if (compactVolume && compactName.includes(compactVolume)) {
    return trimmedName;
  }

  return `${trimmedName} ${trimmedVolume}`.trim();
}

export function isPlaceholderProductName(
  name: string,
  brand: string,
  sku: string,
  barcode?: string | null,
): boolean {
  const n = String(name ?? "").trim();
  const b = String(brand ?? "").trim();
  const id = String(barcode || sku || "").trim();
  if (!n) {
    return true;
  }
  if (/^\d+$/.test(n) && n.length >= 4) {
    return true;
  }
  if (/[-_\s]dup$/i.test(n) || /\bdup\b/i.test(n)) {
    return true;
  }
  if (/^ml\s*\(/i.test(n)) {
    return true;
  }
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(n) && n.split("-").length >= 3) {
    return true;
  }
  if (
    b &&
    n.toLowerCase().includes(b.toLowerCase()) &&
    /[a-z0-9]+(?:-[a-z0-9]+){2,}/i.test(n)
  ) {
    return true;
  }
  if (id && n === id) {
    return true;
  }
  if (b && n.toLowerCase() === b.toLowerCase()) {
    return true;
  }
  if (b && id) {
    const once = `${b} ${id}`;
    const twice = `${b} ${b} ${id}`;
    if (n === once || n === twice) {
      return true;
    }
  }
  if (b && id && /^\d{8,}$/.test(id) && n.includes(id) && n.toLowerCase().startsWith(b.toLowerCase())) {
    return true;
  }
  if (id && n.endsWith(` ${id}`) && b && n.startsWith(b)) {
    const rest = n.slice(b.length).trim();
    if (rest === id || rest === `${b} ${id}`) {
      return true;
    }
  }
  return false;
}

function headerBaseForClassification(header: string): string {
  return normalizeHeader(header.replace(/__\d+$/, ""));
}

type NameColumnKind = "english" | "korean" | "neutral";

function classifyNameHeader(
  header: string,
  indexAmongMatches: number,
  totalMatches: number,
): NameColumnKind {
  const base = headerBaseForClassification(header);
  const pairedGeneric =
    base === "productname" ||
    base === "name" ||
    base === "product" ||
    base === "제품명" ||
    base === "상품명" ||
    base === "description";

  if (pairedGeneric && totalMatches >= 2) {
    return indexAmongMatches === 0 ? "korean" : "english";
  }

  const koreanHint =
    base === "kr" ||
    /korean|kor\b|\(kor|국문|namekr|productkr|productnamekr|상품명|제품명/.test(
      base,
    ) ||
    (base.endsWith("kr") && !base.includes("eng"));
  const englishHint =
    base === "en" ||
    /english|eng\b|\(eng|nameen|producten|productnameen/.test(base) ||
    (base.endsWith("en") && !koreanHint);

  if (englishHint && !koreanHint) {
    return "english";
  }
  if (koreanHint && !englishHint) {
    return "korean";
  }

  return "neutral";
}

function isUsableEnglishName(text: string): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed || trimmed === "0") {
    return false;
  }
  if (!isLatinProductName(trimmed) || trimmed.endsWith("/")) {
    return false;
  }
  if (!/\s/.test(trimmed)) {
    return false;
  }
  return true;
}

/** Prefer English when the sheet has it; otherwise keep the original Korean name. */
export function resolvePrimaryProductName(
  row: Record<string, unknown>,
  nameHeaders: string[],
  brand: string,
  barcode: string | null,
): string {
  const classified = nameHeaders.map((header, index) => {
    const value = String(row[header] ?? "").trim();
    return {
      header,
      kind: classifyNameHeader(header, index, nameHeaders.length),
      value,
      composed: composeSlashSeparatedProductName(value),
      english: extractEnglishProductName(value),
    };
  });

  for (const { kind, composed, english, value } of classified) {
    if (kind !== "english") {
      continue;
    }
    if (composed && isUsableEnglishName(composed)) {
      return composed;
    }
    if (english && isUsableEnglishName(english)) {
      return english;
    }
    if (value && isUsableEnglishName(value)) {
      return value;
    }
  }

  for (const { kind, value } of classified) {
    if (kind === "korean" && value) {
      return value;
    }
  }

  const anyName = classified.find((entry) => entry.value)?.value ?? "";
  if (anyName) {
    return anyName;
  }

  const id = barcode?.trim();
  if (brand && id) {
    return `${brand} ${id}`.trim();
  }
  if (brand) {
    return brand;
  }
  return id || "Product";
}

function isSubHeaderRow(row: (string | number | null)[]): boolean {
  const texts = row.map((cell) => String(cell ?? "").trim().toLowerCase());
  const meaningful = texts.filter(Boolean);

  if (meaningful.length === 0) {
    return true;
  }

  if (
    meaningful.every((text) =>
      ["usd", "krw", "inner", "carton", "updated"].some((token) =>
        text.includes(token),
      ),
    )
  ) {
    return true;
  }

  return false;
}

function shouldSkipSheet(sheetName: string, rows: (string | number | null)[][]): boolean {
  if (/^sheet\d+$/i.test(sheetName.trim())) {
    return true;
  }

  return rows.every((row) => !row.some((cell) => String(cell ?? "").trim()));
}

function inferBrand(sheetName: string, rowBrand: string): string {
  if (rowBrand.trim()) {
    return rowBrand.trim();
  }

  if (normalizeHeader(sheetName) === "hanmistock") {
    return "Hanmi";
  }

  return sheetName.trim();
}

function buildSku(_brand: string, _name: string, barcode: string | null): string {
  if (barcode) {
    return barcode;
  }

  return MISSING_BARCODE_SKU;
}

function buildDescription(
  row: Record<string, unknown>,
  lookup: Record<ImportField, string[]>,
  primaryName: string,
): string | null {
  const extraNames = getFieldValues(row, lookup.name).filter(
    (value) =>
      value !== primaryName && !containsHangul(value) && isLatinProductName(value),
  );
  const color = getFieldValue(row, lookup, "color");
  const explicit = getFieldValue(row, lookup, "description");
  const parts = [explicit, ...extraNames, color].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return Array.from(new Set(parts)).join(" · ");
}

function rowToRecord(
  headers: string[],
  row: (string | number | null)[],
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    if (!header) {
      return;
    }
    record[header] = row[index] ?? "";
  });
  return record;
}

export type ParsedHanmiRowWithIndex = ParsedHanmiRow & { excelRowIndex: number };

export type ParsedSheetLayout = {
  headers: string[];
  headerRowIndex: number;
  hasSubHeader: boolean;
  rows: ParsedHanmiRowWithIndex[];
  skipped: number;
};

function parseSheetWithIndices(
  sheetName: string,
  sheet: XLSX.WorkSheet,
): ParsedSheetLayout {
  const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (shouldSkipSheet(sheetName, rawRows)) {
    return {
      headers: [],
      headerRowIndex: 0,
      hasSubHeader: false,
      rows: [],
      skipped: 0,
    };
  }

  const headerIndex = findHeaderRowIndex(rawRows);
  const { headers, hasSubHeader } = mergeHeaderWithSubRow(
    rawRows[headerIndex] ?? [],
    rawRows[headerIndex + 1] ?? [],
  );
  const dataStartIndex = headerIndex + (hasSubHeader ? 2 : 1);
  if (!headers.some(Boolean)) {
    return {
      headers: [],
      headerRowIndex: headerIndex,
      hasSubHeader,
      rows: [],
      skipped: 0,
    };
  }

  const headerLookup = buildHeaderLookup(headers);
  const nameHeaders = [
    ...headerLookup.name,
    ...headers.filter(
      (header) =>
        header.startsWith("__unnamed_") &&
        !headerLookup.name.includes(header),
    ),
  ];
  const parsedRows: ParsedHanmiRowWithIndex[] = [];
  let skipped = 0;

  for (let rowOffset = 0; rowOffset < rawRows.length - dataStartIndex; rowOffset += 1) {
    const rawRow = rawRows[dataStartIndex + rowOffset];
    if (!rawRow.some((cell) => String(cell ?? "").trim())) {
      continue;
    }

    if (isSubHeaderRow(rawRow)) {
      skipped += 1;
      continue;
    }

    const record = rowToRecord(headers, rawRow);
    const brand = inferBrand(sheetName, getFieldValue(record, headerLookup, "brand"));
    const barcode = pickBarcodeFromRecord(record, headerLookup);
    const primaryName = collapseRepeatedBrandPrefix(
      appendVolumeIfMissing(
        resolvePrimaryProductName(
          record,
          nameHeaders,
          brand,
          barcode,
        ),
        getFieldValue(record, headerLookup, "volume").trim() || null,
      ),
      brand,
    );
    const sku = buildSku(brand, primaryName, barcode);
    const price = getWholesalePriceValue(record, headerLookup);
    const msrp = getMsrpValue(record, headers.filter(Boolean));
    const moq = getMoqValue(record, headerLookup);
    const stock = Math.max(
      0,
      Math.round(parseNumber(getFieldValue(record, headerLookup, "stock")) ?? 0),
    );
    const categoryRaw = getFieldValue(record, headerLookup, "category");
    const category = categoryRaw.trim() ? categoryRaw.trim() : null;
    const description = buildDescription(record, headerLookup, primaryName);
    const volumeRaw = getFieldValue(record, headerLookup, "volume").trim();
    const volume = volumeRaw || null;
    const imageUrl = getFieldValue(record, headerLookup, "image_url") || null;

    if (!primaryName) {
      skipped += 1;
      continue;
    }

    parsedRows.push({
      name: primaryName,
      brand,
      sku,
      price,
      msrp,
      moq,
      stock,
      barcode,
      category,
      description,
      volume,
      image_url: imageUrl,
      sourceSheet: sheetName,
      sourceRow: record,
      excelRowIndex: dataStartIndex + rowOffset,
    });
  }

  return {
    headers,
    headerRowIndex: headerIndex,
    hasSubHeader,
    rows: parsedRows,
    skipped,
  };
}

function parseSheet(
  sheetName: string,
  sheet: XLSX.WorkSheet,
): { rows: ParsedHanmiRow[]; skipped: number } {
  const { rows, skipped } = parseSheetWithIndices(sheetName, sheet);
  return {
    rows: rows.map(({ excelRowIndex, ...row }) => { void excelRowIndex; return row; }),
    skipped,
  };
}

export function parseHanmiWorkbook(
  fileBuffer: ArrayBuffer,
  options?: { usdKrwRate?: number },
): ParseHanmiResult {
  importUsdKrwRate =
    options?.usdKrwRate && options.usdKrwRate > 0
      ? options.usdKrwRate
      : DEFAULT_IMPORT_USD_KRW_RATE;

  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetStats: ParseHanmiResult["sheetStats"] = [];
  const rowsBySku = new Map<string, ParsedHanmiRow>();
  const missingBarcodeRows: ParsedHanmiRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const { rows: sheetRows, skipped } = parseSheet(sheetName, sheet);
    let imported = 0;

    for (const row of sheetRows) {
      const sku = row.sku.trim();
      if (!sku) {
        continue;
      }

      if (isMissingBarcodeSku(sku)) {
        missingBarcodeRows.push(row);
        imported += 1;
        continue;
      }

      const existing = rowsBySku.get(sku);
      rowsBySku.set(
        sku,
        existing ? pickBetterParsedRow(existing, row) : row,
      );
      imported += 1;
    }

    if (imported > 0 || skipped > 0) {
      sheetStats.push({ sheet: sheetName, imported, skipped });
    }
  }

  return {
    headers: Object.keys(HEADER_ALIASES),
    rows: [...rowsBySku.values(), ...missingBarcodeRows],
    sheetStats,
  };
}

/** Per-sheet parse with Excel row indices (for writing Category column back). */
export function parseSheetWithRowIndices(
  sheetName: string,
  sheet: XLSX.WorkSheet,
): ParsedSheetLayout {
  return parseSheetWithIndices(sheetName, sheet);
}

/** SKU / barcode → English product name from one or more Hanmi workbooks. */
export function buildEnglishNameLookup(
  fileBuffers: ArrayBuffer[],
): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const buffer of fileBuffers) {
    const { rows } = parseHanmiWorkbook(buffer);
    for (const row of rows) {
      const englishName = row.name.trim();
      if (!englishName || containsHangul(englishName)) {
        continue;
      }

      const barcode = row.barcode ? normalizeBarcode(row.barcode) : null;
      if (barcode && !lookup.has(barcode)) {
        lookup.set(barcode, englishName);
      }

      const sku = row.sku.trim();
      if (sku && !lookup.has(sku)) {
        lookup.set(sku, englishName);
      }
    }
  }

  return lookup;
}

const NAME_CATEGORY_HINTS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /세럼|serum|ampoule|앰플|토너|toner|크림|cream|로션|lotion|클렌|cleans|마스크|mask|선크림|sunscreen|sun\s*block|spf/i, category: "skincare" },
  { pattern: /립|lip\s|치크|cheek|파운데이|foundation|쿠션|cushion|아이|eye\s|mascara|블러셔|blush|틴트|tint|프라이머|primer|하이라이|highlighter|컨실|conceal|파우더|powder|팔레트|palette|메이크/i, category: "makeup" },
  { pattern: /샴푸|shampoo|conditioner|헤어|hair/i, category: "haircare" },
  { pattern: /바디|body\s|hand\s?cream|풋|foot/i, category: "bodycare" },
  { pattern: /브러시|brush|퍼프|puff|sponge|tool/i, category: "tools-accessories" },
  { pattern: /네일|nail/i, category: "nail" },
];

function inferCategoryFromName(name: string): string | null {
  if (looksLikeSetBundleName(name)) {
    return "set";
  }

  for (const hint of NAME_CATEGORY_HINTS) {
    if (hint.pattern.test(name)) {
      return hint.category;
    }
  }

  return null;
}

/** Barcode / SKU → Hanmi CLASSIFICATION / Category from a reference workbook. */
export function buildHanmiCategoryLookup(
  fileBuffer: ArrayBuffer,
): Map<string, string> {
  const { rows } = parseHanmiWorkbook(fileBuffer);
  const lookup = new Map<string, string>();

  for (const row of rows) {
    if (!row.category?.trim()) {
      continue;
    }

    const category = row.category.trim();
    const barcode = row.barcode ? normalizeBarcode(row.barcode) : null;
    if (barcode && !lookup.has(barcode)) {
      lookup.set(barcode, category);
    }

    const sku = row.sku.trim();
    if (sku && !lookup.has(sku)) {
      lookup.set(sku, category);
    }
  }

  return lookup;
}

function lookupHanmiCategory(
  lookup: Map<string, string>,
  row: Pick<ParsedHanmiRow, "barcode" | "sku">,
): string | null {
  const barcode = row.barcode ? normalizeBarcode(row.barcode) : null;
  if (barcode) {
    const match = lookup.get(barcode);
    if (match) {
      return match;
    }
  }

  const sku = row.sku.trim();
  if (sku) {
    return lookup.get(sku) ?? null;
  }

  return null;
}

/** Fill missing row categories from Hanmi lookup, then lightweight name heuristics. */
export function enrichImportRowsWithCategories(
  rows: ParsedHanmiRow[],
  hanmiLookup: Map<string, string>,
): ParsedHanmiRow[] {
  return rows.map((row) => {
    if (row.category?.trim()) {
      return row;
    }

    const fromHanmi = lookupHanmiCategory(hanmiLookup, row);
    if (fromHanmi) {
      return { ...row, category: fromHanmi };
    }

    const inferred = inferCategoryFromName(row.name);
    if (inferred) {
      const resolved = resolveHanmiCategory(inferred);
      return { ...row, category: resolved?.slug ?? inferred };
    }

    return row;
  });
}
