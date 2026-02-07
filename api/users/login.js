const bcrypt = require('bcryptjs');
const {
  normalizeKey,
  getUserByKey,
  ensureUserDefaults
} = require('../_utils/db');
const { signAuthToken } = require('../_utils/auth');

module.exports = async function handler(req, res) {
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

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios.' });
    return;
  }

  const key = normalizeKey(username);

  try {
    const user = await getUserByKey(key);

    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
      return;
    }

    const normalizedUser = ensureUserDefaults(user);
    const token = signAuthToken({ key: normalizedUser.key, username: normalizedUser.username });

    res.status(200).json({
      success: true,
      token,
      user: {
        key: normalizedUser.key,
        username: normalizedUser.username,
        data: normalizedUser.data
      }
    });
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar usuário.' });
  }
};
