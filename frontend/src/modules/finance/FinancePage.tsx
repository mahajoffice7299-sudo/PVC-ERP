import React, { useEffect, useState } from 'react';
import { Calculator, CircleDollarSign, ReceiptText, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { useProcessing } from '../processing/ProcessingContext';
import { useProcurement } from '../procurement/ProcurementContext';

type FinanceView = 'dashboard' | 'costing' | 'tax';
type CostType = 'Processing' | 'Labor' | 'Utilities' | 'Transport' | 'Other';
interface CostEntry {
  id: string;
  type: CostType;
  description: string;
  amount: number;
  date: string;
  notes: string;
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800';

export const FinancePage: React.FC<{ view: FinanceView }> = ({ view }) => {
  const { purchases } = useProcurement();
  const { sales } = useProcessing();
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [type, setType] = useState<CostType>('Processing');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api('/finance/costing').then(setCostEntries).catch(()=>{}); }, []);
  useEffect(() => { api('/finance/tax').then((d:any)=>{ if (Array.isArray(d)&&d[0]) setTaxRate(d[0].rate ?? 0); }).catch(()=>{}); }, []);

  const purchaseSpend = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
  const additionalCosts = costEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const salesRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const inputTax = purchaseSpend * taxRate / 100;
  const outputTax = salesRevenue * taxRate / 100;
  const submitCost = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setMessage('');
    const amountValue = Number(amount);
    if (!description.trim() || !Number.isFinite(amountValue) || amountValue <= 0 || !date) {
      setError('Enter a description, valid positive amount, and date.');
      return;
    }
    const entry = { id: `cost-${crypto.randomUUID()}`, type, description: description.trim(), amount: amountValue, date, notes: notes.trim() };
    const saved = await api('/finance/costing', { method: 'POST', body: JSON.stringify(entry) });
    setCostEntries((previous) => [saved ?? entry, ...previous]);
    setDescription(''); setAmount(''); setNotes('');
    setMessage('Cost entry saved.');
  };
  const saveTaxRate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      setError('Tax rate must be between 0 and 100%.');
      return;
    }
    setError('');
    setMessage('Tax rate saved. Tax values are estimates and do not replace tax filing.');
  };
  const title = view === 'dashboard' ? 'Finance Dashboard' : view === 'costing' ? 'Costing Details' : 'Tax Details';

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Finance</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">Purchase costs, operating costs, sales revenue, and configurable tax estimates.</p>
      </header>
      {(message || error) && <p role={error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm font-semibold ${error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{error || message}</p>}

      {view === 'dashboard' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Purchase Spend" value={`PKR ${purchaseSpend.toLocaleString()}`} />
            <Metric label="Additional Costs" value={`PKR ${additionalCosts.toLocaleString()}`} />
            <Metric label="Sales Revenue" value={`PKR ${salesRevenue.toLocaleString()}`} />
            <Metric label="Estimated Net Tax" value={`PKR ${(outputTax - inputTax).toLocaleString()}`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Summary title="Cost summary" icon={<Calculator />} rows={[
              ['Procurement costs', `PKR ${purchaseSpend.toLocaleString()}`],
              ['Logged operating costs', `PKR ${additionalCosts.toLocaleString()}`],
              ['Total recorded costs', `PKR ${(purchaseSpend + additionalCosts).toLocaleString()}`],
            ]} />
            <Summary title="Tax estimate" icon={<ReceiptText />} rows={[
              ['Configured tax rate', `${taxRate}%`],
              ['Estimated input tax', `PKR ${inputTax.toLocaleString()}`],
              ['Estimated output tax', `PKR ${outputTax.toLocaleString()}`],
              ['Estimated net tax', `PKR ${(outputTax - inputTax).toLocaleString()}`],
            ]} />
          </div>
        </>
      )}

      {view === 'costing' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Heading icon={<CircleDollarSign />} title="Add Operating Cost" />
            <form onSubmit={submitCost} className="grid gap-3 p-5 md:grid-cols-2">
              <Field label="Cost category"><select value={type} onChange={(event) => setType(event.target.value as CostType)} className={inputClass}>{['Processing', 'Labor', 'Utilities', 'Transport', 'Other'].map((option) => <option key={option}>{option}</option>)}</select></Field>
              <Field label="Description"><input required value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /></Field>
              <Field label="Amount (PKR)"><input required type="number" min="0.01" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></Field>
              <Field label="Date"><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></Field>
              <Field label="Notes (optional)"><input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></Field>
              <button className={`${buttonClass} self-end`}><CircleDollarSign className="h-4 w-4" />Save Cost</button>
            </form>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Heading icon={<Calculator />} title={`Costing Ledger · PKR ${additionalCosts.toLocaleString()}`} />
            <Table headers={['Date', 'Category', 'Description', 'Notes', 'Amount (PKR)']} rows={costEntries.map((entry) => [entry.date, entry.type, entry.description, entry.notes || '—', entry.amount.toLocaleString()])} />
          </section>
        </>
      )}

      {view === 'tax' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Heading icon={<ReceiptText />} title="Tax Rate Configuration" />
            <form onSubmit={saveTaxRate} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto]">
              <Field label="Tax rate (%)"><input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))} className={inputClass} /></Field>
              <button className={`${buttonClass} self-end`}><Save className="h-4 w-4" />Save Tax Rate</button>
            </form>
          </section>
          <Summary title="Estimated tax details" icon={<ReceiptText />} rows={[
            ['Taxable purchase base', `PKR ${purchaseSpend.toLocaleString()}`],
            ['Estimated input tax', `PKR ${inputTax.toLocaleString()}`],
            ['Taxable sales base', `PKR ${salesRevenue.toLocaleString()}`],
            ['Estimated output tax', `PKR ${outputTax.toLocaleString()}`],
            ['Estimated net tax payable / (credit)', `PKR ${(outputTax - inputTax).toLocaleString()}`],
          ]} />
        </div>
      )}
      <p className="text-xs text-slate-500">Finance records are local to this browser. Tax is a simple estimate using one configured rate; confirm applicable tax rules and reporting with your accountant.</p>
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p></article>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-700">{label}</span>{children}</label>;
}
function Heading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-4 text-slate-800"><span className="text-emerald-700">{icon}</span><h2 className="font-bold">{title}</h2></div>;
}
function Summary({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: [string, string][] }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><Heading icon={icon} title={title} /><dl className="divide-y divide-slate-100 px-4">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-slate-600">{label}</dt><dd className="font-bold text-slate-900">{value}</dd></div>)}</dl></section>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr>{headers.map((header) => <th key={header} className="p-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex} className="p-3">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="p-8 text-center text-slate-500">No operating costs recorded.</td></tr>}</tbody></table></div>;
}
