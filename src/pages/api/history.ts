// src/pages/api/history.ts
import type { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";

type HistResp = {
  symbol: string;
  timestamps: number[]; // unix secs
  close: number[]; // same length as timestamps
};

const cache = new NodeCache({ stdTTL: 60 * 5, checkperiod: 60 }); // 5 min cache

function toYahooChartUrl(symbol: string, period = "1mo", interval = "1d") {
  // Yahoo chart endpoint
  // e.g. https://query1.finance.yahoo.com/v8/finance/chart/HDFCBANK.NS?range=1mo&interval=1d
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${period}&interval=${interval}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const symbol = (req.query.symbol as string) || "";
    const period = (req.query.period as string) || "1mo"; // 1d,5d,1mo,3mo,6mo,1y
    const interval = (req.query.interval as string) || "1d"; // 1m,5m,15m,60m,1d

    if (!symbol) {
      res.status(400).json({ error: "symbol required, e.g. HDFCBANK.NS" });
      return;
    }

    const cacheKey = `hist:${symbol}:${period}:${interval}`;
    const cached = cache.get<HistResp>(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const url = toYahooChartUrl(symbol, period, interval);
    const fetchRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!fetchRes.ok) {
      res
        .status(502)
        .json({ error: "Failed to fetch from Yahoo", status: fetchRes.status });
      return;
    }

    const json = await fetchRes.json();

    const result = json?.chart?.result?.[0];
    if (!result) {
      res.status(502).json({ error: "No data in Yahoo response" });
      return;
    }

    const timestamps: number[] = result.timestamp ?? [];
    const indicators = result.indicators?.quote?.[0];
    const close: number[] = indicators?.close ?? [];

    // sanitize arrays: keep equal length and remove nulls (align)
    const trimmedT: number[] = [];
    const trimmedC: number[] = [];
    for (let i = 0; i < Math.min(timestamps.length, close.length); i++) {
      const t = timestamps[i];
      const c = close[i];
      if (t != null && c != null) {
        trimmedT.push(t);
        trimmedC.push(c);
      }
    }

    const out: HistResp = {
      symbol,
      timestamps: trimmedT,
      close: trimmedC,
    };

    cache.set(cacheKey, out);
    res.status(200).json(out);
  } catch (err: any) {
    console.error("/api/history error:", err?.message ?? err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
}
