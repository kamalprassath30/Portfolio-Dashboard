// src/lib/getQuotes.ts
import { getCachedQuote, setCachedQuote } from "./quoteCache";

/**
 * Fetch quotes for an array of Yahoo symbols (e.g. ["TCS.NS","ICICIBANK.NS"])
 * Returns a map: { "TCS.NS": 4200.12, "ICICIBANK.NS": 1050.2 }
 */
export async function getQuotes(
  symbols: string[]
): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  const toFetch: string[] = [];

  // check cache first
  for (const s of symbols) {
    const cached = getCachedQuote(s);
    if (cached !== null) out[s] = cached;
    else toFetch.push(s);
  }

  if (toFetch.length === 0) return out;

  // Yahoo allows multiple symbols joined by comma
  // Break into batches to be safe (batch size 10)
  const BATCH = 10;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    const q = encodeURIComponent(batch.join(","));
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${q}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "node-fetch" }, // just in case
      });
      if (!res.ok) {
        // set nulls for this batch so code doesn't crash
        for (const s of batch) out[s] = null;
        continue;
      }
      const json = await res.json();
      const results = json?.quoteResponse?.result ?? [];

      // fill results
      const found: Record<string, number> = {};
      for (const r of results) {
        // Yahoo returns regularMarketPrice (or regularMarketPreviousClose etc.)
        const sym = r.symbol;
        const price =
          r.regularMarketPrice ?? r.regularMarketPreviousClose ?? null;
        if (typeof price === "number") {
          found[sym] = price;
          setCachedQuote(sym, price);
          out[sym] = price;
        } else {
          out[sym] = null;
        }
      }

      // any symbols not returned -> set null
      for (const s of batch) {
        if (out[s] === undefined) out[s] = null;
      }
    } catch (err) {
      console.error("getQuotes fetch error:", err);
      for (const s of batch) out[s] = null;
    }
  }

  return out;
}
