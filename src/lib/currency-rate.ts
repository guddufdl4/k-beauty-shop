import "server-only";
import { getExchangeRate } from "@/lib/exchange-rate";
export async function getUsdKrwRate(): Promise<number> { return (await getExchangeRate()).appliedRate; }
