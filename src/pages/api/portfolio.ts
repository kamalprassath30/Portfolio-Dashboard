// src/pages/api/portfolio.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { getQuotes } from "@/lib/getQuotes";

type RawHolding = { [k: string]: any };

const symbolMap: Record<string, string> = {
  // edit this map to match company names in your JSON to Yahoo symbols
  // Example:
  TCS: "TCS.NS",
  "TCS Ltd": "TCS.NS",
  "ICICI Bank": "ICICIBANK.NS",
  "Bajaj Finance": "BAJFINANCE.NS",
  "HDFC Bank": "HDFCBANK.NS",
};

// helper to extract symbol from the row (first try explicit fields, then map by name)
function extractSymbol(h: RawHolding): string | null {
  const s =
    (h.Symbol ??
      h.Ticker ??
      h["NSE/BSE"] ??
      h["NSE/BSE "] ??
      h["NSE"] ??
      null) ||
    null;
  if (s && typeof s === "string" && s.trim()) return s.trim();
  const name = (h.Particulars || h["Particulars"] || "").toString().trim();
  if (name && symbolMap[name]) return symbolMap[name];
  // try a simple normalization (uppercase, strip dots/spaces) - not reliable
  const key = name.replace(/\s+/g, "").toUpperCase();
  for (const k of Object.keys(symbolMap)) {
    if (k.replace(/\s+/g, "").toUpperCase() === key) return symbolMap[k];
  }
  return null;
}

function sanitizeJsonText(raw: string) {
  let s = raw;
  s = s.replace(/^\uFEFF/, "");
  s = s.replace(/[\u0000-\u0019]/g, (c) =>
    c === "\n" || c === "\t" || c === "\r" ? c : ""
  );
  s = s.replace(/\bNaN\b/g, "null");
  s = s.replace(/,(\s*[}\]])/g, "$1");
  s = s.replace(/(^|\n)\s*\/\/.*(?=\n|$)/g, "");
  s = s.replace(/(^|\n)\s*#.*(?=\n|$)/g, "");
  s = s.trim();
  return s;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const filePath = path.join(process.cwd(), "data", "portfolio_sample.json");
    let raw = fs.readFileSync(filePath, "utf-8");
    // parse safely
    let parsed: RawHolding[] | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const sanitized = sanitizeJsonText(raw);
      try {
        parsed = JSON.parse(sanitized);
      } catch (e) {
        console.error("Failed to parse portfolio JSON after sanitization:", e);
        res
          .status(500)
          .json({ error: "Invalid portfolio JSON. See server logs." });
        return;
      }
    }

    const rawHoldings: RawHolding[] = Array.isArray(parsed) ? parsed : [parsed];

    // collect symbols
    const symbolSet = new Set<string>();
    const symbolByIndex: (string | null)[] = [];
    for (const h of rawHoldings) {
      const sym = extractSymbol(h);
      symbolByIndex.push(sym);
      if (sym) symbolSet.add(sym);
    }
    const symbols = Array.from(symbolSet);
    const yahooSymbols = symbols.map((s) =>
      s.endsWith(".NS") || s.endsWith(".BO") ? s : `${s}.NS`
    );
    // fetch quotes (cached inside getQuotes)
    let quotes: Record<string, number | null> = {};
    if (symbols.length > 0) {
      quotes = await getQuotes(yahooSymbols);
    }

    // normalize & calculate using live quotes when available
    const holdings = rawHoldings.map((h: any, idx: number) => {
      const qty = Number(h["Qty"] ?? h.Qty ?? 0) || 0;
      const purchasePrice =
        Number(
          h["Purchase Price"] ?? h["PurchasePrice"] ?? h.purchasePrice ?? 0
        ) || 0;
      const investment =
        Number(h["Investment"] ?? 0) || purchasePrice * qty || 0;

      const symbol = symbolByIndex[idx];
      // prefer live quote if available, else fallback to CMP in JSON, else 0
      const cmpFromJson = Number(h["CMP"] ?? h.cmp ?? 0) || 0;
      const live = symbol ? quotes[symbol] ?? null : null;
      const cmp = typeof live === "number" ? live : cmpFromJson;

      const presentValue = +(qty * cmp).toFixed(2);
      const gainLoss = +(presentValue - investment).toFixed(2);
      const gainLossPct = investment ? +(gainLoss / investment).toFixed(4) : 0;

      return {
        ...h,
        symbol: symbol ?? null,
        qty,
        purchasePrice,
        investment,
        cmp,
        presentValue,
        gainLoss,
        gainLossPct,
        sector: h["Sector"] ?? h.Sector ?? "Unknown",
      };
    });

    const totals = holdings.reduce(
      (acc: any, cur: any) => {
        acc.totalInvestment += Number(cur.investment || 0);
        acc.totalPresentValue += Number(cur.presentValue || 0);
        acc.totalGainLoss += Number(cur.gainLoss || 0);
        return acc;
      },
      { totalInvestment: 0, totalPresentValue: 0, totalGainLoss: 0 }
    );

    res
      .status(200)
      .json({ lastUpdated: new Date().toISOString(), totals, holdings });
  } catch (err) {
    console.error("/api/portfolio unexpected error:", err);
    res
      .status(500)
      .json({ error: "Unexpected server error", details: String(err) });
  }
}
