import * as XLSX from "xlsx";
import { slugify } from "@/lib/utils";
import { resolveHanmiCategory } from "@/lib/admin/hanmi-category-map";

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
  barcode: ["barcode", "eabarcode", "boxbarcode", "바코드", "ean", "upc"],
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

function normalizeBarcode(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
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
  if (row.image_url) {
    score += 2;
  }
  if (row.description) {
    score += 1;
  }
  if (row.barcode) {
    score += 1;
  }
  return score;
}

function pickBetterParsedRow(
  current: ParsedHanmiRow,
  candidate: ParsedHanmiRow,
): ParsedHanmiRow {
  const currentScore = scoreParsedRow(current);
  const candidateScore = scoreParsedRow(candidate);
  if (candidateScore >= currentScore) {
    return candidate;
  }
  return current;
}

function buildUniqueHeaders(headerRow: (string | number | null)[]): string[] {
  const counts = new Map<string, number>();
  return headerRow.map((cell) => {
    const base = String(cell ?? "").trim();
    if (!base) {
      return "";
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
  if (normalized.includes("wholesale") || normalized.includes("whlolesale")) {
    return 1;
  }
  if (normalized.includes("fob")) {
    return 2;
  }
  if (normalized.includes("도매")) {
    return 3;
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
    const parsed = parseImportPrice(parseNumber(String(row[header] ?? "").trim()));
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

    const parsed = parseImportPrice(parseNumber(String(row[header] ?? "").trim()));
    if (parsed != null) {
      return parsed;
    }
  }

  return null;
}

function moqHeaderPriority(header: string): number {
  const normalized = normalizeHeader(header);

  if (normalized === "inbox") {
    return 0;
  }
  if (normalized === "inner") {
    return 1;
  }
  if (normalized.startsWith("outbox")) {
    return 2;
  }
  if (/qty.*box|box.*qty|qty\/1box/.test(normalized)) {
    return 3;
  }
  if (normalized === "boxquantity") {
    return 4;
  }
  if (normalized === "box" || normalized === "박스") {
    return 5;
  }
  if (normalized === "ta") {
    return 6;
  }
  if (normalized === "carton" || normalized === "ctn") {
    return 7;
  }
  if (
    normalized === "moq" ||
    normalized.includes("minimumorder") ||
    normalized.includes("최소")
  ) {
    return 8;
  }

  return 9;
}

function getMoqValue(
  row: Record<string, unknown>,
  lookup: Record<ImportField, string[]>,
): number {
  const headers = [...lookup.moq].sort(
    (left, right) => moqHeaderPriority(left) - moqHeaderPriority(right),
  );

  for (const header of headers) {
    const parsed = parseNumber(String(row[header] ?? "").trim());
    if (parsed != null && parsed > 0) {
      return Math.max(1, Math.round(parsed));
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

function isBoxMoqHeader(normalized: string): boolean {
  if (/^qty$|^quantity$|^stock$|^재고|^rate$|^moa$/.test(normalized)) {
    return false;
  }
  if (/boxbarcode|eabarcode|barcode/.test(normalized)) {
    return false;
  }

  return (
    normalized === "inbox" ||
    normalized === "inner" ||
    normalized === "carton" ||
    normalized === "ctn" ||
    normalized === "outbox" ||
    normalized.startsWith("outbox") ||
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

  const koreanHint =
    base === "kr" ||
    /korean|kor\b|\(kor|국문|상품|제품|품목|namekr|productkr|productnamekr|상품명|제품명/.test(
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

  const generic =
    base === "productname" ||
    base === "name" ||
    base === "description" ||
    base === "product" ||
    base.includes("productname");

  if (generic && totalMatches >= 2) {
    return indexAmongMatches === 0 ? "korean" : "english";
  }

  return "neutral";
}

/** Prefer English product name columns; never use Korean as primary `name`. */
export function resolvePrimaryProductName(
  row: Record<string, unknown>,
  nameHeaders: string[],
  brand: string,
  barcode: string | null,
): string {
  const classified = nameHeaders.map((header, index) => ({
    header,
    kind: classifyNameHeader(header, index, nameHeaders.length),
    value: String(row[header] ?? "").trim(),
  }));

  for (const { kind, value } of classified) {
    if (kind === "english" && isLatinProductName(value)) {
      return value;
    }
  }

  for (const { kind, value } of classified) {
    if (kind === "neutral" && isLatinProductName(value)) {
      return value;
    }
  }

  for (const { kind, value } of classified) {
    if (kind !== "korean" && isLatinProductName(value)) {
      return value;
    }
  }

  for (const { value } of classified) {
    if (isLatinProductName(value)) {
      return value;
    }
  }

  const id = barcode?.trim();
  if (brand && id) {
    return `${brand} ${id}`.trim();
  }
  if (brand) {
    return brand;
  }
  if (id) {
    return id;
  }

  const anyName = classified.find((entry) => entry.value)?.value ?? "";
  if (anyName && !containsHangul(anyName)) {
    return anyName;
  }

  return (
    anyName.replace(/[\u3131-\u318E\uAC00-\uD7A3\s_]+/g, " ").trim() || "Product"
  );
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

function buildSku(brand: string, name: string, barcode: string | null): string {
  if (barcode) {
    return barcode;
  }

  const slug = slugify(`${brand}-${name}`);
  return slug || `hanmi-${slugify(name) || "product"}`;
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

function parseSheet(
  sheetName: string,
  sheet: XLSX.WorkSheet,
): { rows: ParsedHanmiRow[]; skipped: number } {
  const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (shouldSkipSheet(sheetName, rawRows)) {
    return { rows: [], skipped: 0 };
  }

  const headerIndex = findHeaderRowIndex(rawRows);
  const { headers, hasSubHeader } = mergeHeaderWithSubRow(
    rawRows[headerIndex] ?? [],
    rawRows[headerIndex + 1] ?? [],
  );
  const dataStartIndex = headerIndex + (hasSubHeader ? 2 : 1);
  if (!headers.some(Boolean)) {
    return { rows: [], skipped: 0 };
  }

  const headerLookup = buildHeaderLookup(headers.filter(Boolean));
  const parsedRows: ParsedHanmiRow[] = [];
  let skipped = 0;

  for (const rawRow of rawRows.slice(dataStartIndex)) {
    if (!rawRow.some((cell) => String(cell ?? "").trim())) {
      continue;
    }

    if (isSubHeaderRow(rawRow)) {
      skipped += 1;
      continue;
    }

    const record = rowToRecord(headers, rawRow);
    const brand = inferBrand(sheetName, getFieldValue(record, headerLookup, "brand"));
    const barcode =
      normalizeBarcode(getFieldValue(record, headerLookup, "barcode")) ??
      normalizeBarcode(getFieldValue(record, headerLookup, "sku"));
    const primaryName = resolvePrimaryProductName(
      record,
      headerLookup.name,
      brand,
      barcode,
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
    });
  }

  return { rows: parsedRows, skipped };
}

export function parseHanmiWorkbook(fileBuffer: ArrayBuffer): ParseHanmiResult {
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const sheetStats: ParseHanmiResult["sheetStats"] = [];
  const rowsBySku = new Map<string, ParsedHanmiRow>();

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
    rows: Array.from(rowsBySku.values()),
    sheetStats,
  };
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
