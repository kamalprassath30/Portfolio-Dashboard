// src/pages/index.tsx
import React from "react";
import { usePortfolio } from "@/hooks/usePortfolio";

export default function Home() {
  const { data, isLoading, error, refetch, isFetching } = usePortfolio();

  if (isLoading) return <div className="p-6 text-lg">Loading portfolio…</div>;
  if (error)
    return <div className="p-6 text-red-500">Error loading portfolio</div>;
  if (!data) return <div className="p-6">No data</div>;

  const { holdings, totals, lastUpdated } = data;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-gray-500 text-sm">Total Investment</h2>
            <p className="text-2xl font-bold text-blue-600">
              ₹{totals.totalInvestment.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-gray-500 text-sm">Present Value</h2>
            <p className="text-2xl font-bold text-indigo-600">
              ₹{totals.totalPresentValue.toFixed(2)}
            </p>
          </div>
          <div
            className={`bg-white p-4 rounded-lg shadow ${
              totals.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            <h2 className="text-gray-500 text-sm">Total Gain/Loss</h2>
            <p className="text-2xl font-bold">
              ₹{totals.totalGainLoss.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
          <div className="text-sm text-gray-600">
            {isFetching
              ? "Updating…"
              : `Last: ${new Date(lastUpdated).toLocaleTimeString()}`}
          </div>
        </div>
      </div>

      <table className="w-full border-collapse bg-white shadow rounded-lg overflow-hidden">
        <thead className="bg-gray-200">
          <tr>
            <th className="border px-3 py-2 text-left">Company</th>
            <th className="border px-3 py-2 text-right">Qty</th>
            <th className="border px-3 py-2 text-right">CMP ₹</th>
            <th className="border px-3 py-2 text-right">Present Value ₹</th>
            <th className="border px-3 py-2 text-right">Gain/Loss ₹</th>
            <th className="border px-3 py-2 text-right">Gain/Loss %</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h: any, i: number) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="border px-3 py-2">{h.Particulars}</td>
              <td className="border px-3 py-2 text-right">{h.qty}</td>
              <td className="border px-3 py-2 text-right">{h.cmp}</td>
              <td className="border px-3 py-2 text-right">{h.presentValue}</td>
              <td
                className={`border px-3 py-2 text-right ${
                  h.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {h.gainLoss}
              </td>
              <td
                className={`border px-3 py-2 text-right ${
                  h.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {(h.gainLossPct * 100).toFixed(2)} %
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-100 font-semibold">
          <tr>
            <td className="border px-3 py-2 text-right" colSpan={3}>
              Totals
            </td>
            <td className="border px-3 py-2 text-right">
              ₹{totals.totalPresentValue.toFixed(2)}
            </td>
            <td
              className={`border px-3 py-2 text-right ${
                totals.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{totals.totalGainLoss.toFixed(2)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </main>
  );
}
