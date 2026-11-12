import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../db.js';
import { randomUUID } from 'node:crypto';

const r = Router();

const registerSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  role: z.string().optional(),
});
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

r.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { username, password, role } = parsed.data;
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [username]);
    if (existing.length > 0) return res.status(409).json({ error: 'username already taken' });
    const hash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role_id) VALUES (?, ?, ?, ?, ?)',
      [id, username, username, hash, role || 'admin']
    );
    res.status(201).json({ id, username, role: role || 'admin' });
  } catch (err) { next(err); }
});

r.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { username, password } = parsed.data;
    // email column stores the username chosen at registration
    const [rows] = await pool.query('SELECT id, name, email, password_hash, role_id FROM users WHERE email = ?', [username]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: 'invalid' });
    const role = u.role_id || 'admin';
    const token = jwt.sign({ id: u.id, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ token, user: { id: u.id, username: u.name || u.email, role } });
  } catch (err) { next(err); }
});

export default r;
