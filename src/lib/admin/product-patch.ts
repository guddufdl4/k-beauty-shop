import { isValidProductImageUrl } from "@/lib/admin/product-image-resolver";

export type ProductPatch = {
  name: string;
  barcode: string | null;
  wholesale_price: number;
  image_url?: string | null;
};

export type ProductPatchResult =
  | { ok: true; patch: ProductPatch }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 200;
const MAX_BARCODE_LENGTH = 64;
const MAX_IMAGE_URL_LENGTH = 2048;

export function parseProductPatch(body: unknown): ProductPatchResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }

  const record = body as Record<string, unknown>;

  if (typeof record.name !== "string") {
    return { ok: false, error: "상품명은 필수입니다." };
  }

  const name = record.name.trim();
  if (!name) {
    return { ok: false, error: "상품명은 필수입니다." };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `상품명은 ${MAX_NAME_LENGTH}자 이하여야 합니다.`,
    };
  }

  let barcode: string | null = null;
  if (record.barcode !== undefined && record.barcode !== null) {
    if (typeof record.barcode !== "string") {
      return { ok: false, error: "바코드 형식이 올바르지 않습니다." };
    }
    const trimmed = record.barcode.trim();
    if (trimmed.length > MAX_BARCODE_LENGTH) {
      return {
        ok: false,
        error: `바코드는 ${MAX_BARCODE_LENGTH}자 이하여야 합니다.`,
      };
    }
    barcode = trimmed || null;
  }

  const priceRaw = record.wholesale_price ?? record.price;
  if (priceRaw === undefined || priceRaw === null || priceRaw === "") {
    return { ok: false, error: "가격은 필수입니다." };
  }

  const wholesale_price = Number(priceRaw);
  if (!Number.isFinite(wholesale_price) || wholesale_price < 0) {
    return { ok: false, error: "가격은 0 이상의 숫자여야 합니다." };
  }

  let image_url: string | null | undefined;
  if (record.image_url !== undefined) {
    if (record.image_url === null) {
      image_url = null;
    } else if (typeof record.image_url !== "string") {
      return { ok: false, error: "이미지 URL 형식이 올바르지 않습니다." };
    } else {
      const trimmed = record.image_url.trim();
      if (!trimmed) {
        image_url = null;
      } else if (trimmed.length > MAX_IMAGE_URL_LENGTH) {
        return {
          ok: false,
          error: `이미지 URL은 ${MAX_IMAGE_URL_LENGTH}자 이하여야 합니다.`,
        };
      } else if (!isValidProductImageUrl(trimmed)) {
        return {
          ok: false,
          error: "이미지 URL은 http(s) 주소 또는 /로 시작하는 경로여야 합니다.",
        };
      } else {
        image_url = trimmed;
      }
    }
  }

  return {
    ok: true,
    patch: {
      name,
      barcode,
      wholesale_price,
      ...(image_url !== undefined ? { image_url } : {}),
    },
  };
}

export type ProductInventoryPatch = {
  stock?: number;
  sold_out?: boolean;
};

export type ProductInventoryPatchResult =
  | { ok: true; patch: ProductInventoryPatch; isInventoryOnly: true }
  | { ok: false; error: string };

const INVENTORY_KEYS = new Set(["stock", "sold_out"]);

export function parseProductInventoryPatch(
  body: unknown,
): ProductInventoryPatchResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }

  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length === 0) {
    return { ok: false, error: "수정할 재고 정보가 없습니다." };
  }

  if (!keys.every((key) => INVENTORY_KEYS.has(key))) {
    return { ok: false, error: "재고 수정 요청 형식이 올바르지 않습니다." };
  }

  const patch: ProductInventoryPatch = {};

  if (record.stock !== undefined) {
    const stock = Number(record.stock);
    if (!Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) {
      return { ok: false, error: "재고는 0 이상의 정수여야 합니다." };
    }
    patch.stock = stock;
  }

  if (record.sold_out !== undefined) {
    if (typeof record.sold_out !== "boolean") {
      return { ok: false, error: "품절 여부는 true/false여야 합니다." };
    }
    patch.sold_out = record.sold_out;
  }

  return { ok: true, patch, isInventoryOnly: true };
}
