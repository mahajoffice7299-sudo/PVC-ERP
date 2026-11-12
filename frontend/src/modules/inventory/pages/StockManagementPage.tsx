import React, { useMemo } from 'react';
import { Boxes, Package, PackageSearch } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useInventory } from '../InventoryContext';
import { filterStockRows } from '../filters';
import { stockCategories, stockViewCategory, stockViewLabels, type StockView } from '../types';
import { InventoryFilterBar } from '../components/InventoryFilterBar';
import { InventoryPageHeader } from '../components/InventoryPageHeader';
import { ExportActions } from '../components/ExportActions';
import { DataTable, Metric, Panel, StockTable } from '../components/InventoryUI';

const stockViews: StockView[] = ['raw-material', 'sorted', 'washed', 'flakes', 'preform', 'bottle', 'byproduct'];

export const StockManagementPage: React.FC = () => {
  const { view: viewParam } = useParams<{ view: string }>();
  const view: StockView | 'overview' = stockViews.includes(viewParam as StockView)
    ? (viewParam as StockView)
    : 'overview';

  const { rows, filters } = useInventory();

  const filteredRows = useMemo(() => filterStockRows(rows, filters), [rows, filters]);
  const visibleRows = useMemo(
    () => (view === 'overview' ? filteredRows : filteredRows.filter((row) => row.category === stockViewCategory[view])),
    [filteredRows, view]
  );

  const title = view === 'overview' ? 'Stock Management Overview' : stockViewLabels[view];
  const categoryLabel = view === 'overview' ? 'All material stages' : stockViewCategory[view];

  const totalKg = visibleRows.reduce((sum, row) => sum + row.kg, 0);
  const totalValue = visibleRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0);
  const weightedCost = totalKg > 0 ? totalValue / totalKg : 0;
  const locationCount = new Set(visibleRows.map((row) => row.locationId)).size;

  const allCategoryTotals = useMemo(() => {
    return stockCategories.map((item) => {
      const categoryRows = filteredRows.filter((row) => row.category === item);
      return {
        category: item,
        lines: categoryRows.length,
        kg: categoryRows.reduce((sum, row) => sum + row.kg, 0),
        value: categoryRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0),
      };
    });
  }, [filteredRows]);

  const filteredTotalKg = allCategoryTotals.reduce((sum, entry) => sum + entry.kg, 0);

  const excelSheet = {
    sheetName: view === 'overview' ? 'Stock Overview' : stockViewLabels[view],
    headers: [
      'Category',
      'Material',
      'Color',
      'Quality',
      'Location',
      'Stock Date',
      'Available KG',
      'Unit Cost (PKR)',
      'Estimated Value (PKR)',
    ],
    rows: visibleRows.map((row) => [
      row.category,
      row.material,
      row.color || '—',
      row.quality || '—',
      row.locationName,
      new Date(row.stockDate).toLocaleDateString(),
      row.kg,
      row.unitCost,
      Math.round(row.kg * row.unitCost),
    ]),
  };

  const summarySheet = {
    sheetName: 'Category Summary',
    headers: ['Category', 'Stock Lines', 'Total KG', 'Estimated Value (PKR)'],
    rows: allCategoryTotals.map((entry) => [entry.category, entry.lines, entry.kg, Math.round(entry.value)]),
  };

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        section="Stock Management"
        title={title}
        description="Live stock balance for this material stage, derived from store receipts, sorting, washing, production and sales activity."
        icon={<Package className="h-7 w-7" />}
        action={
          <ExportActions
            sheets={[excelSheet, summarySheet]}
            excelFilename="Stock_Management_Report.xlsx"
            pdf={{
              title,
              subtitle: 'Al Batina Bottlers - PVC Manufacturing ERP',
              summary: `Total lines: ${visibleRows.length}   |   Quantity: ${totalKg.toLocaleString()} KG   |   Estimated value: PKR ${totalValue.toLocaleString()}   |   Locations: ${locationCount}`,
              filename: 'Stock_Management_Report.pdf',
            }}
            disabled={visibleRows.length === 0}
          />
        }
      />

      <InventoryFilterBar />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Stock Lines" value={visibleRows.length.toLocaleString()} hint={`${locationCount} locations`} />
        <Metric label="Available Quantity" value={`${totalKg.toLocaleString()} KG`} hint={categoryLabel} />
        <Metric label="Estimated Value" value={`PKR ${totalValue.toLocaleString()}`} hint="Purchase rate based" />
        <Metric label="Weighted Unit Cost" value={`PKR ${weightedCost.toLocaleString()}`} hint="Per KG" />
      </section>

      <Panel title={`${visibleRows.length} stock lines · ${totalKg.toLocaleString()} KG`} icon={<PackageSearch className="h-5 w-5" />}>
        <StockTable rows={visibleRows} showAge showValue />
      </Panel>

      <Panel title="Category Comparison" icon={<Boxes className="h-5 w-5" />}>
        <DataTable
          headers={['Category', 'Stock Lines', 'Total KG', 'Estimated Value (PKR)', 'Share of Stock']}
          rows={allCategoryTotals.map((entry) => [
            entry.category,
            entry.lines.toLocaleString(),
            entry.kg.toLocaleString(),
            Math.round(entry.value).toLocaleString(),
            `${filteredTotalKg > 0 ? ((entry.kg / filteredTotalKg) * 100).toFixed(1) : '0.0'}%`,
          ])}
        />
      </Panel>
    </div>
  );
};
