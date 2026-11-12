import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProcurement } from '../ProcurementContext';
import type { PurchaseRecord, PurchaseRecordStatus, PaymentType } from '../types';
import { useStores } from '../../stores/StoreContext';
import {
  exportPurchasesToExcel,
  exportPurchasesToPDF,
} from '../../../utils/exportHelpers';
import {
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  RotateCcw,
  Scale,
  DollarSign,
  UserPlus,
  Users,
  Building2,
  CalendarDays,
} from 'lucide-react';

const MATERIAL_TYPES = ['PVC Resin', 'PVC Scrap', 'PVC Regrind', 'PVC Compound', 'Additives', 'Other'];
const MATERIAL_COLORS = ['White', 'Grey', 'Black', 'Transparent', 'Mixed', 'Other'];
const MATERIAL_GRADES = ['Prime', 'Off-grade', 'Recycled', 'Suspension', 'Emulsion', 'K67', 'Other'];
const MATERIAL_CONDITIONS = ['Clean', 'Mixed', 'Contaminated', 'Wet', 'Dry', 'Other'];

const getMaterialSelection = (value: string | undefined, options: string[]) =>
  value && options.includes(value) ? value : value ? 'Other' : '';

type PurchaseField =
  | 'supplier'
  | 'buyer'
  | 'purchaseDate'
  | 'vehicleNumber'
  | 'materialType'
  | 'materialTypeOther'
  | 'materialColor'
  | 'materialColorOther'
  | 'materialGrade'
  | 'materialGradeOther'
  | 'materialCondition'
  | 'materialConditionOther'
  | 'grossWeight'
  | 'tareWeight'
  | 'ratePerKg'
  | 'paidAmount'
  | 'store'
  | 'status';

type PurchaseFieldErrors = Partial<Record<PurchaseField, string>>;

export const PurchaseDetailsPage: React.FC = () => {
  const {
    purchases,
    suppliers,
    buyers,
    addPurchase,
    updatePurchase,
    deletePurchase,
    clearAllPurchases,
    addSupplier,
    addBuyer,
  } = useProcurement();
  const { stores, receipts, receivePurchase } = useStores();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('All');
  const [supplierFilter, setSupplierFilter] = useState<string>('All');
  const [buyerFilter, setBuyerFilter] = useState<string>('All');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseRecord | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseRecord | null>(null);
  const [deletingPO, setDeletingPO] = useState<PurchaseRecord | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedPurchaseStoreId, setSelectedPurchaseStoreId] = useState('');
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseRecord | null>(null);
  const [receivingStoreId, setReceivingStoreId] = useState('');
  const [editStoreId, setEditStoreId] = useState('');
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick inline add modals inside the purchase form
  const [showInlineAddSupplier, setShowInlineAddSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupErrors, setNewSupErrors] = useState<{ name?: string; phone?: string; address?: string }>({});

  const [showInlineAddBuyer, setShowInlineAddBuyer] = useState(false);
  const [newBuyName, setNewBuyName] = useState('');
  const [newBuyContact, setNewBuyContact] = useState('');
  const [newBuyEmail, setNewBuyEmail] = useState('');
  const [newBuyErrors, setNewBuyErrors] = useState<{ name?: string; contact?: string; email?: string }>({});

  // Add Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryDateRanges] = useState(() => {
    const formatDateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const today = new Date();
    const startDateKey = (days: number) => {
      const start = new Date(today);
      start.setDate(start.getDate() - days + 1);
      return formatDateKey(start);
    };
    return {
      today: formatDateKey(today),
      last7Days: startDateKey(7),
      last30Days: startDateKey(30),
      last90Days: startDateKey(90),
    };
  });
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [materialTypeOther, setMaterialTypeOther] = useState('');
  const [materialColor, setMaterialColor] = useState('');
  const [materialColorOther, setMaterialColorOther] = useState('');
  const [materialGrade, setMaterialGrade] = useState('');
  const [materialGradeOther, setMaterialGradeOther] = useState('');
  const [materialCondition, setMaterialCondition] = useState('');
  const [materialConditionOther, setMaterialConditionOther] = useState('');
  const [grossWeightKg, setGrossWeightKg] = useState<number | ''>('');
  const [tareWeightKg, setTareWeightKg] = useState<number | ''>('');
  const [ratePerKg, setRatePerKg] = useState<number | ''>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('Credit');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [recordStatus, setRecordStatus] = useState<PurchaseRecordStatus>('Pending Approval');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PurchaseFieldErrors>({});
  const [editFieldErrors, setEditFieldErrors] = useState<PurchaseFieldErrors>({});

  // Edit Form state
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editBuyerName, setEditBuyerName] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editMaterialType, setEditMaterialType] = useState('');
  const [editMaterialTypeOther, setEditMaterialTypeOther] = useState('');
  const [editMaterialColor, setEditMaterialColor] = useState('');
  const [editMaterialColorOther, setEditMaterialColorOther] = useState('');
  const [editMaterialGrade, setEditMaterialGrade] = useState('');
  const [editMaterialGradeOther, setEditMaterialGradeOther] = useState('');
  const [editMaterialCondition, setEditMaterialCondition] = useState('');
  const [editMaterialConditionOther, setEditMaterialConditionOther] = useState('');
  const [editGrossWeight, setEditGrossWeight] = useState<number>(0);
  const [editTareWeight, setEditTareWeight] = useState<number>(0);
  const [editRatePerKg, setEditRatePerKg] = useState<number>(0);
  const [editPaymentType, setEditPaymentType] = useState<PaymentType>('Credit');
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<PurchaseRecordStatus>('Pending Approval');
  const [editNotes, setEditNotes] = useState('');

  // Initialize selected supplier/buyer when opening Add modal
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  useEffect(() => {
    if (buyers.length > 0 && !selectedBuyerId) {
      setSelectedBuyerId(buyers[0].id);
    }
  }, [buyers, selectedBuyerId]);

  // Automatic calculation for Add Form
  const todayKey = new Date().toISOString().split('T')[0];
  const numGross = typeof grossWeightKg === 'number' ? grossWeightKg : 0;
  const numTare = typeof tareWeightKg === 'number' ? tareWeightKg : 0;
  const numRate = typeof ratePerKg === 'number' ? ratePerKg : 0;
  const numPaid = typeof paidAmount === 'number' ? paidAmount : 0;

  const calculatedNetWeight = Math.max(0, numGross - numTare);
  const calculatedTotalAmount = calculatedNetWeight * numRate;
  const calculatedPayableAmount = Math.max(0, calculatedTotalAmount - numPaid);

  // Automatic calculation for Edit Form
  const editCalculatedNet = Math.max(0, editGrossWeight - editTareWeight);
  const editCalculatedTotal = editCalculatedNet * editRatePerKg;
  const editCalculatedPayable = Math.max(0, editCalculatedTotal - editPaidAmount);

  // Cash/Card are always paid in full; Credit is unpaid; Mixed lets the user enter a partial amount.
  const isFullPayment = paymentType === 'Cash' || paymentType === 'Card';
  const isMixedPayment = paymentType === 'Mixed';

  useEffect(() => {
    if (isFullPayment) {
      setPaidAmount(calculatedTotalAmount);
    } else if (paymentType === 'Credit') {
      setPaidAmount(0);
    }
  }, [isFullPayment, paymentType, calculatedTotalAmount]);

  // Adjust paid amount default based on Payment Type
  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    clearFieldError('paidAmount');
    if (type === 'Cash' || type === 'Card') {
      setPaidAmount(calculatedTotalAmount);
    } else if (type === 'Credit') {
      setPaidAmount(0);
    } else if (type === 'Mixed') {
      setPaidAmount('');
    }
  };

  // Cash/Card in the edit form always stay fully paid when weights or rate change.
  useEffect(() => {
    if (!editingPO) return;
    if (editPaymentType === 'Cash' || editPaymentType === 'Card') {
      setEditPaidAmount(editCalculatedTotal);
    }
  }, [editingPO, editPaymentType, editCalculatedTotal]);

  const handleEditPaymentTypeChange = (type: PaymentType) => {
    setEditPaymentType(type);
    clearEditFieldError('paidAmount');
    if (type === 'Cash' || type === 'Card') {
      setEditPaidAmount(editCalculatedTotal);
    } else if (type === 'Credit') {
      setEditPaidAmount(0);
    } else if (type === 'Mixed') {
      setEditPaidAmount(0);
    }
  };

  const clearFieldError = (field: PurchaseField) => {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const clearEditFieldError = (field: PurchaseField) => {
    setEditFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  // Live, per-field feedback while the user types (before pressing Save).
  const liveFieldErrors: PurchaseFieldErrors = {};
  if (numGross > 0 && numTare >= numGross) {
    liveFieldErrors.tareWeight = 'Tare Weight must be less than Gross Weight.';
  }
  if (
    isMixedPayment &&
    paidAmount !== '' &&
    calculatedTotalAmount > 0 &&
    (numPaid <= 0 || numPaid >= calculatedTotalAmount)
  ) {
    liveFieldErrors.paidAmount = 'Enter an amount greater than 0 and less than the total amount.';
  }
  if (recordStatus === 'Completed' && purchaseDate && purchaseDate > todayKey) {
    liveFieldErrors.purchaseDate = 'Completed records can only use today or a previous purchase date.';
  }

  const liveEditFieldErrors: PurchaseFieldErrors = {};
  if (editGrossWeight > 0 && editTareWeight >= editGrossWeight) {
    liveEditFieldErrors.tareWeight = 'Tare Weight must be less than Gross Weight.';
  }
  if (
    editPaymentType === 'Mixed' &&
    editPaidAmount > 0 &&
    editCalculatedTotal > 0 &&
    editPaidAmount >= editCalculatedTotal
  ) {
    liveEditFieldErrors.paidAmount = 'Enter an amount greater than 0 and less than the total amount.';
  }
  if (editStatus === 'Completed' && editPurchaseDate && editPurchaseDate > todayKey) {
    liveEditFieldErrors.purchaseDate = 'Completed records can only use today or a previous purchase date.';
  }

  const renderFieldError = (field: PurchaseField) => {
    const message = fieldErrors[field] ?? liveFieldErrors[field];
    return message ? <p className="mt-1 text-[11px] font-medium text-rose-600">{message}</p> : null;
  };

  const renderEditFieldError = (field: PurchaseField) => {
    const message = editFieldErrors[field] ?? liveEditFieldErrors[field];
    return message ? <p className="mt-1 text-[11px] font-medium text-rose-600">{message}</p> : null;
  };

  const hasFieldError = (field: PurchaseField) =>
    Boolean(fieldErrors[field] ?? liveFieldErrors[field]);
  const hasEditFieldError = (field: PurchaseField) =>
    Boolean(editFieldErrors[field] ?? liveEditFieldErrors[field]);

  const errorInputClass = (hasError: boolean) =>
    `border ${hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200'}`;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalSpend = purchases.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalPayable = purchases.reduce((acc, curr) => acc + curr.payableAmount, 0);
    const totalNetWeight = purchases.reduce((acc, curr) => acc + curr.netWeightKg, 0);
    const pendingCount = purchases.filter((p) => p.status === 'Pending Approval').length;
    return { totalSpend, totalPayable, totalNetWeight, pendingCount };
  }, [purchases]);

  const deliveryMetrics = useMemo(() => {
    const countSince = (startDate: string) =>
      purchases.filter(
        (purchase) =>
          purchase.purchaseDate >= startDate && purchase.purchaseDate <= deliveryDateRanges.today
      ).length;

    return {
      today: purchases.filter((purchase) => purchase.purchaseDate === deliveryDateRanges.today).length,
      last7Days: countSince(deliveryDateRanges.last7Days),
      last30Days: countSince(deliveryDateRanges.last30Days),
      last90Days: countSince(deliveryDateRanges.last90Days),
    };
  }, [purchases, deliveryDateRanges]);

  const selectedPOReceipt = selectedPO
    ? receipts.find((receipt) => receipt.purchaseId === selectedPO.id)
    : undefined;
  const selectedPOStore = selectedPOReceipt
    ? stores.find((store) => store.id === selectedPOReceipt.storeId)
    : undefined;

  // Filtered orders
  const filteredPurchases = useMemo(() => {
    return purchases.filter((po) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        po.poNumber.toLowerCase().includes(q) ||
        po.vehicleNumber.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q) ||
        po.buyerName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
      const matchesPaymentType =
        paymentTypeFilter === 'All' || po.paymentType === paymentTypeFilter;
      const matchesSupplier =
        supplierFilter === 'All' || po.supplierName === supplierFilter;
      const matchesBuyer = buyerFilter === 'All' || po.buyerName === buyerFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPaymentType &&
        matchesSupplier &&
        matchesBuyer
      );
    });
  }, [purchases, searchQuery, statusFilter, paymentTypeFilter, supplierFilter, buyerFilter]);

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== 'All' ||
    paymentTypeFilter !== 'All' ||
    supplierFilter !== 'All' ||
    buyerFilter !== 'All';

  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setPaymentTypeFilter('All');
    setSupplierFilter('All');
    setBuyerFilter('All');
  };

  // Quick inline add supplier submit
  const handleCreateInlineSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; phone?: string; address?: string } = {};
    if (!newSupName.trim()) errors.name = 'Supplier name is required.';
    if (!newSupPhone.trim()) errors.phone = 'Phone number is required.';
    if (!newSupAddress.trim()) errors.address = 'Shop address is required.';
    setNewSupErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const created = await addSupplier({
      name: newSupName.trim(),
      companyName: newSupName.trim(),
      phoneNumber: newSupPhone.trim(),
      shopAddress: newSupAddress.trim(),
      status: 'Active',
    });
    setSelectedSupplierId(created.id);
    setShowInlineAddSupplier(false);
    setNewSupName('');
    setNewSupPhone('');
    setNewSupAddress('');
    setNewSupErrors({});
    clearFieldError('supplier');
    showNotification(`Supplier "${created.name}" created and selected.`);
  };

  // Quick inline add buyer submit
  const handleCreateInlineBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; contact?: string; email?: string } = {};
    if (!newBuyName.trim()) errors.name = 'Buyer name is required.';
    if (!newBuyContact.trim()) errors.contact = 'Contact number is required.';
    if (newBuyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBuyEmail.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    setNewBuyErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const created = await addBuyer({
      name: newBuyName.trim(),
      contact: newBuyContact.trim(),
      email: newBuyEmail.trim(),
      status: 'Active',
    });
    setSelectedBuyerId(created.id);
    setShowInlineAddBuyer(false);
    setNewBuyName('');
    setNewBuyContact('');
    setNewBuyEmail('');
    setNewBuyErrors({});
    clearFieldError('buyer');
    showNotification(`Buyer "${created.name}" created and selected.`);
  };

  // Handle Add Purchase submit
  const handleAddPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const supObj = suppliers.find((s) => s.id === selectedSupplierId);
    const buyerObj = buyers.find((b) => b.id === selectedBuyerId);

    const errors: PurchaseFieldErrors = {};
    if (!supObj) errors.supplier = 'Please select or add a supplier.';
    if (!buyerObj) errors.buyer = 'Please select or add a buyer.';
    if (!vehicleNumber.trim()) errors.vehicleNumber = 'Vehicle / Truck Number is required.';
    if (materialType === 'Other' && !materialTypeOther.trim()) {
      errors.materialTypeOther = 'Please specify the material type.';
    }
    if (materialColor === 'Other' && !materialColorOther.trim()) {
      errors.materialColorOther = 'Please specify the color.';
    }
    if (materialGrade === 'Other' && !materialGradeOther.trim()) {
      errors.materialGradeOther = 'Please specify the grade.';
    }
    if (materialCondition === 'Other' && !materialConditionOther.trim()) {
      errors.materialConditionOther = 'Please specify the condition.';
    }
    if (
      recordStatus === 'Completed' &&
      selectedPurchaseStoreId &&
      !stores.some((store) => store.id === selectedPurchaseStoreId)
    ) {
      errors.store = 'The selected store no longer exists. Choose another store or leave it unassigned.';
    }
    if (numGross <= 0) {
      errors.grossWeight = 'Gross Weight must be greater than 0 KG.';
    }
    if (numTare < 0) {
      errors.tareWeight = 'Tare Weight cannot be negative.';
    } else if (numTare >= numGross) {
      errors.tareWeight = 'Tare Weight must be less than Gross Weight.';
    }
    if (numRate <= 0) {
      errors.ratePerKg = 'Rate per KG (PKR) must be greater than 0.';
    }
    if (recordStatus === 'Completed' && (!purchaseDate || purchaseDate > todayKey)) {
      errors.purchaseDate = 'Completed records can only use today or a previous purchase date.';
    }
    if (isMixedPayment && (numPaid <= 0 || numPaid >= calculatedTotalAmount)) {
      errors.paidAmount = 'Enter an amount greater than 0 and less than the total amount.';
    } else if (numPaid > calculatedTotalAmount) {
      errors.paidAmount = 'Paid Amount cannot be greater than the Total Amount.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!supObj || !buyerObj) return;

    try {
      const newPO = await addPurchase({
        poNumber: `PO-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`,
        purchaseDate,
        supplierId: supObj.id,
        supplierName: supObj.name,
        buyerName: buyerObj.name,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        materialType: materialType === 'Other' ? materialTypeOther.trim() : materialType,
        color: materialColor === 'Other' ? materialColorOther.trim() : materialColor,
        grade: materialGrade === 'Other' ? materialGradeOther.trim() : materialGrade,
        condition: materialCondition === 'Other' ? materialConditionOther.trim() : materialCondition,
        grossWeightKg: numGross,
        tareWeightKg: numTare,
        netWeightKg: calculatedNetWeight,
        ratePerKg: numRate,
        totalAmount: calculatedTotalAmount,
        paymentType,
        paidAmount: numPaid,
        payableAmount: calculatedPayableAmount,
        status: recordStatus,
        currency: 'PKR',
        notes,
      });

      // Pending Approval / Draft stay in procurement until the record is marked Completed.
      if (recordStatus === 'Completed' && selectedPurchaseStoreId) {
        const receivedPurchase = { ...newPO, storeId: selectedPurchaseStoreId };
        const received = await receivePurchase(receivedPurchase, selectedPurchaseStoreId);
        if (!received) {
          setFormError('Could not receive this delivery into the selected store.');
          return;
        }
        await updatePurchase(newPO.id, { storeId: selectedPurchaseStoreId });
      }

      setIsAddModalOpen(false);
      setFieldErrors({});
      // Reset form
      setVehicleNumber('');
      setMaterialType('');
      setMaterialTypeOther('');
      setMaterialColor('');
      setMaterialColorOther('');
      setMaterialGrade('');
      setMaterialGradeOther('');
      setMaterialCondition('');
      setMaterialConditionOther('');
      setGrossWeightKg('');
      setTareWeightKg('');
      setRatePerKg('');
      setPaidAmount('');
      setNotes('');
      showNotification(`Purchase ${newPO.poNumber} created successfully.`);
    } catch {
      setFormError('Could not save the purchase record. Please try again.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (po: PurchaseRecord) => {
    setEditingPO(po);
    setEditFieldErrors({});
    setEditSupplierName(po.supplierName);
    setEditBuyerName(po.buyerName);
    setEditPurchaseDate(po.purchaseDate);
    setEditVehicleNumber(po.vehicleNumber);
    setEditStoreId(po.storeId || '');
    setEditMaterialType(getMaterialSelection(po.materialType, MATERIAL_TYPES));
    setEditMaterialTypeOther(getMaterialSelection(po.materialType, MATERIAL_TYPES) === 'Other' ? po.materialType || '' : '');
    setEditMaterialColor(getMaterialSelection(po.color, MATERIAL_COLORS));
    setEditMaterialColorOther(getMaterialSelection(po.color, MATERIAL_COLORS) === 'Other' ? po.color || '' : '');
    setEditMaterialGrade(getMaterialSelection(po.grade, MATERIAL_GRADES));
    setEditMaterialGradeOther(getMaterialSelection(po.grade, MATERIAL_GRADES) === 'Other' ? po.grade || '' : '');
    setEditMaterialCondition(getMaterialSelection(po.condition, MATERIAL_CONDITIONS));
    setEditMaterialConditionOther(getMaterialSelection(po.condition, MATERIAL_CONDITIONS) === 'Other' ? po.condition || '' : '');
    setEditGrossWeight(po.grossWeightKg);
    setEditTareWeight(po.tareWeightKg);
    setEditRatePerKg(po.ratePerKg);
    setEditPaymentType(po.paymentType);
    setEditPaidAmount(po.paidAmount);
    setEditStatus(po.status);
    setEditNotes(po.notes || '');
  };

  // Handle Edit Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;
    const errors: PurchaseFieldErrors = {};
    const existingReceipt = receipts.find((receipt) => receipt.purchaseId === editingPO.id);
    if (editMaterialType === 'Other' && !editMaterialTypeOther.trim()) {
      errors.materialTypeOther = 'Please specify the material type.';
    }
    if (editMaterialColor === 'Other' && !editMaterialColorOther.trim()) {
      errors.materialColorOther = 'Please specify the color.';
    }
    if (editMaterialGrade === 'Other' && !editMaterialGradeOther.trim()) {
      errors.materialGradeOther = 'Please specify the grade.';
    }
    if (editMaterialCondition === 'Other' && !editMaterialConditionOther.trim()) {
      errors.materialConditionOther = 'Please specify the condition.';
    }
    if (!editVehicleNumber.trim()) {
      errors.vehicleNumber = 'Vehicle / Truck Number is required.';
    }
    if (editGrossWeight <= 0) {
      errors.grossWeight = 'Gross Weight must be greater than 0 KG.';
    }
    if (editTareWeight < 0) {
      errors.tareWeight = 'Tare Weight cannot be negative.';
    } else if (editTareWeight >= editGrossWeight) {
      errors.tareWeight = 'Tare Weight must be less than Gross Weight.';
    }
    if (editRatePerKg <= 0) {
      errors.ratePerKg = 'Rate per KG (PKR) must be greater than 0.';
    }
    if (editStatus === 'Completed' && (!editPurchaseDate || editPurchaseDate > todayKey)) {
      errors.purchaseDate = 'Completed records can only use today or a previous purchase date.';
    }
    if (editPaymentType === 'Mixed' && (editPaidAmount <= 0 || editPaidAmount >= editCalculatedTotal)) {
      errors.paidAmount = 'Enter an amount greater than 0 and less than the total amount.';
    } else if (editPaidAmount > editCalculatedTotal) {
      errors.paidAmount = 'Paid Amount cannot be greater than the Total Amount.';
    }
    if (
      editStatus === 'Completed' &&
      !existingReceipt &&
      editStoreId &&
      !stores.some((store) => store.id === editStoreId)
    ) {
      errors.store = 'The selected store no longer exists. Choose another store or leave it unassigned.';
    }
    if (existingReceipt && editStatus !== 'Completed') {
      errors.status = 'A received delivery must remain Completed.';
    }

    setEditFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const updatedPurchase: PurchaseRecord = {
      ...editingPO,
      supplierName: editSupplierName,
      buyerName: editBuyerName,
      purchaseDate: editPurchaseDate,
      vehicleNumber: editVehicleNumber.toUpperCase(),
      materialType: editMaterialType === 'Other' ? editMaterialTypeOther.trim() : editMaterialType,
      color: editMaterialColor === 'Other' ? editMaterialColorOther.trim() : editMaterialColor,
      grade: editMaterialGrade === 'Other' ? editMaterialGradeOther.trim() : editMaterialGrade,
      condition: editMaterialCondition === 'Other' ? editMaterialConditionOther.trim() : editMaterialCondition,
      grossWeightKg: editGrossWeight,
      tareWeightKg: editTareWeight,
      netWeightKg: editCalculatedNet,
      ratePerKg: editRatePerKg,
      totalAmount: editCalculatedTotal,
      paymentType: editPaymentType,
      paidAmount: editPaidAmount,
      payableAmount: editCalculatedPayable,
      status: editStatus,
      storeId:
        existingReceipt?.storeId ||
        (editStatus === 'Completed' && stores.some((store) => store.id === editStoreId)
          ? editStoreId
          : undefined),
      notes: editNotes,
    };

    try {
      // Only a Completed record is pushed into store inventory.
      if (
        editStatus === 'Completed' &&
        !existingReceipt &&
        editStoreId &&
        !(await receivePurchase(updatedPurchase, editStoreId))
      ) {
        alert('Could not receive this delivery into the selected store.');
        return;
      }
      await updatePurchase(editingPO.id, updatedPurchase);

      setEditingPO(null);
      showNotification(`Purchase record updated successfully.`);
    } catch {
      alert('Could not update the purchase record. Please try again.');
    }
  };

  const handleReceiveDelivery = async () => {
    if (!receivingPurchase || !receivingStoreId) return;
    const alreadyReceived = receipts.some((receipt) => receipt.purchaseId === receivingPurchase.id);
    if (alreadyReceived) {
      alert('This delivery has already been received into a store.');
      setReceivingPurchase(null);
      return;
    }

    const receivedPurchase = {
      ...receivingPurchase,
      status: 'Completed' as const,
      storeId: receivingStoreId,
    };
    const received = await receivePurchase(receivedPurchase, receivingStoreId);
    if (!received) {
      alert('Could not receive this delivery. Check that the selected store still exists.');
      return;
    }
    await updatePurchase(receivingPurchase.id, { status: 'Completed', storeId: receivingStoreId });
    setSelectedPO(receivedPurchase);
    setReceivingPurchase(null);
    showNotification(`Delivery ${receivingPurchase.poNumber} received into the selected store.`);
  };

  const handleDelete = () => {
    if (!deletingPO) return;
    deletePurchase(deletingPO.id);
    showNotification(`Purchase order ${deletingPO.poNumber} deleted.`);
    setDeletingPO(null);
    if (selectedPO?.id === deletingPO.id) {
      setSelectedPO(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await clearAllPurchases();
      setSelectedPO(null);
      showNotification('All purchase records have been deleted.');
    } catch {
      showNotification('Failed to delete purchase records. Please try again.');
    }
    setIsDeleteAllOpen(false);
  };

  const handleExportExcel = () => {
    if (filteredPurchases.length === 0) {
      alert('No purchase records to export.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    exportPurchasesToExcel(
      filteredPurchases,
      `AlBatina_Purchase_Report_${today}.xlsx`
    );
    showNotification(`Downloaded ${filteredPurchases.length} purchase records in Excel (.xlsx).`);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    if (filteredPurchases.length === 0) {
      alert('No purchase records to export.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    exportPurchasesToPDF(
      filteredPurchases,
      `AlBatina_Purchase_Report_${today}.pdf`
    );
    showNotification(`Downloaded ${filteredPurchases.length} purchase records in PDF.`);
    setIsExportMenuOpen(false);
  };

  const getRecordStatusBadge = (status: PurchaseRecordStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'Pending Approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending Approval
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Draft
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getPaymentTypeBadge = (type: PaymentType) => {
    switch (type) {
      case 'Cash':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            Cash
          </span>
        );
      case 'Card':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
            Card
          </span>
        );
      case 'Credit':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            Credit
          </span>
        );
      case 'Mixed':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
            Mixed
          </span>
        );
    }
  };

  const draftPurchases = purchases.filter((po) => po.status === 'Draft');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Procurement</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-sky-600 font-semibold">Purchase Details</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Weighbridge & Stock Inward</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track incoming trucks, weighbridge gross/tare, net weight calculations, rate per KG, and payments in PKR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Dropdown (Excel & PDF) */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Export Purchase Details
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-3 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Download Excel</div>
                    <div className="text-[10px] text-slate-400 font-normal">.xlsx spreadsheet format</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-800 flex items-center gap-3 transition cursor-pointer border-t border-slate-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Download PDF</div>
                    <div className="text-[10px] text-slate-400 font-normal">Landscape printable report</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {purchases.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDeleteAllOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete All</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setFieldErrors({});
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-sky-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Purchase</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center gap-2 p-3.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Metric Cards in PKR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Purchase Value</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            Rs. {metrics.totalSpend.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">{purchases.length} recorded purchases</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">Total Net Weight</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {(metrics.totalNetWeight / 1000).toFixed(2)} <span className="text-sm font-medium text-slate-500">Tons</span>
          </p>
          <p className="text-xs text-sky-600 font-medium mt-1">
            {metrics.totalNetWeight.toLocaleString()} KG net received
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Outstanding Payable</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">
            Rs. {metrics.totalPayable.toLocaleString()}
          </p>
          <p className="text-xs text-rose-600 font-medium mt-1">Pending supplier balance</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Active / Pending</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.pendingCount} Loads</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Awaiting approval or in unloading</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">Supplier, Buyer & Delivery Counts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Suppliers</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{suppliers.length}</p>
            <p className="text-xs text-slate-500 mt-1">Registered suppliers</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">Buyers</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{buyers.length}</p>
            <p className="text-xs text-slate-500 mt-1">Registered buyers</p>
          </div>

          {([
            { label: 'Deliveries Today', count: deliveryMetrics.today },
            { label: 'Last 7 Days', count: deliveryMetrics.last7Days },
            { label: 'Last 30 Days', count: deliveryMetrics.last30Days },
            { label: 'Last 90 Days', count: deliveryMetrics.last90Days },
          ]).map(({ label, count }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">{label}</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{count}</p>
              <p className="text-xs text-slate-500 mt-1">Purchase deliveries</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by vehicle #, PO#, supplier, buyer..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
            {/* Record Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Payment Type Filter */}
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="All">All Payment Types</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Credit">Credit</option>
              <option value="Mixed">Mixed</option>
            </select>

            {/* Supplier Filter */}
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 truncate"
            >
              <option value="All">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.phoneNumber})
                </option>
              ))}
            </select>

            {/* Buyer Filter */}
            <select
              value={buyerFilter}
              onChange={(e) => setBuyerFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 truncate"
            >
              <option value="All">All Buyers</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name} ({b.contact})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Results:</span>
            <span className="font-bold text-slate-800">
              {filteredPurchases.length} of {purchases.length} purchases
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Saved Drafts */}
      {draftPurchases.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-amber-200/70">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-900">Saved Drafts</span>
              <span className="text-xs font-semibold bg-amber-200 text-amber-800 rounded-full px-2 py-0.5">
                {draftPurchases.length}
              </span>
            </div>
            <span className="text-xs text-amber-700">
              Drafts stay here and are not sent to a store until marked Completed.
            </span>
          </div>
          <ul className="divide-y divide-amber-200/60">
            {draftPurchases.map((po) => (
              <li key={po.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <button type="button" onClick={() => setSelectedPO(po)} className="text-left">
                  <div className="text-sm font-semibold text-slate-900">{po.poNumber}</div>
                  <div className="text-xs text-slate-500">
                    {po.purchaseDate} · {po.supplierName} · {po.netWeightKg.toLocaleString()} KG · Rs.{' '}
                    {po.totalAmount.toLocaleString()}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(po)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Resume
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingPO(po)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Purchases Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3.5">PO# & Date</th>
                <th className="py-3 px-3.5">Vehicle #</th>
                <th className="py-3 px-3.5">Supplier / Buyer</th>
                <th className="py-3 px-3.5 text-right">Gross (KG)</th>
                <th className="py-3 px-3.5 text-right">Tare (KG)</th>
                <th className="py-3 px-3.5 text-right font-bold text-sky-700">Net (KG)</th>
                <th className="py-3 px-3.5 text-right">Rate/KG</th>
                <th className="py-3 px-3.5 text-right font-bold text-slate-900">Total (PKR)</th>
                <th className="py-3 px-3.5 text-center">Payment</th>
                <th className="py-3 px-3.5 text-right">Payable (PKR)</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No purchase records found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50/70 transition cursor-pointer group"
                    onClick={() => setSelectedPO(po)}
                  >
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900 group-hover:text-sky-600 transition">
                        {po.poNumber}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{po.purchaseDate}</div>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {po.vehicleNumber}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 max-w-[180px]">
                      <div className="font-medium text-slate-800 truncate" title={po.supplierName}>
                        {po.supplierName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">Buyer: {po.buyerName}</div>
                    </td>

                    <td className="py-3 px-3.5 text-right text-slate-600 font-mono">
                      {po.grossWeightKg.toLocaleString()}
                    </td>

                    <td className="py-3 px-3.5 text-right text-slate-500 font-mono">
                      {po.tareWeightKg.toLocaleString()}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono font-bold text-sky-700 bg-sky-50/50">
                      {po.netWeightKg.toLocaleString()}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono text-slate-700">
                      Rs. {po.ratePerKg}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                      Rs. {po.totalAmount.toLocaleString()}
                    </td>

                    <td className="py-3 px-3.5 text-center">{getPaymentTypeBadge(po.paymentType)}</td>

                    <td className="py-3 px-3.5 text-right font-mono">
                      {po.payableAmount > 0 ? (
                        <span className="font-bold text-rose-600">
                          Rs. {po.payableAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Settled</span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-center">{getRecordStatusBadge(po.status)}</td>

                    <td className="py-3 px-3.5 text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedPO(po)}
                          title="View Details"
                          className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(po)}
                          title="Edit Purchase"
                          className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPO(po)}
                          title="Delete Purchase"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PROFESSIONAL ADD PURCHASE MODAL                          */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Add Purchase Record</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Weighbridge truck entry, automated net weight & amount calculations (PKR).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddPurchaseSubmit} noValidate className="space-y-5">
              {/* SECTION 1: Supplier & Buyer selection with Add New capability */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddSupplier((prev) => !prev)}
                      className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{showInlineAddSupplier ? 'Close Form' : '+ Add New Supplier'}</span>
                    </button>
                  </div>

                  {showInlineAddSupplier ? (
                    /* Inline add supplier fields */
                    <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2 mb-2">
                      <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">
                        New Supplier Details
                      </span>
                      <input
                        type="text"
                        placeholder="Supplier Name *"
                        value={newSupName}
                        onChange={(e) => {
                          setNewSupName(e.target.value);
                          setNewSupErrors((previous) => ({ ...previous, name: undefined }));
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white rounded text-xs text-slate-800 ${errorInputClass(Boolean(newSupErrors.name))}`}
                      />
                      {newSupErrors.name && (
                        <p className="text-[11px] font-medium text-rose-600">{newSupErrors.name}</p>
                      )}
                      <input
                        type="text"
                        placeholder="Phone Number *"
                        value={newSupPhone}
                        onChange={(e) => {
                          setNewSupPhone(e.target.value);
                          setNewSupErrors((previous) => ({ ...previous, phone: undefined }));
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white rounded text-xs text-slate-800 ${errorInputClass(Boolean(newSupErrors.phone))}`}
                      />
                      {newSupErrors.phone && (
                        <p className="text-[11px] font-medium text-rose-600">{newSupErrors.phone}</p>
                      )}
                      <input
                        type="text"
                        placeholder="Shop Address *"
                        value={newSupAddress}
                        onChange={(e) => {
                          setNewSupAddress(e.target.value);
                          setNewSupErrors((previous) => ({ ...previous, address: undefined }));
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white rounded text-xs text-slate-800 ${errorInputClass(Boolean(newSupErrors.address))}`}
                      />
                      {newSupErrors.address && (
                        <p className="text-[11px] font-medium text-rose-600">{newSupErrors.address}</p>
                      )}
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowInlineAddSupplier(false)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateInlineSupplier}
                          className="px-3 py-1 bg-sky-600 text-white rounded text-xs font-semibold hover:bg-sky-700"
                        >
                          Save & Select
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => {
                        clearFieldError('supplier');
                        if (e.target.value === '__add_new__') {
                          setShowInlineAddSupplier(true);
                        } else {
                          setSelectedSupplierId(e.target.value);
                        }
                      }}
                      className={`w-full px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${errorInputClass(hasFieldError('supplier'))}`}
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.phoneNumber})
                        </option>
                      ))}
                      <option value="__add_new__" className="text-sky-600 font-bold">
                        + Add New Supplier...
                      </option>
                    </select>
                  )}
                  {renderFieldError('supplier')}
                </div>

                {/* Buyer Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Buyer (Who Buy Stock) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddBuyer((prev) => !prev)}
                      className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{showInlineAddBuyer ? 'Close Form' : '+ Add New Buyer'}</span>
                    </button>
                  </div>

                  {showInlineAddBuyer ? (
                    /* Inline add buyer fields */
                    <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2 mb-2">
                      <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">
                        New Buyer Details
                      </span>
                      <input
                        type="text"
                        placeholder="Buyer Name *"
                        value={newBuyName}
                        onChange={(e) => {
                          setNewBuyName(e.target.value);
                          setNewBuyErrors((previous) => ({ ...previous, name: undefined }));
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white rounded text-xs text-slate-800 ${errorInputClass(Boolean(newBuyErrors.name))}`}
                      />
                      {newBuyErrors.name && (
                        <p className="text-[11px] font-medium text-rose-600">{newBuyErrors.name}</p>
                      )}
                      <input
                        type="text"
                        placeholder="Contact Number *"
                        value={newBuyContact}
                        onChange={(e) => {
                          setNewBuyContact(e.target.value);
                          setNewBuyErrors((previous) => ({ ...previous, contact: undefined }));
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white rounded text-xs text-slate-800 ${errorInputClass(Boolean(newBuyErrors.contact))}`}
                      />
                      {newBuyErrors.contact && (
                        <p className="text-[11px] font-medium text-rose-600">{newBuyErrors.contact}</p>
                      )}
                      <input
                        type="email"
                        placeholder="Email Address (Optional)"
                        value={newBuyEmail}
                        onChange={(e) => {
                          setNewBuyEmail(e.target.value);
                          setNewBuyErrors((previous) => ({ ...previous, email: undefined }));
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white rounded text-xs text-slate-800 ${errorInputClass(Boolean(newBuyErrors.email))}`}
                      />
                      {newBuyErrors.email && (
                        <p className="text-[11px] font-medium text-rose-600">{newBuyErrors.email}</p>
                      )}
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowInlineAddBuyer(false)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateInlineBuyer}
                          className="px-3 py-1 bg-sky-600 text-white rounded text-xs font-semibold hover:bg-sky-700"
                        >
                          Save & Select
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={selectedBuyerId}
                      onChange={(e) => {
                        clearFieldError('buyer');
                        if (e.target.value === '__add_new__') {
                          setShowInlineAddBuyer(true);
                        } else {
                          setSelectedBuyerId(e.target.value);
                        }
                      }}
                      className={`w-full px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${errorInputClass(hasFieldError('buyer'))}`}
                    >
                      {buyers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.contact})
                        </option>
                      ))}
                      <option value="__add_new__" className="text-sky-600 font-bold">
                        + Add New Buyer...
                      </option>
                    </select>
                  )}
                  {renderFieldError('buyer')}
                </div>
              </div>

              {/* SECTION 2: Purchase Date & Vehicle / Truck Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    max={recordStatus === 'Completed' ? todayKey : undefined}
                    value={purchaseDate}
                    onChange={(e) => {
                      setPurchaseDate(e.target.value);
                      clearFieldError('purchaseDate');
                    }}
                    className={`w-full px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${errorInputClass(hasFieldError('purchaseDate'))}`}
                  />
                  {renderFieldError('purchaseDate')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Vehicle / Truck Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. LES-24-9182 / TKP-8812"
                      value={vehicleNumber}
                      onChange={(e) => {
                        setVehicleNumber(e.target.value);
                        clearFieldError('vehicleNumber');
                      }}
                      className={`w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 ${errorInputClass(hasFieldError('vehicleNumber'))}`}
                    />
                  </div>
                  {renderFieldError('vehicleNumber')}
                </div>
              </div>

              {/* Material purchase details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Material Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Material Type</label>
                    <select
                      value={materialType}
                      onChange={(e) => {
                        setMaterialType(e.target.value);
                        clearFieldError('materialTypeOther');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm text-slate-800 ${errorInputClass(hasFieldError('materialTypeOther'))}`}
                    >
                      <option value="">Select material type</option>
                      {MATERIAL_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {materialType === 'Other' && (
                      <input
                        type="text"
                        required
                        placeholder="Specify material type"
                        value={materialTypeOther}
                        onChange={(e) => {
                          setMaterialTypeOther(e.target.value);
                          clearFieldError('materialTypeOther');
                        }}
                        className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-sm text-slate-800 ${errorInputClass(hasFieldError('materialTypeOther'))}`}
                      />
                    )}
                    {renderFieldError('materialTypeOther')}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                    <select
                      value={materialColor}
                      onChange={(e) => {
                        setMaterialColor(e.target.value);
                        clearFieldError('materialColorOther');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm text-slate-800 ${errorInputClass(hasFieldError('materialColorOther'))}`}
                    >
                      <option value="">Select color</option>
                      {MATERIAL_COLORS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {materialColor === 'Other' && (
                      <input
                        type="text"
                        required
                        placeholder="Specify color"
                        value={materialColorOther}
                        onChange={(e) => {
                          setMaterialColorOther(e.target.value);
                          clearFieldError('materialColorOther');
                        }}
                        className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-sm text-slate-800 ${errorInputClass(hasFieldError('materialColorOther'))}`}
                      />
                    )}
                    {renderFieldError('materialColorOther')}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Grade</label>
                    <select
                      value={materialGrade}
                      onChange={(e) => {
                        setMaterialGrade(e.target.value);
                        clearFieldError('materialGradeOther');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm text-slate-800 ${errorInputClass(hasFieldError('materialGradeOther'))}`}
                    >
                      <option value="">Select grade</option>
                      {MATERIAL_GRADES.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {materialGrade === 'Other' && (
                      <input
                        type="text"
                        required
                        placeholder="Specify grade"
                        value={materialGradeOther}
                        onChange={(e) => {
                          setMaterialGradeOther(e.target.value);
                          clearFieldError('materialGradeOther');
                        }}
                        className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-sm text-slate-800 ${errorInputClass(hasFieldError('materialGradeOther'))}`}
                      />
                    )}
                    {renderFieldError('materialGradeOther')}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
                    <select
                      value={materialCondition}
                      onChange={(e) => {
                        setMaterialCondition(e.target.value);
                        clearFieldError('materialConditionOther');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm text-slate-800 ${errorInputClass(hasFieldError('materialConditionOther'))}`}
                    >
                      <option value="">Select condition</option>
                      {MATERIAL_CONDITIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {materialCondition === 'Other' && (
                      <input
                        type="text"
                        required
                        placeholder="Specify condition"
                        value={materialConditionOther}
                        onChange={(e) => {
                          setMaterialConditionOther(e.target.value);
                          clearFieldError('materialConditionOther');
                        }}
                        className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-sm text-slate-800 ${errorInputClass(hasFieldError('materialConditionOther'))}`}
                      />
                    )}
                    {renderFieldError('materialConditionOther')}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Weighbridge Gross, Tare, and Automated Net Weight */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-sky-600" /> Weighbridge Measurement (KG)
                  </span>
                  <span className="text-[11px] text-slate-400">Formula: Net = Gross - Tare</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Gross Weight (KG) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 18500"
                      value={grossWeightKg}
                      onChange={(e) => {
                        setGrossWeightKg(e.target.value === '' ? '' : Number(e.target.value));
                        clearFieldError('grossWeight');
                        clearFieldError('tareWeight');
                        clearFieldError('paidAmount');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${errorInputClass(hasFieldError('grossWeight'))}`}
                    />
                    {renderFieldError('grossWeight')}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tare Weight (KG) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      placeholder="e.g. 6200"
                      value={tareWeightKg}
                      onChange={(e) => {
                        setTareWeightKg(e.target.value === '' ? '' : Number(e.target.value));
                        clearFieldError('tareWeight');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${errorInputClass(hasFieldError('tareWeight'))}`}
                    />
                    {renderFieldError('tareWeight')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sky-700 mb-1">
                      Net Weight (KG) <span className="text-[10px] text-slate-400 font-normal">(Auto)</span>
                    </label>
                    <div className="px-3 py-2 bg-sky-100/60 border border-sky-300 rounded-lg text-sm font-mono font-bold text-sky-900">
                      {calculatedNetWeight.toLocaleString()} KG
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Rate per KG & Total Purchase Amount Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rate per KG (PKR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rs.
                    </span>
                    <input
                      type="number"
                      required
                      min={0.1}
                      step="any"
                      placeholder="e.g. 345"
                      value={ratePerKg}
                      onChange={(e) => {
                        setRatePerKg(e.target.value === '' ? '' : Number(e.target.value));
                        clearFieldError('ratePerKg');
                        clearFieldError('paidAmount');
                      }}
                      className={`w-full pl-10 pr-3 py-2 bg-slate-50 rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 ${errorInputClass(hasFieldError('ratePerKg'))}`}
                    />
                  </div>
                  {renderFieldError('ratePerKg')}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    Total Purchase Amount (PKR) <span className="text-[10px] text-slate-400 font-normal">(Auto: Net × Rate)</span>
                  </label>
                  <div className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-mono font-bold flex items-center justify-between">
                    <span>Rs. {calculatedTotalAmount.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({calculatedNetWeight} kg × Rs. {numRate})
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Payment Type, Paid Amount, and Payable Amount */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Payment Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Payment Type</label>
                    <select
                      value={paymentType}
                      onChange={(e) => handlePaymentTypeChange(e.target.value as PaymentType)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Credit">Credit</option>
                      <option value="Mixed">Mixed (Partial)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Paid Amount (PKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={calculatedTotalAmount}
                      placeholder="0"
                      value={isMixedPayment ? paidAmount : isFullPayment ? calculatedTotalAmount : 0}
                      readOnly={!isMixedPayment}
                      onChange={(e) => {
                        setPaidAmount(e.target.value === '' ? '' : Number(e.target.value));
                        clearFieldError('paidAmount');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-mono text-slate-800 ${errorInputClass(hasFieldError('paidAmount'))} ${
                        isMixedPayment ? 'bg-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      {isMixedPayment
                        ? 'Enter the partial amount paid.'
                        : isFullPayment
                          ? 'Cash/Card pays the full total automatically.'
                          : 'Credit leaves the full amount payable.'}
                    </p>
                    {renderFieldError('paidAmount')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-rose-700 mb-1">
                      Payable Balance (PKR) <span className="text-[10px] text-slate-400 font-normal">(Auto)</span>
                    </label>
                    <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-sm font-mono font-bold text-rose-800">
                      Rs. {calculatedPayableAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: Record Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Record Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={recordStatus}
                    onChange={(e) => {
                      setRecordStatus(e.target.value as PurchaseRecordStatus);
                      clearFieldError('purchaseDate');
                      clearFieldError('store');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Completed">Completed</option>
                  </select>
                  {recordStatus === 'Completed' && (
                    <div className="mt-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Destination Store (Optional)</label>
                      <select
                        value={selectedPurchaseStoreId}
                        onChange={(e) => {
                          setSelectedPurchaseStoreId(e.target.value);
                          clearFieldError('store');
                        }}
                        className={`w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-800 ${errorInputClass(hasFieldError('store'))}`}
                      >
                        <option value="">No store — assign later</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>{store.name} — {store.locationNumber} · {store.address}</option>
                        ))}
                      </select>
                      {renderFieldError('store')}
                      {stores.length === 0 ? (
                        <p className="mt-1 text-[11px] text-slate-500">This completed delivery will appear under Unassigned Deliveries until a store is created and assigned.</p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-500">Leave unassigned to route it to a store later from Stores & Inventory.</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Notes / Batch Info
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weighbridge gate 2, PVC scrap regrind"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-sky-600/30"
                >
                  Save Purchase Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW PO DETAIL MODAL                                     */}
      {/* ======================================================== */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">{selectedPO.poNumber}</h3>
                  {getRecordStatusBadge(selectedPO.status)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Recorded on {selectedPO.purchaseDate} • Truck: <span className="font-mono font-bold text-slate-700">{selectedPO.vehicleNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Supplier & Buyer */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Supplier</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedPO.supplierName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Buyer (Purchaser)</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedPO.buyerName}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Material Details</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-slate-400">Material Type</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPO.materialType || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Color</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPO.color || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Grade</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPO.grade || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Condition</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedPO.condition || '—'}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${selectedPOReceipt ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${selectedPOReceipt ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {selectedPOReceipt ? 'Received into Store' : 'Inventory Receiving'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedPOReceipt
                      ? `${selectedPOStore?.name || 'Store'} — ${selectedPOStore?.location || ''} · ${selectedPOReceipt.receivedKg.toLocaleString()} KG`
                      : 'This delivery has not been added to store inventory.'}
                  </p>
                </div>
                {!selectedPOReceipt && selectedPO.status !== 'Draft' && (
                  <button
                    type="button"
                    disabled={stores.length === 0}
                    onClick={() => {
                      setReceivingPurchase(selectedPO);
                      setReceivingStoreId(selectedPO.storeId || '');
                    }}
                    className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Receive Delivery
                  </button>
                )}
              </div>
              {!selectedPOReceipt && selectedPO.status === 'Draft' && (
                <p className="mt-2 text-xs text-slate-500">Save this draft as Pending Approval or Completed before receiving it into a store.</p>
              )}
              {!selectedPOReceipt && stores.length === 0 && (
                <p className="mt-2 text-xs text-rose-700">Create a store in Stores & Inventory before receiving.</p>
              )}
            </div>

            {/* Weight Breakdown */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Weighbridge Weight Slip
              </span>
              <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-400">Gross Weight</span>
                  <p className="text-lg font-bold font-mono text-slate-800 mt-1">
                    {selectedPO.grossWeightKg.toLocaleString()} KG
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-400">Tare Weight</span>
                  <p className="text-lg font-bold font-mono text-slate-600 mt-1">
                    {selectedPO.tareWeightKg.toLocaleString()} KG
                  </p>
                </div>
                <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                  <span className="text-[11px] text-sky-600 font-semibold">Net Weight</span>
                  <p className="text-lg font-bold font-mono text-sky-900 mt-1">
                    {selectedPO.netWeightKg.toLocaleString()} KG
                  </p>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px]">Rate per KG</span>
                <p className="text-base font-bold text-slate-800 mt-0.5">Rs. {selectedPO.ratePerKg}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px]">Total Amount</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">Rs. {selectedPO.totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px]">Paid ({selectedPO.paymentType})</span>
                <p className="text-base font-bold text-emerald-600 mt-0.5">Rs. {selectedPO.paidAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px]">Payable Balance</span>
                <p className="text-base font-bold text-rose-600 mt-0.5">Rs. {selectedPO.payableAmount.toLocaleString()}</p>
              </div>
            </div>

            {selectedPO.notes && (
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-700">
                <span className="font-bold text-blue-900">Notes: </span>
                {selectedPO.notes}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  exportPurchasesToPDF(
                    [selectedPO],
                    `PO_${selectedPO.poNumber}_Weighbridge_Slip.pdf`
                  );
                  showNotification(`Downloaded PDF slip for ${selectedPO.poNumber}`);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Download PDF Slip</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPO(null);
                  handleOpenEdit(selectedPO);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-sky-600" />
                <span>Edit Record</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {receivingPurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Receive Delivery</h3>
              <p className="mt-1 text-xs text-slate-500">
                {receivingPurchase.poNumber} · {receivingPurchase.netWeightKg.toLocaleString()} KG will be added to the selected store.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Destination Store</label>
              <select
                required
                value={receivingStoreId}
                onChange={(event) => setReceivingStoreId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Select a store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name} — {store.locationNumber} · {store.address}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setReceivingPurchase(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!receivingStoreId}
                onClick={handleReceiveDelivery}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT MODAL                                               */}
      {/* ======================================================== */}
      {editingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Purchase Record</h3>
                <p className="text-xs text-slate-500">Update truck, weights, rates, or status.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPO(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.phoneNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Buyer</label>
                  <select
                    value={editBuyerName}
                    onChange={(e) => setEditBuyerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                  >
                    {buyers.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} ({b.contact})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    max={editStatus === 'Completed' ? todayKey : undefined}
                    value={editPurchaseDate}
                    onChange={(e) => {
                      setEditPurchaseDate(e.target.value);
                      clearEditFieldError('purchaseDate');
                    }}
                    className={`w-full px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-800 ${errorInputClass(hasEditFieldError('purchaseDate'))}`}
                  />
                  {renderEditFieldError('purchaseDate')}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle / Truck Number</label>
                  <input
                    type="text"
                    required
                    value={editVehicleNumber}
                    onChange={(e) => {
                      setEditVehicleNumber(e.target.value);
                      clearEditFieldError('vehicleNumber');
                    }}
                    className={`w-full px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-800 uppercase ${errorInputClass(hasEditFieldError('vehicleNumber'))}`}
                  />
                  {renderEditFieldError('vehicleNumber')}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Material Details</span>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Material Type</label>
                    <select
                      value={editMaterialType}
                      onChange={(e) => {
                        setEditMaterialType(e.target.value);
                        clearEditFieldError('materialTypeOther');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('materialTypeOther'))}`}
                    >
                      <option value="">Select material type</option>
                      {MATERIAL_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {editMaterialType === 'Other' && (
                      <input type="text" required placeholder="Specify material type" value={editMaterialTypeOther} onChange={(e) => { setEditMaterialTypeOther(e.target.value); clearEditFieldError('materialTypeOther'); }} className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('materialTypeOther'))}`} />
                    )}
                    {renderEditFieldError('materialTypeOther')}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                    <select
                      value={editMaterialColor}
                      onChange={(e) => {
                        setEditMaterialColor(e.target.value);
                        clearEditFieldError('materialColorOther');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('materialColorOther'))}`}
                    >
                      <option value="">Select color</option>
                      {MATERIAL_COLORS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {editMaterialColor === 'Other' && (
                      <input type="text" required placeholder="Specify color" value={editMaterialColorOther} onChange={(e) => { setEditMaterialColorOther(e.target.value); clearEditFieldError('materialColorOther'); }} className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('materialColorOther'))}`} />
                    )}
                    {renderEditFieldError('materialColorOther')}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Grade</label>
                    <select
                      value={editMaterialGrade}
                      onChange={(e) => {
                        setEditMaterialGrade(e.target.value);
                        clearEditFieldError('materialGradeOther');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('materialGradeOther'))}`}
                    >
                      <option value="">Select grade</option>
                      {MATERIAL_GRADES.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {editMaterialGrade === 'Other' && (
                      <input type="text" required placeholder="Specify grade" value={editMaterialGradeOther} onChange={(e) => { setEditMaterialGradeOther(e.target.value); clearEditFieldError('materialGradeOther'); }} className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('materialGradeOther'))}`} />
                    )}
                    {renderEditFieldError('materialGradeOther')}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
                    <select
                      value={editMaterialCondition}
                      onChange={(e) => {
                        setEditMaterialCondition(e.target.value);
                        clearEditFieldError('materialConditionOther');
                      }}
                      className={`w-full px-3 py-2 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('materialConditionOther'))}`}
                    >
                      <option value="">Select condition</option>
                      {MATERIAL_CONDITIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {editMaterialCondition === 'Other' && (
                      <input type="text" required placeholder="Specify condition" value={editMaterialConditionOther} onChange={(e) => { setEditMaterialConditionOther(e.target.value); clearEditFieldError('materialConditionOther'); }} className={`w-full mt-2 px-3 py-2 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('materialConditionOther'))}`} />
                    )}
                    {renderEditFieldError('materialConditionOther')}
                  </div>
                </div>
              </div>

              {/* Weights */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gross (KG)</label>
                  <input
                    type="number"
                    min={0}
                    value={editGrossWeight}
                    onChange={(e) => {
                      setEditGrossWeight(Number(e.target.value));
                      clearEditFieldError('grossWeight');
                      clearEditFieldError('tareWeight');
                      clearEditFieldError('paidAmount');
                    }}
                    className={`w-full px-3 py-1.5 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('grossWeight'))}`}
                  />
                  {renderEditFieldError('grossWeight')}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tare (KG)</label>
                  <input
                    type="number"
                    min={0}
                    value={editTareWeight}
                    onChange={(e) => {
                      setEditTareWeight(Number(e.target.value));
                      clearEditFieldError('tareWeight');
                    }}
                    className={`w-full px-3 py-1.5 bg-white rounded-lg text-sm ${errorInputClass(hasEditFieldError('tareWeight'))}`}
                  />
                  {renderEditFieldError('tareWeight')}
                </div>
                <div>
                  <label className="block text-xs font-bold text-sky-700 mb-1">Net Weight (KG)</label>
                  <div className="px-3 py-1.5 bg-sky-100 rounded-lg text-sm font-bold text-sky-900">
                    {editCalculatedNet.toLocaleString()} KG
                  </div>
                </div>
              </div>

              {/* Rate & Totals */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rate per KG (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={editRatePerKg}
                    onChange={(e) => {
                      setEditRatePerKg(Number(e.target.value));
                      clearEditFieldError('ratePerKg');
                      clearEditFieldError('paidAmount');
                    }}
                    className={`w-full px-3 py-2 bg-slate-50 rounded-lg text-sm ${errorInputClass(hasEditFieldError('ratePerKg'))}`}
                  />
                  {renderEditFieldError('ratePerKg')}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (PKR)</label>
                  <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-bold text-slate-900">
                    Rs. {editCalculatedTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Payments */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Payment Type</label>
                  <select
                    value={editPaymentType}
                    onChange={(e) => handleEditPaymentTypeChange(e.target.value as PaymentType)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Credit">Credit</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Paid (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    max={editCalculatedTotal}
                    value={
                      editPaymentType === 'Mixed'
                        ? editPaidAmount
                        : editPaymentType === 'Cash' || editPaymentType === 'Card'
                          ? editCalculatedTotal
                          : editPaidAmount
                    }
                    readOnly={editPaymentType !== 'Mixed'}
                    onChange={(e) => {
                      setEditPaidAmount(Number(e.target.value));
                      clearEditFieldError('paidAmount');
                    }}
                    className={`w-full px-3 py-1.5 rounded-lg text-sm ${errorInputClass(hasEditFieldError('paidAmount'))} ${
                      editPaymentType === 'Mixed' ? 'bg-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  />
                  {renderEditFieldError('paidAmount')}
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">Payable (PKR)</label>
                  <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-sm font-bold text-rose-800">
                    Rs. {editCalculatedPayable.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Record Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => {
                      setEditStatus(e.target.value as PurchaseRecordStatus);
                      clearEditFieldError('status');
                      clearEditFieldError('purchaseDate');
                      clearEditFieldError('store');
                    }}
                    disabled={receipts.some((receipt) => receipt.purchaseId === editingPO.id)}
                    className={`w-full px-3 py-2 bg-slate-50 rounded-lg text-sm ${errorInputClass(hasEditFieldError('status'))}`}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Completed">Completed</option>
                  </select>
                  {renderEditFieldError('status')}
                  {editStatus === 'Completed' && !receipts.some((receipt) => receipt.purchaseId === editingPO.id) && (
                    <div className="mt-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Destination Store (Optional)</label>
                      <select
                        value={editStoreId}
                        onChange={(e) => {
                          setEditStoreId(e.target.value);
                          clearEditFieldError('store');
                        }}
                        className={`w-full rounded-lg bg-white px-3 py-2 text-sm ${errorInputClass(hasEditFieldError('store'))}`}
                      >
                        <option value="">No store — assign later</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>{store.name} — {store.locationNumber} · {store.address}</option>
                        ))}
                      </select>
                      {renderEditFieldError('store')}
                      <p className="mt-1 text-[11px] text-slate-500">Leave unassigned to route it manually from Stores &amp; Inventory.</p>
                    </div>
                  )}
                  {receipts.some((receipt) => receipt.purchaseId === editingPO.id) && (
                    <p className="mt-1 text-[11px] text-emerald-700">This purchase is already received; its completed status cannot be changed.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPO(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL                                */}
      {/* ======================================================== */}
      {deletingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Purchase Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete order <span className="font-semibold text-slate-800">{deletingPO.poNumber}</span> (Truck: {deletingPO.vehicleNumber})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPO(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE ALL PURCHASES CONFIRMATION MODAL                  */}
      {/* ======================================================== */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete ALL Purchases?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete all <span className="font-bold text-rose-600">{purchases.length}</span> purchase orders? All weighbridge records, weights, and payment balances will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
