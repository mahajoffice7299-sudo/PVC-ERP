import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import {
  LayoutDashboard,
  ShoppingCart,
  Recycle,
  Boxes,
  Droplets,
  Factory,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Calculator,
  ClipboardList,
  Package,
  ChartColumn,
  ClipboardCheck,
} from 'lucide-react';

interface SubMenuItem {
  name: string;
  path: string;
  isFocus?: boolean;
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const isProcurementRoute = location.pathname.startsWith('/procurement');
  const isStoresRoute = location.pathname.startsWith('/stores');
  const isInventoryRoute = location.pathname.startsWith('/inventory');
  const isFinanceRoute = location.pathname.startsWith('/finance');
  const isUserManagementRoute = location.pathname.startsWith('/user-management');
  const [procurementOpen, setProcurementOpen] = useState(true);
  const [storesOpen, setStoresOpen] = useState(true);
  const [processingOpen, setProcessingOpen] = useState<Record<string, boolean>>({});
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [inventoryOpenGroups, setInventoryOpenGroups] = useState<Record<string, boolean>>({});
  const [financeOpen, setFinanceOpen] = useState(true);

  // Keep open if currently on any procurement route
  useEffect(() => {
    if (isProcurementRoute) {
      setProcurementOpen(true);
    }
  }, [isProcurementRoute]);

  useEffect(() => {
    if (isStoresRoute) {
      setStoresOpen(true);
    }
  }, [isStoresRoute]);

  const procurementSubMenus: SubMenuItem[] = [
    { name: 'Procurement Dashboard', path: '/procurement/dashboard' },
    { name: 'Buyer Details', path: '/procurement/buyers' },
    { name: 'Supplier Details', path: '/procurement/suppliers' },
    { name: 'Purchase Details', path: '/procurement/purchases', isFocus: true },
  ];

  const inventorySubModules = [
    {
      id: 'stock-management',
      name: 'Stock Management',
      icon: Package,
      basePath: '/inventory/stock-management',
      children: [
        { name: 'Overview', path: '/inventory/stock-management' },
        { name: 'Raw Material Stock', path: '/inventory/stock-management/raw-material' },
        { name: 'Sorted Material Stock', path: '/inventory/stock-management/sorted' },
        { name: 'Washed Material Stock', path: '/inventory/stock-management/washed' },
        { name: 'PET Flakes Stock', path: '/inventory/stock-management/flakes' },
        { name: 'Preform Stock', path: '/inventory/stock-management/preform' },
        { name: 'Bottle Stock', path: '/inventory/stock-management/bottle' },
        { name: 'By-product Stock', path: '/inventory/stock-management/byproduct' },
      ],
    },
    {
      id: 'stock-operations',
      name: 'Stock Operations',
      icon: ClipboardCheck,
      basePath: '/inventory/stock-operations',
      children: [
        { name: 'Overview', path: '/inventory/stock-operations' },
        { name: 'Location-wise Inventory', path: '/inventory/stock-operations/locations' },
        { name: 'Stock Transfers', path: '/inventory/stock-operations/transfers' },
        { name: 'Stock Adjustments', path: '/inventory/stock-operations/adjustments' },
        { name: 'Physical Stock Counts', path: '/inventory/stock-operations/counts' },
      ],
    },
    {
      id: 'inventory-reports',
      name: 'Inventory Reports',
      icon: ChartColumn,
      basePath: '/inventory/reports',
      children: [
        { name: 'Overview', path: '/inventory/reports' },
        { name: 'Inventory Valuation', path: '/inventory/reports/valuation' },
        { name: 'Stock Ageing', path: '/inventory/reports/ageing' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950">
        <div className="bg-white rounded-lg p-1 px-2 flex items-center justify-center">
          <img src={logo} alt="Al Batina Bottlers" className="h-7 w-auto object-contain" />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-white tracking-wide text-sm truncate">Al Batina</h1>
          <p className="text-[10px] text-sky-400 font-medium tracking-wider uppercase">ERP Suite</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Main
        </div>

        {/* Global Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive
                ? 'bg-sky-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </NavLink>

        <div className="pt-3 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Core Modules
        </div>

        {/* Procurement Module with Dropdown Submenus */}
        <div className="rounded-lg overflow-hidden">
          <div
            className={`flex items-center justify-between rounded-lg text-sm font-medium transition ${
              isProcurementRoute
                ? 'bg-slate-800 text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <NavLink to="/procurement/dashboard" className="flex flex-1 items-center gap-3 px-3 py-2.5">
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>Procurement</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setProcurementOpen((prev) => !prev)}
              aria-label={procurementOpen ? 'Collapse Procurement menu' : 'Expand Procurement menu'}
              aria-expanded={procurementOpen}
              className="px-3 py-2.5"
            >
              {procurementOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>

          {/* Submenus */}
          {procurementOpen && (
            <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-3">
              {procurementSubMenus.map((sub) => (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-sky-600 text-white font-bold shadow-sm shadow-sky-950/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-2.5 h-2.5 shrink-0 opacity-60" />
                    <span>{sub.name}</span>
                  </div>
                  {sub.isFocus && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      Focus
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg overflow-hidden">
          <div
            className={`flex items-center justify-between rounded-lg text-sm font-medium transition ${
              isStoresRoute
                ? 'bg-slate-800 text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <NavLink to="/stores/dashboard" className="flex flex-1 items-center gap-3 px-3 py-2.5">
              <Boxes className="w-4 h-4 shrink-0" />
              <span>Stores &amp; Inventory</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setStoresOpen((previous) => !previous)}
              aria-label={storesOpen ? 'Collapse Stores menu' : 'Expand Stores menu'}
              aria-expanded={storesOpen}
              className="px-3 py-2.5"
            >
              {storesOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
          {storesOpen && (
            <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-3">
              {[
                { name: 'Stores Dashboard', path: '/stores/dashboard' },
                { name: 'Store Locations', path: '/stores/locations' },
                { name: 'Unassigned Deliveries', path: '/stores/pending' },
                { name: 'Received Inventory', path: '/stores/inventory' },
              ].map((sub) => (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-sky-600 text-white font-bold shadow-sm shadow-sky-950/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <CircleDot className="w-2.5 h-2.5 shrink-0 opacity-60" />
                  <span>{sub.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {([
          {
            id: 'sorting',
            name: 'Sorting',
            icon: Recycle,
            children: [
              { name: 'Sorting Dashboard', path: '/processing/sorting/dashboard' },
              { name: 'Available Material', path: '/processing/sorting/available' },
              { name: 'Sent to Washing', path: '/processing/sorting/to-wash' },
              { name: 'Sorting Entry', path: '/processing/sorting/entry' },
            ],
          },
          {
            id: 'washing',
            name: 'Washing',
            icon: Droplets,
            children: [
              { name: 'Washing Dashboard', path: '/processing/washing/dashboard' },
              { name: 'Received Material', path: '/processing/washing/received' },
              { name: 'Washing Entry', path: '/processing/washing/entry' },
            ],
          },
          {
            id: 'production',
            name: 'Production',
            icon: Factory,
            children: [
              { name: 'Production Dashboard', path: '/processing/production/dashboard' },
              { name: 'Quality-wise Production', path: '/processing/production/quality' },
              { name: 'Trash / Waste', path: '/processing/production/trash' },
              { name: 'Production Entry', path: '/processing/production/entry' },
            ],
          },
          {
            id: 'sales',
            name: 'Sales',
            icon: TrendingUp,
            children: [
              { name: 'Sales Dashboard', path: '/processing/sales/dashboard' },
              { name: 'Selling History', path: '/processing/sales/history' },
              { name: 'Remaining Stock', path: '/processing/sales/remaining' },
              { name: 'Sales Returns', path: '/processing/sales/returns' },
              { name: 'Sales Entry', path: '/processing/sales/entry' },
            ],
          },
        ]).map((module) => {
          const isActiveModule = location.pathname.startsWith(`/processing/${module.id}`);
          const isOpen = processingOpen[module.id] ?? isActiveModule;
          return (
            <div key={module.id} className="rounded-lg overflow-hidden">
              <div
                className={`flex items-center justify-between rounded-lg text-sm font-medium transition ${
                  isActiveModule
                    ? 'bg-slate-800 text-sky-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                <NavLink to={`/processing/${module.id}/dashboard`} className="flex flex-1 items-center gap-3 px-3 py-2.5">
                  <module.icon className="w-4 h-4 shrink-0" />
                  <span>{module.name}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => setProcessingOpen((previous) => ({ ...previous, [module.id]: !isOpen }))}
                  aria-label={isOpen ? `Collapse ${module.name} menu` : `Expand ${module.name} menu`}
                  aria-expanded={isOpen}
                  className="px-3 py-2.5"
                >
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              {isOpen && (
                <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-3">
                  {module.children.map((sub) => (
                    <NavLink
                      key={sub.path}
                      to={sub.path}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                          isActive
                            ? 'bg-sky-600 text-white font-bold shadow-sm shadow-sky-950/30'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`
                      }
                    >
                      <CircleDot className="w-2.5 h-2.5 shrink-0 opacity-60" />
                      <span>{sub.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-lg overflow-hidden">
          <div
            className={`flex items-center justify-between rounded-lg text-sm font-medium transition ${
              isInventoryRoute ? 'bg-slate-800 text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <NavLink to="/inventory/dashboard" className="flex flex-1 items-center gap-3 px-3 py-2.5">
              <ClipboardList className="h-4 w-4" />
              <span>Inventory</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setInventoryOpen((open) => !open)}
              aria-label={inventoryOpen ? 'Collapse Inventory menu' : 'Expand Inventory menu'}
              aria-expanded={inventoryOpen}
              className="px-3 py-2.5"
            >
              {inventoryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          {(inventoryOpen || isInventoryRoute) && (
            <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-3">
              <NavLink
                to="/inventory/dashboard"
                end
                className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${isActive ? 'bg-sky-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <CircleDot className="h-2.5 w-2.5 shrink-0 opacity-60" />
                <span>Inventory Dashboard</span>
              </NavLink>

              {inventorySubModules.map((module) => {
                const isActiveModule = location.pathname.startsWith(module.basePath);
                const isOpen = inventoryOpenGroups[module.id] ?? isActiveModule;
                return (
                  <div key={module.id} className="rounded-lg overflow-hidden">
                    <div
                      className={`flex items-center justify-between rounded-lg text-xs font-semibold transition ${
                        isActiveModule ? 'bg-slate-800 text-sky-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <NavLink to={module.basePath} className="flex flex-1 items-center gap-2 px-3 py-2">
                        <module.icon className="h-3.5 w-3.5 shrink-0" />
                        {module.name}
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => setInventoryOpenGroups((previous) => ({ ...previous, [module.id]: !isOpen }))}
                        aria-label={isOpen ? `Collapse ${module.name} menu` : `Expand ${module.name} menu`}
                        aria-expanded={isOpen}
                        className="px-2.5 py-2"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                    </div>
                    {isOpen && (
                      <div className="mt-1 ml-3 space-y-1 border-l border-slate-700 pl-3">
                        {module.children.map((sub) => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            end={sub.path === module.basePath}
                            className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${isActive ? 'bg-sky-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                          >
                            <CircleDot className="h-2 w-2 shrink-0 opacity-60" />
                            <span>{sub.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg overflow-hidden">
          <div
            className={`flex items-center justify-between rounded-lg text-sm font-medium transition ${
              isFinanceRoute ? 'bg-slate-800 text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <NavLink to="/finance/dashboard" className="flex flex-1 items-center gap-3 px-3 py-2.5">
              <Calculator className="h-4 w-4" />
              <span>Finance</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setFinanceOpen((open) => !open)}
              aria-label={financeOpen ? 'Collapse Finance menu' : 'Expand Finance menu'}
              aria-expanded={financeOpen}
              className="px-3 py-2.5"
            >
              {financeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
          {(financeOpen || isFinanceRoute) && (
            <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-3">
              {[
                ['Finance Dashboard', '/finance/dashboard'],
                ['Costing Details', '/finance/costing'],
                ['Tax Details', '/finance/tax'],
              ].map(([name, path]) => (
                <NavLink key={path} to={path} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${isActive ? 'bg-sky-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                  <CircleDot className="h-2.5 w-2.5 shrink-0 opacity-60" /><span>{name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/user-management" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive || isUserManagementRoute ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}>
          <Users className="h-4 w-4 shrink-0" /><span>User Management</span>
        </NavLink>

      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        Al Batina Bottlers ERP v1.0
      </div>
    </aside>
  );
};
