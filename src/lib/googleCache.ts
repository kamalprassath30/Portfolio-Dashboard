// src/lib/googleCache.ts
import NodeCache from "node-cache";

const TTL_SECONDS = 60 * 60; // 1 hour - P/E/earnings don't change often
const cache = new NodeCache({ stdTTL: TTL_SECONDS, checkperiod: 600 });

export function getCachedGoogle(symbol: string) {
  return cache.get<any>(`google:${symbol}`);
}

export function setCachedGoogle(symbol: string, value: any) {
  cache.set(`google:${symbol}`, value);
}
