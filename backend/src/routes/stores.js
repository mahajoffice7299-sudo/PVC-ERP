import { Router } from 'express';
import { auth } from '../middleware.js';
import { crud } from '../crud.js';
const r = Router();
r.use(auth);
r.use(crud('locations'));
r.use(crud('receipts'));
r.use(crud('transfers'));
export default r;
