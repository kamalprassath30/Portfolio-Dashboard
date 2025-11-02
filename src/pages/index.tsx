import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer as Resp } from "recharts";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

type SortState = { key: string; dir: "asc" | "desc" | null };

export default function PortfolioDashboard() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);

  //Table filters
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("All");
  const [sort, setSort] = useState<SortState>({
    key: "presentValue",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setpageSize] = useState(10);
  const [groupBySector, setGroupBySector] = useState(false);
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((json: ApiResp) => {
        setData(json);
        setPage(1);
      })
      .catch((e) => {
        console.error("fetch error", e);
        setData(null);
      })
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

  //sectors for filter dropdown
  const sectors = useMemo(() => {
    const set = new Set<string>();
    holdings.forEach((h) => set.add(h.sector ?? "Unknown"));
    return ["All", ...Array.from(set).sort()];
  }, [holdings]);

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

  //filter + search
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let arr = holdings.slice();
    if (sectorFilter !== "All") {
      arr = arr.filter((h) => (h.sector ?? "Unknow") === sectorFilter);
    }
    if (s) {
      arr = arr.filter((h) =>
        (h.Particulars ?? "").toString().toLowerCase().includes(s)
      );
    }
    return arr;
  }, [holdings, search, sectorFilter]);

  // sorting
  const sorted = useMemo(() => {
    if (!sort.dir || !sort.key) return filtered;
    const arr = filtered.slice();
    arr.sort((a: any, b: any) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      const na =
        va === null || va === undefined
          ? -Infinity
          : typeof va === "string"
          ? va.toLowerCase()
          : Number(va);
      const nb =
        vb === null || vb === undefined
          ? -Infinity
          : typeof vb === "string"
          ? vb.toLowerCase()
          : Number(vb);
      if (na < nb) return sort.dir === "asc" ? -1 : 1;
      if (na > nb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // helpers
  function toggleSort(key: string) {
    setPage(1);
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key, dir: null };
    });
  }

  const COLORS = [
    "#2563EB", // deep blue
    "#16A34A", // emerald green
    "#F59E0B", // amber/golden
    "#DC2626", // muted red
    "#7C3AED", // violet
    "#0891B2", // teal
    "#CA8A04", // mustard
    "#EA580C", // orange
  ];

  if (loading)
    return <div className="p-6 text-gray-600">Loading portfolio...</div>;
  if (!data)
    return <div className="p-6 text-red-500">Failed to load portfolio.</div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e0f3f] via-[#150e2f] to-black p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">
            💹 Portfolio Dashboard
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
      {/* Row 2 - 4 columns: cards | pie | bar | sector summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10 items-stretch">
        {/* Column 1: 3 stacked cards */}
        <div className="flex flex-col gap-5 h-full">
          <div className="bg-blue-100 shadow p-5 rounded-xl text-center flex-1">
            <p className="text-gray-500 text-m">Total Investment</p>
            <p className="text-2xl font-bold text-blue-600">
              ₹{totals.totalInvestment.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="bg-green-100 shadow p-5 rounded-xl text-center flex-1">
            <p className="text-gray-500 text-m">Current Value</p>
            <p className="text-2xl font-bold text-green-600">
              ₹{totals.totalPresentValue.toLocaleString("en-IN")}
            </p>
          </div>

          <div
            className={`shadow p-5 rounded-xl text-center flex-1 ${
              totals.totalGainLoss > 0 ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <p className="text-gray-500 text-m">Gain / Loss</p>
            <p
              className={`text-2xl font-bold ${
                totals.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{totals.totalGainLoss.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Column 2: Pie chart */}
        <div className="bg-slate-100 p-6 rounded-xl shadow flex flex-col">
          <div className="w-full mb-3">
            <h2 className="text-lg font-semibold">Allocation — Pie</h2>
          </div>

          {sectorData.length === 0 ? (
            <p className="text-sm text-gray-500">No sector data available.</p>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
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

        {/* Column 3: Bar chart */}
        <div className="bg-slate-100 p-6 rounded-xl shadow flex flex-col">
          <div className="w-full mb-3">
            <h2 className="text-lg font-semibold">Allocation — Bar</h2>
          </div>

          {sectorData.length === 0 ? (
            <p className="text-sm text-gray-500">No sector data available.</p>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sectorData}
                  margin={{ top: 10, right: 10, left: 22, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                  <YAxis
                    tickFormatter={(v) =>
                      `₹${Number(v).toLocaleString("en-IN")}`
                    }
                  />
                  <Tooltip
                    formatter={(val: any) =>
                      `₹${Number(val).toLocaleString("en-IN")}`
                    }
                  />
                  <Bar dataKey="value">
                    {sectorData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Column 4: Sector Summary */}
        <div className="bg-slate-300 p-6 rounded-xl shadow flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Sector Summary</h2>
          <div
            className="space-y-3 overflow-y-auto"
            style={{ maxHeight: "360px" }}
          >
            {sectorData.map((s, i) => {
              const rows = holdings.filter(
                (h) => (h.sector ?? "Unknown") === s.name
              );
              const sectorInvestment = rows.reduce((acc, cur) => {
                const inv = Number(
                  cur.investment ?? (cur.purchasePrice ?? 0) * (cur.qty ?? 0)
                );
                return acc + (isNaN(inv) ? 0 : inv);
              }, 0);
              const sectorPresentValue = rows.reduce((acc, cur) => {
                const pv = Number(cur.presentValue ?? 0);
                return acc + (isNaN(pv) ? 0 : pv);
              }, 0);
              const sectorGainLoss = sectorPresentValue - sectorInvestment;
              const pct = (
                (sectorPresentValue / (totals.totalPresentValue || 1)) *
                100
              ).toFixed(2);

              return (
                <div
                  key={i}
                  className="p-3 border rounded-md bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-500">
                        {rows.length} holdings
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Investment</div>
                        <div className="font-semibold">
                          ₹{Number(sectorInvestment).toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-500">Present</div>
                        <div className="font-semibold">
                          ₹{Number(sectorPresentValue).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-gray-700">
                      Share: <span className="font-medium">{pct}%</span>
                    </div>

                    <div
                      className={`font-semibold ${
                        sectorGainLoss >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      Gain/Loss: ₹
                      {Number(sectorGainLoss).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3 - Table */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search company..."
            className="px-3 py-2 border rounded w-full md:w-64"
          />
          <select
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-white">Page size</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setpageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 border rounded"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-300 p-6 rounded-xl shadow  border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold mb-4 text-black">Holdings</h2>
          <label className="flex items-center gap-2 text-black">
            <input
              type="checkbox"
              checked={groupBySector}
              onChange={(e) => setGroupBySector(e.target.checked)}
            />
            Group by Sector
          </label>
        </div>
        <div className="bg-white rounded-xl shadow">
          <div className="overflow-x-auto">
            {groupBySector ? (
              <div className="space-y-6">
                {sectorData.map((sector, idx) => {
                  const sectorHoldings = sorted.filter(
                    (h) => (h.sector ?? "Unknown") === sector.name
                  );

                  if (sectorHoldings.length === 0) return null;

                  return (
                    <details
                      key={idx}
                      className="border rounded-lg overflow-hidden bg-white"
                      open
                    >
                      <summary className="cursor-pointer select-none bg-gray-100 px-4 py-2 font-semibold text-gray-800 flex justify-between items-center">
                        <span>{sector.name}</span>
                        <span className="text-gray-600 text-sm">
                          ₹{sector.value.toLocaleString("en-IN")}
                        </span>
                      </summary>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-200 text-left">
                              <th className="border px-3 py-2">Particulars</th>
                              <th className="border px-3 py-2 text-right">
                                Qty
                              </th>
                              <th className="border px-3 py-2 text-right">
                                CMP
                              </th>
                              <th className="border px-3 py-2 text-right">
                                Present Value
                              </th>
                              <th className="border px-3 py-2 text-right">
                                Gain/Loss
                              </th>
                              <th className="border px-3 py-2 text-right">
                                P/E
                              </th>
                              <th className="border px-3 py-2 text-right">
                                Earnings
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectorHoldings.map((h, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 border">
                                  {h.Particulars}
                                </td>
                                <td className="px-3 py-2 border text-right">
                                  {h.qty ?? "-"}
                                </td>
                                <td className="px-3 py-2 border text-right">
                                  {h.cmp ?? "-"}
                                </td>
                                <td className="px-3 py-2 border text-right">
                                  ₹
                                  {Number(h.presentValue ?? 0).toLocaleString(
                                    "en-IN"
                                  )}
                                </td>
                                <td
                                  className={`px-3 py-2 border text-right ${
                                    (h.gainLoss ?? 0) >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  ₹
                                  {Number(h.gainLoss ?? 0).toLocaleString(
                                    "en-IN"
                                  )}
                                </td>
                                <td className="px-3 py-2 border text-right">
                                  {h.pe ?? "N/A"}
                                </td>
                                <td className="px-3 py-2 border text-right">
                                  {h.latestEarnings ?? "N/A"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-200 text-left">
                    <th className="border px-3 py-2">Particulars</th>
                    <th className="border px-3 py-2 text-right">
                      Purchase Price
                    </th>
                    <th className="border px-3 py-2 text-right">Qty</th>
                    <th className="border px-3 py-2 text-right">Investment</th>
                    <th className="border px-3 py-2 text-right">
                      Portfolio (%)
                    </th>
                    <th className="border px-3 py-2 text-right">NSE/BSE</th>
                    <th className="border px-3 py-2 text-right">CMP</th>
                    <th className="border px-3 py-2 text-right">
                      Present Value
                    </th>
                    <th className="border px-3 py-2 text-right">Gain/Loss</th>
                    <th className="border px-3 py-2 text-right">P/E Ratio</th>
                    <th className="border px-3 py-2 text-right">
                      Latest Earnings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border">
                        {h.Particulars ?? h.symbol ?? "-"}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {h.purchasePrice ?? h["Purchase Price"] ?? "-"}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {h.qty ?? "-"}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        ₹
                        {Number(
                          h.investment ?? (h.purchasePrice ?? 0) * (h.qty ?? 0)
                        ).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {typeof h.portfolioPercent === "number"
                          ? `${h.portfolioPercent.toFixed(2)}%`
                          : "0%"}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {h.nseCode ?? h["NSE/BSE"] ?? "-"}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {h.cmp ?? "-"}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        ₹{Number(h.presentValue ?? 0).toLocaleString("en-IN")}
                      </td>
                      <td
                        className={`px-3 py-2 border text-right ${
                          (h.gainLoss ?? 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        ₹{Number(h.gainLoss ?? 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {h.pe !== null && h.pe !== undefined ? h.pe : "N/A"}
                      </td>
                      <td className="px-3 py-2 border text-right">
                        {h.latestEarnings !== null &&
                        h.latestEarnings !== undefined
                          ? h.latestEarnings
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Pagination controls */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-black">
            Showing {Math.min((page - 1) * pageSize + 1, sorted.length)} -{" "}
            {Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 border rounded disabled:opacity-50 bg-white"
            >
              First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 border rounded disabled:opacity-50 bg-white"
            >
              Prev
            </button>
            <div className="px-2 py-1 border rounded bg-white">
              Page {page} / {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 border rounded disabled:opacity-50 bg-white"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 border rounded disabled:opacity-50 bg-white"
            >
              Last
            </button>
          </div>
        </div>
      </div>
      {/* </div> */}
    </main>
  );
}
