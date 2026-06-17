/**
 * Database types — mirrors supabase/schema.sql
 * Regenerate from Supabase CLI in Phase 2: `supabase gen types typescript`
 */

export type UserRole = "customer" | "admin" | "wholesale";
export type ProductStatus = "draft" | "active" | "archived";
export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type AddressType = "shipping" | "billing";
export type OrderType = "b2c" | "b2b";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  country_code: string | null;
  role: UserRole;
  wholesale_approved: boolean;
  wholesale_tier: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  brand: string;
  sku: string;
  barcode: string | null;
  price: number;
  wholesale_price: number | null;
  compare_at_price: number | null;
  moq: number;
  stock: number;
  weight_grams: number | null;
  ingredients: string | null;
  how_to_use: string | null;
  country_of_origin: string | null;
  status: ProductStatus;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  type: AddressType;
  label: string | null;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state_province: string | null;
  postal_code: string;
  country_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface OrderAddressSnapshot {
  recipient_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state_province?: string | null;
  postal_code: string;
  country_code: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  order_type: OrderType;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  shipping_address: OrderAddressSnapshot;
  billing_address: OrderAddressSnapshot | null;
  notes: string | null;
  payment_provider: string | null;
  payment_intent_id: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      product_images: {
        Row: ProductImage;
        Insert: Partial<ProductImage>;
        Update: Partial<ProductImage>;
      };
      addresses: { Row: Address; Insert: Partial<Address>; Update: Partial<Address> };
      cart_items: { Row: CartItem; Insert: Partial<CartItem>; Update: Partial<CartItem> };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem>;
        Update: Partial<OrderItem>;
      };
    };
    Enums: {
      user_role: UserRole;
      product_status: ProductStatus;
      order_status: OrderStatus;
      address_type: AddressType;
      order_type: OrderType;
    };
  };
}
