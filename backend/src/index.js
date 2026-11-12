import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import storeRoutes from './routes/stores.js';
import inventoryRoutes from './routes/inventory.js';
import procurementRoutes from './routes/procurement.js';
import processingRoutes from './routes/processing.js';
import salesRoutes from './routes/sales.js';
import financeRoutes from './routes/finance.js';
import dashboardRoutes from './routes/dashboard.js';
import pool from './db.js';

const app = express();
app.set('etag', false);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dashboard', dashboardRoutes);

import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((_, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

const port = process.env.PORT || 4000;

(async () => {
  // Seed the default superadmin account if it does not exist.
  try {
    const [rows] = await pool.query("SELECT id FROM users WHERE email = 'superadmin'");
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO users (id, name, email, password_hash, role_id) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), 'superadmin', 'superadmin', await bcrypt.hash('Super@123', 10), 'superadmin']
      );
      console.log('Seeded default superadmin account');
    }
  } catch (err) {
    console.error('Superadmin seed failed (is MySQL running and schema imported?):', err.message);
  }

  app.listen(port, () => console.log(`API on ${port}`));
})();
