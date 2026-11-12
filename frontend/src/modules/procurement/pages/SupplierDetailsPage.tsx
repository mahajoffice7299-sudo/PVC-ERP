import React, { useState, useMemo } from 'react';
import { useProcurement } from '../ProcurementContext';
import type { Supplier } from '../types';
import {
  Search,
  Plus,
  Phone,
  MapPin,
  Store,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  Filter,
  RotateCcw,
} from 'lucide-react';

// Field-level validation rules for the supplier form
const SUP_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\s.&,'()-]{1,99}$/;
const SUP_PHONE_PATTERN = /^[+]?[0-9()\s-]{7,20}$/;

interface SupplierFieldErrors {
  name?: string;
  phoneNumber?: string;
  shopAddress?: string;
}

function validateSupplierFields(name: string, phoneNumber: string, shopAddress: string): SupplierFieldErrors {
  const errors: SupplierFieldErrors = {};

  const trimmedName = name.trim();
  if (!trimmedName) {
    errors.name = 'Supplier name is required.';
  } else if (trimmedName.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (trimmedName.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  } else if (!SUP_NAME_PATTERN.test(trimmedName)) {
    errors.name = 'Name may only contain letters, numbers, spaces, dots, ampersands, commas and dashes.';
  }

  const trimmedPhone = phoneNumber.trim();
  if (!trimmedPhone) {
    errors.phoneNumber = 'Phone number is required.';
  } else {
    const digitCount = trimmedPhone.replace(/\D/g, '').length;
    if (!SUP_PHONE_PATTERN.test(trimmedPhone)) {
      errors.phoneNumber = 'Enter a valid phone number (digits, spaces, +, - and parentheses only).';
    } else if (digitCount < 7 || digitCount > 15) {
      errors.phoneNumber = 'Phone number must contain between 7 and 15 digits.';
    }
  }

  const trimmedAddress = shopAddress.trim();
  if (!trimmedAddress) {
    errors.shopAddress = 'Shop address is required.';
  } else if (trimmedAddress.length < 5) {
    errors.shopAddress = 'Address must be at least 5 characters.';
  } else if (trimmedAddress.length > 255) {
    errors.shopAddress = 'Address must be 255 characters or fewer.';
  }

  return errors;
}

export const SupplierDetailsPage: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, clearAllSuppliers } = useProcurement();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Blocked'>('All');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [status, setStatus] = useState<'Active' | 'Pending' | 'Blocked'>('Active');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SupplierFieldErrors>({});
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Filtered suppliers with useMemo
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.phoneNumber.toLowerCase().includes(q) ||
        s.shopAddress.toLowerCase().includes(q) ||
        (s.supplierCode && s.supplierCode.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'All' || (s.status || 'Active') === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const handleOpenAddModal = () => {
    setName('');
    setPhoneNumber('');
    setShopAddress('');
    setStatus('Active');
    setFormError(null);
    setFieldErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setPhoneNumber(sup.phoneNumber);
    setShopAddress(sup.shopAddress);
    setStatus(sup.status || 'Active');
    setFormError(null);
    setFieldErrors({});
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors = validateSupplierFields(name, phoneNumber, shopAddress);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      const created = await addSupplier({
        name: name.trim(),
        companyName: name.trim(),
        phoneNumber: phoneNumber.trim(),
        shopAddress: shopAddress.trim(),
        status,
      });

      setIsAddModalOpen(false);
      showNotification(`Supplier "${created.name}" added successfully.`);
    } catch {
      setFormError('Could not save the supplier. Please try again.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setFormError(null);

    const errors = validateSupplierFields(name, phoneNumber, shopAddress);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      await updateSupplier(editingSupplier.id, {
        name: name.trim(),
        companyName: name.trim(),
        phoneNumber: phoneNumber.trim(),
        shopAddress: shopAddress.trim(),
        status,
      });

      setEditingSupplier(null);
      showNotification(`Supplier "${name.trim()}" updated successfully.`);
    } catch {
      setFormError('Could not update the supplier. Please try again.');
    }
  };

  const handleDelete = () => {
    if (!deletingSupplier) return;
    deleteSupplier(deletingSupplier.id);
    showNotification(`Supplier "${deletingSupplier.name}" deleted.`);
    setDeletingSupplier(null);
  };

  const handleDeleteAll = async () => {
    try {
      await clearAllSuppliers();
      showNotification('All suppliers have been deleted.');
    } catch {
      showNotification('Failed to delete suppliers. Please try again.');
    }
    setIsDeleteAllOpen(false);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Procurement</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-sky-600 font-semibold">Supplier Details</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Supplier Details</h1>
          <p className="text-sm text-slate-500 mt-1">
            Directory of vendor names, phone contacts, and physical shop addresses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {suppliers.length > 0 && (
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
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-sky-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier Detail</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {notification && (
        <div className="flex items-center gap-2 p-3.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, shop address..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" /> Status:
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['All', 'Active', 'Blocked'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {(searchQuery || statusFilter !== 'All') && (
            <button
              type="button"
              onClick={resetFilters}
              title="Reset all filters"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="text-xs text-slate-500 font-medium ml-2 pl-2 border-l border-slate-200">
            Showing <span className="font-bold text-slate-800">{filteredSuppliers.length}</span> of {suppliers.length}
          </div>
        </div>
      </div>

      {/* Suppliers Table with Edit & Delete */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Supplier Name</th>
                <th className="py-3.5 px-5">Phone Number</th>
                <th className="py-3.5 px-5">Shop Address</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No suppliers found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{supplier.name}</div>
                          {supplier.supplierCode && (
                            <div className="text-[11px] text-slate-400 font-mono">{supplier.supplierCode}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{supplier.phoneNumber}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 max-w-md">
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{supplier.shopAddress}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          (supplier.status || 'Active') === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {supplier.status || 'Active'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(supplier)}
                          title="Edit Supplier"
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSupplier(supplier)}
                          title="Delete Supplier"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Supplier Detail</h3>
                <p className="text-xs text-slate-500 mt-0.5">All fields marked with * are required.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Enter supplier or shop name"
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.name ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-sky-500'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                    }}
                    placeholder="e.g. +92 300 1234567"
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-sky-500'
                    }`}
                  />
                </div>
                {fieldErrors.phoneNumber && (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Shop Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={3}
                    value={shopAddress}
                    onChange={(e) => {
                      setShopAddress(e.target.value);
                      if (fieldErrors.shopAddress) setFieldErrors((prev) => ({ ...prev, shopAddress: undefined }));
                    }}
                    placeholder="Enter shop/warehouse address, street, city..."
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.shopAddress ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-sky-500'
                    }`}
                  />
                </div>
                {fieldErrors.shopAddress && (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.shopAddress}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Blocked')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

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
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Save Supplier Detail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Supplier Detail</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update supplier information.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.name ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-sky-500'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                    }}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-sky-500'
                    }`}
                  />
                </div>
                {fieldErrors.phoneNumber && (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Shop Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={3}
                    value={shopAddress}
                    onChange={(e) => {
                      setShopAddress(e.target.value);
                      if (fieldErrors.shopAddress) setFieldErrors((prev) => ({ ...prev, shopAddress: undefined }));
                    }}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.shopAddress ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-sky-500'
                    }`}
                  />
                </div>
                {fieldErrors.shopAddress && (
                  <p className="mt-1.5 text-xs text-red-600">{fieldErrors.shopAddress}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Blocked')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Update Supplier Detail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Supplier Detail?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-700">"{deletingSupplier.name}"</span>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSupplier(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete ALL Suppliers Confirmation Modal */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete ALL Suppliers?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete all <span className="font-bold text-rose-600">{suppliers.length}</span> supplier records? All supplier records will be removed.
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
