const bcrypt = require('bcryptjs');
const {
  ensureUserDefaults,
  getUserByKey,
  updateUser
} = require('../_utils/db');
const { authenticateRequest } = require('../_utils/auth');

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Método não permitido.' });
    return;
  }

  const auth = authenticateRequest(req);
  if (!auth.success) {
    res.status(auth.status).json({ success: false, message: auth.message });
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

  const { key, data, password, username } = payload;

  if (!key || key !== auth.payload.key) {
    res.status(403).json({ success: false, message: 'Operação não autorizada para este usuário.' });
    return;
  }

  try {
    const current = await getUserByKey(key);

    if (!current) {
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }

    const mergedData = data && typeof data === 'object'
      ? { ...current.data, ...data }
      : current.data;

    const passwordHash = password && typeof password === 'string'
      ? await bcrypt.hash(password, BCRYPT_ROUNDS)
      : undefined;

    const updated = await updateUser({
      key,
      username,
      passwordHash,
      data: mergedData
    });

    const user = ensureUserDefaults(updated);

    res.status(200).json({
      success: true,
      user: {
        key: user.key,
        username: user.username,
        data: user.data
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
  }
};
