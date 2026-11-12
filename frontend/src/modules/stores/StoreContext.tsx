import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { StoreLocation, StoreReceipt, StoreTransfer } from './types';
import type { PurchaseRecord } from '../procurement/types';

interface StoreContextValue {
  stores: StoreLocation[];
  receipts: StoreReceipt[];
  transfers: StoreTransfer[];
  addStore: (store: Pick<StoreLocation, 'name' | 'locationNumber' | 'address'>) => Promise<StoreLocation>;
  updateStore: (id: string, store: Pick<StoreLocation, 'name' | 'locationNumber' | 'address'>) => Promise<void>;
  deleteStore: (id: string) => Promise<boolean>;
  deleteAllStores: () => boolean;
  receivePurchase: (purchase: PurchaseRecord, storeId: string) => Promise<boolean>;
  transferReceiptStock: (receiptId: string, transferredKg: number) => Promise<StoreTransfer | null>;
  availableReceiptKg: (receiptId: string) => number;
}

const safeRead = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stores, setStores] = useState<StoreLocation[]>(() => {
    const storedLocations = safeRead<StoreLocation[]>('pvc_stores', []);
    return storedLocations.map((store) => ({
      ...store,
      locationNumber: store.locationNumber || '',
      address: store.address || store.location || '',
    }));
  });
  const [receipts, setReceipts] = useState<StoreReceipt[]>(() => safeRead<StoreReceipt[]>('pvc_store_receipts', []));
  const [transfers, setTransfers] = useState<StoreTransfer[]>(() => safeRead<StoreTransfer[]>('pvc_store_transfers', []));
  const receivedPurchaseIds = useRef(new Set(receipts.map((receipt) => receipt.purchaseId)));

  useEffect(() => {
    localStorage.setItem('pvc_stores', JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem('pvc_store_receipts', JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem('pvc_store_transfers', JSON.stringify(transfers));
  }, [transfers]);

  const addStore = async (storeData: Pick<StoreLocation, 'name' | 'locationNumber' | 'address'>): Promise<StoreLocation> => {
    const store: StoreLocation = { ...storeData, id: `store-${Date.now()}`, createdAt: new Date().toISOString() };
    const saved = await api('/stores/locations', { method: 'POST', body: JSON.stringify(store) });
    setStores((previous) => [saved ?? store, ...previous]);
    return saved ?? store;
  };

  const updateStore = async (id: string, storeData: Pick<StoreLocation, 'name' | 'locationNumber' | 'address'>) => {
    const updated = await api(`/stores/locations/${id}`, { method: 'PUT', body: JSON.stringify(storeData) });
    setStores((previous) => previous.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };
  const deleteStore = async (id: string) => {
    if (receipts.some((r) => r.storeId === id)) return false;
    await api(`/stores/locations/${id}`, { method: 'DELETE' });
    setStores((previous) => previous.filter((s) => s.id !== id));
    return true;
  };

  const deleteAllStores = (): boolean => {
    if (receipts.length > 0) return false;
    setStores([]);
    return true;
  };

  const receivePurchase = async (purchase: PurchaseRecord, storeId: string): Promise<boolean> => {
    if (receivedPurchaseIds.current.has(purchase.id)) return false;
    const store = stores.find((item) => item.id === storeId);
    if (!store) return false;
    const receipt: StoreReceipt = {
      id: `receipt-${purchase.id}`,
      purchaseId: purchase.id,
      storeId,
      receivedAt: new Date().toISOString(),
      receivedKg: purchase.netWeightKg,
      purchase: { ...purchase, status: 'Completed', storeId },
    };
    await api('/stores/receipts', { method: 'POST', body: JSON.stringify(receipt) });
    receivedPurchaseIds.current.add(purchase.id);
    setReceipts((previous) => [receipt, ...previous]);
    return true;
  };

  const availableReceiptKg = (receiptId: string): number => {
    const receipt = receipts.find((item) => item.id === receiptId);
    if (!receipt) return 0;
    const transferredKg = transfers
      .filter((transfer) => transfer.receiptId === receiptId)
      .reduce((total, transfer) => total + transfer.transferredKg, 0);
    return Math.max(0, receipt.receivedKg - transferredKg);
  };
  const transferReceiptStock = async (receiptId: string, transferredKg: number) => {
    const receipt = receipts.find((item) => item.id === receiptId);
    if (!receipt || !Number.isFinite(transferredKg) || transferredKg <= 0) return null;
    const availableKg = availableReceiptKg(receiptId);
    if (transferredKg > availableKg) return null;
    const transfer = {
      id: `transfer-${receiptId}-${Date.now()}`,
      receiptId,
      storeId: receipt.storeId,
      transferredAt: new Date().toISOString(),
      transferredKg,
    };
    await api('/stores/transfers', { method: 'POST', body: JSON.stringify(transfer) });
    setTransfers((previous) => [transfer, ...previous]);
    return transfer;
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        receipts,
        transfers,
        addStore,
        updateStore,
        deleteStore,
        deleteAllStores,
        receivePurchase,
        transferReceiptStock,
        availableReceiptKg,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStores = (): StoreContextValue => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStores must be used within a StoreProvider');
  return context;
};
