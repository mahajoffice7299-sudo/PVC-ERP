import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type {
  ProductionBatch,
  SalesRecord,
  SalesReturnRecord,
  SortingBatch,
  WashingBatch,
} from './types';

interface ProcessingContextValue {
  sortingBatches: SortingBatch[];
  washingBatches: WashingBatch[];
  productionBatches: ProductionBatch[];
  sales: SalesRecord[];
  salesReturns: SalesReturnRecord[];
  addSortingBatch: (batch: Omit<SortingBatch, 'id' | 'createdAt'>) => Promise<SortingBatch>;
  addWashingBatch: (batch: Omit<WashingBatch, 'id' | 'createdAt'>) => Promise<WashingBatch>;
  addProductionBatch: (batch: Omit<ProductionBatch, 'id' | 'createdAt'>) => Promise<ProductionBatch>;
  addSale: (sale: Omit<SalesRecord, 'id' | 'soldAt'>) => Promise<SalesRecord>;
  addSalesReturn: (entry: Omit<SalesReturnRecord, 'id' | 'returnedAt'>) => SalesReturnRecord;
}

const ProcessingContext = createContext<ProcessingContextValue | undefined>(undefined);

function readStored<T>(key: string): T[] {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T[] : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

// The DB stores the full nested record (bottle lots, source purchase, etc.) in a
// JSON `data` column. Rows may come back as {id, batch_no, qty, data} or already
// normalized — handle both shapes.
type DbRow = Record<string, unknown> & { data?: unknown };

const isLegacyRow = (row: DbRow) =>
  row.data === undefined || row.data === null || typeof row.data !== 'object';

const revive = <T,>(row: DbRow): T => {
  if (isLegacyRow(row)) return row as unknown as T;
  const payload = row.data as Record<string, unknown>;
  return {
    ...payload,
    id: (row.id as string) ?? (payload.id as string),
    createdAt: (row.created_at as string) ?? (payload.createdAt as string),
  } as unknown as T;
};

const reviveList = <T,>(rows: unknown): T[] =>
  Array.isArray(rows) ? (rows as DbRow[]).map(revive<T>) : [];

export const ProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sortingBatches, setSortingBatches] = useState<SortingBatch[]>([]);
  const [washingBatches, setWashingBatches] = useState<WashingBatch[]>([]);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [salesReturns, setSalesReturns] = useState(() => readStored<SalesReturnRecord>('pvc_sales_returns'));

  useEffect(() => { api('/processing/sorting').then((rows: unknown) => setSortingBatches(reviveList<SortingBatch>(rows))).catch(()=>{}); }, []);
  useEffect(() => { api('/processing/washing').then((rows: unknown) => setWashingBatches(reviveList<WashingBatch>(rows))).catch(()=>{}); }, []);
  useEffect(() => { api('/processing/production').then((rows: unknown) => setProductionBatches(reviveList<ProductionBatch>(rows))).catch(()=>{}); }, []);
  useEffect(() => { api('/sales/sales').then((rows: unknown) => setSales(reviveList<SalesRecord>(rows))).catch(()=>{}); }, []);

  useEffect(() => localStorage.setItem('pvc_sorting_batches', JSON.stringify(sortingBatches)), [sortingBatches]);
  useEffect(() => localStorage.setItem('pvc_washing_batches', JSON.stringify(washingBatches)), [washingBatches]);
  useEffect(() => localStorage.setItem('pvc_production_batches', JSON.stringify(productionBatches)), [productionBatches]);
  useEffect(() => localStorage.setItem('pvc_sales_records', JSON.stringify(sales)), [sales]);
  useEffect(() => localStorage.setItem('pvc_sales_returns', JSON.stringify(salesReturns)), [salesReturns]);

  const addSortingBatch = async (batch: Omit<SortingBatch, 'id' | 'createdAt'>): Promise<SortingBatch> => {
    const created: SortingBatch = { ...batch, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const saved = await api('/processing/sorting', {
      method: 'POST',
      body: JSON.stringify({ batch_no: created.id, qty: created.inputKg, data: created }),
    });
    const final = saved && typeof saved === 'object' && (saved as DbRow).data ? revive<SortingBatch>(saved as DbRow) : created;
    setSortingBatches((previous) => [final, ...previous]);
    return final;
  };

  const addWashingBatch = async (batch: Omit<WashingBatch, 'id' | 'createdAt'>): Promise<WashingBatch> => {
    const created: WashingBatch = { ...batch, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const saved = await api('/processing/washing', {
      method: 'POST',
      body: JSON.stringify({ batch_no: created.id, qty: created.inputKg, data: created }),
    });
    const final = saved && typeof saved === 'object' && (saved as DbRow).data ? revive<WashingBatch>(saved as DbRow) : created;
    setWashingBatches((previous) => [final, ...previous]);
    return final;
  };

  const addProductionBatch = async (batch: Omit<ProductionBatch, 'id' | 'createdAt'>): Promise<ProductionBatch> => {
    const created: ProductionBatch = { ...batch, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const saved = await api('/processing/production', {
      method: 'POST',
      body: JSON.stringify({ batch_no: created.id, qty: created.inputKg, data: created }),
    });
    const final = saved && typeof saved === 'object' && (saved as DbRow).data ? revive<ProductionBatch>(saved as DbRow) : created;
    setProductionBatches((previous) => [final, ...previous]);
    return final;
  };

  const addSale = async (sale: Omit<SalesRecord, 'id' | 'soldAt'>): Promise<SalesRecord> => {
    const created: SalesRecord = { ...sale, id: crypto.randomUUID(), soldAt: new Date().toISOString() };
    const saved = await api('/sales/sales', {
      method: 'POST',
      body: JSON.stringify({ customer: created.buyerName, amount: created.totalAmount, data: created }),
    });
    const final = saved && typeof saved === 'object' && (saved as DbRow).data ? revive<SalesRecord>(saved as DbRow) : created;
    setSales((previous) => [final, ...previous]);
    return final;
  };

  const addSalesReturn = (entry: Omit<SalesReturnRecord, 'id' | 'returnedAt'>): SalesReturnRecord => {
    const created: SalesReturnRecord = {
      ...entry,
      id: `return-${Date.now()}`,
      returnedAt: new Date().toISOString(),
    };
    setSalesReturns((previous) => [created, ...previous]);
    return created;
  };

  return (
    <ProcessingContext.Provider
      value={{
        sortingBatches,
        washingBatches,
        productionBatches,
        sales,
        salesReturns,
        addSortingBatch,
        addWashingBatch,
        addProductionBatch,
        addSale,
        addSalesReturn,
      }}
    >
      {children}
    </ProcessingContext.Provider>
  );
};

export const useProcessing = (): ProcessingContextValue => {
  const context = useContext(ProcessingContext);
  if (!context) throw new Error('useProcessing must be used within a ProcessingProvider');
  return context;
};
