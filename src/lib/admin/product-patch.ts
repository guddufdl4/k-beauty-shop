import { isValidProductImageUrl } from "@/lib/admin/product-image-resolver";

export type ProductPatch = {
  name: string;
  barcode: string | null;
  wholesale_price: number;
  price?: number;
  brand?: string;
  description?: string | null;
  short_description?: string | null;
  moq?: number;
  country_of_origin?: string | null;
  image_url?: string | null;
  category_id?: string | null;
  sold_out?: boolean;
};

export type ProductPatchResult =
  | { ok: true; patch: ProductPatch }
  | { ok: false; error: string };

const MAX_NAME_LENGTH = 200;
const MAX_BARCODE_LENGTH = 64;
const MAX_IMAGE_URL_LENGTH = 2048;
const MAX_BRAND_LENGTH = 120;
const MAX_TEXT_LENGTH = 10000;
const MAX_SHORT_TEXT_LENGTH = 500;

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

  let category_id: string | null | undefined;
  if (record.category_id !== undefined) {
    if (record.category_id === null) {
      category_id = null;
    } else if (typeof record.category_id !== "string") {
      return { ok: false, error: "카테고리 형식이 올바르지 않습니다." };
    } else {
      const trimmed = record.category_id.trim();
      category_id = trimmed || null;
    }
  }

  let sold_out: boolean | undefined;
  if (record.sold_out !== undefined) {
    if (typeof record.sold_out !== "boolean") {
      return { ok: false, error: "품절 여부는 true/false여야 합니다." };
    }
    sold_out = record.sold_out;
  }

  let price: number | undefined;
  if (record.price !== undefined && record.price !== null && record.price !== "") {
    price = Number(record.price);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, error: "소매가는 0 이상의 숫자여야 합니다." };
    }
  }

  let brand: string | undefined;
  if (record.brand !== undefined) {
    if (typeof record.brand !== "string") {
      return { ok: false, error: "브랜드 형식이 올바르지 않습니다." };
    }
    const trimmedBrand = record.brand.trim();
    if (!trimmedBrand) {
      return { ok: false, error: "브랜드는 필수입니다." };
    }
    if (trimmedBrand.length > MAX_BRAND_LENGTH) {
      return {
        ok: false,
        error: `브랜드는 ${MAX_BRAND_LENGTH}자 이하여야 합니다.`,
      };
    }
    brand = trimmedBrand;
  }

  let moq: number | undefined;
  if (record.moq !== undefined && record.moq !== null && record.moq !== "") {
    moq = Number(record.moq);
    if (!Number.isFinite(moq) || !Number.isInteger(moq) || moq < 1) {
      return { ok: false, error: "MOQ는 1 이상의 정수여야 합니다." };
    }
  }

  let description: string | null | undefined;
  if (record.description !== undefined) {
    if (record.description === null) {
      description = null;
    } else if (typeof record.description !== "string") {
      return { ok: false, error: "상품 설명 형식이 올바르지 않습니다." };
    } else {
      const trimmed = record.description.trim();
      if (trimmed.length > MAX_TEXT_LENGTH) {
        return {
          ok: false,
          error: `상품 설명은 ${MAX_TEXT_LENGTH}자 이하여야 합니다.`,
        };
      }
      description = trimmed || null;
    }
  }

  let short_description: string | null | undefined;
  if (record.short_description !== undefined) {
    if (record.short_description === null) {
      short_description = null;
    } else if (typeof record.short_description !== "string") {
      return { ok: false, error: "용량/요약 형식이 올바르지 않습니다." };
    } else {
      const trimmed = record.short_description.trim();
      if (trimmed.length > MAX_SHORT_TEXT_LENGTH) {
        return {
          ok: false,
          error: `용량/요약은 ${MAX_SHORT_TEXT_LENGTH}자 이하여야 합니다.`,
        };
      }
      short_description = trimmed || null;
    }
  }

  let country_of_origin: string | null | undefined;
  if (record.country_of_origin !== undefined) {
    if (record.country_of_origin === null) {
      country_of_origin = null;
    } else if (typeof record.country_of_origin !== "string") {
      return { ok: false, error: "원산지 형식이 올바르지 않습니다." };
    } else {
      const trimmed = record.country_of_origin.trim();
      if (trimmed.length > MAX_SHORT_TEXT_LENGTH) {
        return {
          ok: false,
          error: `원산지는 ${MAX_SHORT_TEXT_LENGTH}자 이하여야 합니다.`,
        };
      }
      country_of_origin = trimmed || null;
    }
  }

  return {
    ok: true,
    patch: {
      name,
      barcode,
      wholesale_price,
      ...(price !== undefined ? { price } : {}),
      ...(brand !== undefined ? { brand } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(short_description !== undefined ? { short_description } : {}),
      ...(moq !== undefined ? { moq } : {}),
      ...(country_of_origin !== undefined ? { country_of_origin } : {}),
      ...(image_url !== undefined ? { image_url } : {}),
      ...(category_id !== undefined ? { category_id } : {}),
      ...(sold_out !== undefined ? { sold_out } : {}),
    },
  };
}

export type ProductFlagsPatch = {
  is_featured?: boolean;
  is_best_seller?: boolean;
};

export type ProductFlagsPatchResult =
  | { ok: true; patch: ProductFlagsPatch; isFlagsOnly: true }
  | { ok: false; error: string };

const FLAG_KEYS = new Set(["is_featured", "is_best_seller"]);

export function parseProductFlagsPatch(body: unknown): ProductFlagsPatchResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }

  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);

  if (keys.length === 0) {
    return { ok: false, error: "수정할 플래그가 없습니다." };
  }

  if (!keys.every((key) => FLAG_KEYS.has(key))) {
    return { ok: false, error: "플래그 수정 요청 형식이 올바르지 않습니다." };
  }

  const patch: ProductFlagsPatch = {};

  if (record.is_featured !== undefined) {
    if (typeof record.is_featured !== "boolean") {
      return { ok: false, error: "Featured 여부는 true/false여야 합니다." };
    }
    patch.is_featured = record.is_featured;
  }

  if (record.is_best_seller !== undefined) {
    if (typeof record.is_best_seller !== "boolean") {
      return { ok: false, error: "Best Seller 여부는 true/false여야 합니다." };
    }
    patch.is_best_seller = record.is_best_seller;
  }

  return { ok: true, patch, isFlagsOnly: true };
}

export function isFlagsOnlyBody(body: unknown): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }
  const keys = Object.keys(body as Record<string, unknown>);
  return keys.length > 0 && keys.every((key) => FLAG_KEYS.has(key));
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

export type OptionalInventoryFields = {
  stock?: number;
  sold_out?: boolean;
};

export function parseOptionalInventoryFields(
  body: unknown,
): { ok: true; fields: OptionalInventoryFields } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: true, fields: {} };
  }

  const record = body as Record<string, unknown>;
  const fields: OptionalInventoryFields = {};

  if (record.stock !== undefined) {
    const stock = Number(record.stock);
    if (!Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) {
      return { ok: false, error: "재고는 0 이상의 정수여야 합니다." };
    }
    fields.stock = stock;
  }

  if (record.sold_out !== undefined) {
    if (typeof record.sold_out !== "boolean") {
      return { ok: false, error: "품절 여부는 true/false여야 합니다." };
    }
    fields.sold_out = record.sold_out;
  }

  return { ok: true, fields };
}

export function isInventoryOnlyBody(body: unknown): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }
  const keys = Object.keys(body as Record<string, unknown>);
  return keys.length > 0 && keys.every((key) => INVENTORY_KEYS.has(key));
}
