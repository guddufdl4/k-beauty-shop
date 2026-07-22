/**
 * Database types — mirrors supabase/schema.sql
 * Regenerate from Supabase CLI in Phase 2: `supabase gen types typescript`
 */

export type UserRole = "customer" | "admin" | "wholesale";
export type ProductStatus = "draft" | "active" | "archived";
export type ProductContentStatus = "pending" | "complete";
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
  sold_out: boolean;
  weight_grams: number | null;
  ingredients: string | null;
  how_to_use: string | null;
  country_of_origin: string | null;
  status: ProductStatus;
  import_batch_id: string | null;
  external_sku: string | null;
  source_row: Record<string, unknown> | null;
  image_url: string | null;
  content_status: ProductContentStatus;
  needs_image: boolean;
  needs_description: boolean;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImportBatch {
  id: string;
  filename: string;
  row_count: number;
  imported_count: number;
  failed_count: number;
  product_count?: number;
  status: "processing" | "success" | "partial" | "failed";
  imported_at: string | null;
  created_at: string;
}

export interface ProductContentJob {
  id: string;
  product_id: string;
  import_batch_id: string | null;
  job_type: "image" | "description";
  status: "pending" | "processing" | "done" | "failed";
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
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
  stripe_session_id: string | null;
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

export interface SiteSettings {
  id: number;
  store_name: string;
  contact_email: string | null;
  maintenance_enabled: boolean;
  maintenance_message: string;
  wholesale_price_label: string | null;
  moq_label: string | null;
  min_order_note: string | null;
  hero_image_url: string | null;
  hero_badge: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_button_text: string | null;
  hero_button_link: string | null;
  updated_at: string;
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
      product_import_batches: {
        Row: ProductImportBatch;
        Insert: Partial<ProductImportBatch>;
        Update: Partial<ProductImportBatch>;
      };
      product_content_jobs: {
        Row: ProductContentJob;
        Insert: Partial<ProductContentJob>;
        Update: Partial<ProductContentJob>;
      };
      addresses: { Row: Address; Insert: Partial<Address>; Update: Partial<Address> };
      cart_items: { Row: CartItem; Insert: Partial<CartItem>; Update: Partial<CartItem> };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem>;
        Update: Partial<OrderItem>;
      };
      site_settings: {
        Row: SiteSettings;
        Insert: Partial<SiteSettings>;
        Update: Partial<SiteSettings>;
      };
    };
    Enums: {
      user_role: UserRole;
      product_status: ProductStatus;
      order_status: OrderStatus;
      address_type: AddressType;
      order_type: OrderType;
      product_content_status: ProductContentStatus;
    };
  };
}
