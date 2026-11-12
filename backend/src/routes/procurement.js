import { Router } from 'express';
import { auth } from '../middleware.js';
import { crud } from '../crud.js';
const r = Router();
r.use(auth);
r.use(crud('buyers'));
r.use(crud('suppliers'));
r.use(crud('purchases'));
export default r;
