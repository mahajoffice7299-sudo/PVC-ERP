import { Router } from 'express';
import { auth } from '../middleware.js';
import { crud } from '../crud.js';
import pool from '../db.js';

const r = Router();
r.use(auth);

const stripHash = (rows) => rows.map(({ password_hash, ...safe }) => safe);

// Map DB rows to the shape the frontend ManagedUser type expects.
const toClient = (u) => ({
  id: u.id,
  username: u.username ?? u.email ?? '',
  fullName: u.name ?? '',
  role: u.role_id ?? 'Production Supervisor',
  active: u.active === null || u.active === undefined ? true : !!u.active,
  createdAt: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),
});

const toDb = (b) => {
  const out = {};
  if (b.username !== undefined) { out.username = b.username; out.email = b.username; out.name = b.fullName ?? b.username; }
  if (b.fullName !== undefined) out.name = b.fullName;
  if (b.role !== undefined) out.role_id = b.role;
  if (b.active !== undefined) out.active = b.active ? 1 : 0;
  return out;
};

// Custom list: strips password_hash and maps field names.
r.get('/users', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(stripHash(rows).map(toClient));
  } catch (err) { next(err); }
});

// Custom create: maps frontend fields, generates id.
r.post('/users', async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = typeof b.id === 'string' && b.id ? b.id : crypto.randomUUID();
    const username = b.username ?? '';
    await pool.query(
      'INSERT INTO users (id, name, username, email, role_id, active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, b.fullName ?? username, username, username, b.role ?? 'Production Supervisor', b.active === false ? 0 : 1]
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    res.status(201).json(toClient(stripHash(rows)[0]));
  } catch (err) { next(err); }
});

r.use(crud('users'));
r.use(crud('roles'));
r.use(crud('permissions'));
export default r;
