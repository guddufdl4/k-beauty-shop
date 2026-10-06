import { AdminOrderActionButton } from "./admin-order-action-button";
export function AdminOrderRestoreButton({ orderNumber }: { orderNumber: string }) {
  return <AdminOrderActionButton orderNumber={orderNumber} restore />;
}
