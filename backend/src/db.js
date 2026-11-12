import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'pvc_erp',
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;

// Allowed table mappings (route key -> physical table). Prevents SQL injection
// through table/column names coming from route definitions.
export const TABLES = {
  users: 'users',
  roles: 'roles',
  permissions: 'permissions',
  locations: 'store_locations',
  receipts: 'store_receipts',
  transfers: 'store_transfers',
  stock: 'stock',
  adjustments: 'adjustments',
  counts: 'stock_counts',
  reports: 'reports',
  buyers: 'buyers',
  suppliers: 'suppliers',
  purchases: 'purchases',
  sorting: 'sorting',
  washing: 'washing',
  production: 'production',
  sales: 'sales',
  returns: 'sales_returns',
  costing: 'costing',
  tax: 'tax',
};

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export function assertTable(key) {
  const table = TABLES[key];
  if (!table || !IDENT.test(table)) throw new Error(`Unknown collection: ${key}`);
  return table;
}
