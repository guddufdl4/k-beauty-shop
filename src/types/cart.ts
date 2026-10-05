export type CartItemView = {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  brand: string;
  sku: string;
  barcode: string | null;
  productCode: string | null;
  imageUrl: string | null;
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
