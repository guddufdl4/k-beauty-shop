/** Packaging from HMT supplier sheets, exact EAN match, checked 2026-10-09.
 * MOQ remains the order rule; inner-box and outer-carton counts are distinct.
 */
const PACKING: Record<string, { units: number; outer?: boolean }> = {
  "8809782555508": { units: 120, outer: true },
  "8809968130277": { units: 120, outer: true },
  "8809447256221": { units: 40 }, "8809447256115": { units: 40 },
  "8809640737190": { units: 54 }, "8809640734526": { units: 54 },
  "8809576260663": { units: 50 }, "8809913830603": { units: 50 },
};
export function VerifiedPackingInfo({ sku, locale }: { sku?: string | null; locale: string }) {
  const packing = PACKING[sku ?? ""];
  if (!packing) return null;
  const label = locale === "ko" ? packing.outer ? "아웃박스당 수량" : "인박스당 수량"
    : packing.outer ? "Units per export carton" : "Units per inner box";
  return <p className="mt-3 text-sm text-zinc-600">{label}: <strong className="font-semibold text-zinc-900">{packing.units}</strong></p>;
}
