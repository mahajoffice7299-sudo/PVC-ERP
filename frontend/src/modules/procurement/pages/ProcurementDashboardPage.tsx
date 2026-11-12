import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProcurement } from '../ProcurementContext';
import {
  TrendingUp,
  Users,
  Building2,
  ShoppingCart,
  ChevronRight,
  Scale,
  Calendar,
  BarChart3,
  CalendarDays,
  Truck,
} from 'lucide-react';

export const ProcurementDashboardPage: React.FC = () => {
  const { purchases, suppliers, buyers } = useProcurement();

  // Graph display toggle: 'daily' | 'monthly'
  const [graphView, setGraphView] = useState<'daily' | 'monthly'>('daily');
  // Metric toggle: 'amount' | 'weight'
  const [metricView, setMetricView] = useState<'amount' | 'weight'>('amount');

  // Active hover tooltip data
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    amount: number;
    weight: number;
    count: number;
  } | null>(null);

  // 1. Calculate Overall Totals
  const totalSpend = useMemo(
    () => purchases.reduce((sum, po) => sum + po.totalAmount, 0),
    [purchases]
  );
  const totalWeight = useMemo(
    () => purchases.reduce((sum, po) => sum + po.netWeightKg, 0),
    [purchases]
  );
  const totalPayable = useMemo(
    () => purchases.reduce((sum, po) => sum + po.payableAmount, 0),
    [purchases]
  );

  // Today's date string
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Today's purchases
  const todayPurchases = useMemo(
    () => purchases.filter((p) => p.purchaseDate === todayStr),
    [purchases, todayStr]
  );
  const todaySpend = useMemo(
    () => todayPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
    [todayPurchases]
  );
  const todayWeight = useMemo(
    () => todayPurchases.reduce((sum, p) => sum + p.netWeightKg, 0),
    [todayPurchases]
  );

  // Current Month's purchases
  const monthPurchases = useMemo(
    () => purchases.filter((p) => p.purchaseDate.startsWith(currentMonthStr)),
    [purchases, currentMonthStr]
  );
  const monthSpend = useMemo(
    () => monthPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
    [monthPurchases]
  );
  const monthWeight = useMemo(
    () => monthPurchases.reduce((sum, p) => sum + p.netWeightKg, 0),
    [monthPurchases]
  );

  // 2. DAILY AGGREGATION (Group by Date)
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; amount: number; weight: number; count: number }>();

    // Generate past 10 days array so the chart has a continuous timeline
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map.set(key, { date: key, amount: 0, weight: 0, count: 0 });
    }

    // Populate with actual purchase records
    purchases.forEach((p) => {
      const existing = map.get(p.purchaseDate);
      if (existing) {
        existing.amount += p.totalAmount;
        existing.weight += p.netWeightKg;
        existing.count += 1;
      } else {
        map.set(p.purchaseDate, {
          date: p.purchaseDate,
          amount: p.totalAmount,
          weight: p.netWeightKg,
          count: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [purchases]);

  // 3. MONTHLY AGGREGATION (Group by YYYY-MM)
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; amount: number; weight: number; count: number }>();

    // Prepopulate last 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      map.set(key, { month: label, amount: 0, weight: 0, count: 0 });
    }

    purchases.forEach((p) => {
      const key = p.purchaseDate.slice(0, 7);
      const existing = map.get(key);
      if (existing) {
        existing.amount += p.totalAmount;
        existing.weight += p.netWeightKg;
        existing.count += 1;
      } else {
        const parts = key.split('-');
        const mIdx = parseInt(parts[1], 10) - 1;
        const label = `${monthNames[mIdx] || key} ${parts[0]}`;
        map.set(key, {
          month: label,
          amount: p.totalAmount,
          weight: p.netWeightKg,
          count: 1,
        });
      }
    });

    return Array.from(map.values());
  }, [purchases]);

  // Active chart dataset
  const activeDataset = graphView === 'daily' ? dailyData : monthlyData;

  // Max value for scaling
  const maxVal = useMemo(() => {
    const values = activeDataset.map((d) => (metricView === 'amount' ? d.amount : d.weight));
    const highest = Math.max(...values, 0);
    return highest > 0 ? highest : 1000;
  }, [activeDataset, metricView]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Procurement</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-sky-600 font-semibold">Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Procurement Analytics & Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time daily & monthly weighbridge intake, purchase spend (PKR), and volume trends.
          </p>
        </div>

        <Link
          to="/procurement/purchases"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-sky-600/30 transition cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Go to Purchase Details</span>
        </Link>
      </div>

      {/* Top 4 Real-time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Purchases */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Purchases</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            Rs. {todaySpend.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-sky-600 font-medium mt-1">
            <Scale className="w-3.5 h-3.5" />
            <span>{todayWeight.toLocaleString()} KG ({todayPurchases.length} Trucks)</span>
          </div>
        </div>

        {/* Monthly Purchases */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month's Spend</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            Rs. {monthSpend.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
            <Scale className="w-3.5 h-3.5" />
            <span>{(monthWeight / 1000).toFixed(2)} Tons ({monthPurchases.length} Orders)</span>
          </div>
        </div>

        {/* Total Cumulative Volume */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cumulative Spend</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            Rs. {totalSpend.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mt-1">
            <span>Vol: {(totalWeight / 1000).toFixed(1)} Tons</span>
            <span className="text-rose-600 font-bold">Payable: Rs. {totalPayable.toLocaleString()}</span>
          </div>
        </div>

        {/* Network: Suppliers & Buyers */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Procurement Network</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {suppliers.length} <span className="text-sm font-normal text-slate-500">Suppliers</span>
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
            <span>{buyers.length} Buyers</span>
            <span>•</span>
            <span>{purchases.length} Total Deliveries</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DAILY & MONTHLY PURCHASE GRAPH SECTION                   */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">
                {graphView === 'daily' ? 'Daily Purchase Analysis' : 'Monthly Purchase Analysis'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {graphView === 'daily'
                ? 'Day-by-day intake volume and financial commitments'
                : 'Month-over-month trend and procurement volume growth'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Metric Switch: Amount vs Weight */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMetricView('amount')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  metricView === 'amount'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Amount (PKR)
              </button>
              <button
                type="button"
                onClick={() => setMetricView('weight')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  metricView === 'weight'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Net Weight (KG)
              </button>
            </div>

            {/* View Switch: Daily vs Monthly */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGraphView('daily')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                  graphView === 'daily'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily Graph
              </button>
              <button
                type="button"
                onClick={() => setGraphView('monthly')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                  graphView === 'monthly'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Graph
              </button>
            </div>
          </div>
        </div>

        {/* Hover Tooltip Banner */}
        <div className="h-10 px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
          {hoveredPoint ? (
            <div className="flex items-center gap-4 animate-in fade-in duration-150">
              <span className="font-bold text-slate-800">{hoveredPoint.label}</span>
              <span className="text-slate-300">|</span>
              <span>
                Amount: <strong className="text-slate-900">Rs. {hoveredPoint.amount.toLocaleString()}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Net Weight: <strong className="text-sky-700">{hoveredPoint.weight.toLocaleString()} KG</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Deliveries: <strong className="text-indigo-600">{hoveredPoint.count} Trucks</strong>
              </span>
            </div>
          ) : (
            <span className="text-slate-400 italic">
              Hover over any bar in the graph to inspect detailed purchase figures for that day/month.
            </span>
          )}
        </div>

        {/* Responsive Interactive Bar Graph */}
        <div className="relative pt-6 pb-2">
          {/* Background Grid Lines */}
          <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-dashed border-slate-400 w-full" />
            <div className="border-b border-dashed border-slate-400 w-full" />
            <div className="border-b border-dashed border-slate-400 w-full" />
            <div className="border-b border-slate-300 w-full" />
          </div>

          {/* Bar Chart Container */}
          <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 relative z-1">
            {activeDataset.map((item, idx) => {
              const val = metricView === 'amount' ? item.amount : item.weight;
              const heightPct = maxVal > 0 ? Math.max((val / maxVal) * 100, 3) : 3;
              const label = 'date' in item ? item.date.slice(5) : item.month;
              const fullLabel = 'date' in item ? `Date: ${item.date}` : `Month: ${item.month}`;

              const isHighlighted = val > 0;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      label: fullLabel,
                      amount: item.amount,
                      weight: item.weight,
                      count: item.count,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Top Bar Label */}
                  {val > 0 && (
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition mb-1 whitespace-nowrap">
                      {metricView === 'amount'
                        ? `Rs. ${(val / 1000).toFixed(0)}k`
                        : `${(val / 1000).toFixed(1)}T`}
                    </span>
                  )}

                  {/* Bar Element */}
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isHighlighted
                          ? metricView === 'amount'
                            ? 'bg-gradient-to-t from-sky-600 to-sky-400 group-hover:from-sky-500 group-hover:to-sky-300 shadow-sm'
                            : 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300 shadow-sm'
                          : 'bg-slate-200'
                      }`}
                    />
                  </div>

                  {/* X-axis Label */}
                  <span className="text-[10px] font-medium text-slate-500 mt-2 truncate max-w-full text-center">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DAILY & MONTHLY DETAILS BREAKDOWN TABLES                 */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Purchase Details Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-sm">Recent Daily Purchase Records</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Last 10 Days</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px]">
                  <th className="py-2">Date</th>
                  <th className="py-2 text-center">Trucks</th>
                  <th className="py-2 text-right">Net Weight</th>
                  <th className="py-2 text-right">Daily Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyData
                  .filter((d) => d.count > 0)
                  .reverse()
                  .slice(0, 5)
                  .map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-800">{d.date}</td>
                      <td className="py-2.5 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold">
                          {d.count}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-600">
                        {d.weight.toLocaleString()} KG
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 font-mono">
                        Rs. {d.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                {dailyData.filter((d) => d.count > 0).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No daily purchase records available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Purchase Details Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Monthly Purchase Performance</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Last 6 Months</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px]">
                  <th className="py-2">Month</th>
                  <th className="py-2 text-center">Orders</th>
                  <th className="py-2 text-right">Volume</th>
                  <th className="py-2 text-right">Monthly Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData
                  .filter((m) => m.count > 0)
                  .reverse()
                  .map((m) => (
                    <tr key={m.month} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-800">{m.month}</td>
                      <td className="py-2.5 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                          {m.count}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-600">
                        {(m.weight / 1000).toFixed(2)} Tons
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 font-mono">
                        Rs. {m.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                {monthlyData.filter((m) => m.count > 0).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No monthly purchase records available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Access to Submodules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <Link
          to="/procurement/purchases"
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-sky-500 hover:shadow-md transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-sky-600 transition">
                Purchase Details
              </h4>
              <p className="text-xs text-slate-400">Weighbridge & truck entries</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition" />
        </Link>

        <Link
          to="/procurement/suppliers"
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-sky-500 hover:shadow-md transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                Supplier Directory
              </h4>
              <p className="text-xs text-slate-400">{suppliers.length} Registered vendors</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
        </Link>

        <Link
          to="/procurement/buyers"
          className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-sky-500 hover:shadow-md transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition">
                Buyer Officers
              </h4>
              <p className="text-xs text-slate-400">{buyers.length} Internal buyers</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" />
        </Link>
      </div>
    </div>
  );
};
