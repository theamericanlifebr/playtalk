const fs = require('fs').promises;
const path = require('path');

const PHRASES_DIR = (() => {
  const candidates = [
    path.join(process.cwd(), 'www', 'data', 'phrases'),
    path.join(process.cwd(), 'data', 'phrases')
  ];
  return candidates.find((candidate) => require('fs').existsSync(candidate)) || candidates[0];
})();
const CONFIG_PATH = path.join(PHRASES_DIR, 'config.json');

function normalizePhraseEntry(phrase) {
  if (typeof phrase !== 'string') {
    return { pt: '', en: [] };
  }
  const parts = phrase.split('#').map((part) => part.trim());
  const pt = parts.shift() || '';
  const en = parts.filter(Boolean);
  return { pt, en };
}

async function loadPhraseLibrary() {
  const rawConfig = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(rawConfig);
  const modesConfig = config && typeof config === 'object' ? config.modes || {} : {};
  const modes = {};

  await Promise.all(
    Object.entries(modesConfig).map(async ([modeKey, modeConfig]) => {
      const filePath = modeConfig && typeof modeConfig.file === 'string' ? modeConfig.file : null;
      const levels = [];

      if (filePath) {
        const absolutePath = path.join(process.cwd(), filePath);
        try {
          const rawMode = await fs.readFile(absolutePath, 'utf8');
          const modeData = JSON.parse(rawMode);
          const rawLevels = modeData && typeof modeData === 'object' && modeData.levels ? modeData.levels : {};
          Object.entries(rawLevels).forEach(([levelKey, entries]) => {
            const levelNumber = Number.isFinite(parseInt(levelKey, 10))
              ? Math.max(1, Math.floor(parseInt(levelKey, 10)))
              : levels.length + 1;
            const normalizedEntries = Array.isArray(entries)
              ? entries.map(normalizePhraseEntry)
              : [];
            levels.push({ level: levelNumber, entries: normalizedEntries });
          });
        } catch (error) {
          console.warn(`Não foi possível carregar o arquivo de nível ${filePath}:`, error);
        }
      }

      levels.sort((a, b) => a.level - b.level);
      modes[modeKey] = { levels };
    })
  );

  return { modes };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, message: 'Método não permitido.' });
    return;
  }

  try {
    const library = await loadPhraseLibrary();
    res.status(200).json({ success: true, library });
  } catch (error) {
    console.error('Erro ao carregar biblioteca de frases:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar biblioteca de frases.' });
  }
};
