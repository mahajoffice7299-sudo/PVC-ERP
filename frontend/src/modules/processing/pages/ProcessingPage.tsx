import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  Boxes,
  CircleDollarSign,
  Droplets,
  Factory,
  Plus,
  Recycle,
  Trash2,
  X,
} from 'lucide-react';
import { useProcurement } from '../../procurement/ProcurementContext';
import { useStores } from '../../stores/StoreContext';
import { useProcessing } from '../ProcessingContext';
import type {
  BottleLotInput,
  MaterialCategory,
  SortedMaterialStream,
} from '../types';

type ProcessingSection = 'sorting' | 'washing' | 'production' | 'sales';
type ProcessingView =
  | 'dashboard'
  | 'available'
  | 'to-wash'
  | 'received'
  | 'entry'
  | 'quality'
  | 'trash'
  | 'history'
  | 'remaining'
  | 'returns';
type NumericInput = number | '';

const colors = ['Clear', 'Blue', 'Green', 'Amber', 'Mixed', 'Other'];
const conditions = ['Clean', 'Mixed', 'Dirty', 'Contaminated', 'Other'];
const qualities = ['Good', 'Fair', 'Poor', 'Rejected', 'Other'];
const categories: { key: MaterialCategory; label: string }[] = [
  { key: 'bottle', label: 'Bottle' },
  { key: 'ring', label: 'Ring' },
  { key: 'cap', label: 'Cap' },
  { key: 'wrapper', label: 'Wrapper' },
  { key: 'other', label: 'Other' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50';
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const numberValue = (value: NumericInput) => (value === '' ? 0 : value);
const nearlyEqual = (left: number, right: number) => Math.abs(left - right) < 0.001;

const categoryLabel = (category: MaterialCategory, description: string) =>
  category === 'other' && description ? description : categories.find((item) => item.key === category)?.label || category;

export const ProcessingPage: React.FC<{ section: ProcessingSection; view: ProcessingView }> = ({ section, view }) => {
  const { stores, receipts, availableReceiptKg, transferReceiptStock } = useStores();
  const { purchases } = useProcurement();
  const {
    sortingBatches,
    washingBatches,
    productionBatches,
    sales,
    salesReturns,
    addSortingBatch,
    addWashingBatch,
    addProductionBatch,
    addSale,
    addSalesReturn,
  } = useProcessing();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [receiptId, setReceiptId] = useState('');
  const [sortInputKg, setSortInputKg] = useState<NumericInput>('');
  const [ringKg, setRingKg] = useState<NumericInput>('');
  const [capKg, setCapKg] = useState<NumericInput>('');
  const [wrapperKg, setWrapperKg] = useState<NumericInput>('');
  const [otherKg, setOtherKg] = useState<NumericInput>('');
  const [otherDescription, setOtherDescription] = useState('');
  const [bottleLots, setBottleLots] = useState<BottleLotInput[]>([
    { id: 'initial-bottle-lot', color: 'Clear', condition: 'Clean', quality: 'Good', kg: 0 },
  ]);
  const [customBottleValues, setCustomBottleValues] = useState<Record<string, { color: string; condition: string; quality: string }>>({});

  const sortedStreams = useMemo<SortedMaterialStream[]>(() => sortingBatches.flatMap((batch) => {
    const materialType = batch.sourcePurchase.materialType || 'Unspecified';
    const bottleStreams = batch.bottleLots.map((lot) => ({
      id: `${batch.id}:bottle:${lot.id}`,
      category: 'bottle' as const,
      materialType,
      color: lot.color,
      condition: lot.condition,
      quality: lot.quality,
      description: '',
      kg: lot.kg,
    }));
    const byproductAmounts: { category: MaterialCategory; kg: number }[] = [
      { category: 'ring', kg: batch.ringKg },
      { category: 'cap', kg: batch.capKg },
      { category: 'wrapper', kg: batch.wrapperKg },
      { category: 'other', kg: batch.otherKg },
    ];
    const byproductStreams = byproductAmounts
      .filter((stream) => stream.kg > 0)
      .map((stream) => ({
        id: `${batch.id}:${stream.category}`,
        category: stream.category,
        materialType,
        color: '',
        condition: '',
        quality: '',
        description: stream.category === 'other' ? batch.otherDescription : '',
        kg: stream.kg,
      }));
    return [...bottleStreams, ...byproductStreams];
  }), [sortingBatches]);

  const streamBalances = sortedStreams.map((stream) => {
    const usedKg = washingBatches
      .filter((batch) => batch.streamId === stream.id)
      .reduce((total, batch) => total + batch.inputKg, 0);
    return { ...stream, availableKg: Math.max(0, stream.kg - usedKg) };
  });
  const availableWashRuns = washingBatches
    .filter((batch) => batch.category === 'bottle')
    .map((batch) => {
      const usedKg = productionBatches
        .filter((production) => production.washingBatchId === batch.id)
        .reduce((total, production) => total + production.inputKg, 0);
      return { ...batch, availableKg: Math.max(0, batch.washedKg - usedKg) };
    })
    .filter((batch) => batch.availableKg > 0);

  const saleStock = [
    ...washingBatches
      .filter((batch) => batch.category !== 'bottle' && batch.washedKg > 0)
      .map((batch) => ({
        id: `wash:${batch.id}`,
        product: categoryLabel(batch.category, batch.description),
        materialType: batch.materialType,
        color: batch.color,
        condition: batch.condition,
        quality: batch.quality,
        sourcePurchase: batch.sourcePurchase,
        quantityKg: batch.washedKg,
      })),
    ...productionBatches.flatMap((batch) => [
      { id: `prod:${batch.id}:flakes`, product: `${batch.materialType} Flakes`, materialType: batch.materialType, color: batch.color, condition: batch.condition, quality: batch.quality || 'Unspecified', sourcePurchase: batch.sourcePurchase, quantityKg: batch.flakesKg },
      { id: `prod:${batch.id}:dust`, product: `${batch.materialType} Dust`, materialType: batch.materialType, color: batch.color, condition: batch.condition, quality: batch.quality || 'Unspecified', sourcePurchase: batch.sourcePurchase, quantityKg: batch.dustKg },
      { id: `prod:${batch.id}:other`, product: `${batch.materialType} Other Output`, materialType: batch.materialType, color: batch.color, condition: batch.condition, quality: batch.quality || 'Unspecified', sourcePurchase: batch.sourcePurchase, quantityKg: batch.otherKg },
    ].filter((item) => item.quantityKg > 0)),
  ].map((item) => {
    const soldKg = sales
      .filter((sale) => sale.stockItemId === item.id)
      .reduce((total, sale) => total + sale.quantityKg, 0);
    const restockedKg = salesReturns
      .filter((entry) => entry.stockItemId === item.id)
      .reduce((total, entry) => total + entry.acceptedKg, 0);
    return { ...item, availableKg: Math.max(0, item.quantityKg - soldKg + restockedKg) };
  }).filter((item) => item.availableKg > 0);

  const selectedReceipt = receipts.find((receipt) => receipt.id === receiptId);
  const receiptAvailableKg = selectedReceipt ? availableReceiptKg(selectedReceipt.id) : 0;
  const bottleTotal = bottleLots.reduce((total, lot) => total + lot.kg, 0);
  const sortBreakdownTotal =
    bottleTotal + numberValue(ringKg) + numberValue(capKg) + numberValue(wrapperKg) + numberValue(otherKg);

  const resetAlerts = () => {
    setError('');
    setSuccess('');
  };

  const addBottleLot = () => {
    setBottleLots((previous) => [
      ...previous,
      { id: `lot-${crypto.randomUUID()}`, color: 'Clear', condition: 'Clean', quality: 'Good', kg: 0 },
    ]);
  };

  const updateBottleLot = (id: string, updates: Partial<BottleLotInput>) => {
    setBottleLots((previous) => previous.map((lot) => (lot.id === id ? { ...lot, ...updates } : lot)));
  };

  const updateBottleCustom = (
    id: string,
    key: 'color' | 'condition' | 'quality',
    value: string
  ) => {
    setCustomBottleValues((previous) => ({
      ...previous,
      [id]: { ...previous[id], [key]: value },
    }));
  };

  const resolvedBottleLots = bottleLots.map((lot) => ({
    ...lot,
    color: lot.color === 'Other' ? customBottleValues[lot.id]?.color?.trim() || '' : lot.color,
    condition: lot.condition === 'Other' ? customBottleValues[lot.id]?.condition?.trim() || '' : lot.condition,
    quality: lot.quality === 'Other' ? customBottleValues[lot.id]?.quality?.trim() || '' : lot.quality,
  }));

  const handleCreateSortingBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    resetAlerts();
    if (!selectedReceipt) {
      setError('Select a received store delivery.');
      return;
    }
    const inputKg = numberValue(sortInputKg);
    if (inputKg <= 0 || inputKg > receiptAvailableKg) {
      setError(`Enter a sorting weight greater than zero and no more than ${receiptAvailableKg.toLocaleString()} KG.`);
      return;
    }
    if (!nearlyEqual(sortBreakdownTotal, inputKg)) {
      setError(`The sorting breakdown must equal the input weight. Current breakdown: ${sortBreakdownTotal.toLocaleString()} KG.`);
      return;
    }
    if (numberValue(otherKg) > 0 && !otherDescription.trim()) {
      setError('Describe the Other sorted material.');
      return;
    }
    if (resolvedBottleLots.some((lot) => lot.kg > 0 && (!lot.color || !lot.condition || !lot.quality))) {
      setError('Specify each bottle lot color, condition, and quality.');
      return;
    }
    const transfer = await transferReceiptStock(selectedReceipt.id, inputKg);
    if (!transfer) {
      setError('Could not withdraw this quantity from store stock. Refresh and verify remaining stock.');
      return;
    }
    await addSortingBatch({
      transferId: transfer.id,
      receiptId: selectedReceipt.id,
      storeId: selectedReceipt.storeId,
      sourcePurchase: selectedReceipt.purchase,
      inputKg,
      bottleLots: resolvedBottleLots.filter((lot) => lot.kg > 0),
      ringKg: numberValue(ringKg),
      capKg: numberValue(capKg),
      wrapperKg: numberValue(wrapperKg),
      otherKg: numberValue(otherKg),
      otherDescription: otherDescription.trim(),
    });
    setSortInputKg('');
    setRingKg('');
    setCapKg('');
    setWrapperKg('');
    setOtherKg('');
    setOtherDescription('');
    setBottleLots([{ id: `lot-${crypto.randomUUID()}`, color: 'Clear', condition: 'Clean', quality: 'Good', kg: 0 }]);
    setSuccess(`Sorted ${inputKg.toLocaleString()} KG from ${selectedReceipt.purchase.poNumber}.`);
  };

  const [washStreamId, setWashStreamId] = useState('');
  const [washInputKg, setWashInputKg] = useState<NumericInput>('');
  const [washedKg, setWashedKg] = useState<NumericInput>('');
  const [washWasteKg, setWashWasteKg] = useState<NumericInput>('');
  const [washWasteCondition, setWashWasteCondition] = useState('');
  const selectedWashStream = streamBalances.find((stream) => stream.id === washStreamId);
  const washBalanceKg = numberValue(washedKg) + numberValue(washWasteKg);

  const handleCreateWashBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    resetAlerts();
    if (!selectedWashStream) {
      setError('Select a sorted material stream.');
      return;
    }
    const inputKg = numberValue(washInputKg);
    if (inputKg <= 0 || inputKg > selectedWashStream.availableKg) {
      setError(`Enter a wash weight greater than zero and no more than ${selectedWashStream.availableKg.toLocaleString()} KG.`);
      return;
    }
    if (!nearlyEqual(washBalanceKg, inputKg)) {
      setError('Washed output plus wash waste must equal the washing input.');
      return;
    }
    if (numberValue(washWasteKg) > 0 && !washWasteCondition.trim()) {
      setError('Describe the condition or quality of washing waste.');
      return;
    }
    const sourceSortingBatch = sortingBatches.find((batch) => batch.id === selectedWashStream.id.split(':')[0]);
    if (!sourceSortingBatch) {
      setError('The selected sorting record could not be found. Refresh and select the material again.');
      return;
    }
    await addWashingBatch({
      sortingBatchId: selectedWashStream.id.split(':')[0],
      streamId: selectedWashStream.id,
      sourcePurchase: sourceSortingBatch.sourcePurchase,
      category: selectedWashStream.category,
      materialType: selectedWashStream.materialType,
      color: selectedWashStream.color,
      condition: selectedWashStream.condition,
      quality: selectedWashStream.quality,
      description: selectedWashStream.description,
      inputKg,
      washedKg: numberValue(washedKg),
      wasteKg: numberValue(washWasteKg),
      wasteCondition: washWasteCondition.trim(),
    });
    setWashInputKg('');
    setWashedKg('');
    setWashWasteKg('');
    setWashWasteCondition('');
    setSuccess(`Recorded washing of ${inputKg.toLocaleString()} KG.`);
  };

  const [productionWashId, setProductionWashId] = useState('');
  const [productionInputKg, setProductionInputKg] = useState<NumericInput>('');
  const [flakesKg, setFlakesKg] = useState<NumericInput>('');
  const [dustKg, setDustKg] = useState<NumericInput>('');
  const [productionOtherKg, setProductionOtherKg] = useState<NumericInput>('');
  const [productionOtherDescription, setProductionOtherDescription] = useState('');
  const [productionWasteKg, setProductionWasteKg] = useState<NumericInput>('');
  const [productionWasteCondition, setProductionWasteCondition] = useState('');
  const [productionQuality, setProductionQuality] = useState('Good');
  const [productionQualityOther, setProductionQualityOther] = useState('');
  const selectedProductionWash = availableWashRuns.find((batch) => batch.id === productionWashId);
  const productionBalanceKg =
    numberValue(flakesKg) + numberValue(dustKg) + numberValue(productionOtherKg) + numberValue(productionWasteKg);

  const handleCreateProductionBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    resetAlerts();
    if (!selectedProductionWash) {
      setError('Select an available washed bottle batch.');
      return;
    }
    const inputKg = numberValue(productionInputKg);
    if (inputKg <= 0 || inputKg > selectedProductionWash.availableKg) {
      setError(`Enter production input greater than zero and no more than ${selectedProductionWash.availableKg.toLocaleString()} KG.`);
      return;
    }
    if (!nearlyEqual(productionBalanceKg, inputKg)) {
      setError('Flakes, dust, other output, and waste must total the production input weight.');
      return;
    }
    if (numberValue(productionOtherKg) > 0 && !productionOtherDescription.trim()) {
      setError('Describe the other production output.');
      return;
    }
    if (numberValue(productionWasteKg) > 0 && !productionWasteCondition.trim()) {
      setError('Describe the condition or quality of production waste.');
      return;
    }
    if (productionQuality === 'Other' && !productionQualityOther.trim()) {
      setError('Specify the production quality.');
      return;
    }
    await addProductionBatch({
      washingBatchId: selectedProductionWash.id,
      sourcePurchase: selectedProductionWash.sourcePurchase,
      materialType: selectedProductionWash.materialType,
      color: selectedProductionWash.color,
      condition: selectedProductionWash.condition,
      quality: productionQuality === 'Other' ? productionQualityOther.trim() : productionQuality,
      inputKg,
      flakesKg: numberValue(flakesKg),
      dustKg: numberValue(dustKg),
      otherKg: numberValue(productionOtherKg),
      otherDescription: productionOtherDescription.trim(),
      wasteKg: numberValue(productionWasteKg),
      wasteCondition: productionWasteCondition.trim(),
    });
    setProductionInputKg('');
    setFlakesKg('');
    setDustKg('');
    setProductionOtherKg('');
    setProductionOtherDescription('');
    setProductionWasteKg('');
    setProductionWasteCondition('');
    setProductionQuality('Good');
    setProductionQualityOther('');
    setSuccess(`Recorded production output for ${inputKg.toLocaleString()} KG.`);
  };

  const [saleStockItemId, setSaleStockItemId] = useState('');
  const [saleQuantityKg, setSaleQuantityKg] = useState<NumericInput>('');
  const [saleRatePerKg, setSaleRatePerKg] = useState<NumericInput>('');
  const [saleBuyerName, setSaleBuyerName] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const selectedSaleStock = saleStock.find((item) => item.id === saleStockItemId);

  const handleCreateSale = async (event: React.FormEvent) => {
    event.preventDefault();
    resetAlerts();
    if (!selectedSaleStock) {
      setError('Select an available by-product or production output.');
      return;
    }
    const quantityKg = numberValue(saleQuantityKg);
    const ratePerKg = numberValue(saleRatePerKg);
    if (quantityKg <= 0 || quantityKg > selectedSaleStock.availableKg) {
      setError(`Enter a sale quantity greater than zero and no more than ${selectedSaleStock.availableKg.toLocaleString()} KG.`);
      return;
    }
    if (ratePerKg <= 0 || !saleBuyerName.trim()) {
      setError('Enter a positive rate and buyer name.');
      return;
    }
    await addSale({
      stockItemId: selectedSaleStock.id,
      product: selectedSaleStock.product,
      materialType: selectedSaleStock.materialType,
      color: selectedSaleStock.color,
      condition: selectedSaleStock.condition,
      quality: selectedSaleStock.quality,
      sourcePurchase: selectedSaleStock.sourcePurchase,
      quantityKg,
      ratePerKg,
      totalAmount: quantityKg * ratePerKg,
      buyerName: saleBuyerName.trim(),
      notes: saleNotes.trim(),
    });
    setSaleQuantityKg('');
    setSaleRatePerKg('');
    setSaleBuyerName('');
    setSaleNotes('');
    setSuccess(`Sale recorded: ${quantityKg.toLocaleString()} KG of ${selectedSaleStock.product}.`);
  };

  const [returnSaleId, setReturnSaleId] = useState('');
  const [returnKg, setReturnKg] = useState<NumericInput>('');
  const [acceptedReturnKg, setAcceptedReturnKg] = useState<NumericInput>('');
  const [returnNotes, setReturnNotes] = useState('');
  const returnableSales = sales.map((sale) => {
    const returnedKg = salesReturns
      .filter((entry) => entry.saleId === sale.id)
      .reduce((total, entry) => total + entry.returnedKg, 0);
    return { ...sale, returnableKg: Math.max(0, sale.quantityKg - returnedKg) };
  }).filter((sale) => sale.returnableKg > 0);
  const selectedReturnSale = returnableSales.find((sale) => sale.id === returnSaleId);

  const handleCreateSalesReturn = (event: React.FormEvent) => {
    event.preventDefault();
    resetAlerts();
    if (!selectedReturnSale) {
      setError('Select a sale with a remaining returnable quantity.');
      return;
    }
    const returnedKg = numberValue(returnKg);
    const acceptedKg = numberValue(acceptedReturnKg);
    if (returnedKg <= 0 || returnedKg > selectedReturnSale.returnableKg) {
      setError(`Return quantity must be greater than zero and no more than ${selectedReturnSale.returnableKg.toLocaleString()} KG.`);
      return;
    }
    if (acceptedKg < 0 || acceptedKg > returnedKg) {
      setError('Accepted returned KG must be between zero and the returned quantity.');
      return;
    }
    addSalesReturn({
      saleId: selectedReturnSale.id,
      stockItemId: selectedReturnSale.stockItemId,
      product: selectedReturnSale.product,
      returnedKg,
      acceptedKg,
      notes: returnNotes.trim(),
    });
    setReturnKg('');
    setAcceptedReturnKg('');
    setReturnNotes('');
    setSuccess(`${acceptedKg.toLocaleString()} KG accepted and returned to saleable stock.`);
  };

  const moduleTitle = {
    sorting: 'Sorting',
    washing: 'Washing',
    production: 'Bottle Production',
    sales: 'Recycled Materials Sales',
  }[section];
  const defaultSubtitle = {
    sorting: 'Withdraw store material and record a complete kilogram-by-kilogram sort breakdown.',
    washing: 'Wash sorted bottle, ring, cap, wrapper, and other material streams.',
    production: 'Convert washed bottles into flakes, dust, other output, and quality-based waste.',
    sales: 'Sell washed by-products and production outputs while tracking remaining sale stock.',
  }[section];

  const availableReceipts = receipts
    .map((receipt) => ({ ...receipt, availableKg: availableReceiptKg(receipt.id) }))
    .filter((receipt) => receipt.availableKg > 0);
  const [todayKey] = useState(() => dateKey(new Date()));
  const isToday = (value: string) => dateKey(new Date(value)) === todayKey;
  const sortedTodayKg = sortingBatches.filter((batch) => isToday(batch.createdAt)).reduce((sum, batch) => sum + batch.inputKg, 0);
  const washingInputTodayKg = washingBatches.filter((batch) => isToday(batch.createdAt)).reduce((sum, batch) => sum + batch.inputKg, 0);
  const washingInputAllKg = washingBatches.reduce((sum, batch) => sum + batch.inputKg, 0);
  const salesToday = sales.filter((sale) => isToday(sale.soldAt));
  const remainingSaleKg = saleStock.reduce((sum, item) => sum + item.availableKg, 0);
  const acceptedReturnsKg = salesReturns.reduce((sum, entry) => sum + entry.acceptedKg, 0);
  const qualitySummary = Array.from(
    productionBatches.reduce((summary, batch) => {
      const quality = batch.quality || 'Unspecified';
      const values = summary.get(quality) || { inputKg: 0, flakesKg: 0, dustKg: 0, wasteKg: 0 };
      values.inputKg += batch.inputKg;
      values.flakesKg += batch.flakesKg;
      values.dustKg += batch.dustKg;
      values.wasteKg += batch.wasteKg;
      summary.set(quality, values);
      return summary;
    }, new Map<string, { inputKg: number; flakesKg: number; dustKg: number; wasteKg: number }>())
  );
  const viewTitle = {
    dashboard: `${moduleTitle} Dashboard`,
    available: 'Available Material for Sorting',
    'to-wash': 'Material Sent to Washing',
    received: 'Washing Material Received',
    entry: `${moduleTitle} Entry`,
    quality: 'Quality-wise Production',
    trash: 'Production Trash / Waste',
    history: 'Selling History',
    remaining: 'Remaining Saleable Stock',
    returns: 'Sales Returns',
  }[view];
  const subtitle = view === 'dashboard'
    ? `Overview and current totals for ${moduleTitle.toLowerCase()}.`
    : defaultSubtitle;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-800">Recycling Operations</p>
        <div className="mt-2 flex items-center gap-4">
          <div className="rounded-2xl bg-sky-700 p-3 text-white shadow-lg shadow-sky-700/20">
            {section === 'sorting' && <Recycle className="h-7 w-7" />}
            {section === 'washing' && <Droplets className="h-7 w-7" />}
            {section === 'production' && <Factory className="h-7 w-7" />}
            {section === 'sales' && <CircleDollarSign className="h-7 w-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{viewTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
        </div>
      </header>

      {(error || success) && (
        <div role={error ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
          {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <PackageCheckIcon />}
          {error || success}
          <button type="button" className="ml-auto" onClick={resetAlerts} aria-label="Dismiss message"><X className="h-4 w-4" /></button>
        </div>
      )}

      {section === 'sorting' && view === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Available Store Material" value={`${availableReceipts.reduce((sum, receipt) => sum + receipt.availableKg, 0).toLocaleString()} KG`} />
            <MetricCard label="Sorted Today" value={`${sortedTodayKg.toLocaleString()} KG`} />
            <MetricCard label="Total Sorting Batches" value={sortingBatches.length.toLocaleString()} />
            <MetricCard label="Sent to Washing" value={`${washingInputAllKg.toLocaleString()} KG`} />
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Boxes className="h-5 w-5" />} title="Available Material for Sorting" count={availableReceipts.length} />
            <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Store / PO</th><th className="p-3">Material</th><th className="p-3">Supplier</th><th className="p-3 text-right">Available KG</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{availableReceipts.length === 0 ? <EmptyRow colSpan={4} /> : availableReceipts.map((receipt) => (
                <tr key={receipt.id}><td className="p-3">{stores.find((store) => store.id === receipt.storeId)?.name || 'Store'} / {receipt.purchase.poNumber}</td><td className="p-3">{receipt.purchase.materialType || 'Unspecified'}</td><td className="p-3">{receipt.purchase.supplierName}</td><td className="p-3 text-right font-mono font-bold">{receipt.availableKg.toLocaleString()}</td></tr>
              ))}</tbody>
            </table></div>
          </section>
        </div>
      )}
      {section === 'sorting' && view === 'available' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={<Boxes className="h-5 w-5" />} title="Available Material in Stores" count={availableReceipts.length} />
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Received</th><th className="p-3">Store / PO</th><th className="p-3">Material Details</th><th className="p-3">Supplier</th><th className="p-3 text-right">Available KG</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{availableReceipts.length === 0 ? <EmptyRow colSpan={5} /> : availableReceipts.map((receipt) => (
              <tr key={receipt.id}><td className="p-3">{new Date(receipt.receivedAt).toLocaleDateString()}</td><td className="p-3">{stores.find((store) => store.id === receipt.storeId)?.name || 'Store'} / {receipt.purchase.poNumber}</td><td className="p-3">{[receipt.purchase.materialType, receipt.purchase.color, receipt.purchase.grade, receipt.purchase.condition].filter(Boolean).join(' / ') || '—'}</td><td className="p-3">{receipt.purchase.supplierName}</td><td className="p-3 text-right font-mono font-bold">{receipt.availableKg.toLocaleString()}</td></tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
      {section === 'sorting' && view === 'to-wash' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={<Droplets className="h-5 w-5" />} title="Sorted Material Sent to Washing" count={streamBalances.length} />
          <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Material / PO</th><th className="p-3">Color / Quality</th><th className="p-3 text-right">Sorted KG</th><th className="p-3 text-right">Sent to Washing KG</th><th className="p-3 text-right">Waiting for Washing KG</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{streamBalances.length === 0 ? <EmptyRow colSpan={5} /> : streamBalances.map((stream) => {
              const sentKg = washingBatches.filter((batch) => batch.streamId === stream.id).reduce((sum, batch) => sum + batch.inputKg, 0);
              return <tr key={stream.id}><td className="p-3">{categoryLabel(stream.category, stream.description)} / {sortingBatches.find((batch) => batch.id === stream.id.split(':')[0])?.sourcePurchase.poNumber}</td><td className="p-3">{stream.color || '—'} / {stream.quality || '—'}</td><td className="p-3 text-right font-mono">{stream.kg.toLocaleString()}</td><td className="p-3 text-right font-mono">{sentKg.toLocaleString()}</td><td className="p-3 text-right font-mono font-bold">{stream.availableKg.toLocaleString()}</td></tr>;
            })}</tbody>
          </table></div>
        </section>
      )}

      {section === 'washing' && view === 'dashboard' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Received Today" value={`${washingInputTodayKg.toLocaleString()} KG`} />
          <MetricCard label="Received All Days" value={`${washingInputAllKg.toLocaleString()} KG`} />
          <MetricCard label="Washed Output" value={`${washingBatches.reduce((sum, batch) => sum + batch.washedKg, 0).toLocaleString()} KG`} />
          <MetricCard label="Washing Waste" value={`${washingBatches.reduce((sum, batch) => sum + batch.wasteKg, 0).toLocaleString()} KG`} />
        </div>
      )}
      {section === 'washing' && view === 'received' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Received Today" value={`${washingInputTodayKg.toLocaleString()} KG`} />
            <MetricCard label="Received All Days" value={`${washingInputAllKg.toLocaleString()} KG`} />
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Droplets className="h-5 w-5" />} title="Washing Receipts" count={washingBatches.length} />
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Date / PO</th><th className="p-3">Material</th><th className="p-3">Received KG</th><th className="p-3">Washed KG</th><th className="p-3">Waste KG</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{washingBatches.length === 0 ? <EmptyRow colSpan={5} /> : washingBatches.map((batch) => <tr key={batch.id}><td className="p-3">{new Date(batch.createdAt).toLocaleDateString()} / {batch.sourcePurchase.poNumber}</td><td className="p-3">{categoryLabel(batch.category, batch.description)} · {batch.materialType}</td><td className="p-3 font-mono">{batch.inputKg.toLocaleString()}</td><td className="p-3 font-mono">{batch.washedKg.toLocaleString()}</td><td className="p-3 font-mono">{batch.wasteKg.toLocaleString()}</td></tr>)}</tbody>
            </table></div>
          </section>
        </div>
      )}
      {section === 'production' && view === 'dashboard' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Production Batches" value={productionBatches.length.toLocaleString()} />
          <MetricCard label="Input Processed" value={`${productionBatches.reduce((sum, batch) => sum + batch.inputKg, 0).toLocaleString()} KG`} />
          <MetricCard label="Flakes Produced" value={`${productionBatches.reduce((sum, batch) => sum + batch.flakesKg, 0).toLocaleString()} KG`} />
          <MetricCard label="Trash / Waste" value={`${productionBatches.reduce((sum, batch) => sum + batch.wasteKg, 0).toLocaleString()} KG`} />
        </div>
      )}
      {section === 'production' && view === 'quality' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={<Factory className="h-5 w-5" />} title="Production Totals by Quality" count={qualitySummary.length} />
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Quality</th><th className="p-3 text-right">Input KG</th><th className="p-3 text-right">Flakes KG</th><th className="p-3 text-right">Dust KG</th><th className="p-3 text-right">Trash KG</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{qualitySummary.length === 0 ? <EmptyRow colSpan={5} /> : qualitySummary.map(([quality, totals]) => <tr key={quality}><td className="p-3 font-semibold">{quality}</td><td className="p-3 text-right font-mono">{totals.inputKg.toLocaleString()}</td><td className="p-3 text-right font-mono">{totals.flakesKg.toLocaleString()}</td><td className="p-3 text-right font-mono">{totals.dustKg.toLocaleString()}</td><td className="p-3 text-right font-mono">{totals.wasteKg.toLocaleString()}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
      {section === 'production' && view === 'trash' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={<Trash2 className="h-5 w-5" />} title="Production Trash / Waste" count={productionBatches.filter((batch) => batch.wasteKg > 0).length} />
          <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Date / PO</th><th className="p-3">Material / Quality</th><th className="p-3 text-right">Trash KG</th><th className="p-3">Condition / Notes</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{productionBatches.filter((batch) => batch.wasteKg > 0).length === 0 ? <EmptyRow colSpan={4} /> : productionBatches.filter((batch) => batch.wasteKg > 0).map((batch) => <tr key={batch.id}><td className="p-3">{new Date(batch.createdAt).toLocaleDateString()} / {batch.sourcePurchase.poNumber}</td><td className="p-3">{batch.materialType} / {batch.quality || 'Unspecified'}</td><td className="p-3 text-right font-mono font-bold">{batch.wasteKg.toLocaleString()}</td><td className="p-3">{batch.wasteCondition || '—'}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
      {section === 'sales' && view === 'dashboard' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Sales Today" value={`${salesToday.reduce((sum, sale) => sum + sale.quantityKg, 0).toLocaleString()} KG`} />
          <MetricCard label="Sales All Days" value={`${sales.reduce((sum, sale) => sum + sale.quantityKg, 0).toLocaleString()} KG`} />
          <MetricCard label="Remaining Stock" value={`${remainingSaleKg.toLocaleString()} KG`} />
          <MetricCard label="Accepted Returns Restocked" value={`${acceptedReturnsKg.toLocaleString()} KG`} />
        </div>
      )}
      {section === 'sales' && view === 'remaining' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={<Boxes className="h-5 w-5" />} title="Remaining Saleable Stock" count={saleStock.length} />
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Product</th><th className="p-3">Material / Color / Quality</th><th className="p-3">Source PO</th><th className="p-3 text-right">Available KG</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{saleStock.length === 0 ? <EmptyRow colSpan={4} /> : saleStock.map((item) => <tr key={item.id}><td className="p-3 font-semibold">{item.product}</td><td className="p-3">{item.materialType} / {item.color || '—'} / {item.quality || '—'}</td><td className="p-3">{item.sourcePurchase.poNumber}</td><td className="p-3 text-right font-mono font-bold">{item.availableKg.toLocaleString()}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
      {section === 'sales' && view === 'history' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={<CircleDollarSign className="h-5 w-5" />} title="Selling History" count={sales.length} />
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3">Source PO</th><th className="p-3">Buyer</th><th className="p-3 text-right">KG</th><th className="p-3 text-right">Rate / KG</th><th className="p-3 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{sales.length === 0 ? <EmptyRow colSpan={7} /> : sales.map((sale) => <tr key={sale.id}><td className="p-3">{new Date(sale.soldAt).toLocaleDateString()}</td><td className="p-3 font-semibold">{sale.product}</td><td className="p-3">{sale.sourcePurchase.poNumber}</td><td className="p-3">{sale.buyerName}</td><td className="p-3 text-right font-mono">{sale.quantityKg.toLocaleString()}</td><td className="p-3 text-right font-mono">{sale.ratePerKg.toLocaleString()}</td><td className="p-3 text-right font-mono font-bold">{sale.totalAmount.toLocaleString()}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
      {section === 'sales' && view === 'returns' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<ArrowDownToLine className="h-5 w-5" />} title="Record Customer Return" />
            <form onSubmit={handleCreateSalesReturn} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Original sale">
                <select required value={returnSaleId} onChange={(event) => setReturnSaleId(event.target.value)} className={inputClass}>
                  <option value="">Select a sale</option>
                  {returnableSales.map((sale) => <option key={sale.id} value={sale.id}>{sale.product} · {sale.buyerName} · {sale.returnableKg.toLocaleString()} KG returnable</option>)}
                </select>
              </Field>
              <Field label={`Return quantity (KG) · ${selectedReturnSale?.returnableKg.toLocaleString() || 0} returnable`}>
                <input required type="number" min="0.001" step="any" max={selectedReturnSale?.returnableKg} value={returnKg} onChange={(event) => setReturnKg(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} />
              </Field>
              <Field label="Accepted for resale (KG)">
                <input required type="number" min="0" step="any" max={numberValue(returnKg)} value={acceptedReturnKg} onChange={(event) => setAcceptedReturnKg(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} />
              </Field>
              <Field label="Return notes (optional)">
                <input value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} className={inputClass} />
              </Field>
              <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 md:col-span-2">Accepted KG is added back to available saleable stock. Returned quantity is linked to the selected sale.</p>
              <button type="submit" disabled={!selectedReturnSale} className={buttonClass}>Save Return</button>
            </form>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Boxes className="h-5 w-5" />} title="Return History" count={salesReturns.length} />
            <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Date</th><th className="p-3">Product / Sale</th><th className="p-3 text-right">Returned KG</th><th className="p-3 text-right">Accepted / Restocked KG</th><th className="p-3">Notes</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{salesReturns.length === 0 ? <EmptyRow colSpan={5} /> : salesReturns.map((entry) => <tr key={entry.id}><td className="p-3">{new Date(entry.returnedAt).toLocaleDateString()}</td><td className="p-3">{entry.product} · {sales.find((sale) => sale.id === entry.saleId)?.buyerName || 'Original sale'}</td><td className="p-3 text-right font-mono">{entry.returnedKg.toLocaleString()}</td><td className="p-3 text-right font-mono font-bold">{entry.acceptedKg.toLocaleString()}</td><td className="p-3">{entry.notes || '—'}</td></tr>)}</tbody>
            </table></div>
          </section>
        </div>
      )}

      {section === 'sorting' && view === 'entry' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 p-4">
              <h2 className="font-bold text-slate-900">Send Store Material to Sorting</h2>
              <p className="mt-1 text-xs text-slate-600">The withdrawn quantity is removed from available store stock. The sorting categories must exactly balance.</p>
            </div>
            <form onSubmit={handleCreateSortingBatch} className="space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Store delivery / material">
                  <select required value={receiptId} onChange={(event) => setReceiptId(event.target.value)} className={inputClass}>
                    <option value="">Select available stock</option>
                    {availableReceipts.map((receipt) => (
                      <option key={receipt.id} value={receipt.id}>
                        {stores.find((store) => store.id === receipt.storeId)?.name || 'Store'} · {receipt.purchase.poNumber} · {receipt.purchase.materialType || 'Material'} · {receipt.availableKg.toLocaleString()} KG available
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sorting input (KG)">
                  <input required type="number" min="0.001" step="any" value={sortInputKg} onChange={(event) => setSortInputKg(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} />
                </Field>
                <div className="flex items-end rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">
                  Available: {receiptAvailableKg.toLocaleString()} KG
                </div>
              </div>
              {selectedReceipt && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Source: {selectedReceipt.purchase.poNumber} · {selectedReceipt.purchase.supplierName} · {selectedReceipt.purchase.materialType || 'Unspecified material'} · Color {selectedReceipt.purchase.color || '—'} · Condition {selectedReceipt.purchase.condition || '—'}
                </p>
              )}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">Bottle Lots by Color and Quality</h3>
                    <p className="text-xs text-slate-500">Each bottle lot advances separately through washing and production.</p>
                  </div>
                  <button type="button" onClick={addBottleLot} className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-50"><Plus className="h-3.5 w-3.5" />Add Bottle Lot</button>
                </div>
                <div className="space-y-3">
                  {bottleLots.map((lot) => (
                    <div key={lot.id} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                      <Field label="Color">
                        <select value={lot.color} onChange={(event) => updateBottleLot(lot.id, { color: event.target.value })} className={inputClass}>
                          {colors.map((color) => <option key={color}>{color}</option>)}
                        </select>
                      </Field>
                      {lot.color === 'Other' && <Field label="Specify color"><input required value={customBottleValues[lot.id]?.color || ''} onChange={(event) => updateBottleCustom(lot.id, 'color', event.target.value)} className={inputClass} /></Field>}
                      <Field label="Condition">
                        <select value={lot.condition} onChange={(event) => updateBottleLot(lot.id, { condition: event.target.value })} className={inputClass}>
                          {conditions.map((condition) => <option key={condition}>{condition}</option>)}
                        </select>
                      </Field>
                      {lot.condition === 'Other' && <Field label="Specify condition"><input required value={customBottleValues[lot.id]?.condition || ''} onChange={(event) => updateBottleCustom(lot.id, 'condition', event.target.value)} className={inputClass} /></Field>}
                      <Field label="Quality">
                        <select value={lot.quality} onChange={(event) => updateBottleLot(lot.id, { quality: event.target.value })} className={inputClass}>
                          {qualities.map((quality) => <option key={quality}>{quality}</option>)}
                        </select>
                      </Field>
                      {lot.quality === 'Other' && <Field label="Specify quality"><input required value={customBottleValues[lot.id]?.quality || ''} onChange={(event) => updateBottleCustom(lot.id, 'quality', event.target.value)} className={inputClass} /></Field>}
                      <Field label="Bottle weight (KG)">
                        <input required type="number" min="0" step="any" value={lot.kg || ''} onChange={(event) => updateBottleLot(lot.id, { kg: Number(event.target.value) || 0 })} className={inputClass} />
                      </Field>
                      <button type="button" disabled={bottleLots.length === 1} onClick={() => setBottleLots((previous) => previous.filter((item) => item.id !== lot.id))} aria-label="Remove bottle lot" className="self-end rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-right text-sm font-bold text-slate-800">Bottle total: {bottleTotal.toLocaleString()} KG</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 font-bold text-slate-900">Other Sorted Materials</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KgField label="Rings (KG)" value={ringKg} onChange={setRingKg} />
                  <KgField label="Caps (KG)" value={capKg} onChange={setCapKg} />
                  <KgField label="Wrappers (KG)" value={wrapperKg} onChange={setWrapperKg} />
                  <KgField label="Other (KG)" value={otherKg} onChange={setOtherKg} />
                </div>
                {numberValue(otherKg) > 0 && <Field label="Specify other material"><input required value={otherDescription} onChange={(event) => setOtherDescription(event.target.value)} className={inputClass} /></Field>}
                <div className={`mt-4 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold ${nearlyEqual(sortBreakdownTotal, numberValue(sortInputKg)) ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
                  <span>Sorted total</span><span>{sortBreakdownTotal.toLocaleString()} / {numberValue(sortInputKg).toLocaleString()} KG</span>
                </div>
              </div>
              <button type="submit" className={buttonClass} disabled={!selectedReceipt}><Recycle className="h-4 w-4" />Confirm Store Withdrawal & Sort</button>
            </form>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Recycle className="h-5 w-5" />} title="Sorting History" count={sortingBatches.length} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Date / PO</th><th className="p-3">Material</th><th className="p-3">Input KG</th><th className="p-3">Bottles KG</th><th className="p-3">Rings</th><th className="p-3">Caps</th><th className="p-3">Wrappers</th><th className="p-3">Other</th><th className="p-3">Source Store</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{sortingBatches.length === 0 ? <EmptyRow colSpan={9} /> : sortingBatches.map((batch) => (
                  <tr key={batch.id} className="odd:bg-white even:bg-slate-50/70">
                    <td className="p-3">{new Date(batch.createdAt).toLocaleDateString()}<div className="text-slate-500">{batch.sourcePurchase.poNumber}</div></td>
                    <td className="p-3">{batch.sourcePurchase.materialType || '—'}</td>
                    <td className="p-3 font-mono font-bold">{batch.inputKg.toLocaleString()}</td>
                    <td className="p-3">{batch.bottleLots.reduce((sum, lot) => sum + lot.kg, 0).toLocaleString()} <span className="text-slate-500">({batch.bottleLots.length} lots)</span></td>
                    <td className="p-3">{batch.ringKg}</td><td className="p-3">{batch.capKg}</td><td className="p-3">{batch.wrapperKg}</td>
                    <td className="p-3">{batch.otherKg}{batch.otherDescription ? ` · ${batch.otherDescription}` : ''}</td>
                    <td className="p-3">{stores.find((store) => store.id === batch.storeId)?.name || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {section === 'washing' && view === 'entry' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Droplets className="h-5 w-5" />} title="Record Washing Batch" />
            <form onSubmit={handleCreateWashBatch} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Sorted material stream">
                <select required value={washStreamId} onChange={(event) => setWashStreamId(event.target.value)} className={inputClass}>
                  <option value="">Select sorted material</option>
                  {streamBalances.filter((stream) => stream.availableKg > 0).map((stream) => (
                    <option key={stream.id} value={stream.id}>{categoryLabel(stream.category, stream.description)} · {stream.materialType} · {stream.color || 'No color'} · {stream.availableKg.toLocaleString()} KG available</option>
                  ))}
                </select>
              </Field>
              <Field label={`Input to wash (KG) · ${selectedWashStream?.availableKg.toLocaleString() || 0} available`}>
                <input required type="number" min="0.001" step="any" value={washInputKg} onChange={(event) => setWashInputKg(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} />
              </Field>
              <KgField label="Washed output (KG)" value={washedKg} onChange={setWashedKg} />
              <KgField label="Wash waste (KG)" value={washWasteKg} onChange={setWashWasteKg} />
              {numberValue(washWasteKg) > 0 && <Field label="Waste condition / quality"><input required value={washWasteCondition} onChange={(event) => setWashWasteCondition(event.target.value)} placeholder="e.g. Mud, labels, contaminated material" className={inputClass} /></Field>}
              <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-sky-950 md:col-span-2"><span>Washed + waste</span><span>{washBalanceKg.toLocaleString()} / {numberValue(washInputKg).toLocaleString()} KG</span></div>
              <button type="submit" disabled={!selectedWashStream} className={buttonClass}><Droplets className="h-4 w-4" />Save Washing</button>
            </form>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Droplets className="h-5 w-5" />} title="Washing History" count={washingBatches.length} />
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Date / PO</th><th className="p-3">Stream</th><th className="p-3">Material / Color</th><th className="p-3">Condition / Quality</th><th className="p-3">Input</th><th className="p-3">Washed</th><th className="p-3">Waste / Condition</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{washingBatches.length === 0 ? <EmptyRow colSpan={7} /> : washingBatches.map((batch) => (
                <tr key={batch.id} className="odd:bg-white even:bg-slate-50/70"><td className="p-3">{new Date(batch.createdAt).toLocaleDateString()}<div className="text-slate-500">{batch.sourcePurchase.poNumber}</div></td><td className="p-3">{categoryLabel(batch.category, batch.description)}</td><td className="p-3">{batch.materialType} / {batch.color || '—'}</td><td className="p-3">{batch.condition || '—'} / {batch.quality || '—'}</td><td className="p-3 font-mono">{batch.inputKg.toLocaleString()}</td><td className="p-3 font-mono font-bold">{batch.washedKg.toLocaleString()}</td><td className="p-3">{batch.wasteKg.toLocaleString()} KG{batch.wasteCondition ? ` · ${batch.wasteCondition}` : ''}</td></tr>
              ))}</tbody>
            </table></div>
          </section>
        </>
      )}

      {section === 'production' && view === 'entry' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Factory className="h-5 w-5" />} title="Record Bottle Production" />
            <form onSubmit={handleCreateProductionBatch} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Washed bottle batch">
                <select required value={productionWashId} onChange={(event) => setProductionWashId(event.target.value)} className={inputClass}>
                  <option value="">Select washed bottle batch</option>
                  {availableWashRuns.map((batch) => <option key={batch.id} value={batch.id}>{batch.materialType} · {batch.color} · {batch.sourcePurchase.poNumber} · {batch.availableKg.toLocaleString()} KG available</option>)}
                </select>
              </Field>
              <Field label={`Production input (KG) · ${selectedProductionWash?.availableKg.toLocaleString() || 0} available`}>
                <input required type="number" min="0.001" step="any" value={productionInputKg} onChange={(event) => setProductionInputKg(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} />
              </Field>
              <Field label="Production quality">
                <select value={productionQuality} onChange={(event) => setProductionQuality(event.target.value)} className={inputClass}>
                  {qualities.map((quality) => <option key={quality}>{quality}</option>)}
                </select>
              </Field>
              {productionQuality === 'Other' && <Field label="Specify production quality"><input required value={productionQualityOther} onChange={(event) => setProductionQualityOther(event.target.value)} className={inputClass} /></Field>}
              <KgField label="Flakes (KG)" value={flakesKg} onChange={setFlakesKg} />
              <KgField label="Dust (KG)" value={dustKg} onChange={setDustKg} />
              <KgField label="Other output (KG)" value={productionOtherKg} onChange={setProductionOtherKg} />
              <KgField label="Quality / condition waste (KG)" value={productionWasteKg} onChange={setProductionWasteKg} />
              {numberValue(productionOtherKg) > 0 && <Field label="Specify other output"><input required value={productionOtherDescription} onChange={(event) => setProductionOtherDescription(event.target.value)} className={inputClass} /></Field>}
              {numberValue(productionWasteKg) > 0 && <Field label="Waste condition / quality"><input required value={productionWasteCondition} onChange={(event) => setProductionWasteCondition(event.target.value)} placeholder="e.g. Contaminated, poor-quality material" className={inputClass} /></Field>}
              <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-950 md:col-span-2"><span>Flakes + dust + other + waste</span><span>{productionBalanceKg.toLocaleString()} / {numberValue(productionInputKg).toLocaleString()} KG</span></div>
              <button type="submit" disabled={!selectedProductionWash} className={buttonClass}><Factory className="h-4 w-4" />Save Production Batch</button>
            </form>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Factory className="h-5 w-5" />} title="Production & Waste History" count={productionBatches.length} />
            <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Date / PO</th><th className="p-3">Material / Color / Quality</th><th className="p-3">Input</th><th className="p-3">Flakes</th><th className="p-3">Dust</th><th className="p-3">Other Output</th><th className="p-3">Trash / Condition</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{productionBatches.length === 0 ? <EmptyRow colSpan={7} /> : productionBatches.map((batch) => (
                <tr key={batch.id} className="odd:bg-white even:bg-slate-50/70"><td className="p-3">{new Date(batch.createdAt).toLocaleDateString()}<div className="text-slate-500">{batch.sourcePurchase.poNumber}</div></td><td className="p-3">{batch.materialType} / {batch.color} / {batch.quality || 'Unspecified'}</td><td className="p-3 font-mono">{batch.inputKg.toLocaleString()}</td><td className="p-3 font-mono font-bold text-emerald-800">{batch.flakesKg.toLocaleString()}</td><td className="p-3 font-mono">{batch.dustKg.toLocaleString()}</td><td className="p-3">{batch.otherKg.toLocaleString()} {batch.otherDescription}</td><td className="p-3">{batch.wasteKg.toLocaleString()} KG · {batch.wasteCondition || '—'}</td></tr>
              ))}</tbody>
            </table></div>
          </section>
        </>
      )}

      {section === 'sales' && view === 'entry' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<CircleDollarSign className="h-5 w-5" />} title="Record a Material Sale" />
            <form onSubmit={handleCreateSale} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Saleable stock">
                <select required value={saleStockItemId} onChange={(event) => setSaleStockItemId(event.target.value)} className={inputClass}>
                  <option value="">Select available product</option>
                  {saleStock.map((item) => <option key={item.id} value={item.id}>{item.product} · {item.color || 'No color'} · {item.availableKg.toLocaleString()} KG available · {item.sourcePurchase.poNumber}</option>)}
                </select>
              </Field>
              <Field label={`Available (KG) · ${selectedSaleStock?.availableKg.toLocaleString() || 0}`}>
                <input required type="number" min="0.001" step="any" max={selectedSaleStock?.availableKg} value={saleQuantityKg} onChange={(event) => setSaleQuantityKg(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} />
              </Field>
              <Field label="Rate per KG">
                <input required type="number" min="0.01" step="any" value={saleRatePerKg} onChange={(event) => setSaleRatePerKg(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} />
              </Field>
              <Field label="Buyer name">
                <input required value={saleBuyerName} onChange={(event) => setSaleBuyerName(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Sale notes (optional)">
                <input value={saleNotes} onChange={(event) => setSaleNotes(event.target.value)} className={inputClass} />
              </Field>
              <div className="flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950">
                Sale total: PKR {(numberValue(saleQuantityKg) * numberValue(saleRatePerKg)).toLocaleString()}
              </div>
              <button type="submit" disabled={!selectedSaleStock} className={buttonClass}><CircleDollarSign className="h-4 w-4" />Record Sale</button>
            </form>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<Boxes className="h-5 w-5" />} title="Saleable Stock" count={saleStock.length} />
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Product</th><th className="p-3">Material / Color</th><th className="p-3">Source PO</th><th className="p-3 text-right">Available KG</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{saleStock.length === 0 ? <EmptyRow colSpan={4} /> : saleStock.map((item) => (
                <tr key={item.id} className="odd:bg-white even:bg-slate-50/70"><td className="p-3 font-semibold">{item.product}</td><td className="p-3">{item.materialType} / {item.color || '—'}</td><td className="p-3">{item.sourcePurchase.poNumber}</td><td className="p-3 text-right font-mono font-bold">{item.availableKg.toLocaleString()}</td></tr>
              ))}</tbody>
            </table></div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={<CircleDollarSign className="h-5 w-5" />} title="Sales History" count={sales.length} />
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3">Source PO</th><th className="p-3">Buyer</th><th className="p-3 text-right">KG</th><th className="p-3 text-right">Rate / KG</th><th className="p-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{sales.length === 0 ? <EmptyRow colSpan={7} /> : sales.map((sale) => (
                <tr key={sale.id} className="odd:bg-white even:bg-slate-50/70"><td className="p-3">{new Date(sale.soldAt).toLocaleDateString()}</td><td className="p-3 font-semibold">{sale.product}</td><td className="p-3">{sale.sourcePurchase.poNumber}</td><td className="p-3">{sale.buyerName}</td><td className="p-3 text-right font-mono">{sale.quantityKg.toLocaleString()}</td><td className="p-3 text-right font-mono">{sale.ratePerKg.toLocaleString()}</td><td className="p-3 text-right font-mono font-bold">{sale.totalAmount.toLocaleString()}</td></tr>
              ))}</tbody>
            </table></div>
          </section>
        </>
      )}

      {purchases.length === 0 && section === 'sorting' && view === 'entry' && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No purchases are available. Create and receive a purchase into a store first.</p>
      )}
      <p className="text-right text-[11px] text-slate-500">Local date: {todayKey}</p>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-700">{label}</span>{children}</label>;
}

function KgField({ label, value, onChange }: { label: string; value: NumericInput; onChange: (value: NumericInput) => void }) {
  return (
    <Field label={label}>
      <input type="number" min="0" step="any" value={value} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} />
    </Field>
  );
}

function SectionHeading({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-4">
      <div className="rounded-lg bg-sky-100 p-2 text-sky-800">{icon}</div>
      <h2 className="font-bold text-slate-900">{title}</h2>
      {count !== undefined && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">{count}</span>}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
    </article>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return <tr><td colSpan={colSpan} className="p-8 text-center text-slate-500">No records yet.</td></tr>;
}

function PackageCheckIcon() {
  return <ArrowDownToLine className="h-4 w-4 shrink-0" />;
}
