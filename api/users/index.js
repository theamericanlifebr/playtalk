const { getUserByKey, ensureUserDefaults } = require('../_utils/db');
const { authenticateRequest } = require('../_utils/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, message: 'Método não permitido.' });
    return;
  }

  const auth = authenticateRequest(req);
  if (!auth.success) {
    res.status(auth.status).json({ success: false, message: auth.message });
    return;
  }

  try {
    const user = await getUserByKey(auth.payload.key);

    if (!user) {
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }

    const normalizedUser = ensureUserDefaults(user);

    res.status(200).json({
      success: true,
      user: {
        key: normalizedUser.key,
        username: normalizedUser.username,
        data: normalizedUser.data
      }
    });
  } catch (error) {
    console.error('Erro ao ler usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar usuário.' });
  }
};
