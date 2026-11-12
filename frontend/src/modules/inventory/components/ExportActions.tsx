import React from 'react';
import { FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import { exportSheetsToExcel, exportSheetsToPdf, printReport, type ExportSheet } from '../inventoryExport';
import { secondaryButtonClass } from './InventoryUI';

export const ExportActions: React.FC<{
  sheets: ExportSheet[];
  pdf: { title: string; subtitle: string; summary?: string; filename: string; page?: 'portrait' | 'landscape' };
  excelFilename: string;
  disabled?: boolean;
}> = ({ sheets, pdf, excelFilename, disabled = false }) => (
  <div className="flex flex-wrap gap-2 print:hidden">
    <button
      type="button"
      disabled={disabled}
      onClick={() => exportSheetsToExcel(sheets, excelFilename)}
      className={secondaryButtonClass}
    >
      <FileSpreadsheet className="h-3.5 w-3.5" />
      Export Excel
    </button>
    <button
      type="button"
      disabled={disabled}
      onClick={() => exportSheetsToPdf(sheets, pdf)}
      className={secondaryButtonClass}
    >
      <FileDown className="h-3.5 w-3.5" />
      Export PDF
    </button>
    <button type="button" disabled={disabled} onClick={printReport} className={secondaryButtonClass}>
      <Printer className="h-3.5 w-3.5" />
      Print Report
    </button>
  </div>
);
