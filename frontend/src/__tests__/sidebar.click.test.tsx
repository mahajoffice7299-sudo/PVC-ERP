import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '../routes/AppRoutes';

const setAuth = () => {
  window.localStorage.setItem('pvc_erp_user', JSON.stringify({ username: 'admin', name: 'Operations Admin', role: 'Production Supervisor' }));
};

const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(<AppRoutes />);
};

const sidebar = () => document.querySelector('aside') as HTMLElement;

describe('Sidebar click-through', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    setAuth();
  });

  it('clicking every Inventory sub-link navigates and renders the right page', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const nav = sidebar();

    // Open the Inventory accordion + each sub-group accordion
    const stockManagement = within(nav).getByText('Stock Management');
    await user.click(stockManagement);
    await waitFor(() => expect(within(nav).getByText('Raw Material Stock')).toBeTruthy());

    const links: [string, string][] = [
      ['Raw Material Stock', 'Raw Material Stock'],
      ['Sorted Material Stock', 'Sorted Material Stock'],
      ['Washed Material Stock', 'Washed Material Stock'],
      ['PET Flakes Stock', 'PET Flakes Stock'],
      ['Preform Stock', 'Preform Stock'],
      ['Bottle Stock', 'Bottle Stock'],
      ['By-product Stock', 'By-product Stock'],
    ];

    for (const [label, heading] of links) {
      await user.click(within(nav).getByText(label));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
      });
    }
  });

  it('Stock Operations sub-links navigate correctly', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const nav = sidebar();

    await user.click(within(nav).getByText('Stock Operations'));
    await waitFor(() => expect(within(nav).getByText('Stock Transfers')).toBeTruthy());

    for (const [label, heading] of [
      ['Location-wise Inventory', 'Location-wise Inventory'],
      ['Stock Transfers', 'Stock Transfers'],
      ['Stock Adjustments', 'Stock Adjustments'],
      ['Physical Stock Counts', 'Physical Stock Counts'],
    ] as [string, string][]) {
      await user.click(within(nav).getByText(label));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
      });
    }
  });

  it('Inventory Reports sub-links navigate correctly', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const nav = sidebar();

    await user.click(within(nav).getByText('Inventory Reports'));
    await waitFor(() => expect(within(nav).getByText('Inventory Valuation')).toBeTruthy());

    await user.click(within(nav).getByText('Inventory Valuation'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Inventory Valuation' })).toBeTruthy());

    await user.click(within(nav).getByText('Stock Ageing'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Stock Ageing' })).toBeTruthy());
  });

  it('Finance sub-links navigate correctly', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const nav = sidebar();

    for (const [label, heading] of [
      ['Finance Dashboard', 'Finance Dashboard'],
      ['Costing Details', 'Costing Details'],
      ['Tax Details', 'Tax Details'],
    ] as [string, string][]) {
      await user.click(within(nav).getByText(label));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
      });
    }
  });

  it('legacy inventory URLs redirect to the new sub-module pages', async () => {
    renderAt('/inventory/raw-material');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Raw Material Stock' })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/inventory/stock-management/raw-material');
  });

  it('the active sidebar entry is highlighted for the current page', async () => {
    renderAt('/inventory/reports/valuation');
    const nav = sidebar();
    const active = within(nav).getByText('Inventory Valuation').closest('a');
    expect(active?.className).toContain('bg-sky-600');
  });
});
