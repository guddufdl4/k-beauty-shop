export const MIN_USD_KRW_RATE = 1350;
export type ExchangeRateState = {
  marketRate: number | null;
  appliedRate: number;
  rateDate: string | null;
  checkedAt: string | null;
  attemptedAt: string | null;
  error: string | null;
};
export const INITIAL_EXCHANGE_RATE: ExchangeRateState = {
  marketRate: null, appliedRate: MIN_USD_KRW_RATE, rateDate: null,
  checkedAt: null, attemptedAt: null, error: null,
};
export function applyExchangeRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid exchange rate");
  return Math.max(MIN_USD_KRW_RATE, Math.round(rate * 100) / 100);
}
export function parseMarketRate(value: unknown, now = new Date()): { rate: number; date: string } {
  const data = value as { base?: unknown; quote?: unknown; rate?: unknown; date?: unknown } | null;
  if (!data || data.base !== "USD" || data.quote !== "KRW" || typeof data.rate !== "number" || data.rate < 100 || data.rate > 10000 || typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error("Invalid exchange rate response");
  const age = now.getTime() - Date.parse(data.date + "T00:00:00Z");
  if (!Number.isFinite(age) || age < -86400000 || age > 7 * 86400000) throw new Error("Outdated exchange rate response");
  return { rate: data.rate, date: data.date };
}
export function koreaDay(date: string): string {
  return new Date(Date.parse(date) + 9 * 3600000).toISOString().slice(0, 10);
}
