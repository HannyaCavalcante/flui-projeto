const jwt = require('jsonwebtoken');
const SECRET = () => process.env.JWT_SECRET || 'flui_secret';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, SECRET());
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    next();
  });
}

module.exports = { authMiddleware, adminMiddleware };
