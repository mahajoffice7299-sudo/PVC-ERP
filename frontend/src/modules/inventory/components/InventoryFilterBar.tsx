import React from 'react';
import { CalendarRange, Funnel, MapPin, PackageSearch, RefreshCw } from 'lucide-react';
import { useStores } from '../../stores/StoreContext';
import { useInventory } from '../InventoryContext';
import { inputClass, secondaryButtonClass } from './InventoryUI';

export const InventoryFilterBar: React.FC<{
  showLocation?: boolean;
  showMaterial?: boolean;
}> = ({ showLocation = true, showMaterial = true }) => {
  const { stores } = useStores();
  const { filters, setFilter, resetFilters } = useInventory();

  const active =
    Boolean(filters.fromDate) ||
    Boolean(filters.toDate) ||
    Boolean(filters.locationId) ||
    Boolean(filters.material.trim());

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-sky-50 p-2 text-sky-700">
            <Funnel className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Report Filters</h2>
            <p className="text-xs text-slate-500">Narrow down stock, movements and reports before exporting.</p>
          </div>
        </div>
        {active && (
          <button type="button" onClick={resetFilters} className={secondaryButtonClass}>
            <RefreshCw className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <CalendarRange className="h-3.5 w-3.5" /> From Date
          </span>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(event) => setFilter('fromDate', event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <CalendarRange className="h-3.5 w-3.5" /> To Date
          </span>
          <input
            type="date"
            value={filters.toDate}
            onChange={(event) => setFilter('toDate', event.target.value)}
            className={inputClass}
          />
        </label>

        {showLocation && (
          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <MapPin className="h-3.5 w-3.5" /> Location
            </span>
            <select
              value={filters.locationId}
              onChange={(event) => setFilter('locationId', event.target.value)}
              className={inputClass}
            >
              <option value="">All locations</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {showMaterial && (
          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <PackageSearch className="h-3.5 w-3.5" /> Material
            </span>
            <input
              type="search"
              placeholder="Search material, color or quality"
              value={filters.material}
              onChange={(event) => setFilter('material', event.target.value)}
              className={inputClass}
            />
          </label>
        )}
      </div>
    </section>
  );
};
