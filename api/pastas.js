const fs = require('fs').promises;
const path = require('path');

const PHRASES_DIR = path.join(process.cwd(), 'data', 'phrases');
const CONFIG_PATH = path.join(PHRASES_DIR, 'config.json');

async function loadPhraseLibrary() {
  const rawConfig = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(rawConfig);
  const modesConfig = config && typeof config === 'object' ? config.modes || {} : {};
  const modes = {};

  await Promise.all(
    Object.entries(modesConfig).map(async ([modeKey, modeConfig]) => {
      const levelPaths = Array.isArray(modeConfig.levels) ? modeConfig.levels : [];
      const levels = [];

      for (const levelPath of levelPaths) {
        const absolutePath = path.join(process.cwd(), levelPath);
        try {
          const rawLevel = await fs.readFile(absolutePath, 'utf8');
          const levelData = JSON.parse(rawLevel);
          const levelNumber = Number.isFinite(levelData.level)
            ? Math.max(1, Math.floor(levelData.level))
            : levels.length + 1;
          const entries = Array.isArray(levelData.entries) ? levelData.entries : [];
          levels.push({ level: levelNumber, entries });
        } catch (error) {
          console.warn(`Não foi possível carregar o arquivo de nível ${levelPath}:`, error);
          levels.push({ level: levels.length + 1, entries: [] });
        }
      }

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
