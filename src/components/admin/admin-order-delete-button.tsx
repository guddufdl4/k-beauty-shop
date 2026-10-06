import { AdminOrderActionButton } from "./admin-order-action-button";
export function AdminOrderDeleteButton({ orderNumber }: { orderNumber: string }) {
  return <AdminOrderActionButton orderNumber={orderNumber} />;
}
