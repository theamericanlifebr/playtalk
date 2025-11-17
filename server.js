const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const USERS_DB_PATH = path.join(DATA_DIR, 'users.json');

const DEFAULT_USER = {
  username: 'PlayTalk',
  password: 'tatatata'
};

const PROGRESS_SCHEMA = {
  acertosTotais: { type: 'number', default: 0 },
  errosTotais: { type: 'number', default: 0 },
  tentativasTotais: { type: 'number', default: 0 },
  points: { type: 'number', default: 0 },
  playerBalance: { type: 'number', default: 0 },
  displayName: { type: 'string', default: '' },
  modeStats: { type: 'json', default: {} },
  completedModes: { type: 'json', default: {} },
  unlockedModes: { type: 'json', default: {} },
  modeIntroShown: { type: 'json', default: {} },
  playtalkSettings: {
    type: 'json',
    default: {
      theme: 'light',
      pointsPerHit: 4000,
      pointsLossPerSecond: 0,
      startingPoints: 0
    }
  },
  generalProgress: { type: 'json', default: { level: 1, xp: 0 } },
  modeProgress: { type: 'json', default: {} },
  pastaAtual: { type: 'number', default: 1 },
  tutorialDone: { type: 'boolean', default: false },
  ilifeDone: { type: 'boolean', default: false },
  levelDetails: { type: 'json', default: [] },
  totalTime: { type: 'number', default: 0 },
  shareResults: { type: 'boolean', default: true },
  avatar: { type: 'string', default: '' },
  medalHistory: { type: 'json', default: [] },
  currentStreak: { type: 'number', default: 0 },
  bestStreak: { type: 'number', default: 0 },
  monthlyStats: { type: 'json', default: { month: '', totalAttempts: 0, eligibleAttempts: 0, correctAttempts: 0 } },
  recentPhraseStats: {
    type: 'json',
    default: { entries: [], totalChars: 0, totalTime: 0 }
  }
};

const DEFAULT_AVATAR_URL = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2296%22%20height%3D%2296%22%20viewBox%3D%220%200%2096%2096%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23c5d7ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237fa8ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle%20cx%3D%2248%22%20cy%3D%2248%22%20r%3D%2248%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20fill%3D%22%23fff%22%20opacity%3D%220.85%22%20d%3D%22M48%2046a14%2014%200%201%200-14-14A14%2014%200%200%200%2048%2046Zm0%207c-12.1%200-22%206.56-22%2014.66V70a24%2024%200%200%200%2044%200v-2.34C70%2059.56%2060.1%2053%2048%2053Z%22/%3E%3C/svg%3E';
const GENERAL_MODE_KEYS = ['2', '3', '4', '5', '6'];
const MAX_RANKING_ENTRIES = 30;
const LEGEND_REQUIREMENTS = { cpm: 200, accuracy: 80, diamonds: 10 };
const RECENT_PHRASE_LIMIT = 500;

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

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_DB_PATH)) {
    const initialData = {
      users: {},
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

function normalizeKey(username = '') {
  return username.trim().toLowerCase();
}

function getDefaultValue(schema) {
  if (!('default' in schema)) {
    return undefined;
  }
  if (schema.type === 'json') {
    return JSON.parse(JSON.stringify(schema.default));
  }
  return schema.default;
}

function createDefaultData() {
  const data = {};
  for (const [key, schema] of Object.entries(PROGRESS_SCHEMA)) {
    data[key] = getDefaultValue(schema);
  }
  return data;
}

async function readDatabase() {
  try {
    const raw = await fs.promises.readFile(USERS_DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.users || typeof parsed.users !== 'object') {
      parsed.users = {};
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { users: {}, updatedAt: new Date().toISOString() };
    }
    throw error;
  }
}

async function writeDatabase(data) {
  const payload = {
    users: data.users || {},
    updatedAt: new Date().toISOString()
  };
  await fs.promises.writeFile(USERS_DB_PATH, JSON.stringify(payload, null, 2));
  return payload;
}

function ensureUserDefaults(user) {
  if (!user.data || typeof user.data !== 'object') {
    user.data = createDefaultData();
    return user;
  }

  for (const [key, schema] of Object.entries(PROGRESS_SCHEMA)) {
    if (user.data[key] === undefined) {
      user.data[key] = getDefaultValue(schema);
    }
  }
  return user;
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizePositiveInteger(value) {
  return Math.max(0, Math.floor(normalizeNumber(value)));
}

function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function aggregateModeStats(modeStats = {}) {
  const totals = {
    totalPhrases: 0,
    correctPhrases: 0,
    totalChars: 0,
    correctChars: 0,
    totalTime: 0,
    report: 0,
    diamantes: 0
  };
  GENERAL_MODE_KEYS.forEach((modeKey) => {
    const stats = modeStats[String(modeKey)] || {};
    totals.totalPhrases += normalizePositiveInteger(stats.totalPhrases);
    totals.correctPhrases += normalizePositiveInteger(stats.correct);
    totals.totalChars += normalizePositiveInteger(stats.totalChars);
    totals.correctChars += normalizePositiveInteger(stats.correctChars);
    totals.totalTime += normalizePositiveInteger(stats.totalTime);
    totals.report += normalizePositiveInteger(stats.report);
    const medals = stats.medals || {};
    totals.diamantes += normalizePositiveInteger(medals.diamante);
  });
  return totals;
}

function createEmptyRecentPhraseStats() {
  return { entries: [], totalChars: 0, totalTime: 0 };
}

function normalizeRecentPhraseStatsValue(value) {
  const base = createEmptyRecentPhraseStats();
  if (!value || typeof value !== 'object') {
    return base;
  }
  const sourceEntries = Array.isArray(value.entries)
    ? value.entries
    : Array.isArray(value)
      ? value
      : [];
  sourceEntries.some((entry) => {
    if (base.entries.length >= RECENT_PHRASE_LIMIT) {
      return true;
    }
    let chars = 0;
    let duration = 0;
    if (Array.isArray(entry)) {
      chars = entry[0];
      duration = entry[1];
    } else if (entry && typeof entry === 'object') {
      chars = entry.chars ?? entry.c ?? 0;
      duration = entry.time ?? entry.t ?? 0;
    }
    const normalizedChars = Number.isFinite(chars) && chars > 0 ? Math.floor(chars) : 0;
    const normalizedDuration = Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 0;
    if (!normalizedChars && !normalizedDuration) {
      return false;
    }
    base.entries.push([normalizedChars, normalizedDuration]);
    base.totalChars += normalizedChars;
    base.totalTime += normalizedDuration;
    return false;
  });
  if (!base.totalChars && Number.isFinite(value.totalChars)) {
    base.totalChars = Math.max(0, Math.floor(value.totalChars));
  }
  if (!base.totalTime && Number.isFinite(value.totalTime)) {
    base.totalTime = Math.max(0, Math.floor(value.totalTime));
  }
  return base;
}

function computeRecentCpm(stats) {
  if (!stats || !stats.totalChars || !stats.totalTime) {
    return 0;
  }
  const minutes = stats.totalTime / 60000;
  return minutes > 0 ? stats.totalChars / minutes : 0;
}

function parseAvatar(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return DEFAULT_AVATAR_URL;
}

function parseDisplayName(entry) {
  if (entry && entry.data && typeof entry.data.displayName === 'string' && entry.data.displayName.trim()) {
    return entry.data.displayName.trim();
  }
  if (entry && typeof entry.username === 'string' && entry.username.trim()) {
    return entry.username.trim();
  }
  return entry && entry.username ? entry.username : 'Jogador';
}

function computeMonthlyPoints(stats) {
  if (!stats || typeof stats !== 'object') {
    return 0;
  }
  if (typeof stats.month !== 'string' || stats.month !== getCurrentMonthKey()) {
    return 0;
  }
  return normalizePositiveInteger(stats.correctAttempts);
}

function buildPlayerSnapshot(key, entry) {
  const normalized = ensureUserDefaults(entry);
  const data = normalized.data || {};
  if (data.shareResults === false) {
    return null;
  }
  const totals = aggregateModeStats(data.modeStats || {});
  const minutes = totals.totalTime > 0 ? totals.totalTime / 60000 : 0;
  const cpm = minutes > 0 ? totals.correctChars / minutes : 0;
  const recentStats = normalizeRecentPhraseStatsValue(data.recentPhraseStats || {});
  const recentCpm = computeRecentCpm(recentStats);
  const recentPhraseCount = Array.isArray(recentStats.entries) ? recentStats.entries.length : 0;
  const accuracy = totals.totalPhrases > 0
    ? (totals.correctPhrases / totals.totalPhrases) * 100
    : 0;
  const bestStreak = Math.max(
    normalizePositiveInteger(data.bestStreak),
    normalizePositiveInteger(data.currentStreak)
  );
  const fastCpm = recentPhraseCount > 0 && recentStats.totalTime > 0 ? recentCpm : cpm;

  return {
    key,
    username: normalized.username || key,
    displayName: parseDisplayName(normalized),
    avatar: parseAvatar(data.avatar),
    cpm,
    accuracy,
    points: normalizePositiveInteger(data.points),
    diamantes: totals.diamantes,
    bestStreak,
    currentStreak: normalizePositiveInteger(data.currentStreak),
    monthlyPoints: computeMonthlyPoints(data.monthlyStats),
    totalPhrases: totals.totalPhrases,
    correctPhrases: totals.correctPhrases,
    totalTime: totals.totalTime,
    correctChars: totals.correctChars,
    fastCpm,
    recentPhraseCount,
    recentPhraseWindow: RECENT_PHRASE_LIMIT
  };
}

function sortEntries(entries, fields) {
  return [...entries].sort((a, b) => {
    for (const field of fields) {
      const direction = field.direction === 'asc' ? 1 : -1;
      const aValue = normalizeNumber(a[field.key]);
      const bValue = normalizeNumber(b[field.key]);
      if (aValue === bValue) {
        continue;
      }
      return aValue > bValue ? direction : -direction;
    }
    const nameCompare = String(a.displayName || a.username || '')
      .localeCompare(String(b.displayName || b.username || ''), 'pt-BR', { sensitivity: 'base' });
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return String(a.key || '').localeCompare(String(b.key || ''));
  });
}

function limitEntries(entries) {
  return entries.slice(0, MAX_RANKING_ENTRIES);
}

function computeRankings(users = {}) {
  const snapshots = [];
  Object.entries(users).forEach(([key, entry]) => {
    const snapshot = buildPlayerSnapshot(key, entry);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  });

  const fast = limitEntries(sortEntries(snapshots, [
    { key: 'fastCpm', direction: 'desc' },
    { key: 'recentPhraseCount', direction: 'desc' },
    { key: 'accuracy', direction: 'desc' },
    { key: 'diamantes', direction: 'desc' },
    { key: 'points', direction: 'desc' }
  ]));

  const points = limitEntries(sortEntries(snapshots, [
    { key: 'points', direction: 'desc' },
    { key: 'cpm', direction: 'desc' },
    { key: 'accuracy', direction: 'desc' }
  ]));

  const diamonds = limitEntries(sortEntries(snapshots, [
    { key: 'diamantes', direction: 'desc' },
    { key: 'points', direction: 'desc' },
    { key: 'cpm', direction: 'desc' }
  ]));

  const streak = limitEntries(sortEntries(snapshots, [
    { key: 'bestStreak', direction: 'desc' },
    { key: 'currentStreak', direction: 'desc' },
    { key: 'points', direction: 'desc' }
  ]));

  const monthly = limitEntries(sortEntries(
    snapshots.filter(player => player.monthlyPoints > 0),
    [
      { key: 'monthlyPoints', direction: 'desc' },
      { key: 'points', direction: 'desc' },
      { key: 'cpm', direction: 'desc' }
    ]
  ));

  const legends = limitEntries(sortEntries(
    snapshots.filter(player => (
      player.cpm >= LEGEND_REQUIREMENTS.cpm &&
      player.accuracy >= LEGEND_REQUIREMENTS.accuracy &&
      player.diamantes >= LEGEND_REQUIREMENTS.diamonds
    )),
    [
      { key: 'cpm', direction: 'desc' },
      { key: 'diamantes', direction: 'desc' },
      { key: 'accuracy', direction: 'desc' },
      { key: 'points', direction: 'desc' }
    ]
  ));

  return { fast, points, diamonds, streak, monthly, legends };
}

ensureDataDirectory();

async function ensureDefaultUser() {
  try {
    const database = await readDatabase();
    const defaultUserKey = normalizeKey(DEFAULT_USER.username);

    if (!database.users[defaultUserKey]) {
      const user = ensureUserDefaults({
        username: DEFAULT_USER.username,
        password: DEFAULT_USER.password,
        data: createDefaultData()
      });

      database.users[defaultUserKey] = user;
      await writeDatabase(database);
    }
  } catch (error) {
    console.error('Erro ao garantir usuário padrão:', error);
  }
}

ensureDefaultUser();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(staticDir));

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.endsWith('.html')) {
    res.status(404).send('Página não encontrada.');
    return;
  }
  next();
});

app.get('/api/users', async (req, res) => {
  try {
    const database = await readDatabase();
    res.json({
      success: true,
      users: database.users,
      updatedAt: database.updatedAt
    });
  } catch (error) {
    console.error('Erro ao ler usuários:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar usuários.' });
  }
});

app.get('/api/rankings', async (req, res) => {
  try {
    const database = await readDatabase();
    const rankings = computeRankings(database.users || {});
    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      rankings
    });
  } catch (error) {
    console.error('Erro ao montar rankings:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar rankings.' });
  }
});

app.post('/api/users/register', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios.' });
    return;
  }

  const key = normalizeKey(username);

  try {
    const database = await readDatabase();

    if (database.users[key]) {
      res.status(409).json({ success: false, message: 'Usuário já existe.' });
      return;
    }

    const user = ensureUserDefaults({
      username: username.trim(),
      password: password,
      data: createDefaultData()
    });

    database.users[key] = user;
    await writeDatabase(database);

    res.status(201).json({
      success: true,
      user: { key, ...user }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar usuário.' });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios.' });
    return;
  }

  const key = normalizeKey(username);

  try {
    const database = await readDatabase();
    const entry = database.users[key];

    if (!entry || entry.password !== password) {
      res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
      return;
    }

    ensureUserDefaults(entry);

    res.json({
      success: true,
      user: {
        key,
        username: entry.username || username.trim(),
        password: entry.password,
        data: entry.data
      }
    });
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar usuário.' });
  }
});

app.post('/api/users/update', async (req, res) => {
  const { key, data, password, username } = req.body || {};

  if (!key) {
    res.status(400).json({ success: false, message: 'Usuário inválido.' });
    return;
  }

  try {
    const database = await readDatabase();
    const entry = database.users[key];

    if (!entry) {
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }

    if (entry.password && password && entry.password !== password) {
      res.status(403).json({ success: false, message: 'Senha incorreta.' });
      return;
    }

    if (username && typeof username === 'string') {
      entry.username = username.trim();
    }

    if (password && typeof password === 'string') {
      entry.password = password;
    }

    if (data && typeof data === 'object') {
      entry.data = { ...entry.data, ...data };
    }

    ensureUserDefaults(entry);
    await writeDatabase(database);

    res.json({
      success: true,
      user: {
        key,
        username: entry.username,
        password: entry.password,
        data: entry.data
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Serving static content from ${staticDir}`);
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
