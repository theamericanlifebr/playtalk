const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;
const env = (value) => (typeof value === 'string' ? value.trim() : value);

const loadDotEnv = () => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

loadDotEnv();

const DATABASE_URL = env(process.env.DATABASE_URL);
const DATABASE_SSL = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : Boolean(DATABASE_URL && DATABASE_URL.includes('render.com'));
const JWT_SECRET = process.env.JWT_SECRET;

const DATABASE_CONFIG = DATABASE_URL
  ? {
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false
  }
  : {
    host: env(process.env.DATABASE_HOST),
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 5432,
    database: env(process.env.DATABASE_NAME),
    user: env(process.env.DATABASE_USER),
    password: env(process.env.DATABASE_PASSWORD),
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false
  };

const describeDatabaseTarget = () => {
  if (DATABASE_URL) {
    try {
      const parsedUrl = new URL(DATABASE_URL);
      return {
        source: 'DATABASE_URL',
        host: parsedUrl.hostname,
        port: parsedUrl.port || '5432',
        database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : null
      };
    } catch (_error) {
      return {
        source: 'DATABASE_URL',
        host: '(URL inválida)',
        port: null,
        database: null
      };
    }
  }

  return {
    source: 'DATABASE_HOST',
    host: DATABASE_CONFIG.host || null,
    port: DATABASE_CONFIG.port || null,
    database: DATABASE_CONFIG.database || null
  };
};

const databaseTarget = describeDatabaseTarget();
const pool = (DATABASE_URL || DATABASE_CONFIG.host)
  ? new Pool(DATABASE_CONFIG)
  : null;

const logDatabaseConnectionStatus = async () => {
  if (!pool) {
    console.warn('Banco de dados não configurado: defina DATABASE_URL ou DATABASE_HOST.');
    return;
  }

  console.log(
    `Postgres target: source=${databaseTarget.source}, host=${databaseTarget.host || '(vazio)'}, port=${databaseTarget.port || '(vazio)'}, db=${databaseTarget.database || '(vazio)'}, ssl=${DATABASE_SSL ? 'on' : 'off'}`
  );

  try {
    await pool.query('SELECT 1');
    console.log('Conexão com Postgres validada com sucesso.');
  } catch (error) {
    console.error('Falha ao conectar no Postgres:', {
      code: error.code,
      message: error.message,
      host: databaseTarget.host,
      source: databaseTarget.source
    });
  }
};

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
const DEFAULT_GAME_SOUNDS_BASE_URL = 'https://pub-1208463a3c774431bf7e0ddcbd3cf670.r2.dev/gamesounds';
const GAME_SOUNDS_BASE_URL = (process.env.GAME_SOUNDS_BASE_URL || DEFAULT_GAME_SOUNDS_BASE_URL).trim();

const FORCE_R2_GAME_SOUND_FILES = new Set([
  '001.mp3',
  '002.mp3',
  '003.mp3',
  '004.mp3',
  '005.mp3',
  '006.mp3',
  '007.mp3',
  '008.mp3',
  '009.mp3',
  '010.mp3',
  'abertura.mp3',
  'conclusão.mp3',
  'conclusão1.mp3',
  'conclusao.mp3',
  'conclusao1.mp3',
  'error.mp3',
  'fase1.mp3',
  'fase2.mp3',
  'fase3.mp3',
  'fase4.mp3',
  'fase5.mp3',
  'fase6.mp3',
  'fase7.mp3',
  'final.mp3',
  'final_1.mp3.mp3',
  'final_1.mp3'
]);
let imageIndex = null;
let imageLevelIndex = null;
let voiceIndex = null;
let mediaIndex = null;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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

  if (FORCE_R2_GAME_SOUND_FILES.has(baseName)) {
    return `${GAME_SOUNDS_BASE_URL}/${encodeURIComponent(baseName)}`;
  }

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

function createAuthToken(user) {
  if (!JWT_SECRET) {
    return null;
  }

  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce((acc, part) => {
    const [name, ...valueParts] = part.trim().split('=');
    if (!name) return acc;
    acc[name] = decodeURIComponent(valueParts.join('='));
    return acc;
  }, {});
}

function getAuthenticatedUserFromRequest(req) {
  if (!JWT_SECRET) return null;

  const cookies = parseCookies(req);
  const token = cookies.playtalk_token;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `playtalk_token=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=604800'
  ];

  if (secure) {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'playtalk_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

app.post('/register', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL não configurada.' });
      return;
    }

    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email e senha são obrigatórios.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO public.users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    const user = result.rows[0];
    const token = createAuthToken(user);

    if (token) {
      setAuthCookie(res, token);
    }

    res.status(201).json({ success: true, user, token });
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ success: false, message: 'Email já cadastrado.' });
      return;
    }
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar usuário.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    if (!pool) {
      res.status(500).json({ success: false, message: 'DATABASE_URL não configurada.' });
      return;
    }

    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email e senha são obrigatórios.' });
      return;
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, created_at FROM public.users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      res.status(401).json({ success: false, message: 'Email ou senha inválidos.' });
      return;
    }

    const user = result.rows[0];
    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      res.status(401).json({ success: false, message: 'Email ou senha inválidos.' });
      return;
    }

    if (!JWT_SECRET) {
      res.status(500).json({ success: false, message: 'JWT_SECRET não configurado.' });
      return;
    }

    const token = createAuthToken(user);

    setAuthCookie(res, token);

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, created_at: user.created_at }
    });
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar usuário.' });
  }
});

app.get('/auth/session', (req, res) => {
  const payload = getAuthenticatedUserFromRequest(req);
  if (!payload) {
    res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
    return;
  }

  res.json({ success: true, user: { id: payload.sub, email: payload.email } });
});

app.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});
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
  const fallbackBase = DEFAULT_GAME_SOUNDS_BASE_URL;
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

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const pathName = req.path;
  const publicPaths = new Set([
    '/auth.html',
    '/login',
    '/register',
    '/logout',
    '/auth/session',
    '/config.js'
  ]);

  if (
    publicPaths.has(pathName)
    || pathName.startsWith('/css/')
    || pathName.startsWith('/js/')
    || pathName.startsWith('/images/')
    || pathName.startsWith('/voices/')
    || pathName.startsWith('/api/')
    || pathName.startsWith('/videos/')
    || pathName.startsWith('/SVG/')
    || pathName.startsWith('/Fontes/')
    || pathName.startsWith('/medalhas/')
    || pathName.startsWith('/Avatar/')
    || pathName.startsWith('/backgrounds/')
    || pathName.startsWith('/data/')
    || pathName === '/favicon.ico'
    || (path.extname(pathName) && path.extname(pathName) !== '.html')
  ) {
    next();
    return;
  }

  const payload = getAuthenticatedUserFromRequest(req);
  if (!payload) {
    res.redirect('/auth.html');
    return;
  }

  next();
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
    logDatabaseConnectionStatus();
  });
}

module.exports = app;
