import jwt from 'jsonwebtoken';

export const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = { id: String(payload.id), role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
