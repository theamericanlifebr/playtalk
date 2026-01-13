const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token ausente.' });
  }

  try {
    // Valida assinatura e expiração do token antes de buscar o usuário.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      `SELECT id, email, created_at
       FROM users
       WHERE id = $1`,
      [payload.sub]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    req.user = result.rows[0];
    return next();
  } catch (error) {
    console.error('Erro ao validar JWT:', error);
    return res.status(401).json({ message: 'Token inválido.' });
  }
}

module.exports = { authenticate };
