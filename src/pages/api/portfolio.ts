// src/pages/api/portfolio.ts
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { getQuotes } from "@/lib/getQuotes";
import { getGoogleData } from "@/lib/getGoogleData";

type RawHolding = { [k: string]: any };

// Map company names to Yahoo Finance symbols
const symbolMap: Record<string, string> = {
  TCS: "TCS.NS",
  "TCS Ltd": "TCS.NS",
  "ICICI Bank": "ICICIBANK.NS",
  "Bajaj Finance": "BAJFINANCE.NS",
  "HDFC Bank": "HDFCBANK.NS",
};
const sectorMap: Record<string, string> = {
  "HDFC Bank": "Banking",
  "ICICI Bank": "Banking",
  "Bajaj Finance": "Financial Services",
  TCS: "IT",
  "TCS Ltd": "IT",
};

// helper: extract symbol from row
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

  const key = name.replace(/\s+/g, "").toUpperCase();
  for (const k of Object.keys(symbolMap)) {
    if (k.replace(/\s+/g, "").toUpperCase() === key) return symbolMap[k];
  }
  return null;
}

// clean malformed JSON text (for safety)
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
    // ---- Step 1: Read local JSON ----
    const filePath = path.join(process.cwd(), "data", "portfolio_sample.json");
    let raw = fs.readFileSync(filePath, "utf-8");

    let parsed: RawHolding[] | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const sanitized = sanitizeJsonText(raw);
      parsed = JSON.parse(sanitized);
    }

    const rawHoldings: RawHolding[] = Array.isArray(parsed) ? parsed : [parsed];

    // ---- Step 2: Extract all symbols ----
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

    // ---- Step 3: Fetch from Yahoo + Google ----
    const quotes = symbols.length > 0 ? await getQuotes(yahooSymbols) : {};
    const googleData = await getGoogleData(yahooSymbols);

    console.log(
      "googleData preview:",
      JSON.stringify(Object.entries(googleData).slice(0, 3), null, 2)
    );

    // ---- Step 4: Combine + calculate ----
    const holdings = rawHoldings.map((h, idx) => {
      const qty = Number(h["Qty"] ?? h.Qty ?? 0) || 0;
      const purchasePrice =
        Number(
          h["Purchase Price"] ?? h["PurchasePrice"] ?? h.purchasePrice ?? 0
        ) || 0;
      const investment =
        Number(h["Investment"] ?? 0) || purchasePrice * qty || 0;

      const symbol = symbolByIndex[idx];
      const yahooSymbol =
        symbol && !symbol.endsWith(".NS") && !symbol.endsWith(".BO")
          ? `${symbol}.NS`
          : symbol;

      const live = yahooSymbol ? (quotes as any)[yahooSymbol] ?? null : null;
      const cmpFromJson = Number(h["CMP"] ?? h.cmp ?? 0) || 0;
      const cmp = live?.price ?? cmpFromJson ?? 0;

      const presentValue = +(qty * cmp).toFixed(2);
      const gainLoss = +(presentValue - investment).toFixed(2);
      const gainLossPct = investment ? +(gainLoss / investment).toFixed(4) : 0;

      const googleForThis = yahooSymbol
        ? googleData[yahooSymbol] ?? null
        : null;

      const googlePe = googleForThis?.pe ?? null;
      const yahooEps = live?.eps ?? null;

      // If Google P/E missing, calculate fallback from Yahoo EPS
      const finalPe =
        googlePe !== null
          ? googlePe
          : yahooEps && yahooEps > 0
          ? +(cmp / yahooEps).toFixed(2)
          : null;

      // Prefer Google earnings; fallback to Yahoo EPS
      const finalEarnings = googleForThis?.earnings ?? yahooEps ?? null;
      const name = (h.Particulars || h["Particulars"] || "").toString().trim();
      return {
        ...h,
        symbol: yahooSymbol,
        qty,
        purchasePrice,
        investment,
        cmp,
        presentValue,
        gainLoss,
        gainLossPct,
        pe: finalPe,
        latestEarnings: finalEarnings,
        sector: h["Sector"] ?? h["Industry"] ?? sectorMap[name] ?? "Unknown",
      };
    });

    // ---- Step 5: Totals ----
    const totals = holdings.reduce(
      (acc, cur) => {
        acc.totalInvestment += Number(cur.investment || 0);
        acc.totalPresentValue += Number(cur.presentValue || 0);
        acc.totalGainLoss += Number(cur.gainLoss || 0);
        return acc;
      },
      { totalInvestment: 0, totalPresentValue: 0, totalGainLoss: 0 }
    );

    // ---- Step 6: Response ----
    res.status(200).json({
      lastUpdated: new Date().toISOString(),
      totals,
      holdings,
    });
  } catch (err) {
    console.error("/api/portfolio error:", err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
}
