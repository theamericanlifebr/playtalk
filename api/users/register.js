const bcrypt = require('bcryptjs');
const {
  normalizeKey,
  createDefaultData,
  ensureUserDefaults,
  getUserByKey,
  createUser
} = require('../_utils/db');
const { signAuthToken } = require('../_utils/auth');

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

module.exports = async function handler(req, res) {
  // 🔥 PROVA 1: endpoint realmente foi chamado
  console.log('REGISTER ENDPOINT HIT');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Método não permitido.' });
    return;
  }

  let payload = req.body || {};
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload || '{}');
    } catch (error) {
      payload = {};
    }
  }

  const { username, password } = payload;

  if (!username || !password || String(password).length < 8) {
    res.status(400).json({
      success: false,
      message: 'Usuário e senha são obrigatórios (senha com mínimo de 8 caracteres).'
    });
    return;
  }

  const key = normalizeKey(username);
  console.log('REGISTER PAYLOAD:', { key, username });

  try {
    const existing = await getUserByKey(key);
    console.log('EXISTING USER:', existing ? 'YES' : 'NO');

    if (existing) {
      res.status(409).json({ success: false, message: 'Usuário já existe.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    console.log('PASSWORD HASH GENERATED');

    // 🔥 PROVA 2: createUser está sendo chamado
    console.log('CALLING createUser()');

    const user = await createUser({
      key,
      username: username.trim(),
      passwordHash,
      data: createDefaultData()
    });

    console.log('USER CREATED IN DB:', user.key);

    const normalizedUser = ensureUserDefaults(user);
    const token = signAuthToken({
      key: normalizedUser.key,
      username: normalizedUser.username
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        key: normalizedUser.key,
        username: normalizedUser.username,
        data: normalizedUser.data
      }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar usuário.' });
  }
};
