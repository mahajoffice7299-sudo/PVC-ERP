import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ClipboardCheck,
  Package,
  Plus,
  SlidersHorizontal,
  Warehouse,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useInventory } from '../InventoryContext';
import { useStores } from '../../stores/StoreContext';
import { filterAdjustments, filterCounts, filterStockRows, filterTransfers } from '../filters';
import { stockOperationsLabels, type StockOperationsView } from '../types';
import { InventoryFilterBar } from '../components/InventoryFilterBar';
import { InventoryPageHeader } from '../components/InventoryPageHeader';
import { ExportActions } from '../components/ExportActions';
import { DataTable, Field, Metric, Panel, StockTable, buttonClass, inputClass } from '../components/InventoryUI';

const operationViews: StockOperationsView[] = ['locations', 'transfers', 'adjustments', 'counts'];

const numberInput = (value: string) => (value === '' ? 0 : Number(value));

export const StockOperationsPage: React.FC = () => {
  const { view: viewParam } = useParams<{ view: string }>();
  const view: StockOperationsView = operationViews.includes(viewParam as StockOperationsView)
    ? (viewParam as StockOperationsView)
    : 'locations';

  const { stores } = useStores();
  const { rows, adjustments, transfers, counts, filters, addAdjustment, addTransfer, addCount, locationName } =
    useInventory();

  const [transferStockId, setTransferStockId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferKg, setTransferKg] = useState('');
  const [adjustStockId, setAdjustStockId] = useState('');
  const [adjustKg, setAdjustKg] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [countStockId, setCountStockId] = useState('');
  const [countedKg, setCountedKg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const filteredRows = useMemo(() => filterStockRows(rows, filters), [rows, filters]);
  const visibleAdjustments = useMemo(() => filterAdjustments(adjustments, filters), [adjustments, filters]);
  const visibleTransfers = useMemo(() => filterTransfers(transfers, filters), [transfers, filters]);
  const visibleCounts = useMemo(() => filterCounts(counts, filters), [counts, filters]);

  const selectedStock =
    filteredRows.find((row) => row.id === (view === 'transfers' ? transferStockId : view === 'adjustments' ? adjustStockId : countStockId)) ??
    rows.find((row) => row.id === (view === 'transfers' ? transferStockId : view === 'adjustments' ? adjustStockId : countStockId));

  const totalKg = filteredRows.reduce((sum, row) => sum + row.kg, 0);
  const totalValue = filteredRows.reduce((sum, row) => sum + row.kg * row.unitCost, 0);

  const addManualStockAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const deltaKg = numberInput(adjustKg);
    if (!selectedStock || deltaKg === 0 || !adjustReason.trim()) {
      setError('Select stock, enter a non-zero adjustment, and provide a reason.');
      return;
    }
    if (selectedStock.kg + deltaKg < 0) {
      setError('Adjustment cannot reduce stock below zero.');
      return;
    }
    await addAdjustment({
      stockId: selectedStock.id,
      category: selectedStock.category,
      material: selectedStock.material,
      color: selectedStock.color,
      quality: selectedStock.quality,
      locationId: selectedStock.locationId,
      deltaKg,
      reason: adjustReason.trim(),
    });
    setAdjustKg('');
    setAdjustReason('');
    setSuccess('Stock adjustment recorded.');
  };

  const addStockTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const quantityKg = numberInput(transferKg);
    if (
      !selectedStock ||
      !transferToId ||
      transferToId === selectedStock.locationId ||
      quantityKg <= 0 ||
      quantityKg > selectedStock.kg
    ) {
      setError('Choose a different destination and enter a transfer quantity within available stock.');
      return;
    }
    await addTransfer({
      stockId: selectedStock.id,
      material: selectedStock.material,
      category: selectedStock.category,
      fromLocationId: selectedStock.locationId,
      toLocationId: transferToId,
      quantityKg,
    });
    setTransferKg('');
    setSuccess('Stock transfer recorded.');
  };

  const addPhysicalCount = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const counted = numberInput(countedKg);
    if (!selectedStock || counted < 0) {
      setError('Select an inventory item and enter a valid counted quantity.');
      return;
    }
    const varianceKg = counted - selectedStock.kg;
    await addCount({
      stockId: selectedStock.id,
      material: selectedStock.material,
      category: selectedStock.category,
      locationId: selectedStock.locationId,
      expectedKg: selectedStock.kg,
      countedKg: counted,
      varianceKg,
    });
    setCountedKg('');
    setSuccess(
      varianceKg === 0
        ? 'Physical count matched book stock.'
        : `Count recorded; stock reconciled by ${varianceKg.toLocaleString()} KG.`
    );
  };

  const stockSheet = {
    sheetName: 'Location Stock',
    headers: ['Location', 'Category', 'Material', 'Color', 'Quality', 'Stock Date', 'Available KG', 'Unit Cost (PKR)'],
    rows: filteredRows.map((row) => [
      row.locationName,
      row.category,
      row.material,
      row.color || '—',
      row.quality || '—',
      new Date(row.stockDate).toLocaleDateString(),
      row.kg,
      row.unitCost,
    ]),
  };

  const movementSheet =
    view === 'transfers'
      ? {
          sheetName: 'Stock Transfers',
          headers: ['Date', 'Material', 'Category', 'From', 'To', 'Quantity KG'],
          rows: visibleTransfers.map((record) => [
            new Date(record.createdAt).toLocaleString(),
            record.material,
            record.category,
            locationName(record.fromLocationId),
            locationName(record.toLocationId),
            record.quantityKg,
          ]),
        }
      : view === 'adjustments'
        ? {
            sheetName: 'Stock Adjustments',
            headers: ['Date', 'Material', 'Location', 'Change KG', 'Reason'],
            rows: visibleAdjustments.map((record) => [
              new Date(record.createdAt).toLocaleString(),
              record.material,
              locationName(record.locationId),
              record.deltaKg,
              record.reason,
            ]),
          }
        : {
            sheetName: 'Physical Counts',
            headers: ['Date', 'Material', 'Location', 'Book KG', 'Counted KG', 'Variance KG'],
            rows: visibleCounts.map((record) => [
              new Date(record.createdAt).toLocaleString(),
              record.material,
              locationName(record.locationId),
              record.expectedKg,
              record.countedKg,
              record.varianceKg,
            ]),
          };

  const title = stockOperationsLabels[view];

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        section="Stock Operations"
        title={title}
        description="Move stock between locations, record manual adjustments, and reconcile physical counts against book balances."
        icon={<Warehouse className="h-7 w-7" />}
        action={
          <ExportActions
            sheets={[movementSheet, stockSheet]}
            excelFilename="Stock_Operations_Report.xlsx"
            pdf={{
              title,
              subtitle: 'Al Batina Bottlers - PVC Manufacturing ERP',
              summary: `Stock lines: ${filteredRows.length}   |   Quantity: ${totalKg.toLocaleString()} KG   |   Value: PKR ${totalValue.toLocaleString()}   |   Transfers: ${visibleTransfers.length}   |   Adjustments: ${visibleAdjustments.length}   |   Counts: ${visibleCounts.length}`,
              filename: 'Stock_Operations_Report.pdf',
            }}
          />
        }
      />

      <InventoryFilterBar />

      {(error || success) && (
        <div
          role={error ? 'alert' : 'status'}
          className={`rounded-xl border p-3 text-sm font-semibold ${
            error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          {error || success}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Stock Lines" value={filteredRows.length.toLocaleString()} hint="Filtered by current filters" />
        <Metric label="Available Quantity" value={`${totalKg.toLocaleString()} KG`} />
        <Metric label="Estimated Value" value={`PKR ${totalValue.toLocaleString()}`} />
        <Metric
          label="Movements"
          value={(visibleTransfers.length + visibleAdjustments.length + visibleCounts.length).toLocaleString()}
          hint={`${visibleTransfers.length} transfers · ${visibleAdjustments.length} adjustments`}
        />
      </section>

      {view === 'locations' && (
        <>
          {stores.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Add store locations to begin location-wise inventory tracking.
            </p>
          ) : (
            stores.map((store) => {
              const locationRows = filteredRows.filter((row) => row.locationId === store.id);
              const locationKg = locationRows.reduce((sum, row) => sum + row.kg, 0);
              return (
                <Panel
                  key={store.id}
                  title={`${store.name} · ${locationKg.toLocaleString()} KG`}
                  icon={<Warehouse className="h-5 w-5" />}
                >
                  <p className="mb-3 text-xs text-slate-500">
                    {store.locationNumber} · {store.address}
                  </p>
                  <StockTable rows={locationRows} showValue emptyMessage="No stock at this location." />
                </Panel>
              );
            })
          )}
        </>
      )}

      {view === 'transfers' && (
        <Panel title="Transfer Stock Between Locations" icon={<ArrowLeftRight className="h-5 w-5" />}>
          <form onSubmit={addStockTransfer} className="grid gap-3 md:grid-cols-4">
            <Field label="Stock item">
              <select required value={transferStockId} onChange={(event) => setTransferStockId(event.target.value)} className={inputClass}>
                <option value="">Select stock</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.material} · {row.locationName} · {row.kg.toLocaleString()} KG
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Destination location">
              <select required value={transferToId} onChange={(event) => setTransferToId(event.target.value)} className={inputClass}>
                <option value="">Select destination</option>
                {stores
                  .filter((store) => store.id !== selectedStock?.locationId)
                  .map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={`Quantity (KG), available ${selectedStock?.kg.toLocaleString() || 0}`}>
              <input
                required
                type="number"
                min="0.001"
                step="any"
                max={selectedStock?.kg}
                value={transferKg}
                onChange={(event) => setTransferKg(event.target.value)}
                className={inputClass}
              />
            </Field>
            <button className={`${buttonClass} self-end`}>
              <ArrowLeftRight className="h-4 w-4" />
              Record Transfer
            </button>
          </form>
          <DataTable
            headers={['Date', 'Material', 'Category', 'From', 'To', 'KG']}
            rows={visibleTransfers.map((record) => [
              new Date(record.createdAt).toLocaleString(),
              record.material,
              record.category,
              locationName(record.fromLocationId),
              locationName(record.toLocationId),
              `${record.quantityKg.toLocaleString()} KG`,
            ])}
            emptyMessage="No transfers recorded for the current filters."
          />
        </Panel>
      )}

      {view === 'adjustments' && (
        <Panel title="Record Stock Adjustment" icon={<SlidersHorizontal className="h-5 w-5" />}>
          <form onSubmit={addManualStockAdjustment} className="grid gap-3 md:grid-cols-4">
            <Field label="Stock item">
              <select required value={adjustStockId} onChange={(event) => setAdjustStockId(event.target.value)} className={inputClass}>
                <option value="">Select stock</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.material} · {row.locationName} · {row.kg.toLocaleString()} KG
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Adjustment KG (+/-)">
              <input required type="number" step="any" value={adjustKg} onChange={(event) => setAdjustKg(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Reason">
              <input required value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} className={inputClass} />
            </Field>
            <button className={`${buttonClass} self-end`}>
              <Plus className="h-4 w-4" />
              Save Adjustment
            </button>
          </form>
          <DataTable
            headers={['Date', 'Material', 'Location', 'Change', 'Reason']}
            rows={visibleAdjustments.map((record) => [
              new Date(record.createdAt).toLocaleString(),
              record.material,
              locationName(record.locationId),
              `${record.deltaKg > 0 ? '+' : ''}${record.deltaKg.toLocaleString()} KG`,
              record.reason,
            ])}
            emptyMessage="No adjustments recorded for the current filters."
          />
        </Panel>
      )}

      {view === 'counts' && (
        <Panel title="Physical Stock Count" icon={<ClipboardCheck className="h-5 w-5" />}>
          <form onSubmit={addPhysicalCount} className="grid gap-3 md:grid-cols-3">
            <Field label="Stock item">
              <select required value={countStockId} onChange={(event) => setCountStockId(event.target.value)} className={inputClass}>
                <option value="">Select stock</option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.material} · {row.locationName} · {row.kg.toLocaleString()} KG book stock
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Counted quantity (KG)">
              <input required type="number" min="0" step="any" value={countedKg} onChange={(event) => setCountedKg(event.target.value)} className={inputClass} />
            </Field>
            <button className={`${buttonClass} self-end`}>
              <ClipboardCheck className="h-4 w-4" />
              Save Count & Reconcile
            </button>
          </form>
          <DataTable
            headers={['Counted at', 'Material', 'Location', 'Book KG', 'Counted KG', 'Variance KG']}
            rows={visibleCounts.map((record) => [
              new Date(record.createdAt).toLocaleString(),
              record.material,
              locationName(record.locationId),
              record.expectedKg.toLocaleString(),
              record.countedKg.toLocaleString(),
              `${record.varianceKg > 0 ? '+' : ''}${record.varianceKg.toLocaleString()}`,
            ])}
            emptyMessage="No physical counts recorded for the current filters."
          />
        </Panel>
      )}

      {view === 'locations' && (
        <Panel title="All Stock Lines" icon={<Package className="h-5 w-5" />}>
          <StockTable rows={filteredRows} showValue />
        </Panel>
      )}

      <p className="text-xs text-slate-500 print:hidden">
        Inventory data is stored in this browser. Stock values are estimates using purchase rate as the unit cost; production conversion costs are not yet capitalized.
      </p>
    </div>
  );
};
