import { Router } from 'express'; import { auth } from '../middleware.js'; const r=Router(); r.get('/', auth, (req,res)=>res.json([])); export default r;
