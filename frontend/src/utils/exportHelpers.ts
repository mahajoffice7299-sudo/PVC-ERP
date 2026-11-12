import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseRecord } from '../modules/procurement/types';

export function exportPurchasesToExcel(
  records: PurchaseRecord[],
  filename: string = 'Purchase_Details_Report.xlsx'
) {
  // Format rows for Excel
  const rows = records.map((r, index) => ({
    'Sr#': index + 1,
    'PO Number': r.poNumber,
    'Purchase Date': r.purchaseDate,
    'Vehicle / Truck #': r.vehicleNumber,
    'Supplier': r.supplierName,
    'Buyer': r.buyerName,
    'Material Type': r.materialType || '',
    'Color': r.color || '',
    'Grade': r.grade || '',
    'Condition': r.condition || '',
    'Gross Weight (KG)': r.grossWeightKg,
    'Tare Weight (KG)': r.tareWeightKg,
    'Net Weight (KG)': r.netWeightKg,
    'Rate per KG (PKR)': r.ratePerKg,
    'Total Amount (PKR)': r.totalAmount,
    'Payment Type': r.paymentType,
    'Paid Amount (PKR)': r.paidAmount,
    'Payable Balance (PKR)': r.payableAmount,
    'Record Status': r.status,
    'Notes': r.notes || '',
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // Sr#
    { wch: 15 }, // PO Number
    { wch: 14 }, // Date
    { wch: 16 }, // Vehicle #
    { wch: 28 }, // Supplier
    { wch: 20 }, // Buyer
    { wch: 20 }, // Material Type
    { wch: 14 }, // Color
    { wch: 16 }, // Grade
    { wch: 18 }, // Condition
    { wch: 16 }, // Gross
    { wch: 16 }, // Tare
    { wch: 16 }, // Net
    { wch: 16 }, // Rate
    { wch: 18 }, // Total
    { wch: 14 }, // Payment
    { wch: 18 }, // Paid
    { wch: 18 }, // Payable
    { wch: 16 }, // Status
    { wch: 30 }, // Notes
  ];

  // Create workbook and write
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Records');

  XLSX.writeFile(workbook, filename);
}

export function exportPurchasesToPDF(
  records: PurchaseRecord[],
  filename: string = 'Purchase_Details_Report.pdf'
) {
  // Landscape orientation for wide ERP table
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate totals
  const totalAmount = records.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalNetWeight = records.reduce((sum, r) => sum + r.netWeightKg, 0);
  const totalPayable = records.reduce((sum, r) => sum + r.payableAmount, 0);

  // Header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 297, 24, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Al Batina Bottlers - PVC Manufacturing ERP', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253); // sky-200
  doc.text('Purchase Details, Weighbridge Measurement & Payment Report', 14, 18);

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${dateStr}`, 283, 15, { align: 'right' });

  // Summary Metrics Bar
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 28, 269, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 28, 269, 14, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600

  doc.text(
    `Total Records: ${records.length} Loads   |   Total Net Weight: ${(totalNetWeight / 1000).toFixed(2)} Tons (${totalNetWeight.toLocaleString()} KG)   |   Total Purchase: Rs. ${totalAmount.toLocaleString()}   |   Outstanding Payable: Rs. ${totalPayable.toLocaleString()}`,
    18,
    37
  );

  // Table Data
  const tableHeaders = [
    'PO Number',
    'Date',
    'Vehicle #',
    'Supplier',
    'Buyer',
    'Material',
    'Gross',
    'Tare',
    'Net (KG)',
    'Rate/KG',
    'Total (PKR)',
    'Type',
    'Payable',
    'Status',
  ];

  const tableBody = records.map((r) => [
    r.poNumber,
    r.purchaseDate,
    r.vehicleNumber,
    r.supplierName,
    r.buyerName,
    [r.materialType, r.color, r.grade, r.condition].filter(Boolean).join(' / ') || '—',
    r.grossWeightKg.toLocaleString(),
    r.tareWeightKg.toLocaleString(),
    r.netWeightKg.toLocaleString(),
    `Rs. ${r.ratePerKg}`,
    `Rs. ${r.totalAmount.toLocaleString()}`,
    r.paymentType,
    r.payableAmount > 0 ? `Rs. ${r.payableAmount.toLocaleString()}` : 'Settled',
    r.status,
  ]);

  autoTable(doc, {
    head: [tableHeaders],
    body: tableBody,
    startY: 46,
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 18 }, // PO
      1: { cellWidth: 16 }, // Date
      2: { cellWidth: 18 }, // Truck
      3: { cellWidth: 30 }, // Supplier
      4: { cellWidth: 22 }, // Buyer
      5: { cellWidth: 32 }, // Material
      6: { halign: 'right', cellWidth: 13 }, // Gross
      7: { halign: 'right', cellWidth: 13 }, // Tare
      8: { halign: 'right', fontStyle: 'bold', textColor: [2, 132, 199], cellWidth: 14 }, // Net
      9: { halign: 'right', cellWidth: 14 }, // Rate
      10: { halign: 'right', fontStyle: 'bold', cellWidth: 19 }, // Total
      11: { halign: 'center', cellWidth: 11 }, // Type
      12: { halign: 'right', cellWidth: 17 }, // Payable
      13: { halign: 'center', cellWidth: 18 }, // Status
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageNumber = data.pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Page ${pageNumber} - Confidential & Proprietary - Al Batina Bottlers`,
        148.5,
        204,
        { align: 'center' }
      );
    },
  });

  doc.save(filename);
}
