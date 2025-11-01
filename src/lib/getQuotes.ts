// src/lib/getQuotes.ts
import { getCachedQuote, setCachedQuote } from "./quoteCache";

/**
 * Fetch quotes from Yahoo Finance for given symbols (like ["TCS.NS", "HDFCBANK.NS"])
 * Returns price, EPS, and earnings timestamp (if available)
 */
export async function getQuotes(
  symbols: string[]
): Promise<
  Record<
    string,
    {
      price: number | null;
      eps: number | null;
      earningsTimestamp: number | null;
    }
  >
> {
  const out: Record<
    string,
    {
      price: number | null;
      eps: number | null;
      earningsTimestamp: number | null;
    }
  > = {};
  const toFetch: string[] = [];

  // Check cache
  for (const s of symbols) {
    const cached = getCachedQuote(s);
    if (cached && typeof cached === "object" && "price" in cached) {
      out[s] = cached as any;
    } else {
      toFetch.push(s);
    }
  }

  if (toFetch.length === 0) return out;

  const BATCH = 10;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    const q = encodeURIComponent(batch.join(","));
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${q}`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      const results = json?.quoteResponse?.result ?? [];

      for (const r of results) {
        const sym = r.symbol;
        const price =
          r.regularMarketPrice ?? r.regularMarketPreviousClose ?? null;

        const eps = r.epsTrailingTwelveMonths ?? r.trailingEps ?? r.eps ?? null;

        const earningsTimestamp = r.earningsTimestamp ?? null;

        const obj = { price, eps, earningsTimestamp };
        out[sym] = obj;
        setCachedQuote(sym, obj);
      }
    } catch (err) {
      console.error("Yahoo fetch error:", err);
      for (const s of batch) {
        out[s] = { price: null, eps: null, earningsTimestamp: null };
      }
    }
  }

  return out;
}
