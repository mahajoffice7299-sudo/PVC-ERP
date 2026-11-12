import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { useStores } from '../stores/StoreContext';
import { useProcessing } from '../processing/ProcessingContext';
import type { MaterialCategory } from '../processing/types';
import type {
  InventoryFilters,
  StockAdjustment,
  StockCount,
  StockRow,
  StockTransfer,
} from './types';

const nowIso = () => new Date().toISOString();

const defaultFilters: InventoryFilters = {
  fromDate: '',
  toDate: '',
  locationId: '',
  material: '',
};

export interface InventoryContextValue {
  rows: StockRow[];
  adjustments: StockAdjustment[];
  transfers: StockTransfer[];
  counts: StockCount[];
  filters: InventoryFilters;
  setFilter: <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => void;
  resetFilters: () => void;
  addAdjustment: (adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>) => Promise<StockAdjustment>;
  addTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt'>) => Promise<StockTransfer>;
  addCount: (count: Omit<StockCount, 'id' | 'createdAt'>) => Promise<StockCount>;
  locationName: (locationId: string) => string;
}

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { stores, receipts, availableReceiptKg } = useStores();
  const { sortingBatches, washingBatches, productionBatches, sales, salesReturns } = useProcessing();

  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [filters, setFilters] = useState<InventoryFilters>(defaultFilters);

  useEffect(() => { api('/inventory/adjustments').then(setAdjustments).catch(()=>{}); }, []);
  useEffect(() => { api('/inventory/transfers').then(setTransfers).catch(()=>{}); }, []);
  useEffect(() => { api('/inventory/counts').then(setCounts).catch(()=>{}); }, []);

  useEffect(() => localStorage.setItem('pvc_inventory_adjustments', JSON.stringify(adjustments)), [adjustments]);
  useEffect(() => localStorage.setItem('pvc_inventory_transfers', JSON.stringify(transfers)), [transfers]);
  useEffect(() => localStorage.setItem('pvc_inventory_counts', JSON.stringify(counts)), [counts]);

  const locationName = (locationId: string) =>
    stores.find((store) => store.id === locationId)?.name || 'Unknown location';

  const rows = useMemo<StockRow[]>(() => {
    const stock: StockRow[] = receipts.map((receipt) => ({
      id: `raw:${receipt.id}`,
      category: 'Raw Material',
      material: receipt.purchase.materialType || 'Unspecified material',
      color: receipt.purchase.color || '',
      quality: receipt.purchase.grade || '',
      locationId: receipt.storeId,
      locationName: stores.find((store) => store.id === receipt.storeId)?.name || 'Unknown location',
      kg: availableReceiptKg(receipt.id),
      unitCost: receipt.purchase.ratePerKg || 0,
      stockDate: receipt.receivedAt,
    }));

    for (const batch of sortingBatches) {
      const lots = [
        ...batch.bottleLots.map((lot) => ({
          id: `${batch.id}:bottle:${lot.id}`,
          category: 'bottle' as MaterialCategory,
          kg: lot.kg,
          color: lot.color,
          quality: lot.quality,
        })),
        ...[
          { category: 'ring' as const, kg: batch.ringKg },
          { category: 'cap' as const, kg: batch.capKg },
          { category: 'wrapper' as const, kg: batch.wrapperKg },
          { category: 'other' as const, kg: batch.otherKg },
        ]
          .filter((item) => item.kg > 0)
          .map((item) => ({ id: `${batch.id}:${item.category}`, ...item, color: '', quality: '' })),
      ];
      for (const lot of lots) {
        const remainingKg = Math.max(
          0,
          lot.kg -
            washingBatches
              .filter((wash) => wash.streamId === lot.id)
              .reduce((sum, wash) => sum + wash.inputKg, 0)
        );
        if (remainingKg <= 0) continue;
        const byproductNames: Record<MaterialCategory, string> = {
          bottle: 'Bottle',
          ring: 'Ring',
          cap: 'Cap',
          wrapper: 'Wrapper',
          other: 'Other',
        };
        stock.push({
          id: `sorted:${lot.id}`,
          category: 'Sorted Material',
          material:
            lot.category === 'other'
              ? batch.otherDescription || 'Other'
              : `${batch.sourcePurchase.materialType || 'Material'} ${byproductNames[lot.category]}`,
          color: lot.color,
          quality: lot.quality,
          locationId: batch.storeId,
          locationName: stores.find((store) => store.id === batch.storeId)?.name || 'Unknown location',
          kg: remainingKg,
          unitCost: batch.sourcePurchase.ratePerKg || 0,
          stockDate: batch.createdAt,
        });
      }
    }

    for (const wash of washingBatches) {
      const usedForProduction =
        wash.category === 'bottle'
          ? productionBatches
              .filter((batch) => batch.washingBatchId === wash.id)
              .reduce((sum, batch) => sum + batch.inputKg, 0)
          : wash.washedKg;
      const remainingKg = Math.max(0, wash.washedKg - usedForProduction);
      if (remainingKg <= 0) continue;
      const sortingBatch = sortingBatches.find((batch) => batch.id === wash.sortingBatchId);
      const category: StockRow['category'] = wash.category === 'bottle' ? 'Washed Material' : 'By-product';
      stock.push({
        id: `washed:${wash.id}`,
        category,
        material: wash.description || `${wash.materialType} ${wash.category}`,
        color: wash.color,
        quality: wash.quality,
        locationId: sortingBatch?.storeId || '',
        locationName: stores.find((store) => store.id === sortingBatch?.storeId)?.name || 'Processing',
        kg: remainingKg,
        unitCost: wash.sourcePurchase.ratePerKg || 0,
        stockDate: wash.createdAt,
      });
    }

    for (const batch of productionBatches) {
      const sortedBySale = (itemId: string, quantityKg: number) => {
        const sold = sales
          .filter((sale) => sale.stockItemId === itemId)
          .reduce((sum, sale) => sum + sale.quantityKg, 0);
        const returned = salesReturns
          .filter((entry) => entry.stockItemId === itemId)
          .reduce((sum, entry) => sum + entry.acceptedKg, 0);
        return Math.max(0, quantityKg - sold + returned);
      };
      const wash = washingBatches.find((item) => item.id === batch.washingBatchId);
      const sorting = sortingBatches.find((item) => item.id === wash?.sortingBatchId);
      if (batch.flakesKg > 0) {
        stock.push({
          id: `prod:${batch.id}:flakes`,
          category: 'PET Flakes',
          material: `${batch.materialType} Flakes`,
          color: batch.color,
          quality: batch.quality || '',
          locationId: sorting?.storeId || '',
          locationName: stores.find((store) => store.id === sorting?.storeId)?.name || 'Processing',
          kg: sortedBySale(`prod:${batch.id}:flakes`, batch.flakesKg),
          unitCost: batch.sourcePurchase.ratePerKg || 0,
          stockDate: batch.createdAt,
        });
      }
      for (const [kind, quantity] of [
        ['dust', batch.dustKg],
        ['other', batch.otherKg],
      ] as const) {
        if (quantity <= 0) continue;
        stock.push({
          id: `prod:${batch.id}:${kind}`,
          category: 'By-product',
          material:
            kind === 'dust'
              ? `${batch.materialType} Dust`
              : batch.otherDescription || `${batch.materialType} Other`,
          color: batch.color,
          quality: batch.quality || '',
          locationId: sorting?.storeId || '',
          locationName: stores.find((store) => store.id === sorting?.storeId)?.name || 'Processing',
          kg: sortedBySale(`prod:${batch.id}:${kind}`, quantity),
          unitCost: batch.sourcePurchase.ratePerKg || 0,
          stockDate: batch.createdAt,
        });
      }
    }

    for (const adjustment of adjustments) {
      const existing = stock.find((row) => row.id === adjustment.stockId);
      if (existing) existing.kg = Math.max(0, existing.kg + adjustment.deltaKg);
      else if (adjustment.deltaKg > 0) {
        stock.push({
          id: adjustment.stockId,
          category: adjustment.category,
          material: adjustment.material,
          color: adjustment.color,
          quality: adjustment.quality,
          locationId: adjustment.locationId,
          locationName: stores.find((store) => store.id === adjustment.locationId)?.name || 'Unknown location',
          kg: adjustment.deltaKg,
          unitCost: 0,
          stockDate: adjustment.createdAt,
        });
      }
    }

    for (const transfer of transfers) {
      const source = stock.find((row) => row.id === transfer.stockId && row.locationId === transfer.fromLocationId);
      if (source) source.kg = Math.max(0, source.kg - transfer.quantityKg);
      const destinationId = `${transfer.stockId}@${transfer.toLocationId}`;
      const destination = stock.find((row) => row.id === destinationId);
      if (destination) destination.kg += transfer.quantityKg;
      else if (source) {
        stock.push({
          ...source,
          id: destinationId,
          locationId: transfer.toLocationId,
          locationName: stores.find((store) => store.id === transfer.toLocationId)?.name || 'Unknown location',
          kg: transfer.quantityKg,
        });
      }
    }

    return stock.filter((row) => row.kg > 0);
  }, [receipts, stores, availableReceiptKg, sortingBatches, washingBatches, productionBatches, sales, salesReturns, adjustments, transfers]);

  const setFilter = <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const resetFilters = () => setFilters(defaultFilters);

  const addAdjustment = async (adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>): Promise<StockAdjustment> => {
    const created: StockAdjustment = { ...adjustment, id: `adjust-${crypto.randomUUID()}`, createdAt: nowIso() };
    const saved = await api('/inventory/adjustments', { method: 'POST', body: JSON.stringify(created) });
    const final = saved ?? created;
    setAdjustments((previous) => [final, ...previous]);
    return final;
  };

  const addTransfer = async (transfer: Omit<StockTransfer, 'id' | 'createdAt'>): Promise<StockTransfer> => {
    const created: StockTransfer = { ...transfer, id: `stock-transfer-${crypto.randomUUID()}`, createdAt: nowIso() };
    const saved = await api('/inventory/transfers', { method: 'POST', body: JSON.stringify(created) });
    const final = saved ?? created;
    setTransfers((previous) => [final, ...previous]);
    return final;
  };
  const addCount = async (count: Omit<StockCount, 'id' | 'createdAt'>): Promise<StockCount> => {
    const created: StockCount = { ...count, id: `count-${crypto.randomUUID()}`, createdAt: nowIso() };
    const saved = await api('/inventory/counts', { method: 'POST', body: JSON.stringify(created) });
    const final = saved ?? created;
    setCounts((previous) => [final, ...previous]);
    return final;
  };

  return (
    <InventoryContext.Provider
      value={{
        rows,
        adjustments,
        transfers,
        counts,
        filters,
        setFilter,
        resetFilters,
        addAdjustment,
        addTransfer,
        addCount,
        locationName,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextValue => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
};
