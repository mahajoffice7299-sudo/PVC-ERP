import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { ProcurementProvider } from '../modules/procurement/ProcurementContext';
import { StoreProvider } from '../modules/stores/StoreContext';
import { StoresPage } from '../modules/stores/pages/StoresPage';
import { ProcessingProvider } from '../modules/processing/ProcessingContext';
import { ProcessingPage } from '../modules/processing/pages/ProcessingPage';
import { InventoryProvider } from '../modules/inventory/InventoryContext';
import { InventoryDashboardPage } from '../modules/inventory/pages/InventoryDashboardPage';
import { StockManagementPage } from '../modules/inventory/pages/StockManagementPage';
import { StockOperationsPage } from '../modules/inventory/pages/StockOperationsPage';
import { InventoryReportsPage } from '../modules/inventory/pages/InventoryReportsPage';
import { FinancePage } from '../modules/finance/FinancePage';
import { UserManagementPage } from '../modules/users/UserManagementPage';

// Procurement Module Pages
import { ProcurementDashboardPage } from '../modules/procurement/pages/ProcurementDashboardPage';
import { BuyerDetailsPage } from '../modules/procurement/pages/BuyerDetailsPage';
import { SupplierDetailsPage } from '../modules/procurement/pages/SupplierDetailsPage';
import { PurchaseDetailsPage } from '../modules/procurement/pages/PurchaseDetailsPage';

export const AppRoutes: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <StoreProvider>
                  <ProcurementProvider>
                    <ProcessingProvider>
                      <InventoryProvider>
                        <MainLayout />
                      </InventoryProvider>
                    </ProcessingProvider>
                  </ProcurementProvider>
                </StoreProvider>
              </ProtectedRoute>
            }
          >
            {/* Dashboard left as is */}
            <Route index element={<DashboardPage />} />
            <Route path="stores" element={<Navigate to="/stores/dashboard" replace />} />
            <Route path="stores/dashboard" element={<StoresPage section="dashboard" />} />
            <Route path="stores/locations" element={<StoresPage section="locations" />} />
            <Route path="stores/pending" element={<StoresPage section="pending" />} />
            <Route path="stores/inventory" element={<StoresPage section="inventory" />} />
            <Route path="inventory" element={<Navigate to="/inventory/dashboard" replace />} />
            <Route path="inventory/dashboard" element={<InventoryDashboardPage />} />
            {/* Inventory Module - Stock Management Sub-module */}
            <Route path="inventory/stock-management" element={<StockManagementPage />} />
            <Route path="inventory/stock-management/:view" element={<StockManagementPage />} />
            {/* Inventory Module - Stock Operations Sub-module */}
            <Route path="inventory/stock-operations" element={<StockOperationsPage />} />
            <Route path="inventory/stock-operations/:view" element={<StockOperationsPage />} />
            {/* Inventory Module - Inventory Reports Sub-module */}
            <Route path="inventory/reports" element={<InventoryReportsPage />} />
            <Route path="inventory/reports/:view" element={<InventoryReportsPage />} />
            {/* Legacy inventory redirects */}
            <Route path="inventory/locations" element={<Navigate to="/inventory/stock-operations/locations" replace />} />
            <Route path="inventory/raw-material" element={<Navigate to="/inventory/stock-management/raw-material" replace />} />
            <Route path="inventory/sorted" element={<Navigate to="/inventory/stock-management/sorted" replace />} />
            <Route path="inventory/washed" element={<Navigate to="/inventory/stock-management/washed" replace />} />
            <Route path="inventory/pet-flakes" element={<Navigate to="/inventory/stock-management/flakes" replace />} />
            <Route path="inventory/preform" element={<Navigate to="/inventory/stock-management/preform" replace />} />
            <Route path="inventory/bottle" element={<Navigate to="/inventory/stock-management/bottle" replace />} />
            <Route path="inventory/by-product" element={<Navigate to="/inventory/stock-management/byproduct" replace />} />
            <Route path="inventory/transfers" element={<Navigate to="/inventory/stock-operations/transfers" replace />} />
            <Route path="inventory/adjustments" element={<Navigate to="/inventory/stock-operations/adjustments" replace />} />
            <Route path="inventory/physical-counts" element={<Navigate to="/inventory/stock-operations/counts" replace />} />
            <Route path="inventory/ageing" element={<Navigate to="/inventory/reports/ageing" replace />} />
            <Route path="inventory/valuation" element={<Navigate to="/inventory/reports/valuation" replace />} />
            <Route path="finance" element={<Navigate to="/finance/dashboard" replace />} />
            <Route path="finance/dashboard" element={<FinancePage view="dashboard" />} />
            <Route path="finance/costing" element={<FinancePage view="costing" />} />
            <Route path="finance/tax" element={<FinancePage view="tax" />} />
            <Route path="user-management" element={<UserManagementPage />} />
            <Route path="processing/sorting" element={<Navigate to="/processing/sorting/dashboard" replace />} />
            <Route path="processing/sorting/dashboard" element={<ProcessingPage section="sorting" view="dashboard" />} />
            <Route path="processing/sorting/available" element={<ProcessingPage section="sorting" view="available" />} />
            <Route path="processing/sorting/to-wash" element={<ProcessingPage section="sorting" view="to-wash" />} />
            <Route path="processing/sorting/entry" element={<ProcessingPage section="sorting" view="entry" />} />
            <Route path="processing/washing" element={<Navigate to="/processing/washing/dashboard" replace />} />
            <Route path="processing/washing/dashboard" element={<ProcessingPage section="washing" view="dashboard" />} />
            <Route path="processing/washing/received" element={<ProcessingPage section="washing" view="received" />} />
            <Route path="processing/washing/entry" element={<ProcessingPage section="washing" view="entry" />} />
            <Route path="processing/production" element={<Navigate to="/processing/production/dashboard" replace />} />
            <Route path="processing/production/dashboard" element={<ProcessingPage section="production" view="dashboard" />} />
            <Route path="processing/production/quality" element={<ProcessingPage section="production" view="quality" />} />
            <Route path="processing/production/trash" element={<ProcessingPage section="production" view="trash" />} />
            <Route path="processing/production/entry" element={<ProcessingPage section="production" view="entry" />} />
            <Route path="processing/sales" element={<Navigate to="/processing/sales/dashboard" replace />} />
            <Route path="processing/sales/dashboard" element={<ProcessingPage section="sales" view="dashboard" />} />
            <Route path="processing/sales/history" element={<ProcessingPage section="sales" view="history" />} />
            <Route path="processing/sales/remaining" element={<ProcessingPage section="sales" view="remaining" />} />
            <Route path="processing/sales/returns" element={<ProcessingPage section="sales" view="returns" />} />
            <Route path="processing/sales/entry" element={<ProcessingPage section="sales" view="entry" />} />

            <Route path="procurement" element={<Outlet />}>
              <Route index element={<Navigate to="/procurement/purchases" replace />} />
              <Route path="dashboard" element={<ProcurementDashboardPage />} />
              <Route path="buyers" element={<BuyerDetailsPage />} />
              <Route path="suppliers" element={<SupplierDetailsPage />} />
              <Route path="purchases" element={<PurchaseDetailsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
