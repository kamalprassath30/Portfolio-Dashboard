import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Holding = {
  Particulars?: string;
  symbol?: string;
  qty?: number;
  cmp?: number;
  investment?: number;
  presentValue?: number;
  gainLoss?: number;
  pe?: number | null;
  latestEarnings?: number | null;
  sector?: string;
};

type ApiResp = {
  holdings: Holding[];
  totals: {
    totalInvestment: number;
    totalPresentValue: number;
    totalGainLoss: number;
  };
  lastUpdated?: string;
};

export default function PortfolioDashboard() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((json: ApiResp) => setData(json))
      .catch((e) => console.error("fetch error", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const holdings = data?.holdings ?? [];
  const totals = data?.totals ?? {
    totalInvestment: 0,
    totalPresentValue: 0,
    totalGainLoss: 0,
  };

  // Sector data for chart and list
  const sectorData = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of holdings) {
      const sector = h.sector ?? "Unknown";
      const val = Number(h.presentValue ?? 0) || 0;
      map.set(sector, (map.get(sector) ?? 0) + val);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  const COLORS = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#a3e635",
    "#f472b6",
  ];

  if (loading)
    return <div className="p-6 text-gray-600">Loading portfolio...</div>;
  if (!data)
    return <div className="p-6 text-red-500">Failed to load portfolio.</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            📊 Portfolio Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Last updated:{" "}
            {data.lastUpdated
              ? new Date(data.lastUpdated).toLocaleString()
              : "—"}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Row 1 - Summary Cards */}

      {/* Row 2 - Chart and Sector Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 items-stretch">
        <div className="grid grid-cols-1 gap-6 mb-8 h-full">
          <div className="bg-blue-200 shadow p-5 rounded-xl text-center">
            <p className="text-gray-500 text-sm">Total Investment</p>
            <p className="text-2xl font-bold text-blue-600">
              ₹{totals.totalInvestment.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white shadow p-5 rounded-xl text-center">
            <p className="text-gray-500 text-sm">Current Value</p>
            <p className="text-2xl font-bold text-green-600">
              ₹{totals.totalPresentValue.toLocaleString("en-IN")}
            </p>
          </div>
          <div
            className={`${
              totals.totalGainLoss > 0 ? "bg-green-200" : "bg-red-200"
            } shadow p-5 rounded-xl text-center`}
          >
            <p className="text-gray-500 text-sm">Gain / Loss</p>
            <p
              className={`text-2xl font-bold ${
                totals.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{totals.totalGainLoss.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold mb-4 self-start">
            Allocation by Sector
          </h2>
          {sectorData.length === 0 ? (
            <p className="text-sm text-gray-500">No sector data available.</p>
          ) : (
            <div className="w-full h-80">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={sectorData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={120}
                    label={({ name }) => name}
                  >
                    {sectorData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) =>
                      `₹${Number(val).toLocaleString("en-IN")}`
                    }
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Sector Summary */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Sector Summary</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sectorData.map((s, i) => {
              const pct = (
                (s.value / (totals.totalPresentValue || 1)) *
                100
              ).toFixed(2);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-md bg-gray-50 hover:bg-gray-100"
                >
                  <span className="font-medium">{s.name}</span>
                  <div className="text-right">
                    <div className="text-gray-800 font-semibold">
                      ₹{s.value.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-gray-500">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3 - Table */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Holdings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border px-3 py-2">Particulars</th>
                <th className="border px-3 py-2 text-right">Qty</th>
                <th className="border px-3 py-2 text-right">CMP</th>
                <th className="border px-3 py-2 text-right">Present Value</th>
                <th className="border px-3 py-2 text-right">Gain/Loss</th>
                <th className="border px-3 py-2 text-right">P/E</th>
                <th className="border px-3 py-2 text-right">Earnings</th>
                <th className="border px-3 py-2 text-right">Sector</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="border px-3 py-2">{h.Particulars}</td>
                  <td className="border px-3 py-2 text-right">{h.qty}</td>
                  <td className="border px-3 py-2 text-right">
                    {h.cmp ?? "-"}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    ₹{Number(h.presentValue ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td
                    className={`border px-3 py-2 text-right ${
                      (h.gainLoss ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    ₹{Number(h.gainLoss ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {h.pe ?? "N/A"}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {h.latestEarnings ?? "N/A"}
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {h.sector ?? "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
