import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import pool, { assertTable } from './db.js';

const bodySchema = z.record(z.any()).refine((b) => Object.keys(b).length > 0, { message: 'Empty body' });

function columns(data) {
  return Object.keys(data).filter((k) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
}

// Whitelisted columns per table so clients cannot write to arbitrary columns
// (e.g. password_hash or *_id foreign keys) through generic CRUD.
const ALLOWED = {
  users: ['id', 'name', 'username', 'email', 'role_id', 'active'],
  roles: ['id', 'name'],
  permissions: ['id', 'name', 'role_id'],
  buyers: ['id', 'name', 'contact', 'email', 'buyer_code', 'department', 'designation', 'spending_limit', 'active_orders_count', 'status'],
  suppliers: ['id', 'name', 'phone_number', 'shop_address', 'company_name', 'supplier_code', 'category', 'contact_person', 'email', 'city', 'country', 'payment_terms', 'rating', 'status'],
  purchases: ['id', 'po_number', 'supplier_id', 'supplier_name', 'buyer_id', 'buyer_name', 'purchase_date', 'vehicle_number', 'material_type', 'color', 'grade', 'condition', 'store_id', 'gross_weight_kg', 'tare_weight_kg', 'net_weight_kg', 'rate_per_kg', 'total_amount', 'payment_type', 'paid_amount', 'payable_amount', 'status', 'currency', 'notes'],
  store_locations: ['id', 'name', 'contact', 'address'],
  store_receipts: ['id', 'location_id', 'supplier_id', 'amount'],
  store_transfers: ['id', 'from_loc', 'to_loc'],
  stock: ['id', 'sku', 'qty', 'location_id'],
  adjustments: ['id', 'stock_id', 'delta', 'reason'],
  stock_counts: ['id', 'location_id'],
  reports: ['id', 'title'],
  sorting: ['id', 'batch_no', 'qty', 'data'],
  washing: ['id', 'batch_no', 'qty', 'data'],
  production: ['id', 'batch_no', 'qty', 'data'],
  sales: ['id', 'customer', 'amount', 'data'],
  sales_returns: ['id', 'sale_id', 'reason'],
  costing: ['id', 'item', 'cost'],
  tax: ['id', 'name', 'rate'],
};

function writableCols(table, data) {
  const allowed = ALLOWED[table] || [];
  return columns(data).filter((k) => allowed.includes(k));
}

const newId = () => randomUUID();

export function crud(key) {
  const r = Router();
  const table = assertTable(key);

  r.get(`/${key}`, async (_req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      res.json(rows);
    } catch (err) { next(err); }
  });

  r.post(`/${key}`, async (req, res, next) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      const cols = writableCols(table, parsed.data);
      if (cols.length === 0) return res.status(400).json({ error: 'No valid fields in body' });
      const id = typeof parsed.data.id === 'string' && parsed.data.id ? parsed.data.id : newId();
      const data = { ...parsed.data, id };
      const insertCols = cols.includes('id') ? cols : ['id', ...cols];
      const placeholders = insertCols.map(() => '?').join(', ');
      await pool.query(
        `INSERT INTO \`${table}\` (${insertCols.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
        insertCols.map((c) => data[c])
      );
      const [stored] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`id\` = ?`, [id]);
      res.status(201).json(stored[0] ?? data);
    } catch (err) { next(err); }
  });

  r.put(`/${key}/:id`, async (req, res, next) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      const cols = writableCols(table, parsed.data).filter((c) => c !== 'id');
      if (cols.length === 0) return res.status(400).json({ error: 'No valid fields in body' });
      const [result] = await pool.query(
        `UPDATE \`${table}\` SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE \`id\` = ?`,
        [...cols.map((c) => parsed.data[c]), req.params.id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`id\` = ?`, [req.params.id]);
      res.json(rows[0]);
    } catch (err) { next(err); }
  });

  r.delete(`/${key}/:id`, async (req, res, next) => {
    try {
      const [result] = await pool.query(`DELETE FROM \`${table}\` WHERE \`id\` = ?`, [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
      res.status(204).end();
    } catch (err) { next(err); }
  });

  r.delete(`/${key}`, async (_req, res, next) => {
    try {
      await pool.query(`DELETE FROM \`${table}\``);
      res.status(204).end();
    } catch (err) { next(err); }
  });

  return r;
}
