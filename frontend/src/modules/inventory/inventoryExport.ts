import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportCell = string | number;

export interface ExportSheet {
  sheetName: string;
  headers: string[];
  rows: ExportCell[][];
}

export function exportSheetsToExcel(sheets: ExportSheet[], filename: string) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    worksheet['!cols'] = sheet.headers.map((_, columnIndex) => {
      const longest = sheet.rows.reduce(
        (max, row) => Math.max(max, String(row[columnIndex] ?? '').length),
        sheet.headers[columnIndex]?.length ?? 0
      );
      return { wch: Math.min(42, Math.max(12, longest + 2)) };
    });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName.slice(0, 31));
  }

  XLSX.writeFile(workbook, filename);
}

export interface PdfExportOptions {
  title: string;
  subtitle: string;
  summary?: string;
  filename: string;
  page?: 'portrait' | 'landscape';
}

export function exportSheetsToPdf(sheets: ExportSheet[], options: PdfExportOptions) {
  const doc = new jsPDF({
    orientation: options.page ?? 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Al Batina Bottlers - PVC Manufacturing ERP', 14, 10);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(186, 230, 253);
    doc.text(options.title, 14, 15);
    doc.text(options.subtitle, 14, 20);

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 15, { align: 'right' });
  };

  const drawFooter = (data: { pageNumber: number }) => {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${data.pageNumber} - Confidential & Proprietary - Al Batina Bottlers`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  };

  drawHeader();

  let startY = 30;

  if (options.summary) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 28, pageWidth - 28, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 28, pageWidth - 28, 14, 2, 2, 'D');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(options.summary, 18, 37);
    startY = 46;
  }

  sheets.forEach((sheet, index) => {
    if (index > 0) {
      doc.addPage();
      drawHeader();
      startY = 30;
    }

    if (sheets.length > 1) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(sheet.sheetName, 14, startY);
      startY += 6;
    }

    autoTable(doc, {
      head: [sheet.headers],
      body: sheet.rows.map((row) => row.map((cell) => String(cell))),
      startY,
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: drawFooter,
    });
  });

  doc.save(options.filename);
}

export function printReport() {
  window.print();
}
