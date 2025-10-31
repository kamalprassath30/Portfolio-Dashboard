// src/lib/quoteCache.ts
import NodeCache from "node-cache";

const TTL_SECONDS = 20; // keep quotes for 20 seconds
const cache = new NodeCache({
  stdTTL: TTL_SECONDS,
  checkperiod: TTL_SECONDS * 0.2,
});

export function getCachedQuote(symbol: string): number | null {
  const v = cache.get<number>(`quote:${symbol}`);
  return typeof v === "number" ? v : null;
}

export function setCachedQuote(symbol: string, price: number) {
  cache.set(`quote:${symbol}`, price);
}

export function clearCache() {
  cache.flushAll();
}
