import { unstable_cache } from "next/cache";

/** Storefront USD = KRW / this rate. */
const DEFAULT_USD_KRW_RATE = 1300;
const RATE_CACHE_SECONDS = 1_800;

function parseEnvRate(): number | null {
  const raw = process.env.EXCHANGE_RATE_USD_KRW;
  if (!raw) return null;
  const rate = Number(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function fetchUsdKrwRate(): Promise<number> {
  const envRate = parseEnvRate();
  if (envRate) return envRate;
  return DEFAULT_USD_KRW_RATE;
}

export const getUsdKrwRate = unstable_cache(
  fetchUsdKrwRate,
  ["usd-krw-rate"],
  { revalidate: RATE_CACHE_SECONDS },
);
