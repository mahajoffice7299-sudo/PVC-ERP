import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Supplier, Buyer, PurchaseRecord } from './types';
import { api } from '../../lib/api';

// ---- DB <-> frontend field-name mapping ------------------------------------
// The MySQL tables use snake_case columns; the frontend types use camelCase.
// These helpers normalize every record that crosses the boundary.

const SUPPLIER_DB_TO_CLIENT: Record<string, string> = {
  phone_number: 'phoneNumber',
  shop_address: 'shopAddress',
  company_name: 'companyName',
  supplier_code: 'supplierCode',
  contact_person: 'contactPerson',
  payment_terms: 'paymentTerms',
};
const SUPPLIER_CLIENT_TO_DB: Record<string, string> = {
  phoneNumber: 'phone_number',
  shopAddress: 'shop_address',
  companyName: 'company_name',
  supplierCode: 'supplier_code',
  contactPerson: 'contact_person',
  paymentTerms: 'payment_terms',
};

const BUYER_DB_TO_CLIENT: Record<string, string> = {
  buyer_code: 'buyerCode',
  spending_limit: 'spendingLimit',
  active_orders_count: 'activeOrdersCount',
};
const BUYER_CLIENT_TO_DB: Record<string, string> = {
  buyerCode: 'buyer_code',
  spendingLimit: 'spending_limit',
  activeOrdersCount: 'active_orders_count',
};

const PURCHASE_DB_TO_CLIENT: Record<string, string> = {
  po_number: 'poNumber',
  supplier_id: 'supplierId',
  supplier_name: 'supplierName',
  buyer_id: 'buyerId',
  buyer_name: 'buyerName',
  purchase_date: 'purchaseDate',
  vehicle_number: 'vehicleNumber',
  material_type: 'materialType',
  store_id: 'storeId',
  gross_weight_kg: 'grossWeightKg',
  tare_weight_kg: 'tareWeightKg',
  net_weight_kg: 'netWeightKg',
  rate_per_kg: 'ratePerKg',
  total_amount: 'totalAmount',
  payment_type: 'paymentType',
  paid_amount: 'paidAmount',
  payable_amount: 'payableAmount',
};
const PURCHASE_CLIENT_TO_DB: Record<string, string> = {
  poNumber: 'po_number',
  supplierId: 'supplier_id',
  supplierName: 'supplier_name',
  buyerId: 'buyer_id',
  buyerName: 'buyer_name',
  purchaseDate: 'purchase_date',
  vehicleNumber: 'vehicle_number',
  materialType: 'material_type',
  storeId: 'store_id',
  grossWeightKg: 'gross_weight_kg',
  tareWeightKg: 'tare_weight_kg',
  netWeightKg: 'net_weight_kg',
  ratePerKg: 'rate_per_kg',
  totalAmount: 'total_amount',
  paymentType: 'payment_type',
  paidAmount: 'paid_amount',
  payableAmount: 'payable_amount',
};

function remap<T extends Record<string, unknown>>(row: T, map: Record<string, string>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row ?? {})) {
    out[map[key] ?? key] = value;
  }
  return out as T;
}

const fromDbSupplier = (row: Record<string, unknown>): Supplier => remap(row, SUPPLIER_DB_TO_CLIENT) as unknown as Supplier;
const toDbSupplier = (sup: Record<string, unknown>): Record<string, unknown> => remap(sup, SUPPLIER_CLIENT_TO_DB);
const fromDbBuyer = (row: Record<string, unknown>): Buyer => remap(row, BUYER_DB_TO_CLIENT) as unknown as Buyer;
const toDbBuyer = (b: Record<string, unknown>): Record<string, unknown> => remap(b, BUYER_CLIENT_TO_DB);
const fromDbPurchase = (row: Record<string, unknown>): PurchaseRecord => {
  const mapped = remap(row, PURCHASE_DB_TO_CLIENT) as unknown as PurchaseRecord;
  if (!['Draft', 'Pending Approval', 'Completed'].includes(mapped.status)) {
    mapped.status = 'Pending Approval';
  }
  if (!['Cash', 'Card', 'Credit', 'Mixed'].includes(mapped.paymentType)) {
    mapped.paymentType = 'Credit';
  }
  return mapped;
};
const toDbPurchase = (p: Record<string, unknown>): Record<string, unknown> => remap(p, PURCHASE_CLIENT_TO_DB);

interface ProcurementContextType {
  suppliers: Supplier[];
  buyers: Buyer[];
  purchases: PurchaseRecord[];
  addSupplier: (sup: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (id: string, sup: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  clearAllSuppliers: () => Promise<void>;
  addBuyer: (buyer: Omit<Buyer, 'id'>) => Promise<Buyer>;
  updateBuyer: (id: string, buyer: Partial<Buyer>) => Promise<void>;
  deleteBuyer: (id: string) => Promise<void>;
  clearAllBuyers: () => Promise<void>;
  addPurchase: (purchase: Omit<PurchaseRecord, 'id'>) => Promise<PurchaseRecord>;
  updatePurchase: (id: string, purchase: Partial<PurchaseRecord>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  clearAllPurchases: () => Promise<void>;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  useEffect(() => {
    api('/procurement/suppliers')
      .then((rows: unknown[]) => setSuppliers(rows.map((r) => fromDbSupplier(r as Record<string, unknown>))))
      .catch(()=>{});
    api('/procurement/buyers')
      .then((rows: unknown[]) => setBuyers(rows.map((r) => fromDbBuyer(r as Record<string, unknown>))))
      .catch(()=>{});
    api('/procurement/purchases')
      .then((rows: unknown[]) => setPurchases(rows.map((r) => fromDbPurchase(r as Record<string, unknown>))))
      .catch(()=>{});
  }, []);

  const addSupplier = async (supData: Omit<Supplier, 'id'>): Promise<Supplier> => {
    const raw = await api('/procurement/suppliers', { method: 'POST', body: JSON.stringify(toDbSupplier(supData as unknown as Record<string, unknown>)) });
    const newSup = fromDbSupplier(raw as Record<string, unknown>);
    setSuppliers((prev) => [newSup, ...prev]);
    return newSup;
  };
  const updateSupplier = async (id: string, supData: Partial<Supplier>) => {
    const raw = await api(`/procurement/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(toDbSupplier(supData as unknown as Record<string, unknown>)) });
    const updated = fromDbSupplier(raw as Record<string, unknown>);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };
  const deleteSupplier = async (id: string) => {
    await api(`/procurement/suppliers/${id}`, { method: 'DELETE' });
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };
  const clearAllSuppliers = async () => {
    await api('/procurement/suppliers', { method: 'DELETE' });
    setSuppliers([]);
  };

  const addBuyer = async (buyerData: Omit<Buyer, 'id'>): Promise<Buyer> => {
    const raw = await api('/procurement/buyers', { method: 'POST', body: JSON.stringify(toDbBuyer(buyerData as unknown as Record<string, unknown>)) });
    const newBuyer = fromDbBuyer(raw as Record<string, unknown>);
    setBuyers((prev) => [newBuyer, ...prev]);
    return newBuyer;
  };
  const updateBuyer = async (id: string, buyerData: Partial<Buyer>) => {
    const raw = await api(`/procurement/buyers/${id}`, { method: 'PUT', body: JSON.stringify(toDbBuyer(buyerData as unknown as Record<string, unknown>)) });
    const updated = fromDbBuyer(raw as Record<string, unknown>);
    setBuyers((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };
  const deleteBuyer = async (id: string) => {
    await api(`/procurement/buyers/${id}`, { method: 'DELETE' });
    setBuyers((prev) => prev.filter((b) => b.id !== id));
  };
  const clearAllBuyers = async () => {
    await api('/procurement/buyers', { method: 'DELETE' });
    setBuyers([]);
  };

  const addPurchase = async (purchaseData: Omit<PurchaseRecord, 'id'>): Promise<PurchaseRecord> => {
    const raw = await api('/procurement/purchases', { method: 'POST', body: JSON.stringify(toDbPurchase(purchaseData as unknown as Record<string, unknown>)) });
    const newPO = fromDbPurchase(raw as Record<string, unknown>);
    setPurchases((prev) => [newPO, ...prev]);
    return newPO;
  };
  const updatePurchase = async (id: string, purchaseData: Partial<PurchaseRecord>) => {
    const raw = await api(`/procurement/purchases/${id}`, { method: 'PUT', body: JSON.stringify(toDbPurchase(purchaseData as unknown as Record<string, unknown>)) });
    const updated = fromDbPurchase(raw as Record<string, unknown>);
    setPurchases((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };
  const deletePurchase = async (id: string) => {
    await api(`/procurement/purchases/${id}`, { method: 'DELETE' });
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  };
  const clearAllPurchases = async () => {
    await api('/procurement/purchases', { method: 'DELETE' });
    setPurchases([]);
  };

  return (
    <ProcurementContext.Provider
      value={{
        suppliers, buyers, purchases,
        addSupplier, updateSupplier, deleteSupplier, clearAllSuppliers,
        addBuyer, updateBuyer, deleteBuyer, clearAllBuyers,
        addPurchase, updatePurchase, deletePurchase, clearAllPurchases,
      }}
    >
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = (): ProcurementContextType => {
  const context = useContext(ProcurementContext);
  if (!context) throw new Error('useProcurement must be used within a ProcurementProvider');
  return context;
};
