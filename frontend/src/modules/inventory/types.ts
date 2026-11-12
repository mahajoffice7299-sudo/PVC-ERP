export type StockCategory =
  | 'Raw Material'
  | 'Sorted Material'
  | 'Washed Material'
  | 'PET Flakes'
  | 'Preform'
  | 'Bottle'
  | 'By-product';

export type StockView =
  | 'raw-material'
  | 'sorted'
  | 'washed'
  | 'flakes'
  | 'preform'
  | 'bottle'
  | 'byproduct';

export type StockOperationsView = 'locations' | 'transfers' | 'adjustments' | 'counts';

export type InventoryReportsView = 'valuation' | 'ageing';

export interface StockRow {
  id: string;
  category: StockCategory;
  material: string;
  color: string;
  quality: string;
  locationId: string;
  locationName: string;
  kg: number;
  unitCost: number;
  stockDate: string;
}

export interface StockAdjustment {
  id: string;
  stockId: string;
  category: StockCategory;
  material: string;
  color: string;
  quality: string;
  locationId: string;
  deltaKg: number;
  reason: string;
  createdAt: string;
}

export interface StockTransfer {
  id: string;
  stockId: string;
  material: string;
  category: StockCategory;
  fromLocationId: string;
  toLocationId: string;
  quantityKg: number;
  createdAt: string;
}

export interface StockCount {
  id: string;
  stockId: string;
  material: string;
  category: StockCategory;
  locationId: string;
  expectedKg: number;
  countedKg: number;
  varianceKg: number;
  createdAt: string;
}

export interface InventoryFilters {
  fromDate: string;
  toDate: string;
  locationId: string;
  material: string;
}

export const stockCategories: StockCategory[] = [
  'Raw Material',
  'Sorted Material',
  'Washed Material',
  'PET Flakes',
  'Preform',
  'Bottle',
  'By-product',
];

export const stockViewLabels: Record<StockView, string> = {
  'raw-material': 'Raw Material Stock',
  sorted: 'Sorted Material Stock',
  washed: 'Washed Material Stock',
  flakes: 'PET Flakes Stock',
  preform: 'Preform Stock',
  bottle: 'Bottle Stock',
  byproduct: 'By-product Stock',
};

export const stockViewCategory: Record<StockView, StockCategory> = {
  'raw-material': 'Raw Material',
  sorted: 'Sorted Material',
  washed: 'Washed Material',
  flakes: 'PET Flakes',
  preform: 'Preform',
  bottle: 'Bottle',
  byproduct: 'By-product',
};

export const stockOperationsLabels: Record<StockOperationsView, string> = {
  locations: 'Location-wise Inventory',
  transfers: 'Stock Transfers',
  adjustments: 'Stock Adjustments',
  counts: 'Physical Stock Counts',
};

export const inventoryReportsLabels: Record<InventoryReportsView, string> = {
  valuation: 'Inventory Valuation',
  ageing: 'Stock Ageing',
};
