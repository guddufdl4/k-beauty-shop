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
