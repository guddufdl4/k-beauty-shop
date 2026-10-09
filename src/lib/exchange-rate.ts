import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { applyExchangeRate, INITIAL_EXCHANGE_RATE, koreaDay, parseMarketRate, type ExchangeRateState } from "./exchange-rate-policy";

const BUCKET = "site-config";
const PATH = "exchange-rate.json";
export async function readExchangeRate(): Promise<ExchangeRateState> {
  const service = createServiceClient();
  if (!service) return { ...INITIAL_EXCHANGE_RATE };
  // Authenticated download bypasses public CDN staleness after replacement.
  const { data, error } = await service.storage.from(BUCKET).download(PATH);
  if (error || !data) throw new Error("환율 설정을 읽지 못했습니다.");
  const state = JSON.parse(await data.text()) as ExchangeRateState;
  if (!Number.isFinite(state.appliedRate) || state.appliedRate < 1350) throw new Error("환율 설정이 올바르지 않습니다.");
  return state;
}
export const getExchangeRate = unstable_cache(readExchangeRate, ["exchange-rate-policy-1350-v1"], { revalidate: 60, tags: ["exchange-rate"] });

export async function refreshExchangeRate(force = false): Promise<ExchangeRateState> {
  const previous = await readExchangeRate();
  const now = new Date().toISOString();
  if (!force && previous.checkedAt && koreaDay(previous.checkedAt) === koreaDay(now)) return previous;
  let next: ExchangeRateState;
  try {
    const response = await fetch("https://api.frankfurter.dev/v2/rate/USD/KRW", { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("환율 조회 실패");
    const market = parseMarketRate(await response.json());
    next = { marketRate: market.rate, appliedRate: applyExchangeRate(market.rate), rateDate: market.date, checkedAt: now, attemptedAt: now, error: null };
  } catch {
    next = { ...previous, attemptedAt: now, error: "환율 조회에 실패해 마지막 정상 환율을 유지합니다. 다시 확인해 주세요." };
  }
  const service = createServiceClient();
  if (!service) throw new Error("환율 저장 서비스가 준비되지 않았습니다.");
  const { error } = await service.storage.from(BUCKET).upload(PATH, JSON.stringify(next), { upsert: true, contentType: "application/json", cacheControl: "0" });
  if (error) throw new Error("환율을 저장하지 못했습니다. 기존 환율을 유지합니다.");
  revalidateTag("exchange-rate", { expire: 0 });
  return next;
}
