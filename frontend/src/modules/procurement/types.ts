export type PurchaseRecordStatus = 'Draft' | 'Pending Approval' | 'Completed';

export type PaymentType = 'Cash' | 'Card' | 'Credit' | 'Mixed';

export interface PurchaseRecord {
  id: string;
  poNumber: string;
  purchaseDate: string;
  supplierId?: string;
  supplierName: string;
  buyerName: string;
  vehicleNumber: string;
  materialType?: string;
  color?: string;
  grade?: string;
  condition?: string;
  storeId?: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number; // Gross - Tare
  ratePerKg: number;
  totalAmount: number; // Net * Rate
  paymentType: PaymentType;
  paidAmount: number;
  payableAmount: number; // Total - Paid
  status: PurchaseRecordStatus;
  currency: string;
  notes?: string;
}

// Backward compatibility alias if needed
export type PurchaseOrder = PurchaseRecord;
export type POStatus = PurchaseRecordStatus;
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';

export interface Buyer {
  id: string;
  name: string;
  contact: string;
  email: string;
  buyerCode?: string;
  department?: string;
  designation?: string;
  spendingLimit?: number;
  activeOrdersCount?: number;
  status?: 'Active' | 'Inactive';
}

export interface Supplier {
  id: string;
  name: string;
  phoneNumber: string;
  shopAddress: string;
  companyName?: string;
  supplierCode?: string;
  category?: string;
  contactPerson?: string;
  email?: string;
  city?: string;
  country?: string;
  paymentTerms?: string;
  rating?: number;
  status?: 'Active' | 'Pending' | 'Blocked';
}
