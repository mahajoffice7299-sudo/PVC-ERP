import { Router } from 'express';
import { auth } from '../middleware.js';
import { crud } from '../crud.js';
const r = Router();
r.use(auth);
r.use(crud('sorting'));
r.use(crud('washing'));
r.use(crud('production'));
export default r;
