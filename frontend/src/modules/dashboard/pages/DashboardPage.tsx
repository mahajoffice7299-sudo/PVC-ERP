import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  Calculator,
  ClipboardList,
  Droplets,
  Factory,
  Recycle,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useProcurement } from '../../procurement/ProcurementContext';
import { useStores } from '../../stores/StoreContext';
import { useProcessing } from '../../processing/ProcessingContext';

const modules = [
  { title: 'Procurement', description: 'Purchases, suppliers, buyers, and delivery tracking.', path: '/procurement/dashboard', icon: ShoppingCart, color: 'text-blue-700', bg: 'bg-blue-50' },
  { title: 'Stores', description: 'Store locations, receipts, and assigned inventory.', path: '/stores/dashboard', icon: Store, color: 'text-indigo-700', bg: 'bg-indigo-50' },
  { title: 'Sorting', description: 'Sort received material into tracked streams.', path: '/processing/sorting/dashboard', icon: Recycle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { title: 'Washing', description: 'Track washed material, output, and waste.', path: '/processing/washing/dashboard', icon: Droplets, color: 'text-cyan-700', bg: 'bg-cyan-50' },
  { title: 'Production', description: 'Record quality-wise flakes, dust, and waste.', path: '/processing/production/dashboard', icon: Factory, color: 'text-orange-700', bg: 'bg-orange-50' },
  { title: 'Sales', description: 'Record sales, returns, and remaining stock.', path: '/processing/sales/dashboard', icon: TrendingUp, color: 'text-violet-700', bg: 'bg-violet-50' },
  { title: 'Inventory', description: 'Reconcile stock, locations, transfers, and valuation.', path: '/inventory/dashboard', icon: ClipboardList, color: 'text-sky-700', bg: 'bg-sky-50' },
  { title: 'Finance', description: 'Review costing and estimated tax details.', path: '/finance/dashboard', icon: Calculator, color: 'text-teal-700', bg: 'bg-teal-50' },
  { title: 'User Management', description: 'Manage the local prototype user list and roles.', path: '/user-management', icon: Users, color: 'text-fuchsia-700', bg: 'bg-fuchsia-50' },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { purchases } = useProcurement();
  const { stores, receipts, availableReceiptKg } = useStores();
  const { sortingBatches, washingBatches, productionBatches, sales } = useProcessing();

  const currentStoreKg = receipts.reduce((sum, receipt) => sum + availableReceiptKg(receipt.id), 0);
  const pendingPurchases = purchases.filter((purchase) => purchase.status !== 'Completed').length;
  const producedFlakesKg = productionBatches.reduce((sum, batch) => sum + batch.flakesKg, 0);
  const salesRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const metrics = [
    { name: 'Stores', value: stores.length.toLocaleString(), detail: 'Active locations', icon: Store, color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { name: 'Store Material', value: `${currentStoreKg.toLocaleString()} KG`, detail: 'Available to process', icon: Boxes, color: 'text-blue-700', bg: 'bg-blue-50' },
    { name: 'Pending Purchases', value: pendingPurchases.toLocaleString(), detail: 'Awaiting completion', icon: ShoppingCart, color: 'text-amber-700', bg: 'bg-amber-50' },
    { name: 'PET Flakes Produced', value: `${producedFlakesKg.toLocaleString()} KG`, detail: `${sortingBatches.length} sorting · ${washingBatches.length} washing batches`, icon: Factory, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { name: 'Sales Revenue', value: `PKR ${salesRevenue.toLocaleString()}`, detail: `${sales.length} recorded sales`, icon: TrendingUp, color: 'text-violet-700', bg: 'bg-violet-50' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 rounded-2xl bg-sky-100 p-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-blue-100">Operations Overview</p>
          <h1 className="mt-1 text-2xl font-extrabold">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">Your procurement, stores, recycling operations, inventory, finance, and administration at a glance.</p>
        </div>
        <div className="rounded-xl bg-white/10 p-3 text-sm font-semibold backdrop-blur-sm">
          All modules in one place
        </div>
      </header>

      <section aria-label="Business summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <article key={metric.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{metric.name}</p>
              <span className={`rounded-lg p-2 ${metric.bg} ${metric.color}`}><metric.icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 text-xl font-extrabold text-slate-950">{metric.value}</p>
            <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-slate-950">ERP Modules</h2>
          <p className="mt-1 text-sm text-slate-600">Choose a module to view details or continue your work.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <NavLink
              key={module.path}
              to={module.path}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className={`rounded-xl p-3 ${module.bg} ${module.color}`}><module.icon className="h-5 w-5" /></span>
                <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-sky-700" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{module.title}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">{module.description}</p>
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  );
};
