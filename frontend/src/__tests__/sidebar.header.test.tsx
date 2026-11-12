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

describe('Module header clicks navigate to the module', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    setAuth();
  });

  it('clicking "Inventory" header navigates to the Inventory Dashboard', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(within(sidebar()).getByText('Inventory'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inventory Dashboard' })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/inventory/dashboard');
  });

  it('clicking "Finance" header navigates to the Finance Dashboard', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(within(sidebar()).getByText('Finance'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Finance Dashboard' })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/finance/dashboard');
  });

  it('clicking "Procurement" header navigates to the Procurement Dashboard', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(within(sidebar()).getByText('Procurement'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Procurement Analytics/i })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/procurement/dashboard');
  });

  it('clicking "Stores & Inventory" header navigates to the Stores Dashboard', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(within(sidebar()).getByText('Stores & Inventory'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Stores Dashboard' })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/stores/dashboard');
  });

  it('clicking "Sorting" header navigates to the Sorting Dashboard', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(within(sidebar()).getByText('Sorting'));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/processing/sorting/dashboard');
    });
  });

  it('clicking the chevron toggles the Inventory submenu without navigating away', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const nav = sidebar();
    const toggle = within(nav).getByLabelText('Collapse Inventory menu');
    await user.click(toggle);
    await waitFor(() => {
      expect(within(nav).queryByText('Raw Material Stock')).toBeNull();
    });
    expect(window.location.pathname).toBe('/inventory/dashboard');
  });

  it('clicking a sub-module header navigates to that sub-module overview', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const nav = sidebar();

    await user.click(within(nav).getByText('Stock Operations'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Location-wise Inventory' })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/inventory/stock-operations');
  });

  it('clicking the Stock Management sub-module header shows the overview page', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const nav = sidebar();

    await user.click(within(nav).getByText('Stock Management'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Stock Management Overview' })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/inventory/stock-management');
  });

  it('clicking the Inventory Reports sub-module header shows the valuation report', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const nav = sidebar();

    await user.click(within(nav).getByText('Inventory Reports'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inventory Valuation' })).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/inventory/reports');
  });
});
