import React from 'react';
import type { StockRow } from '../types';
import { ageInDays } from '../filters';

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100';

export const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800';

export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50';

export const Metric: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
    {hint && <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>}
  </article>
);

export const Panel: React.FC<{
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, action, children }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        {icon && <span className="text-sky-700">{icon}</span>}
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
    <div className="space-y-4 p-4">{children}</div>
  </section>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-slate-700">{label}</span>
    {children}
  </label>
);

export const DataTable: React.FC<{ headers: string[]; rows: string[][]; emptyMessage?: string }> = ({
  headers,
  rows,
  emptyMessage = 'No records yet.',
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[700px] text-left text-xs">
      <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
        <tr>
          {headers.map((header) => (
            <th key={header} className="p-3">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="p-8 text-center text-slate-500">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="odd:bg-white even:bg-slate-50/70">
              {row.map((cell, cellIndex) => (
                <td key={`${cellIndex}-${cell}`} className="p-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export const StockTable: React.FC<{
  rows: StockRow[];
  showAge?: boolean;
  showValue?: boolean;
  emptyMessage?: string;
}> = ({ rows, showAge = false, showValue = false, emptyMessage = 'No stock lines found.' }) => {
  const headers = [
    'Category',
    'Material',
    'Color / Quality',
    'Location',
    'Stock date',
    'Available KG',
    ...(showAge ? ['Age'] : []),
    ...(showValue ? ['Unit Cost', 'Estimated Value'] : []),
  ];

  return (
    <DataTable
      headers={headers}
      emptyMessage={emptyMessage}
      rows={rows.map((row) => [
        row.category,
        row.material,
        [row.color, row.quality].filter(Boolean).join(' / ') || '—',
        row.locationName,
        new Date(row.stockDate).toLocaleDateString(),
        row.kg.toLocaleString(),
        ...(showAge ? [`${ageInDays(row.stockDate)} days`] : []),
        ...(showValue ? [`PKR ${row.unitCost.toLocaleString()}`, `PKR ${(row.kg * row.unitCost).toLocaleString()}`] : []),
      ])}
    />
  );
};

export const AgeBadge: React.FC<{ days: number }> = ({ days }) => {
  const tone =
    days <= 30
      ? 'bg-emerald-100 text-emerald-800'
      : days <= 60
        ? 'bg-sky-100 text-sky-800'
        : days <= 90
          ? 'bg-amber-100 text-amber-900'
          : 'bg-rose-100 text-rose-800';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{days} days</span>;
};
