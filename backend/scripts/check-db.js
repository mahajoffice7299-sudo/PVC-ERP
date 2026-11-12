import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'pvc_erp',
});

try {
  const [tables] = await pool.query("SHOW TABLES");
  console.log('CONNECTED. Tables:', tables.length > 0 ? tables.map(Object.values).flat().join(', ') : '(none — schema not imported)');
} catch (err) {
  console.error('CONNECTION FAILED:', err.code, '-', err.message);
} finally {
  await pool.end();
}
