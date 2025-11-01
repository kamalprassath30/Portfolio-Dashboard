// src/lib/getGoogleData.ts
import { getCachedGoogle, setCachedGoogle } from "./googleCache";

/**
 * Best-effort fetch of P/E and latest earnings from Google Finance page.
 * Input symbol should be the Yahoo-like symbol (e.g. "TCS.NS" or "HDFCBANK.NS").
 * We will convert to Google URL form by stripping .NS and adding :NSE
 */
function toGoogleSymbol(yahooSymbol: string) {
  if (!yahooSymbol) return null;
  const s = yahooSymbol.replace(/\.NS$/i, "").replace(/\.BO$/i, "");
  return `${s}:NSE`;
}

async function fetchPage(url: string) {
  const res = await fetch(url, {
    headers: {
      // mimic browser
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function tryParsePEAndEarnings(html: string) {
  // Try multiple heuristics/patterns. Return { pe: number|null, earnings: number|null } or null.
  // Pattern 1: look for "P/E" or "PE ratio" nearby numbers
  const results: { pe: number | null; earnings: number | null } = {
    pe: null,
    earnings: null,
  };

  // Heuristic A: look for "P/E" or "P/E (TTM)" with a following number
  const peRegexes = [
    /P\/E[^0-9\n]*([0-9]+(?:\.[0-9]+)?)/i,
    /PE ratio[^0-9\n]*([0-9]+(?:\.[0-9]+)?)/i,
    /"PE_RATIO":\s*([0-9]+(?:\.[0-9]+)?)/i,
  ];
  for (const r of peRegexes) {
    const m = html.match(r);
    if (m && m[1]) {
      const v = Number(m[1]);
      if (!Number.isNaN(v)) {
        results.pe = v;
        break;
      }
    }
  }

  // Heuristic B: try to find "Earnings" or "EPS" near a number
  const earnRegexes = [
    /Earnings[^0-9\n-–—]*([0-9]+(?:\.[0-9]+)?)/i,
    /EPS[^0-9\n-–—]*([0-9]+(?:\.[0-9]+)?)/i,
    /"EPS":\s*([0-9]+(?:\.[0-9]+)?)/i,
    /Recent earnings[^0-9\n-–—]*([0-9]+(?:\.[0-9]+)?)/i,
  ];
  for (const r of earnRegexes) {
    const m = html.match(r);
    if (m && m[1]) {
      const v = Number(m[1]);
      if (!Number.isNaN(v)) {
        results.earnings = v;
        break;
      }
    }
  }

  // Heuristic C: attempt to parse embedded JSON structures
  try {
    const jsonMatch = html.match(/AF_initDataCallback\(([^<]+)\);/g);
    if (jsonMatch) {
      for (const js of jsonMatch) {
        const inner = js.replace(/^AF_initDataCallback\(|\);$/g, "");
        // try to locate numbers inside
        const numMatch = inner.match(/"(\w+)":\s*([0-9]+(?:\.[0-9]+)?)/);
        if (numMatch && numMatch[2]) {
          const maybe = Number(numMatch[2]);
          if (!Number.isNaN(maybe)) {
            if (results.pe === null) results.pe = maybe;
            else if (results.earnings === null) results.earnings = maybe;
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return results;
}

export async function getGoogleData(
  yahooSymbols: string[]
): Promise<Record<string, { pe: number | null; earnings: number | null }>> {
  const out: Record<string, { pe: number | null; earnings: number | null }> =
    {};
  for (const s of yahooSymbols) {
    // check cache
    const cached = getCachedGoogle(s);
    if (cached) {
      out[s] = cached;
      continue;
    }

    const googleSym = toGoogleSymbol(s);
    if (!googleSym) {
      out[s] = { pe: null, earnings: null };
      setCachedGoogle(s, out[s]);
      continue;
    }

    const url = `https://www.google.com/finance/quote/${encodeURIComponent(
      googleSym
    )}`;
    let pe = null;
    let earnings = null;
    try {
      const html = await fetchPage(url);
      const parsed = tryParsePEAndEarnings(html);
      pe = parsed.pe;
      earnings = parsed.earnings ?? null;
    } catch (err) {
      console.warn("getGoogleData fetch/parse failed for", s, err);
      pe = null;
      earnings = null;
    }

    out[s] = { pe, earnings };
    setCachedGoogle(s, out[s]);
  }
  return out;
}
