const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const serviceAuthMiddleware = (req, res, next) => {
  const serviceToken = process.env.SERVICE_TOKEN;

  if (!serviceToken) {
    return res.status(500).json({ error: 'Configuración interna incorrecta' });
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Service token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  if (token !== serviceToken) {
    return res.status(403).json({ error: 'Service token inválido' });
  }

  next();
};

module.exports = { authMiddleware, serviceAuthMiddleware };