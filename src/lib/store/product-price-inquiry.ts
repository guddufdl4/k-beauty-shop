/** Use database identity, never customer-supplied names, barcodes or prices. */
export function productPriceInquiryMessage(product: { name: string; product_code?: string | null; barcode?: string | null; moq: number; price_on_request?: boolean; sold_out?: boolean }, quantity: unknown) {
  if (!product.price_on_request || product.sold_out || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < Math.max(1, product.moq)) return null;
  return [`Wholesale price inquiry`, `Product: ${product.name}`, `HMT product no.: ${product.product_code || '-'}`, `Barcode: ${product.barcode || 'Not provided by supplier'}`, `Desired quantity: ${quantity}`, `MOQ: ${product.moq}`, '', 'Please confirm the latest wholesale price.'].join('\n');
}
