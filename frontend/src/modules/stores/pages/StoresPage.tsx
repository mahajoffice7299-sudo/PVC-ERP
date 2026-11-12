import React, { useState } from 'react';
import {
  AlertCircle,
  Boxes,
  CalendarDays,
  ClipboardList,
  MapPin,
  PackageCheck,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Truck,
  Warehouse,
  X,
} from 'lucide-react';
import { useProcurement } from '../../procurement/ProcurementContext';
import type { PurchaseRecord } from '../../procurement/types';
import { useStores } from '../StoreContext';

type StoresSection = 'dashboard' | 'locations' | 'pending' | 'inventory';

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getStoreAddress = (store: { locationNumber: string; address: string; location?: string }) =>
  [store.locationNumber && `#${store.locationNumber}`, store.address || store.location]
    .filter(Boolean)
    .join(' · ');

export const StoresPage: React.FC<{ section: StoresSection }> = ({ section }) => {
  const {
    stores,
    receipts,
    transfers,
    addStore,
    updateStore,
    deleteStore,
    deleteAllStores,
    receivePurchase,
    availableReceiptKg,
  } = useStores();
  const { purchases, updatePurchase } = useProcurement();
  const [storeName, setStoreName] = useState('');
  const [storeLocationNumber, setStoreLocationNumber] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('All');
  const [error, setError] = useState<string | null>(null);
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseRecord | null>(null);
  const [receivingStoreId, setReceivingStoreId] = useState('');
  const [todayKey] = useState(() => getDateKey(new Date()));
  const [last7DaysStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return getDateKey(date);
  });

  const storeSummaries = stores.map((store) => {
    const storeReceipts = receipts.filter((receipt) => receipt.storeId === store.id);
    const materialKeys = new Set(
      storeReceipts.map((receipt) =>
        JSON.stringify([
          receipt.purchase.materialType,
          receipt.purchase.color,
          receipt.purchase.grade,
          receipt.purchase.condition,
        ])
      )
    );
    return {
      ...store,
      receiptCount: storeReceipts.length,
      totalKg: storeReceipts.reduce((total, receipt) => total + availableReceiptKg(receipt.id), 0),
      materialCount: materialKeys.size,
    };
  });

  const visibleReceipts = receipts.filter(
    (receipt) => selectedStoreId === 'All' || receipt.storeId === selectedStoreId
  );
  const pendingPurchases = purchases.filter(
    (purchase) =>
      purchase.status !== 'Draft' &&
      !receipts.some((receipt) => receipt.purchaseId === purchase.id)
  );
  const totalStockKg = receipts.reduce((total, receipt) => total + availableReceiptKg(receipt.id), 0);
  const getReceiptDateKey = (receivedAt: string) => getDateKey(new Date(receivedAt));
  const todayReceipts = receipts.filter((receipt) => getReceiptDateKey(receipt.receivedAt) === todayKey);
  const last7DaysReceipts = receipts.filter((receipt) => {
    const dateKey = getReceiptDateKey(receipt.receivedAt);
    return dateKey >= last7DaysStart && dateKey <= todayKey;
  });
  const todayReceivedKg = todayReceipts.reduce((total, receipt) => total + receipt.receivedKg, 0);
  const last7DaysReceivedKg = last7DaysReceipts.reduce((total, receipt) => total + receipt.receivedKg, 0);
  const storeStockMetrics = stores.map((store) => {
    const storeReceipts = receipts.filter((receipt) => receipt.storeId === store.id);
    const todayStoreReceipts = todayReceipts.filter((receipt) => receipt.storeId === store.id);
    const last7DayStoreReceipts = last7DaysReceipts.filter((receipt) => receipt.storeId === store.id);
    return {
      ...store,
      stockKg: storeReceipts.reduce((total, receipt) => total + availableReceiptKg(receipt.id), 0),
      todayKg: todayStoreReceipts.reduce((total, receipt) => total + receipt.receivedKg, 0),
      todayDeliveries: todayStoreReceipts.length,
      last7DaysKg: last7DayStoreReceipts.reduce((total, receipt) => total + receipt.receivedKg, 0),
      last7DaysDeliveries: last7DayStoreReceipts.length,
    };
  });

  const handleAddStore = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!storeName.trim() || !storeLocationNumber.trim() || !storeAddress.trim()) {
      setError('Enter the store name, location number, and address.');
      return;
    }

    const storeData = {
      name: storeName.trim(),
      locationNumber: storeLocationNumber.trim(),
      address: storeAddress.trim(),
    };
    if (editingStoreId) {
      await updateStore(editingStoreId, storeData);
    } else {
      const created = await addStore(storeData);
      setSelectedStoreId(created.id);
    }
    setStoreName('');
    setStoreLocationNumber('');
    setStoreAddress('');
    setIsAddStoreOpen(false);
    setEditingStoreId(null);
  };

  const handleOpenAddStore = () => {
    setError(null);
    setEditingStoreId(null);
    setStoreName('');
    setStoreLocationNumber('');
    setStoreAddress('');
    setIsAddStoreOpen(true);
  };

  const handleOpenEditStore = (store: (typeof stores)[number]) => {
    setError(null);
    setEditingStoreId(store.id);
    setStoreName(store.name);
    setStoreLocationNumber(store.locationNumber);
    setStoreAddress(store.address || store.location || '');
    setIsAddStoreOpen(true);
  };

  const handleDeleteStore = async (storeId: string, name: string) => {
    if (!window.confirm(`Delete store "${name}"?`)) return;
    if (!(await deleteStore(storeId))) {
      setError('This store has received inventory and cannot be deleted.');
      return;
    }
    purchases
      .filter((purchase) => purchase.storeId === storeId)
      .forEach((purchase) => updatePurchase(purchase.id, { storeId: undefined }));
    if (selectedStoreId === storeId) setSelectedStoreId('All');
  };

  const handleDeleteAllStores = () => {
    if (stores.length === 0) return;
    if (!window.confirm(`Delete all ${stores.length} stores? This cannot be undone. Stores with received inventory will be protected.`)) return;
    if (!deleteAllStores()) {
      setError('Stores cannot be deleted while received inventory is assigned to them.');
      return;
    }
    purchases
      .filter((purchase) => purchase.storeId)
      .forEach((purchase) => updatePurchase(purchase.id, { storeId: undefined }));
    setSelectedStoreId('All');
    setError(null);
  };

  const handleReceivePurchase = async () => {
    if (!receivingPurchase || !receivingStoreId) return;
    const received = await receivePurchase(receivingPurchase, receivingStoreId);
    if (!received) {
      setError('This delivery could not be received. It may already be recorded or the store no longer exists.');
      return;
    }
    await updatePurchase(receivingPurchase.id, { status: 'Completed', storeId: receivingStoreId });
    setReceivingPurchase(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
          <span>Inventory</span>
          <span>/</span>
          <span className="font-semibold text-sky-700">Stores & Inventory</span>
        </div>
        <div className="mt-3 flex items-start gap-4">
          <div className="hidden rounded-2xl bg-sky-600 p-3 text-white shadow-lg shadow-sky-600/20 sm:block">
            <Warehouse className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              {section === 'locations' && 'Store Locations'}
              {section === 'pending' && 'Unassigned Deliveries'}
              {section === 'inventory' && 'Received Inventory'}
              {section === 'dashboard' && 'Stores Dashboard'}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {section === 'locations' && 'Create and manage storage locations for purchased materials.'}
              {section === 'pending' && 'Assign completed or pending purchase deliveries to a store.'}
              {section === 'inventory' && 'Review received stock and purchase details by store.'}
              {section === 'dashboard' && 'Track total stock, recent receipts, and purchases that still need a store assignment.'}
            </p>
          </div>
        </div>
      </header>

      {section !== 'dashboard' && <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Store Locations', value: stores.length, icon: Warehouse, iconClass: 'bg-sky-100 text-sky-800' },
          { label: 'Awaiting Assignment', value: pendingPurchases.length, icon: Truck, iconClass: 'bg-amber-100 text-amber-800' },
          { label: 'Received Deliveries', value: `${receipts.length} · ${totalStockKg.toLocaleString()} KG`, icon: PackageCheck, iconClass: 'bg-emerald-100 text-emerald-800' },
        ].map(({ label, value, icon: Icon, iconClass }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`rounded-xl p-3 ${iconClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </section>}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-800 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {section === 'dashboard' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Total Stores', value: stores.length.toLocaleString(), detail: 'Active locations', icon: Warehouse, style: 'bg-sky-100 text-sky-800' },
              { label: 'Current Stock', value: `${totalStockKg.toLocaleString()} KG`, detail: `${receipts.length} received deliveries`, icon: Boxes, style: 'bg-indigo-100 text-indigo-800' },
              { label: "Received Today", value: `${todayReceivedKg.toLocaleString()} KG`, detail: `${todayReceipts.length} deliveries`, icon: CalendarDays, style: 'bg-emerald-100 text-emerald-800' },
              { label: 'Last 7 Days', value: `${last7DaysReceivedKg.toLocaleString()} KG`, detail: `${last7DaysReceipts.length} deliveries`, icon: Scale, style: 'bg-violet-100 text-violet-800' },
              { label: 'Unassigned Purchases', value: pendingPurchases.length.toLocaleString(), detail: 'Waiting for a store', icon: Truck, style: 'bg-amber-100 text-amber-900' },
            ].map(({ label, value, detail, icon: Icon, style }) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</p>
                  <div className={`rounded-xl p-2.5 ${style}`}><Icon className="h-5 w-5" /></div>
                </div>
                <p className="mt-4 text-2xl font-extrabold text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-sky-700" />
                <h2 className="text-sm font-bold text-slate-900">Stock by Store</h2>
              </div>
              <p className="mt-1 text-xs text-slate-600">Current stock and delivery intake for each location.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                  <tr>
                    <th className="px-5 py-3">Store</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3 text-right">Current Stock</th>
                    <th className="px-5 py-3 text-right">Today</th>
                    <th className="px-5 py-3 text-right">Last 7 Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeStockMetrics.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No stores created yet. Add a location to start tracking stock.</td></tr>
                  ) : storeStockMetrics.map((store) => (
                    <tr key={store.id} className="text-slate-800 odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/70">
                      <td className="px-5 py-3 font-bold">{store.name}</td>
                      <td className="px-5 py-3 text-slate-600">{getStoreAddress(store)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold">{store.stockKg.toLocaleString()} KG</td>
                      <td className="px-5 py-3 text-right font-mono">
                        <span className="font-semibold">{store.todayKg.toLocaleString()} KG</span>
                        <span className="ml-1 text-xs text-slate-500">({store.todayDeliveries})</span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        <span className="font-semibold">{store.last7DaysKg.toLocaleString()} KG</span>
                        <span className="ml-1 text-xs text-slate-500">({store.last7DaysDeliveries})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/70 p-4">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><PackageCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Today’s Store Receipts</h2>
                <p className="mt-1 text-xs text-slate-600">{todayReceipts.length} deliveries · {todayReceivedKg.toLocaleString()} KG received today</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Purchase</th>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 text-right">Received Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayReceipts.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No store receipts recorded today.</td></tr>
                  ) : todayReceipts.map((receipt) => (
                    <tr key={receipt.id} className="text-slate-800 odd:bg-white even:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold">{stores.find((store) => store.id === receipt.storeId)?.name || 'Store removed'}</td>
                      <td className="px-4 py-3">{receipt.purchase.poNumber} · {receipt.purchase.vehicleNumber}</td>
                      <td className="px-4 py-3">{[receipt.purchase.materialType, receipt.purchase.color, receipt.purchase.grade, receipt.purchase.condition].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="px-4 py-3">{receipt.purchase.supplierName}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{receipt.receivedKg.toLocaleString()} KG</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {section === 'locations' && <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2 text-sky-700"><Warehouse className="h-4 w-4" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Store Locations</h2>
              <p className="text-xs text-slate-500">Set up destinations for receiving materials.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {stores.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAllStores}
                title={receipts.length > 0 ? 'Stores with received inventory are protected from deletion' : 'Delete all stores'}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete All Stores
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenAddStore}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <Plus className="h-4 w-4" />
              Add Store
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">Your Store Locations</h2>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">{stores.length} stores</span>
        </div>
        {stores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Warehouse className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No stores created yet</p>
            <p className="mt-1 text-xs text-slate-500">Create a store before receiving a purchase delivery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {storeSummaries.map((store) => (
              <article key={store.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg">
                <div className="h-1.5 bg-gradient-to-r from-sky-500 to-indigo-500" />
                <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-950">{store.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="h-3.5 w-3.5" />
                        {store.locationNumber ? `Location #${store.locationNumber}` : 'Location number not set'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{store.address || store.location || 'Address not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditStore(store)}
                      title={`Edit ${store.name}`}
                      aria-label={`Edit ${store.name}`}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStore(store.id, store.name)}
                      title={store.receiptCount > 0 ? 'Stores with inventory cannot be deleted' : `Delete ${store.name}`}
                      aria-label={`Delete ${store.name}`}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={store.receiptCount > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                  <div>
                    <p className="text-lg font-extrabold text-slate-950">{store.totalKg.toLocaleString()}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Stock KG</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-slate-950">{store.materialCount}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Materials</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-slate-950">{store.receiptCount}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Deliveries</p>
                  </div>
                </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      </>}

      {section === 'pending' && (
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50/70 p-4">
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><ClipboardList className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Unassigned / Awaiting Store Assignment</h2>
              <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-950">{pendingPurchases.length} pending</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">Deliveries saved without a destination store appear here. Assign each delivery manually.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-4 py-3">Purchase / Date</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3 text-right">Net KG</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No eligible deliveries are awaiting receipt.
                  </td>
                </tr>
              ) : pendingPurchases.map((purchase) => (
                <tr key={purchase.id} className="text-slate-800 odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{purchase.poNumber} · {purchase.vehicleNumber}</div>
                    <div className="text-slate-500">{purchase.purchaseDate}</div>
                  </td>
                  <td className="px-4 py-3">
                    {[purchase.materialType, purchase.color, purchase.grade, purchase.condition].filter(Boolean).join(' / ') || 'Material not specified'}
                  </td>
                  <td className="px-4 py-3">{purchase.supplierName}</td>
                  <td className="px-4 py-3">{purchase.buyerName}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{purchase.netWeightKg.toLocaleString()}</td>
                  <td className="px-4 py-3">{purchase.status}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={stores.length === 0}
                      onClick={() => {
                        setReceivingPurchase(purchase);
                        setReceivingStoreId(purchase.storeId || '');
                      }}
                      className="rounded-lg bg-sky-700 px-3.5 py-2 font-bold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Assign to Store
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {section === 'inventory' && (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">Received Material Details</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">{visibleReceipts.length} records</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">Purchase details are recorded here when a delivery is received.</p>
          </div>
          <select
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
            aria-label="Filter receipts by store"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="All">All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1750px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Purchase Date</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">PO / Truck</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Supplier / Buyer</th>
                <th className="px-4 py-3 text-right">Gross / Tare (KG)</th>
                <th className="px-4 py-3 text-right">Received Net (KG)</th>
                <th className="px-4 py-3 text-right">Transferred (KG)</th>
                <th className="px-4 py-3 text-right">Remaining (KG)</th>
                <th className="px-4 py-3 text-right">Rate / KG</th>
                <th className="px-4 py-3 text-right">Total (PKR)</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Paid / Payable (PKR)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleReceipts.length === 0 ? (
                <tr>
                  <td colSpan={19} className="px-4 py-10 text-center text-slate-500">
                    No received deliveries to display.
                  </td>
                </tr>
              ) : visibleReceipts.map((receipt) => {
                const purchase = receipt.purchase;
                const store = stores.find((item) => item.id === receipt.storeId);
                const transferredKg = transfers
                  .filter((transfer) => transfer.receiptId === receipt.id)
                  .reduce((total, transfer) => total + transfer.transferredKg, 0);
                const remainingKg = availableReceiptKg(receipt.id);
                return (
                  <tr key={receipt.id} className="text-slate-800 odd:bg-white even:bg-slate-50/70 hover:bg-sky-50/70">
                    <td className="whitespace-nowrap px-4 py-3">{new Date(receipt.receivedAt).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-4 py-3">{purchase.purchaseDate}</td>
                    <td className="px-4 py-3 font-semibold">{store?.name || 'Store removed'}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{purchase.poNumber}</div>
                      <div className="text-slate-500">{purchase.vehicleNumber}</div>
                    </td>
                    <td className="px-4 py-3">{purchase.materialType || '—'}</td>
                    <td className="px-4 py-3">{purchase.color || '—'}</td>
                    <td className="px-4 py-3">{purchase.grade || '—'}</td>
                    <td className="px-4 py-3">{purchase.condition || '—'}</td>
                    <td className="px-4 py-3">
                      <div>{purchase.supplierName}</div>
                      <div className="text-slate-500">{purchase.buyerName}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{purchase.grossWeightKg.toLocaleString()} / {purchase.tareWeightKg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{receipt.receivedKg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{transferredKg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-800">{remainingKg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{purchase.ratePerKg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{purchase.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">{purchase.paymentType}</td>
                    <td className="px-4 py-3 text-right font-mono">{purchase.paidAmount.toLocaleString()} / {purchase.payableAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">{purchase.status}</td>
                    <td className="max-w-48 truncate px-4 py-3" title={purchase.notes}>{purchase.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {isAddStoreOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsAddStoreOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-store-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-2.5 text-sky-800">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                          <h2 id="add-store-title" className="text-lg font-bold text-slate-950">
                            {editingStoreId ? 'Edit Store' : 'Add Store'}
                          </h2>
                          <p className="mt-0.5 text-xs text-slate-600">Enter the store name, location number, and address.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close add store dialog"
                onClick={() => setIsAddStoreOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddStore} className="space-y-4 p-6">
              <div>
                <label htmlFor="store-name" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Store Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="store-name"
                  autoFocus
                  required
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="e.g. Main Warehouse"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label htmlFor="store-location-number" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Location Number <span className="text-rose-600">*</span>
                </label>
                <input
                  id="store-location-number"
                  required
                  value={storeLocationNumber}
                  onChange={(event) => setStoreLocationNumber(event.target.value)}
                  placeholder="e.g. WH-01"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label htmlFor="store-address" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Store Address <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="store-address"
                  required
                  rows={3}
                  value={storeAddress}
                  onChange={(event) => setStoreAddress(event.target.value)}
                  placeholder="Enter the full store address"
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddStoreOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <Plus className="h-4 w-4" />
                  {editingStoreId ? 'Save Changes' : 'Save Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receivingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Receive Purchase Delivery</h2>
              <p className="mt-1 text-xs text-slate-500">
                {receivingPurchase.poNumber} · {receivingPurchase.netWeightKg.toLocaleString()} KG will be added to store stock.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Destination Store</label>
              <select
                value={receivingStoreId}
                onChange={(event) => setReceivingStoreId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Select a store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name} — {getStoreAddress(store)}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setReceivingPurchase(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!receivingStoreId}
                onClick={handleReceivePurchase}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
