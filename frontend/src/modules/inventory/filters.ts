import type { InventoryFilters, StockAdjustment, StockCount, StockRow, StockTransfer } from './types';

const REFERENCE_TIME = Date.now();

const toDateKey = (value: string): string => {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : value.slice(0, 10);
};

const withinDateRange = (value: string, filters: InventoryFilters): boolean => {
  if (!filters.fromDate && !filters.toDate) return true;
  const key = toDateKey(value);
  if (filters.fromDate && key < filters.fromDate) return false;
  if (filters.toDate && key > filters.toDate) return false;
  return true;
};

const matchesMaterial = (values: (string | undefined)[], query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => (value ?? '').toLowerCase().includes(needle));
};

export const filterStockRows = (rows: StockRow[], filters: InventoryFilters): StockRow[] =>
  rows.filter(
    (row) =>
      withinDateRange(row.stockDate, filters) &&
      (!filters.locationId || row.locationId === filters.locationId) &&
      matchesMaterial([row.material, row.color, row.quality], filters.material)
  );

export const filterAdjustments = (
  adjustments: StockAdjustment[],
  filters: InventoryFilters
): StockAdjustment[] =>
  adjustments.filter(
    (record) =>
      withinDateRange(record.createdAt, filters) &&
      (!filters.locationId || record.locationId === filters.locationId) &&
      matchesMaterial([record.material, record.color, record.quality], filters.material)
  );

export const filterTransfers = (transfers: StockTransfer[], filters: InventoryFilters): StockTransfer[] =>
  transfers.filter(
    (record) =>
      withinDateRange(record.createdAt, filters) &&
      (!filters.locationId ||
        record.fromLocationId === filters.locationId ||
        record.toLocationId === filters.locationId) &&
      matchesMaterial([record.material, record.category], filters.material)
  );

export const filterCounts = (counts: StockCount[], filters: InventoryFilters): StockCount[] =>
  counts.filter(
    (record) =>
      withinDateRange(record.createdAt, filters) &&
      (!filters.locationId || record.locationId === filters.locationId) &&
      matchesMaterial([record.material, record.category], filters.material)
  );

export const ageInDays = (value: string): number =>
  Math.max(0, Math.floor((REFERENCE_TIME - new Date(value).getTime()) / 86400000));

export interface AgeBucket {
  label: string;
  minDays: number;
  maxDays: number;
}

export const ageBuckets: AgeBucket[] = [
  { label: '0-30 days', minDays: 0, maxDays: 30 },
  { label: '31-60 days', minDays: 31, maxDays: 60 },
  { label: '61-90 days', minDays: 61, maxDays: 90 },
  { label: '91-180 days', minDays: 91, maxDays: 180 },
  { label: '180+ days', minDays: 181, maxDays: Number.POSITIVE_INFINITY },
];

export const bucketForAge = (days: number): AgeBucket =>
  ageBuckets.find((bucket) => days >= bucket.minDays && days <= bucket.maxDays) ?? ageBuckets[ageBuckets.length - 1];
