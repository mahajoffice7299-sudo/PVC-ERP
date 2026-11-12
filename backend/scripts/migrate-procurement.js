import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

const statements = `
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS buyers;
CREATE TABLE buyers (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100), contact VARCHAR(100), email VARCHAR(100), buyer_code VARCHAR(50), department VARCHAR(100), designation VARCHAR(100), spending_limit DECIMAL(12,2), active_orders_count INT, status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE suppliers (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100), phone_number VARCHAR(100), shop_address VARCHAR(255), company_name VARCHAR(100), supplier_code VARCHAR(50), category VARCHAR(100), contact_person VARCHAR(100), email VARCHAR(100), city VARCHAR(100), country VARCHAR(100), payment_terms VARCHAR(100), rating DECIMAL(3,1), status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE purchases (id VARCHAR(50) PRIMARY KEY, po_number VARCHAR(100), supplier_id VARCHAR(50), supplier_name VARCHAR(100), buyer_id VARCHAR(50), buyer_name VARCHAR(100), purchase_date DATE, vehicle_number VARCHAR(255), material_type VARCHAR(100), color VARCHAR(100), grade VARCHAR(100), \`condition\` VARCHAR(100), store_id VARCHAR(50), gross_weight_kg DECIMAL(12,3), tare_weight_kg DECIMAL(12,3), net_weight_kg DECIMAL(12,3), rate_per_kg DECIMAL(12,2), total_amount DECIMAL(12,2), payment_type VARCHAR(50), paid_amount DECIMAL(12,2), payable_amount DECIMAL(12,2), status VARCHAR(50), currency VARCHAR(10) DEFAULT 'PKR', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
`;

try {
  await pool.query(statements);
  console.log('Migration complete: buyers, suppliers, purchases recreated with full column sets.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
