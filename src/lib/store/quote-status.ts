import type { OrderStatus } from "@/types/database";

export type QuoteDisplayStatus =
  | "submitted"
  | "under_review"
  | "quoted"
  | "awaiting_payment"
  | "payment_confirmed"
  | "cancelled";

/**
 * Map existing order.status values without changing stored rows.
 * Quote requests are stored as order_type=b2b, payment_provider=quote.
 */
export function mapOrderStatusToQuoteDisplay(
  status: OrderStatus | string | null | undefined,
): QuoteDisplayStatus {
  switch (status) {
    case "cancelled":
    case "refunded":
      return "cancelled";
    case "paid":
    case "processing":
    case "shipped":
    case "delivered":
      return "payment_confirmed";
    case "pending":
    default:
      return "submitted";
  }
}

export function quoteDisplayStatusLabelKey(
  status: QuoteDisplayStatus,
): `quoteStatus.${QuoteDisplayStatus}` {
  return `quoteStatus.${status}`;
}
