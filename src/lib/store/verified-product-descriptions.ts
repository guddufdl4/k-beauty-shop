/** Brand-page summaries checked 2026-10-09 against exact HMT supplier EANs.
 * Regional ingredient lists and clinical claims are deliberately not inferred.
 */
export const VERIFIED_PRODUCT_DESCRIPTIONS: Record<string, { source: string; checked: string; en: string; ko: string }> = {
  "8809447256221": { source: "https://doctoraltheaglobal.com/products/345-relief-cream", checked: "2026-10-09", en: "A lightweight daily moisturizing cream with a comfortable finish. This listing is for the 50ml renewal product in the HMT supplier catalog.", ko: "가볍게 발리는 데일리 보습 크림입니다. HMT 공급사 자료에 등록된 50ml 리뉴얼 제품입니다." },
  "8809447256115": { source: "https://doctoraltheaglobal.com/products/345-relief-cream-mist", checked: "2026-10-09", en: "A fine moisturizing mist combining cream and essence layers. Supplied in a 100ml format for daily hydration.", ko: "크림과 에센스층을 결합한 미세 분사형 보습 미스트입니다. 판매 용량은 100ml입니다." },
  "8809640737190": { source: "https://anua.com/products/azelaic-acid-10-hyaluron-redness-soothing-serum", checked: "2026-10-09", en: "A lightweight azelaic acid and hyaluronic acid serum for moisturizing skin care. This listing is for the 30ml product.", ko: "아젤라익애씨드와 히알루론산을 배합한 가벼운 사용감의 보습 세럼입니다. 판매 용량은 30ml입니다." },
  "8809640734526": { source: "https://anua.com/products/niacinamide-10-txa-4-serum-2", checked: "2026-10-09", en: "A facial serum formulated with 10% niacinamide and 4% tranexamic acid. This listing is for the 30ml format.", ko: "나이아신아마이드 10%와 트라넥사믹애씨드 4%를 배합한 페이셜 세럼입니다. 판매 용량은 30ml입니다." },
  "8809782555508": { source: "https://beautyofjoseon.com/products/relief-sun-rice-probiotics", checked: "2026-10-09", en: "A moisturizing rice-based daily sunscreen with a creamy texture. This is the 50ml Rice + Niacinamide product identified in the HMT supplier sheet; regional formulations may differ.", ko: "크림 제형의 쌀 성분 데일리 보습 선크림입니다. HMT 공급사 자료의 Rice + Niacinamide 50ml 제품이며 지역별 처방은 다를 수 있습니다." },
  "8809968130277": { source: "https://beautyofjoseon.com/pages/relief-sun-aqua-fresh", checked: "2026-10-09", en: "A lightweight fluid sunscreen with rice seed water and panthenol (vitamin B5). The Aqua-Fresh version is supplied in a 50ml format.", ko: "쌀수와 판테놀(비타민 B5)을 배합한 가벼운 플루이드 타입 선크림입니다. 아쿠아 프레쉬 제품의 판매 용량은 50ml입니다." },
  "8809576260663": { source: "https://www.skin1004.com/products/skin1004-madagascar-centella-ampoule", checked: "2026-10-09", en: "A watery ampoule featuring Madagascar Centella asiatica extract for soothing and moisturizing care. This listing is for the 100ml format.", ko: "마다가스카르 병풀 추출물을 담은 워터리 제형의 진정·보습 앰플입니다. 판매 용량은 100ml입니다." },
  "8809913830603": { source: "https://www.skin1004.com/products/hyalu-cica-water-fit-sun-serum-spf50-pa", checked: "2026-10-09", en: "A lightweight, serum-like moisturizing sunscreen. This listing is for the 100ml Hyalu-Cica Water-Fit Sun Serum, distinct from the regional UV version.", ko: "세럼처럼 가볍게 발리는 보습 선크림입니다. 판매 제품은 Hyalu-Cica Water-Fit Sun Serum 100ml이며 지역별 UV 버전과 구분됩니다." },
};
export function getVerifiedProductDescription(product: { sku?: string | null; barcode?: string | null }, locale: string): string | null {
  const entry = VERIFIED_PRODUCT_DESCRIPTIONS[product.barcode ?? ""] ?? VERIFIED_PRODUCT_DESCRIPTIONS[product.sku ?? ""];
  return entry ? locale === "ko" ? entry.ko : entry.en : null;
}
