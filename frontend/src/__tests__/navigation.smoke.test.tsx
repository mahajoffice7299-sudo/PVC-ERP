import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '../routes/AppRoutes';

const setAuth = () => {
  window.localStorage.setItem('pvc_erp_user', JSON.stringify({ username: 'admin', name: 'Operations Admin', role: 'Production Supervisor' }));
};

const renderAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(<AppRoutes />);
};

describe('Inventory + Finance navigation smoke test', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setAuth();
  });

  const routes = [
    '/inventory/dashboard',
    '/inventory/stock-management',
    '/inventory/stock-management/raw-material',
    '/inventory/stock-management/sorted',
    '/inventory/stock-management/washed',
    '/inventory/stock-management/flakes',
    '/inventory/stock-management/preform',
    '/inventory/stock-management/bottle',
    '/inventory/stock-management/byproduct',
    '/inventory/stock-operations',
    '/inventory/stock-operations/locations',
    '/inventory/stock-operations/transfers',
    '/inventory/stock-operations/adjustments',
    '/inventory/stock-operations/counts',
    '/inventory/reports',
    '/inventory/reports/valuation',
    '/inventory/reports/ageing',
    '/finance/dashboard',
    '/finance/costing',
    '/finance/tax',
  ];

  routes.forEach((route) => {
    it(`renders ${route} without crashing`, async () => {
      const { container } = renderAt(route);
      await waitFor(() => {
        expect(container.querySelector('main')).toBeTruthy();
      });
      expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    });
  });

  it('sidebar shows Inventory sub-modules and Finance links', async () => {
    renderAt('/inventory/dashboard');
    const sidebar = document.querySelector('aside') as HTMLElement;
    expect(within(sidebar).getByText('Inventory Dashboard')).toBeTruthy();
    expect(within(sidebar).getByText('Stock Management')).toBeTruthy();
    expect(within(sidebar).getByText('Stock Operations')).toBeTruthy();
    expect(within(sidebar).getByText('Inventory Reports')).toBeTruthy();
    expect(within(sidebar).getByText('Finance Dashboard')).toBeTruthy();
  });

  it('clicking a sidebar link navigates to the right page', async () => {
    const user = userEvent.setup();
    renderAt('/inventory/dashboard');
    const sidebar = document.querySelector('aside') as HTMLElement;

    const financeLink = within(sidebar).getByText('Costing Details');
    await user.click(financeLink);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Costing Details' })).toBeTruthy();
    });
  });
});
