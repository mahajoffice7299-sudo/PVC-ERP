import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  ChartColumn,
  ChevronRight,
  ClipboardCheck,
  Layers,
  LayoutDashboard,
  MapPin,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useInventory } from '../InventoryContext';
import { useStores } from '../../stores/StoreContext';
import { ageBuckets, ageInDays, filterAdjustments, filterCounts, filterStockRows, filterTransfers } from '../filters';
import { stockCategories } from '../types';
import { InventoryFilterBar } from '../components/InventoryFilterBar';
import { InventoryPageHeader } from '../components/InventoryPageHeader';
import { ExportActions } from '../components/ExportActions';
import { DataTable, Metric, Panel } from '../components/InventoryUI';

export const InventoryDashboardPage: React.FC = () => {
  const { stores } = useStores();
  const { rows, adjustments, transfers, counts, filters } = useInventory();

  const filteredRows = useMemo(() => filterStockRows(rows, filters), [rows, filters]);
  const visibleAdjustments = useMemo(() => filterAdjustments(adjustments, filters), [adjustments, filters]);
  const visibleTransfers = useMemo(() => filterTransfers(transfers, filters), [transfers, filters]);
  const visibleCounts = useMemo(() => filterCounts(counts, filters), [counts, filters]);

  const totalKg = filteredRows.reduce((sum, row) => sum + row.kg, 0);
  const totalValue = filteredRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0);

  const categoryTotals = useMemo(
    () =>
      stockCategories.map((category) => {
        const categoryRows = filterStockRows(rows, filters).filter((row) => row.category === category);
        return {
          category,
          lines: categoryRows.length,
          kg: categoryRows.reduce((sum, row) => sum + row.kg, 0),
          value: categoryRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0),
        };
      }),
    [rows, filters]
  );

  const locationTotals = useMemo(() => {
    const map = new Map<string, { locationName: string; kg: number; value: number; lines: number }>();
    for (const row of filterStockRows(rows, filters)) {
      const entry = map.get(row.locationId) ?? { locationName: row.locationName, kg: 0, value: 0, lines: 0 };
      entry.kg += row.kg;
      entry.value += row.kg * row.unitCost;
      entry.lines += 1;
      map.set(row.locationId, entry);
    }
    return [...map.values()].sort((a, b) => b.kg - a.kg);
  }, [rows, filters]);

  const ageingTotals = useMemo(
    () =>
      ageBuckets.map((bucket) => {
        const bucketRows = filterStockRows(rows, filters).filter((row) => {
          const days = ageInDays(row.stockDate);
          return days >= bucket.minDays && days <= bucket.maxDays;
        });
        return {
          label: bucket.label,
          kg: bucketRows.reduce((sum, row) => sum + row.kg, 0),
          value: bucketRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0),
        };
      }),
    [rows, filters]
  );

  const summarySheet = {
    sheetName: 'Inventory Summary',
    headers: ['Category', 'Stock Lines', 'Quantity (KG)', 'Estimated Value (PKR)'],
    rows: categoryTotals.map((entry) => [entry.category, entry.lines, entry.kg, Math.round(entry.value)]),
  };

  const locationSheet = {
    sheetName: 'Location Summary',
    headers: ['Location', 'Stock Lines', 'Quantity (KG)', 'Estimated Value (PKR)'],
    rows: locationTotals.map((entry) => [entry.locationName, entry.lines, entry.kg, Math.round(entry.value)]),
  };

  const ageingSheet = {
    sheetName: 'Ageing Summary',
    headers: ['Age Bucket', 'Quantity (KG)', 'Estimated Value (PKR)'],
    rows: ageingTotals.map((entry) => [entry.label, entry.kg, Math.round(entry.value)]),
  };

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        section="Dashboard"
        title="Inventory Dashboard"
        description="A consolidated view of stock holdings, material-stage mix, location balances and movement activity."
        icon={<LayoutDashboard className="h-7 w-7" />}
        action={
          <ExportActions
            sheets={[summarySheet, locationSheet, ageingSheet]}
            excelFilename="Inventory_Dashboard.xlsx"
            pdf={{
              title: 'Inventory Dashboard',
              subtitle: 'Al Batina Bottlers - PVC Manufacturing ERP',
              summary: `Stock lines: ${filteredRows.length}   |   Quantity: ${totalKg.toLocaleString()} KG   |   Estimated value: PKR ${totalValue.toLocaleString()}   |   Locations: ${locationTotals.length}`,
              filename: 'Inventory_Dashboard.pdf',
            }}
          />
        }
      />

      <InventoryFilterBar />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tracked Stock" value={`${totalKg.toLocaleString()} KG`} hint={`${filteredRows.length} active stock lines`} />
        <Metric label="Inventory Valuation" value={`PKR ${totalValue.toLocaleString()}`} hint="Purchase rate based" />
        <Metric label="Locations" value={locationTotals.length.toLocaleString()} hint={`${stores.length} registered stores`} />
        <Metric
          label="Movement Records"
          value={(visibleTransfers.length + visibleAdjustments.length + visibleCounts.length).toLocaleString()}
          hint={`${visibleTransfers.length} transfers · ${visibleAdjustments.length} adjustments · ${visibleCounts.length} counts`}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {categoryTotals.map((entry) => (
          <Metric key={entry.category} label={entry.category} value={`${entry.kg.toLocaleString()} KG`} hint={`PKR ${Math.round(entry.value).toLocaleString()}`} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Stock by Material Stage" icon={<Boxes className="h-5 w-5" />}>
          <DataTable
            headers={['Category', 'Lines', 'Quantity (KG)', 'Value (PKR)']}
            rows={categoryTotals.map((entry) => [
              entry.category,
              entry.lines.toLocaleString(),
              entry.kg.toLocaleString(),
              Math.round(entry.value).toLocaleString(),
            ])}
          />
        </Panel>

        <Panel title="Stock by Location" icon={<MapPin className="h-5 w-5" />}>
          <DataTable
            headers={['Location', 'Lines', 'Quantity (KG)', 'Value (PKR)']}
            rows={locationTotals.map((entry) => [
              entry.locationName,
              entry.lines.toLocaleString(),
              entry.kg.toLocaleString(),
              Math.round(entry.value).toLocaleString(),
            ])}
            emptyMessage="No stock available for the current filters."
          />
        </Panel>

        <Panel title="Stock Ageing Snapshot" icon={<TrendingDown className="h-5 w-5" />}>
          <DataTable
            headers={['Age Bucket', 'Quantity (KG)', 'Value (PKR)']}
            rows={ageingTotals.map((entry) => [
              entry.label,
              entry.kg.toLocaleString(),
              Math.round(entry.value).toLocaleString(),
            ])}
          />
        </Panel>

        <Panel title="Recent Movement Activity" icon={<TrendingUp className="h-5 w-5" />}>
          <DataTable
            headers={['Type', 'Material', 'Location', 'KG', 'Date']}
            rows={[
              ...visibleTransfers.slice(0, 5).map((record) => [
                'Transfer',
                record.material,
                record.toLocationId ? '→ destination' : '',
                record.quantityKg.toLocaleString(),
                new Date(record.createdAt).toLocaleDateString(),
              ]),
              ...visibleAdjustments.slice(0, 5).map((record) => [
                'Adjustment',
                record.material,
                record.locationId ? 'Adjusted' : '',
                `${record.deltaKg > 0 ? '+' : ''}${record.deltaKg.toLocaleString()}`,
                new Date(record.createdAt).toLocaleDateString(),
              ]),
            ]}
            emptyMessage="No stock movements recorded for the current filters."
          />
        </Panel>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            to: '/inventory/stock-management/raw-material',
            icon: <Layers className="h-4 w-4" />,
            title: 'Stock Management',
            description: 'Raw material through by-product balances by material stage.',
            tone: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600',
          },
          {
            to: '/inventory/stock-operations/transfers',
            icon: <ClipboardCheck className="h-4 w-4" />,
            title: 'Stock Operations',
            description: 'Transfers, adjustments and physical stock counts.',
            tone: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600',
          },
          {
            to: '/inventory/reports/valuation',
            icon: <ChartColumn className="h-4 w-4" />,
            title: 'Inventory Reports',
            description: 'Valuation and ageing analysis with Excel, PDF and print output.',
            tone: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600',
          },
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-sky-500 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.tone} text-white transition`}>
                {card.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 transition group-hover:text-sky-600">{card.title}</h4>
                <p className="text-xs text-slate-500">{card.description}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-sky-600" />
          </Link>
        ))}
      </section>

      <p className="text-xs text-slate-500 print:hidden">
        Stock balances are derived from store receipts, processing, sales, transfers and recorded adjustments. Values use purchase rate as unit cost.
      </p>
    </div>
  );
};
