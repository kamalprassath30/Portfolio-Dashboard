// src/lib/quoteCache.ts
import NodeCache from "node-cache";

const TTL_SECONDS = 20; // cache duration in seconds
const cache = new NodeCache({
  stdTTL: TTL_SECONDS,
  checkperiod: TTL_SECONDS * 0.2,
});

export type CachedQuote = {
  price: number | null;
  eps: number | null;
  earningsTimestamp: number | null;
};

export function getCachedQuote(symbol: string): CachedQuote | null {
  const v = cache.get<CachedQuote>(`quote:${symbol}`);
  return v ?? null;
}

export function setCachedQuote(symbol: string, data: CachedQuote) {
  cache.set(`quote:${symbol}`, data);
}

export function clearCache() {
  cache.flushAll();
}
