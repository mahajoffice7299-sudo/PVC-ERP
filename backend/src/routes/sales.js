import { Router } from 'express';
import { auth } from '../middleware.js';
import { crud } from '../crud.js';
const r = Router();
r.use(auth);
r.use(crud('sales'));
r.use(crud('returns'));
export default r;
