const { loadPastasRaw, parsePastas } = require('./_utils/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, message: 'Método não permitido.' });
    return;
  }

  try {
    const raw = await loadPastasRaw();
    const pastas = parsePastas(raw);
    res.status(200).json({ success: true, pastas });
  } catch (error) {
    console.error('Erro ao carregar pastas:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar pastas.' });
  }
};
