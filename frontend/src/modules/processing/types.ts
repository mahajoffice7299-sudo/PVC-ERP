import type { PurchaseRecord } from '../procurement/types';

export type MaterialCategory = 'bottle' | 'ring' | 'cap' | 'wrapper' | 'other';

export interface BottleLotInput {
  id: string;
  color: string;
  condition: string;
  quality: string;
  kg: number;
}

export interface SortedMaterialStream {
  id: string;
  category: MaterialCategory;
  materialType: string;
  color: string;
  condition: string;
  quality: string;
  description: string;
  kg: number;
}

export interface SortingBatch {
  id: string;
  transferId: string;
  receiptId: string;
  storeId: string;
  sourcePurchase: PurchaseRecord;
  inputKg: number;
  bottleLots: BottleLotInput[];
  ringKg: number;
  capKg: number;
  wrapperKg: number;
  otherKg: number;
  otherDescription: string;
  createdAt: string;
}

export interface WashingBatch {
  id: string;
  sortingBatchId: string;
  streamId: string;
  sourcePurchase: PurchaseRecord;
  category: MaterialCategory;
  materialType: string;
  color: string;
  condition: string;
  quality: string;
  description: string;
  inputKg: number;
  washedKg: number;
  wasteKg: number;
  wasteCondition: string;
  createdAt: string;
}

export interface ProductionBatch {
  id: string;
  washingBatchId: string;
  sourcePurchase: PurchaseRecord;
  materialType: string;
  color: string;
  condition: string;
  quality: string;
  inputKg: number;
  flakesKg: number;
  dustKg: number;
  otherKg: number;
  otherDescription: string;
  wasteKg: number;
  wasteCondition: string;
  createdAt: string;
}

export interface SalesRecord {
  id: string;
  stockItemId: string;
  product: string;
  materialType: string;
  color: string;
  condition: string;
  quality: string;
  sourcePurchase: PurchaseRecord;
  quantityKg: number;
  ratePerKg: number;
  totalAmount: number;
  buyerName: string;
  notes: string;
  soldAt: string;
}

export interface SalesReturnRecord {
  id: string;
  saleId: string;
  stockItemId: string;
  product: string;
  returnedKg: number;
  acceptedKg: number;
  notes: string;
  returnedAt: string;
}
