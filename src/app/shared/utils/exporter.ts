import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Expense } from '../../core/models/expense.interface';
import type { MaintenanceWithType } from '../../core/models/maintenance.interface';
import type { Vehicle } from '../../core/models/vehicle.interface';
import type { VehicleDocument } from '../../core/models/document.interface';

/* ============================================================
   Exportación de datos: Excel (xlsx) y PDF (ficha + listados)
   ============================================================ */

const PRIMARY: [number, number, number] = [15, 76, 129];
const MUTED: [number, number, number] = [100, 116, 139];

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 'yyyy-mm-dd' -> 'dd/mm/yyyy' sin problemas de timezone. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR');
}

export function fmtMoney(n: number | null | undefined): string {
  return `$ ${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

export function vehicleLabelOf(v: Vehicle): string {
  return `${v.brand} ${v.model}`.trim() || 'Vehículo';
}

function pdfHeader(doc: jsPDF, title: string, subtitle: string): void {
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 232, 245);
  doc.text(subtitle, 14, 19);
  doc.setFontSize(8);
  doc.text(`AutoCheck · generado el ${fmtDate(stamp())}`, 196, 19, { align: 'right' });
}

function pdfFooter(doc: jsPDF): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${i} de ${pages}`, 196, 290, { align: 'right' });
  }
}

export interface ExpenseRow {
  expense: Expense;
  vehicleLabel: string;
}

/** Exporta un listado de gastos a Excel. */
export function exportExpensesExcel(rows: ExpenseRow[], scope: string): void {
  const data: Record<string, string | number>[] = rows.map(({ expense: e, vehicleLabel }) => ({
    Vehículo: vehicleLabel,
    Categoría: e.category,
    Descripción: e.description ?? '',
    Fecha: fmtDate(e.date),
    Importe: Number(e.amount) || 0,
  }));
  const total = rows.reduce((s, r) => s + (Number(r.expense.amount) || 0), 0);
  data.push({ Vehículo: '', Categoría: '', Descripción: '', Fecha: 'TOTAL', Importe: total });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 36 }, { wch: 12 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
  XLSX.writeFile(wb, `autocheck-gastos-${scope}-${stamp()}.xlsx`);
}

/** Exporta un listado de gastos a PDF. */
export function exportExpensesPdf(rows: ExpenseRow[], scope: string): void {
  const doc = new jsPDF();
  pdfHeader(doc, 'Gastos', `${scope} · ${rows.length} registros`);
  const total = rows.reduce((s, r) => s + (Number(r.expense.amount) || 0), 0);

  autoTable(doc, {
    startY: 34,
    head: [['Vehículo', 'Categoría', 'Descripción', 'Fecha', 'Importe']],
    body: rows.map(({ expense: e, vehicleLabel }) => [
      vehicleLabel,
      e.category,
      e.description ?? '—',
      fmtDate(e.date),
      fmtMoney(e.amount),
    ]),
    foot: [['', '', '', 'TOTAL', fmtMoney(total)]],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [232, 241, 249], textColor: PRIMARY, fontStyle: 'bold' },
    columnStyles: { 4: { halign: 'right' } },
  });
  pdfFooter(doc);
  doc.save(`autocheck-gastos-${scope}-${stamp()}.pdf`);
}

export interface VehicleSheetData {
  vehicle: Vehicle;
  typeName: string;
  maintenances: MaintenanceWithType[];
  expenses: Expense[];
  documents: VehicleDocument[];
}

/** Ficha completa del vehículo (libro de service digital) en PDF. */
export function exportVehicleSheetPdf(data: VehicleSheetData): void {
  const { vehicle: v, typeName, maintenances, expenses, documents } = data;
  const doc = new jsPDF();
  const plate = v.license_plate || (v.unit_number ? `N° ${v.unit_number}` : 'S/D');
  pdfHeader(doc, `${vehicleLabelOf(v)} · ${plate}`, `${typeName} · ${v.year} · ${v.fuel_type}`);

  let y = 34;
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Datos del vehículo', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    body: [
      ['Vehículo', vehicleLabelOf(v)],
      ['Patente / Unidad', plate],
      ['Tipo', typeName],
      ['Año', String(v.year)],
      ['Combustible', v.fuel_type],
      ['Kilometraje actual', `${Number(v.current_km).toLocaleString('es-AR')} km`],
      ['Fecha de compra', fmtDate(v.purchase_date)],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: PRIMARY, cellWidth: 45 } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(`Mantenimientos (${maintenances.length})`, 14, y);

  autoTable(doc, {
    startY: y + 2,
    head: [['Fecha', 'Tipo', 'KM', 'Taller', 'Costo']],
    body:
      maintenances.length > 0
        ? maintenances.map((m) => [
            fmtDate(m.date),
            m.maintenance_type?.name ?? '—',
            Number(m.kilometers).toLocaleString('es-AR'),
            m.workshop ?? '—',
            fmtMoney(m.cost),
          ])
        : [['Sin mantenimientos registrados', '', '', '', '']],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 4: { halign: 'right' } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const totalExp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(`Gastos (${expenses.length}) · Total ${fmtMoney(totalExp)}`, 14, y);

  autoTable(doc, {
    startY: y + 2,
    head: [['Fecha', 'Categoría', 'Descripción', 'Importe']],
    body:
      expenses.length > 0
        ? expenses.map((e) => [fmtDate(e.date), e.category, e.description ?? '—', fmtMoney(e.amount)])
        : [['Sin gastos registrados', '', '', '']],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 3: { halign: 'right' } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(`Documentación (${documents.length})`, 14, y);

  autoTable(doc, {
    startY: y + 2,
    head: [['Tipo', 'Vencimiento', 'Observaciones']],
    body:
      documents.length > 0
        ? documents.map((d) => [d.type, fmtDate(d.expiration_date), d.notes ?? '—'])
        : [['Sin documentos registrados', '', '']],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
  });

  pdfFooter(doc);
  const safe = plate.replace(/[^a-zA-Z0-9]+/g, '-');
  doc.save(`autocheck-ficha-${safe}-${stamp()}.pdf`);
}
