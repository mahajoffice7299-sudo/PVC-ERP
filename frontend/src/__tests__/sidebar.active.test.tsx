import { describe, expect, it, beforeEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { AppRoutes } from '../routes/AppRoutes';

const setAuth = () => {
  window.localStorage.setItem('pvc_erp_user', JSON.stringify({ username: 'admin', name: 'Operations Admin', role: 'Production Supervisor' }));
};

const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(<AppRoutes />);
};

const sidebar = () => document.querySelector('aside') as HTMLElement;

const activeLinks = (nav: HTMLElement): string[] =>
  [...nav.querySelectorAll('a')].filter((a) => a.className.includes('bg-sky-600')).map((a) => a.textContent?.trim() ?? '');

describe('Sidebar active-state', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    setAuth();
  });

  const cases: [string, string[]][] = [
    ['/inventory/dashboard', ['Inventory Dashboard']],
    ['/inventory/stock-management/raw-material', ['Raw Material Stock']],
    ['/inventory/stock-management/sorted', ['Sorted Material Stock']],
    ['/inventory/stock-management/byproduct', ['By-product Stock']],
    ['/inventory/stock-operations/locations', ['Location-wise Inventory']],
    ['/inventory/stock-operations/transfers', ['Stock Transfers']],
    ['/inventory/stock-operations/adjustments', ['Stock Adjustments']],
    ['/inventory/stock-operations/counts', ['Physical Stock Counts']],
    ['/inventory/reports/valuation', ['Inventory Valuation']],
    ['/inventory/reports/ageing', ['Stock Ageing']],
    ['/finance/dashboard', ['Finance Dashboard']],
    ['/finance/costing', ['Costing Details']],
    ['/finance/tax', ['Tax Details']],
    ['/stores/dashboard', ['Stores Dashboard']],
    ['/procurement/dashboard', ['Procurement Dashboard']],
    ['/processing/sorting/available', ['Available Material']],
    ['/processing/sales/returns', ['Sales Returns']],
  ];

  cases.forEach(([path, expected]) => {
    it(`${path} highlights exactly ${expected.join(', ')}`, async () => {
      renderAt(path);
      await waitFor(() => expect(document.querySelector('main')).toBeTruthy());
      const nav = sidebar();
      // Expand any collapsed inventory groups so all links are in the DOM
      const active = activeLinks(nav);
      expect(active).toEqual(expected);
    });
  });
});
