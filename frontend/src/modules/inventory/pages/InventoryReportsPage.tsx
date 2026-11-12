import React, { useMemo } from 'react';
import { ChartColumn, Clock, Scale } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useInventory } from '../InventoryContext';
import { ageBuckets, ageInDays, bucketForAge, filterStockRows } from '../filters';
import { inventoryReportsLabels, stockCategories, type InventoryReportsView } from '../types';
import { InventoryFilterBar } from '../components/InventoryFilterBar';
import { InventoryPageHeader } from '../components/InventoryPageHeader';
import { ExportActions } from '../components/ExportActions';
import { DataTable, Metric, Panel, StockTable } from '../components/InventoryUI';

const reportViews: InventoryReportsView[] = ['valuation', 'ageing'];

export const InventoryReportsPage: React.FC = () => {
  const { view: viewParam } = useParams<{ view: string }>();
  const view: InventoryReportsView = reportViews.includes(viewParam as InventoryReportsView)
    ? (viewParam as InventoryReportsView)
    : 'valuation';

  const { rows, filters } = useInventory();
  const filteredRows = useMemo(() => filterStockRows(rows, filters), [rows, filters]);

  const totalKg = filteredRows.reduce((sum, row) => sum + row.kg, 0);
  const totalValue = filteredRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0);

  const categoryTotals = useMemo(
    () =>
      stockCategories.map((category) => {
        const categoryRows = filteredRows.filter((row) => row.category === category);
        const kg = categoryRows.reduce((sum, row) => sum + row.kg, 0);
        const value = categoryRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0);
        return { category, lines: categoryRows.length, kg, value };
      }),
    [filteredRows]
  );

  const locationTotals = useMemo(() => {
    const map = new Map<string, { locationName: string; kg: number; value: number; lines: number }>();
    for (const row of filteredRows) {
      const entry = map.get(row.locationId) ?? { locationName: row.locationName, kg: 0, value: 0, lines: 0 };
      entry.kg += row.kg;
      entry.value += row.kg * row.unitCost;
      entry.lines += 1;
      map.set(row.locationId, entry);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  const ageingTotals = useMemo(
    () =>
      ageBuckets.map((bucket) => {
        const bucketRows = filteredRows.filter((row) => {
          const days = ageInDays(row.stockDate);
          return days >= bucket.minDays && days <= bucket.maxDays;
        });
        return {
          label: bucket.label,
          lines: bucketRows.length,
          kg: bucketRows.reduce((sum, row) => sum + row.kg, 0),
          value: bucketRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0),
        };
      }),
    [filteredRows]
  );

  const ageingRows = useMemo(
    () =>
      filteredRows
        .map((row) => ({ row, days: ageInDays(row.stockDate) }))
        .sort((a, b) => b.days - a.days),
    [filteredRows]
  );

  const stockSheet = {
    sheetName: 'Stock Detail',
    headers: ['Category', 'Material', 'Color', 'Quality', 'Location', 'Stock Date', 'Age (Days)', 'Available KG', 'Unit Cost (PKR)', 'Estimated Value (PKR)'],
    rows: filteredRows.map((row) => [
      row.category,
      row.material,
      row.color || '—',
      row.quality || '—',
      row.locationName,
      new Date(row.stockDate).toLocaleDateString(),
      ageInDays(row.stockDate),
      row.kg,
      row.unitCost,
      Math.round(row.kg * row.unitCost),
    ]),
  };

  const title = inventoryReportsLabels[view];

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        section="Inventory Reports"
        title={title}
        description="Printable and exportable analysis of stock value and stock ageing across every material stage."
        icon={<ChartColumn className="h-7 w-7" />}
        action={
          <ExportActions
            sheets={[
              stockSheet,
              {
                sheetName: 'Category Summary',
                headers: ['Category', 'Lines', 'Total KG', 'Estimated Value (PKR)'],
                rows: categoryTotals.map((entry) => [entry.category, entry.lines, entry.kg, Math.round(entry.value)]),
              },
              {
                sheetName: 'Ageing Summary',
                headers: ['Age Bucket', 'Lines', 'Total KG', 'Estimated Value (PKR)'],
                rows: ageingTotals.map((entry) => [entry.label, entry.lines, entry.kg, Math.round(entry.value)]),
              },
            ]}
            excelFilename="Inventory_Reports.xlsx"
            pdf={{
              title,
              subtitle: 'Al Batina Bottlers - PVC Manufacturing ERP',
              summary: `Stock lines: ${filteredRows.length}   |   Quantity: ${totalKg.toLocaleString()} KG   |   Estimated value: PKR ${totalValue.toLocaleString()}`,
              filename: 'Inventory_Reports.pdf',
            }}
            disabled={filteredRows.length === 0}
          />
        }
      />

      <InventoryFilterBar />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Quantity" value={`${totalKg.toLocaleString()} KG`} />
        <Metric label="Estimated Value" value={`PKR ${totalValue.toLocaleString()}`} />
        <Metric label="Average Unit Cost" value={`PKR ${(totalKg > 0 ? totalValue / totalKg : 0).toLocaleString()}`} />
        <Metric
          label="Oldest Line"
          value={`${ageingRows.length > 0 ? ageingRows[0].days : 0} days`}
          hint={ageingRows.length > 0 ? ageingRows[0].row.material : 'No stock'}
        />
      </section>

      {view === 'valuation' ? (
        <>
          <Panel title="Valuation by Material Category" icon={<Scale className="h-5 w-5" />}>
            <DataTable
              headers={['Category', 'Stock Lines', 'Quantity (KG)', 'Estimated Value (PKR)', 'Share']}
              rows={categoryTotals.map((entry) => [
                entry.category,
                entry.lines.toLocaleString(),
                entry.kg.toLocaleString(),
                Math.round(entry.value).toLocaleString(),
                `${totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : '0.0'}%`,
              ])}
            />
          </Panel>

          <Panel title="Valuation by Location" icon={<Scale className="h-5 w-5" />}>
            <DataTable
              headers={['Location', 'Stock Lines', 'Quantity (KG)', 'Estimated Value (PKR)']}
              rows={locationTotals.map((entry) => [
                entry.locationName,
                entry.lines.toLocaleString(),
                entry.kg.toLocaleString(),
                Math.round(entry.value).toLocaleString(),
              ])}
              emptyMessage="No stock to value for the current filters."
            />
          </Panel>

          <Panel title="Valuation Detail" icon={<Scale className="h-5 w-5" />}>
            <StockTable rows={filteredRows} showValue emptyMessage="No stock lines to value." />
          </Panel>
        </>
      ) : (
        <>
          <Panel title="Ageing Summary" icon={<Clock className="h-5 w-5" />}>
            <DataTable
              headers={['Age Bucket', 'Stock Lines', 'Quantity (KG)', 'Estimated Value (PKR)']}
              rows={ageingTotals.map((entry) => [
                entry.label,
                entry.lines.toLocaleString(),
                entry.kg.toLocaleString(),
                Math.round(entry.value).toLocaleString(),
              ])}
            />
          </Panel>

          <Panel title="Ageing by Stock Line" icon={<Clock className="h-5 w-5" />}>
            <DataTable
              headers={['Material', 'Category', 'Location', 'Stock Date', 'Age (Days)', 'Bucket', 'Quantity (KG)', 'Estimated Value (PKR)']}
              rows={ageingRows.map(({ row, days }) => [
                row.material,
                row.category,
                row.locationName,
                new Date(row.stockDate).toLocaleDateString(),
                days.toLocaleString(),
                bucketForAge(days).label,
                row.kg.toLocaleString(),
                Math.round(row.kg * row.unitCost).toLocaleString(),
              ])}
              emptyMessage="No stock lines to age for the current filters."
            />
          </Panel>
        </>
      )}
    </div>
  );
};
