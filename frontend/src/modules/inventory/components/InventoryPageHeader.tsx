import React from 'react';
import { ChevronRight } from 'lucide-react';

export const InventoryPageHeader: React.FC<{
  section: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}> = ({ section, title, description, icon, action }) => (
  <header className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-6 shadow-sm print:bg-white print:border-slate-300">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-4">
        <div className="hidden rounded-2xl bg-sky-600 p-3 text-white shadow-lg shadow-sky-600/20 sm:block print:hidden">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 print:text-slate-700">
            <span>Inventory</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-sky-700">{section}</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {action && <div className="print:hidden">{action}</div>}
    </div>
  </header>
);
