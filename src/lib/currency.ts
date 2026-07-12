import { unstable_cache } from "next/cache";

const DEFAULT_USD_KRW_RATE = 1350;
const RATE_CACHE_SECONDS = 86_400;

function parseEnvRate(): number | null {
  const raw = process.env.EXCHANGE_RATE_USD_KRW;
  if (!raw) return null;
  const rate = Number(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function fetchUsdKrwRate(): Promise<number> {
  const envRate = parseEnvRate();
  if (envRate) return envRate;

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: RATE_CACHE_SECONDS },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates?: { KRW?: number } };
    const krw = data.rates?.KRW;
    if (typeof krw === "number" && krw > 0) return krw;
  } catch {
    // fall through to default
  }

  return DEFAULT_USD_KRW_RATE;
}

export const getUsdKrwRate = unstable_cache(
  fetchUsdKrwRate,
  ["usd-krw-rate"],
  { revalidate: RATE_CACHE_SECONDS },
);
