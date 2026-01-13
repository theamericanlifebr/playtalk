const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const SALT_ROUNDS = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function createUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, created_at`,
    [email, passwordHash]
  );

  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

function generateToken(userId) {
  // Usamos "sub" para identificar o usuário de forma padrão em JWTs.
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  createUser,
  findUserByEmail,
  generateToken,
  verifyPassword
};
