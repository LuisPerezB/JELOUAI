const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

router.post('/token', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username y password requeridos' });
  }

  if (username !== 'admin' || password !== 'admin123') {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { sub: 1, username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  res.json({ token });
});

module.exports = router;