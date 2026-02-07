const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;


const staticDir = (() => {
  const customDir = process.env.STATIC_DIR;
  if (customDir) {
    return path.resolve(__dirname, customDir);
  }

  const candidateDirs = ['public', 'dist'];
  for (const dir of candidateDirs) {
    const candidatePath = path.join(__dirname, dir);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return __dirname;
})();

const IMAGES_ROOT = (() => {
  const candidateDirs = ['imagens', 'images'];
  for (const dir of candidateDirs) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return path.join(__dirname, 'images');
})();

const VOICES_ROOT = (() => {
  const candidateDirs = ['voices'];
  for (const dir of candidateDirs) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return path.join(__dirname, 'voices');
})();
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp']);
const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.opus', '.ogg', '.oga', '.webm']);
const SUPPORTED_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogv', '.mov', '.m4v']);
const SUPPORTED_MEDIA_EXTENSIONS = new Set([
  ...SUPPORTED_IMAGE_EXTENSIONS,
  ...SUPPORTED_AUDIO_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS
]);
const GAME_SOUNDS_BASE_URL = (process.env.GAME_SOUNDS_BASE_URL || '').trim();
let imageIndex = null;
let imageLevelIndex = null;
let voiceIndex = null;
let mediaIndex = null;

const MEDIA_DIR_CANDIDATES = [
  'videos',
  'video',
  'voices',
  'gamesounds',
  'audio',
  'images',
  'imagens',
  'backgrounds',
  'Avatar',
  'SVG',
  'Fontes',
  'medalhas',
  'data'
];

function extractLevelFromRelativePath(relativePath) {
  if (!relativePath) return null;
  const [firstSegment] = relativePath.split(path.sep);
  const parsed = Number.parseInt(firstSegment, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

 

async function collectImageFiles(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectImageFiles(fullPath));
    } else if (entry.isFile() && SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push({ name: entry.name, relativePath: path.relative(IMAGES_ROOT, fullPath) });
    }
  }

  return files;
}

async function refreshImageIndex() {
  try {
    const files = await collectImageFiles(IMAGES_ROOT);
    imageIndex = new Map(files.map(file => [file.name, file.relativePath]));
    imageLevelIndex = new Map(
      files.map(file => [file.name, extractLevelFromRelativePath(file.relativePath)])
    );
  } catch (error) {
    console.error('Erro ao mapear arquivos de imagem:', error);
    imageIndex = new Map();
    imageLevelIndex = new Map();
  }
}

async function resolveImagePath(fileName) {
  if (!fileName) return null;

  if (!imageIndex) {
    await refreshImageIndex();
  }

  let relativePath = imageIndex.get(fileName);

  if (relativePath) {
    const candidatePath = path.join(IMAGES_ROOT, relativePath);
    try {
      await fs.promises.access(candidatePath);
      return candidatePath;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  await refreshImageIndex();
  relativePath = imageIndex.get(fileName);

  return relativePath ? path.join(IMAGES_ROOT, relativePath) : null;
}

async function collectMediaFiles(directory, rootDir) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      files.push(...await collectMediaFiles(fullPath, rootDir));
    } else if (entry.isFile() && SUPPORTED_MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push({ name: entry.name, relativePath: path.relative(rootDir, fullPath) });
    }
  }

  return files;
}

async function refreshMediaIndex() {
  const roots = MEDIA_DIR_CANDIDATES
    .map(dir => path.join(staticDir, dir))
    .filter(dir => fs.existsSync(dir));
  const files = [];

  for (const root of roots) {
    files.push(...await collectMediaFiles(root, staticDir));
  }

  mediaIndex = new Map(files.map(file => [file.name, file.relativePath]));
}

async function resolveMediaUrl(fileName) {
  if (!fileName) return null;

  const normalized = fileName.replace(/\\/g, '/');
  const baseName = path.basename(normalized);
  const ext = path.extname(baseName).toLowerCase();

  if (ext && !SUPPORTED_MEDIA_EXTENSIONS.has(ext)) {
    return null;
  }

  const directPath = path.join(staticDir, baseName);
  try {
    await fs.promises.access(directPath);
    return `/${baseName}`;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (!mediaIndex) {
    await refreshMediaIndex();
  }

  let relativePath = mediaIndex.get(baseName);

  if (relativePath) {
    return `/${relativePath.replace(/\\/g, '/')}`;
  }

  await refreshMediaIndex();
  relativePath = mediaIndex.get(baseName);

  return relativePath ? `/${relativePath.replace(/\\/g, '/')}` : null;
}

async function collectVoiceFiles(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectVoiceFiles(fullPath));
    } else if (entry.isFile() && SUPPORTED_AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push({ name: entry.name, relativePath: path.relative(VOICES_ROOT, fullPath) });
    }
  }

  return files;
}

async function refreshVoiceIndex() {
  try {
    const files = await collectVoiceFiles(VOICES_ROOT);
    voiceIndex = new Map(files.map(file => [file.name, file.relativePath]));
  } catch (error) {
    console.error('Erro ao mapear arquivos de áudio:', error);
    voiceIndex = new Map();
  }
}

async function resolveVoicePath(filePathOrName) {
  if (!filePathOrName) return null;

  const normalized = filePathOrName.replace(/\\/g, '/');
  const ext = path.extname(normalized).toLowerCase();
  if (ext && !SUPPORTED_AUDIO_EXTENSIONS.has(ext)) return null;

  if (normalized.includes('/')) {
    const safePath = path.normalize(normalized).replace(/^([.]{2}[\\/])+/g, '');
    const candidate = path.resolve(VOICES_ROOT, safePath);
    if (candidate.startsWith(VOICES_ROOT)) {
      try {
        await fs.promises.access(candidate);
        return candidate;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }

  if (!voiceIndex) {
    await refreshVoiceIndex();
  }

  const baseName = path.basename(normalized);
  let relativePath = voiceIndex.get(baseName);

  if (relativePath) {
    const candidatePath = path.join(VOICES_ROOT, relativePath);
    try {
      await fs.promises.access(candidatePath);
      return candidatePath;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  await refreshVoiceIndex();
  relativePath = voiceIndex.get(baseName);

  return relativePath ? path.join(VOICES_ROOT, relativePath) : null;
}

function ensureVoiceDirectories() {
  if (!fs.existsSync(VOICES_ROOT)) {
    fs.mkdirSync(VOICES_ROOT, { recursive: true });
  }

  for (let folder = 1; folder <= 50; folder += 1) {
    const dirPath = path.join(VOICES_ROOT, String(folder));
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

ensureVoiceDirectories();
app.get('/api/image-levels', async (req, res) => {
  try {
    if (!imageLevelIndex) {
      await refreshImageIndex();
    }

    const levels = {};
    for (const [fileName, level] of imageLevelIndex.entries()) {
      if (Number.isFinite(level)) {
        levels[fileName] = level;
      }
    }

    res.json({ success: true, levels });
  } catch (error) {
    console.error('Erro ao carregar níveis das imagens:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar níveis das imagens.' });
  }
});

app.post('/api/image-levels/refresh', async (req, res) => {
  try {
    await refreshImageIndex();

    const levels = {};
    for (const [fileName, level] of imageLevelIndex.entries()) {
      if (Number.isFinite(level)) {
        levels[fileName] = level;
      }
    }

    res.json({ success: true, levels });
  } catch (error) {
    console.error('Erro ao atualizar níveis das imagens:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar níveis das imagens.' });
  }
});

app.get('/api/media/resolve', async (req, res) => {
  try {
    const name = typeof req.query.name === 'string' ? req.query.name : '';
    if (!name) {
      res.status(400).json({ success: false, message: 'Informe o nome do arquivo.' });
      return;
    }

    const url = await resolveMediaUrl(name);

    if (!url) {
      res.status(404).json({ success: false, message: 'Arquivo não encontrado.' });
      return;
    }

    res.json({ success: true, url });
  } catch (error) {
    console.error('Erro ao resolver arquivo de mídia:', error);
    res.status(500).json({ success: false, message: 'Erro ao resolver arquivo de mídia.' });
  }
});

app.get('/config.js', (req, res) => {
  const fallbackBase = '/gamesounds';
  const baseUrl = GAME_SOUNDS_BASE_URL || fallbackBase;
  res.type('application/javascript');
  res.send(`window.GAME_SOUNDS_BASE_URL = ${JSON.stringify(baseUrl)};`);
});

app.get('/images/:filePath(*)', async (req, res, next) => {
  try {
    const requestedName = decodeURIComponent(path.basename(req.params.filePath));
    const ext = path.extname(requestedName || '').toLowerCase();

    if (!SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
      next();
      return;
    }

    const imagePath = await resolveImagePath(requestedName);

    if (!imagePath) {
      res.status(404).send('Imagem não encontrada.');
      return;
    }

    res.sendFile(imagePath, error => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
});

app.get('/voices/:filePath(*)', async (req, res, next) => {
  try {
    const requestedPath = decodeURIComponent(req.params.filePath || '');
    const ext = path.extname(requestedPath || '').toLowerCase();

    if (ext && !SUPPORTED_AUDIO_EXTENSIONS.has(ext)) {
      next();
      return;
    }

    const voicePath = await resolveVoicePath(requestedPath);

    if (!voicePath) {
      res.status(404).send('Áudio não encontrado.');
      return;
    }

    res.sendFile(voicePath, error => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
});
app.use(express.static(staticDir));

app.get(['/class', '/class/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'class.html'));
});

app.get(['/game', '/game/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

app.get(['/vocabulary', '/vocabulary/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'vocabulary.html'));
});

app.get(['/levels', '/levels/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'levels.html'));
});

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.endsWith('.html')) {
    res.status(404).send('Página não encontrada.');
    return;
  }
  next();
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Serving static content from ${staticDir}`);
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
