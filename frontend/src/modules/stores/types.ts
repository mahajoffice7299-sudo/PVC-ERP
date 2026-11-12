import type { PurchaseRecord } from '../procurement/types';

export interface StoreLocation {
  id: string;
  name: string;
  locationNumber: string;
  address: string;
  location?: string;
  createdAt: string;
}

export interface StoreReceipt {
  id: string;
  purchaseId: string;
  storeId: string;
  receivedAt: string;
  receivedKg: number;
  purchase: PurchaseRecord;
}

export interface StoreTransfer {
  id: string;
  receiptId: string;
  storeId: string;
  transferredAt: string;
  transferredKg: number;
}
