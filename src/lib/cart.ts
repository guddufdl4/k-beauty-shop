import { cookies } from "next/headers";
import { formatKRW } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSafeClient } from "@/lib/supabase/safe-server";
import {
  FALLBACK_PRODUCTS,
  type ProductWithRelations,
} from "@/lib/supabase/products";

export const DEMO_CART_COOKIE = "kb_demo_cart";
export const DEMO_ORDERS_COOKIE = "kb_demo_orders";

export type ShippingAddress = {
  recipient_name: string;
  phone: string;
  line1: string;
  city: string;
  postal_code: string;
  country_code: string;
};

export type CartItemView = {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  brand: string;
  sku: string;
  unitPrice: number;
  moq: number;
  stock: number;
  lineTotal: number;
};

export type CartView = {
  items: CartItemView[];
  subtotal: number;
  itemCount: number;
  source: "database" | "cookie";
};

export type DemoOrder = {
  order_number: string;
  status: "pending" | "paid";
  subtotal: number;
  shipping_cost: number;
  total: number;
  currency: "KRW";
  shipping_address: ShippingAddress;
  items: Array<{
    product_id: string;
    product_name: string;
    product_sku: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
  created_at: string;
};

export { formatKRW as formatPrice };

export function isDemoProductId(productId: string): boolean {
  return (
    productId.startsWith("static-") ||
    FALLBACK_PRODUCTS.some((product) => product.id === productId)
  );
}

export function generateOrderNumber(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `KB-${ymd}-${suffix}`;
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function usesDatabaseCart(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return Boolean(userId && isSupabaseConfigured());
}

function mapFallbackItem(
  product: ProductWithRelations,
  quantity: number,
): CartItemView {
  return {
    id: product.id,
    productId: product.id,
    quantity,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    sku: product.sku,
    unitPrice: product.price,
    moq: product.moq,
    stock: product.stock,
    lineTotal: product.price * quantity,
  };
}

async function readDemoCart(): Promise<Record<string, number>> {
  const store = await cookies();
  const raw = store.get(DEMO_CART_COOKIE)?.value;

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([productId, quantity]) =>
          isDemoProductId(productId) && Number.isFinite(quantity) && quantity >= 1,
      ),
    );
  } catch {
    return {};
  }
}

async function writeDemoCart(cart: Record<string, number>) {
  const store = await cookies();
  store.set(DEMO_CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readDemoOrders(): Promise<DemoOrder[]> {
  const store = await cookies();
  const raw = store.get(DEMO_ORDERS_COOKIE)?.value;

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as DemoOrder[];
  } catch {
    return [];
  }
}

export async function writeDemoOrders(orders: DemoOrder[]) {
  const store = await cookies();
  store.set(DEMO_ORDERS_COOKIE, JSON.stringify(orders), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function getFallbackProduct(
  productId: string,
): Promise<ProductWithRelations | null> {
  return FALLBACK_PRODUCTS.find((product) => product.id === productId) ?? null;
}

async function getDatabaseCart(userId: string): Promise<CartView> {
  const supabase = await createSafeClient();
  if (!supabase) {
    return { items: [], subtotal: 0, itemCount: 0, source: "cookie" };
  }

  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `
      id,
      product_id,
      quantity,
      product:products (
        id,
        name,
        slug,
        brand,
        sku,
        price,
        moq,
        stock
      )
    `,
    )
    .eq("user_id", userId);

  if (error || !data) {
    return { items: [], subtotal: 0, itemCount: 0, source: "database" };
  }

  const items: CartItemView[] = [];

  for (const row of data) {
    const record = row as Record<string, unknown>;
    const product = record.product as Record<string, unknown> | null;
    if (!product) {
      continue;
    }

    const quantity = Number(record.quantity ?? 1);
    const unitPrice = Number(product.price ?? 0);

    items.push({
      id: String(record.id),
      productId: String(record.product_id),
      quantity,
      name: String(product.name),
      slug: String(product.slug),
      brand: String(product.brand),
      sku: String(product.sku),
      unitPrice,
      moq: Number(product.moq ?? 1),
      stock: Number(product.stock ?? 0),
      lineTotal: unitPrice * quantity,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, itemCount, source: "database" };
}

async function getCookieCart(): Promise<CartView> {
  const cart = await readDemoCart();
  const items: CartItemView[] = [];

  for (const [productId, quantity] of Object.entries(cart)) {
    const product = await getFallbackProduct(productId);
    if (!product) {
      continue;
    }
    items.push(mapFallbackItem(product, quantity));
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, itemCount, source: "cookie" };
}

export async function getCart(): Promise<CartView> {
  const userId = await getCurrentUserId();
  if (userId && isSupabaseConfigured()) {
    return getDatabaseCart(userId);
  }
  return getCookieCart();
}

export async function getCartItemCount(): Promise<number> {
  const cart = await getCart();
  return cart.itemCount;
}

async function resolveProductForCart(
  productId: string,
): Promise<ProductWithRelations | null> {
  if (isDemoProductId(productId)) {
    return getFallbackProduct(productId);
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name, slug),
      images:product_images(id, product_id, url, alt_text, sort_order, is_primary)
    `,
    )
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const categoryRaw = record.category as Record<string, unknown> | null;
  const imagesRaw = (record.images as Record<string, unknown>[] | null) ?? [];

  return {
    id: String(record.id),
    category_id: record.category_id ? String(record.category_id) : null,
    name: String(record.name),
    slug: String(record.slug),
    description: record.description ? String(record.description) : null,
    short_description: record.short_description
      ? String(record.short_description)
      : null,
    brand: String(record.brand),
    sku: String(record.sku),
    barcode: record.barcode ? String(record.barcode) : null,
    price: Number(record.price ?? 0),
    wholesale_price:
      record.wholesale_price != null ? Number(record.wholesale_price) : null,
    compare_at_price:
      record.compare_at_price != null ? Number(record.compare_at_price) : null,
    moq: Number(record.moq ?? 1),
    stock: Number(record.stock ?? 0),
    weight_grams:
      record.weight_grams != null ? Number(record.weight_grams) : null,
    ingredients: record.ingredients ? String(record.ingredients) : null,
    how_to_use: record.how_to_use ? String(record.how_to_use) : null,
    country_of_origin: record.country_of_origin
      ? String(record.country_of_origin)
      : null,
    status: "active",
    is_featured: Boolean(record.is_featured),
    created_at: String(record.created_at ?? new Date().toISOString()),
    updated_at: String(record.updated_at ?? new Date().toISOString()),
    category: categoryRaw
      ? {
          id: String(categoryRaw.id),
          name: String(categoryRaw.name),
          slug: String(categoryRaw.slug),
        }
      : null,
    images: imagesRaw.map((image) => ({
      id: String(image.id),
      product_id: String(image.product_id),
      url: String(image.url),
      alt_text: image.alt_text ? String(image.alt_text) : null,
      sort_order: Number(image.sort_order ?? 0),
      is_primary: Boolean(image.is_primary),
    })),
  };
}

function validateQuantity(
  product: ProductWithRelations,
  quantity: number,
): string | null {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return "수량을 올바르게 입력해 주세요.";
  }
  if (quantity < product.moq) {
    return `최소 주문 수량(MOQ)은 ${product.moq}개입니다.`;
  }
  if (product.stock > 0 && quantity > product.stock) {
    return `재고가 ${product.stock}개뿐입니다.`;
  }
  return null;
}

export async function addToCart(
  productId: string,
  quantity: number,
): Promise<{ error?: string }> {
  const product = await resolveProductForCart(productId);
  if (!product) {
    return { error: "상품을 찾을 수 없습니다." };
  }

  const validationError = validateQuantity(product, quantity);
  if (validationError) {
    return { error: validationError };
  }

  const userId = await getCurrentUserId();
  const useDatabase =
    Boolean(userId && isSupabaseConfigured()) && !isDemoProductId(productId);

  if (useDatabase && userId) {
    const supabase = await createSafeClient();
    if (!supabase) {
      return { error: "장바구니를 사용할 수 없습니다." };
    }

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const nextQuantity = Number(existing.quantity) + quantity;
      const nextValidation = validateQuantity(product, nextQuantity);
      if (nextValidation) {
        return { error: nextValidation };
      }

      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: nextQuantity })
        .eq("id", existing.id);

      if (error) {
        return { error: error.message };
      }
    } else {
      const { error } = await supabase.from("cart_items").insert({
        user_id: userId,
        product_id: productId,
        quantity,
      });

      if (error) {
        return { error: error.message };
      }
    }

    return {};
  }

  const cart = await readDemoCart();
  const nextQuantity = (cart[productId] ?? 0) + quantity;
  const nextValidation = validateQuantity(product, nextQuantity);
  if (nextValidation) {
    return { error: nextValidation };
  }

  cart[productId] = nextQuantity;
  await writeDemoCart(cart);
  return {};
}

export async function updateCartQuantity(
  productId: string,
  quantity: number,
): Promise<{ error?: string }> {
  const product = await resolveProductForCart(productId);
  if (!product) {
    return { error: "상품을 찾을 수 없습니다." };
  }

  const validationError = validateQuantity(product, quantity);
  if (validationError) {
    return { error: validationError };
  }

  const userId = await getCurrentUserId();
  const useDatabase =
    Boolean(userId && isSupabaseConfigured()) && !isDemoProductId(productId);

  if (useDatabase && userId) {
    const supabase = await createSafeClient();
    if (!supabase) {
      return { error: "장바구니를 사용할 수 없습니다." };
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("user_id", userId)
      .eq("product_id", productId);

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  const cart = await readDemoCart();
  cart[productId] = quantity;
  await writeDemoCart(cart);
  return {};
}

export async function removeFromCart(
  productId: string,
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  const useDatabase =
    Boolean(userId && isSupabaseConfigured()) && !isDemoProductId(productId);

  if (useDatabase && userId) {
    const supabase = await createSafeClient();
    if (!supabase) {
      return { error: "장바구니를 사용할 수 없습니다." };
    }

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  const cart = await readDemoCart();
  delete cart[productId];
  await writeDemoCart(cart);
  return {};
}

export async function clearCart(): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId && isSupabaseConfigured()) {
    const supabase = await createSafeClient();
    if (supabase) {
      await supabase.from("cart_items").delete().eq("user_id", userId);
    }
  }

  await writeDemoCart({});
}

export function calculateShippingCost(subtotal: number): number {
  return subtotal >= 100_000 ? 0 : 3_000;
}

export async function createOrder(
  shippingAddress: ShippingAddress,
): Promise<{ error?: string; orderNumber?: string }> {
  const cart = await getCart();
  if (cart.items.length === 0) {
    return { error: "장바구니가 비어 있습니다." };
  }

  const subtotal = cart.subtotal;
  const shippingCost = calculateShippingCost(subtotal);
  const total = subtotal + shippingCost;
  const orderNumber = generateOrderNumber();
  const userId = await getCurrentUserId();

  if (userId && isSupabaseConfigured() && cart.source === "database") {
    const supabase = await createSafeClient();
    if (!supabase) {
      return { error: "주문을 생성할 수 없습니다." };
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId,
        order_type: "b2c",
        status: "pending",
        subtotal,
        shipping_cost: shippingCost,
        total,
        currency: "KRW",
        shipping_address: shippingAddress,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return { error: orderError?.message ?? "주문 생성에 실패했습니다." };
    }

    const orderItems = cart.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      product_sku: item.sku,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      return { error: itemsError.message };
    }

    await clearCart();
    return { orderNumber };
  }

  const demoOrder: DemoOrder = {
    order_number: orderNumber,
    status: "pending",
    subtotal,
    shipping_cost: shippingCost,
    total,
    currency: "KRW",
    shipping_address: shippingAddress,
    items: cart.items.map((item) => ({
      product_id: item.productId,
      product_name: item.name,
      product_sku: item.sku,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
    })),
    created_at: new Date().toISOString(),
  };

  const orders = await readDemoOrders();
  orders.unshift(demoOrder);
  await writeDemoOrders(orders);
  await clearCart();

  return { orderNumber };
}

export async function getOrderByNumber(orderNumber: string): Promise<{
  order:
    | (DemoOrder & { source: "cookie" })
    | ({
        order_number: string;
        status: string;
        subtotal: number;
        shipping_cost: number;
        total: number;
        currency: string;
        shipping_address: ShippingAddress;
        created_at: string;
        items: Array<{
          product_name: string;
          product_sku: string;
          unit_price: number;
          quantity: number;
          line_total: number;
        }>;
      } & { source: "database" })
    | null;
}> {
  if (isSupabaseConfigured()) {
    const supabase = await createSafeClient();
    if (supabase) {
      const { data } = await supabase
        .from("orders")
        .select(
          `
          order_number,
          status,
          subtotal,
          shipping_cost,
          total,
          currency,
          shipping_address,
          created_at,
          items:order_items (
            product_name,
            product_sku,
            unit_price,
            quantity,
            line_total
          )
        `,
        )
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (data) {
        const record = data as Record<string, unknown>;
        const items =
          (record.items as Array<Record<string, unknown>> | null) ?? [];

        return {
          order: {
            order_number: String(record.order_number),
            status: String(record.status),
            subtotal: Number(record.subtotal),
            shipping_cost: Number(record.shipping_cost),
            total: Number(record.total),
            currency: String(record.currency),
            shipping_address: record.shipping_address as ShippingAddress,
            created_at: String(record.created_at),
            items: items.map((item) => ({
              product_name: String(item.product_name),
              product_sku: String(item.product_sku),
              unit_price: Number(item.unit_price),
              quantity: Number(item.quantity),
              line_total: Number(item.line_total),
            })),
            source: "database",
          },
        };
      }
    }
  }

  const demoOrders = await readDemoOrders();
  const demoOrder = demoOrders.find((order) => order.order_number === orderNumber);

  if (!demoOrder) {
    return { order: null };
  }

  return {
    order: {
      ...demoOrder,
      source: "cookie",
    },
  };
}

export async function markOrderPaid(
  orderNumber: string,
  payment: { provider: string; sessionId: string },
): Promise<void> {
  const { createServiceClient } = await import("@/lib/supabase/service");
  const service = createServiceClient();

  if (service) {
    const { data } = await service
      .from("orders")
      .select("status")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (data && data.status !== "paid") {
      await service
        .from("orders")
        .update({
          status: "paid",
          payment_provider: payment.provider,
          payment_intent_id: payment.sessionId,
          paid_at: new Date().toISOString(),
        })
        .eq("order_number", orderNumber);
    }
    return;
  }

  const orders = await readDemoOrders();
  const index = orders.findIndex((order) => order.order_number === orderNumber);

  if (index >= 0 && orders[index].status !== "paid") {
    orders[index] = { ...orders[index], status: "paid" };
    await writeDemoOrders(orders);
  }
}
