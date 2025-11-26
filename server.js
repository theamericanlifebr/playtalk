const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DATA_ROOT = process.env.PLAYTALK_DATA_DIR
  ? path.resolve(process.env.PLAYTALK_DATA_DIR)
  : DEFAULT_DATA_DIR;
const USERS_DB_PATH = process.env.PLAYTALK_USERS_DB
  ? path.resolve(process.env.PLAYTALK_USERS_DB)
  : path.join(DATA_ROOT, 'users.json');
const DATA_DIR = path.dirname(USERS_DB_PATH);

const DEFAULT_USER = {
  username: 'PlayTalk',
  password: 'tatatata',
  email: '',
  emailVerified: false,
  emailVerifiedAt: null,
  emailVerificationCode: null,
  emailVerificationExpiresAt: null,
  emailVerificationAttempts: 0,
  emailVerificationLastSentAt: null
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
      retryWrongPhrases: false,
      headerGradientStart: '#1a66cc',
      headerGradientEnd: '#357de0',
      headerGradientEnabled: true,
      phraseColor: '',
      lensColor: ''
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
const DEFAULT_VERIFICATION_EXPIRATION_MINUTES = 10;
const DEFAULT_VERIFICATION_CODE_LENGTH = 6;
const DEFAULT_VERIFICATION_RESEND_INTERVAL_SECONDS = 60;
const DEFAULT_VERIFICATION_MAX_ATTEMPTS = 5;
const RESEND_API_KEY = process.env.PLAYTALK_RESEND_API_KEY || '';
const RESEND_API_URL = process.env.PLAYTALK_RESEND_API_URL || 'https://api.resend.com/emails';
const RESEND_EMAIL_FROM = process.env.PLAYTALK_EMAIL_FROM || 'PlayTalk <onboarding@resend.dev>';
const GENERAL_MODE_KEYS = ['2', '3', '4', '5', '6'];
const MAX_RANKING_ENTRIES = 30;
const LEGEND_REQUIREMENTS = { cps: 3.5, accuracy: 80, diamonds: 10 };
const RECENT_PHRASE_LIMIT = 500;
const BOT_PROFILES = [
  { key: 'maya', name: 'Maya', avatar: 'users/maya.png' },
  { key: 'jimmy', name: 'Jimmy', avatar: 'users/jimmy.png' },
  { key: 'bella', name: 'Bella', avatar: 'users/bella.png' },
  { key: 'charlotte', name: 'Charlotte', avatar: 'users/charlotte.png' },
  { key: 'willy', name: 'Willy', avatar: 'users/willy.png' },
  { key: 'bit', name: 'Bit', avatar: 'users/bit.png' },
  { key: 'kim', name: 'Kim', avatar: 'users/kim.png' },
  { key: 'pablo', name: 'Pablo', avatar: 'users/pablo.png' },
  { key: 'tim', name: 'Tim', avatar: 'users/tim.png' },
  { key: 'theuser', name: 'TheUser', avatar: 'users/theuser.png' },
  { key: 'luna', name: 'Luna', avatar: DEFAULT_AVATAR_URL },
  { key: 'nova', name: 'Nova', avatar: DEFAULT_AVATAR_URL }
];

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
  if (!('email' in user)) {
    user.email = '';
  } else if (typeof user.email === 'string') {
    user.email = user.email.trim();
  }
  if (typeof user.emailVerified !== 'boolean') {
    user.emailVerified = Boolean(user.emailVerified);
  }
  if (user.emailVerified) {
    user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString();
  } else {
    user.emailVerifiedAt = null;
  }

  if (!('emailVerificationCode' in user)) {
    user.emailVerificationCode = null;
  }
  if (!('emailVerificationExpiresAt' in user)) {
    user.emailVerificationExpiresAt = null;
  }
  if (!('emailVerificationAttempts' in user)) {
    user.emailVerificationAttempts = 0;
  } else {
    user.emailVerificationAttempts = normalizePositiveInteger(user.emailVerificationAttempts);
  }
  if (!('emailVerificationLastSentAt' in user)) {
    user.emailVerificationLastSentAt = null;
  }

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

function buildModeSnapshot(modeKey, stats = {}) {
  const totalPhrases = normalizePositiveInteger(stats.totalPhrases);
  const correctPhrases = normalizePositiveInteger(stats.correct);
  const totalChars = normalizePositiveInteger(stats.totalChars);
  const correctChars = normalizePositiveInteger(stats.correctChars);
  const totalTime = normalizePositiveInteger(stats.totalTime);
  const seconds = totalTime > 0 ? totalTime / 1000 : 0;
  const cps = seconds > 0 ? correctChars / seconds : 0;
  const accuracy = totalPhrases > 0 ? (correctPhrases / totalPhrases) * 100 : 0;

  return {
    mode: modeKey,
    totalPhrases,
    correctPhrases,
    totalChars,
    correctChars,
    totalTime,
    cps,
    accuracy,
    bestStreak: normalizePositiveInteger(stats.bestStreak),
    currentStreak: normalizePositiveInteger(stats.currentStreak),
    points: Math.max(correctPhrases, normalizePositiveInteger(stats.points))
  };
}

function createVerificationCode(length = DEFAULT_VERIFICATION_CODE_LENGTH) {
  const digits = '0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    result += digits[randomIndex];
  }
  return result;
}

function computeVerificationExpiry(minutes = DEFAULT_VERIFICATION_EXPIRATION_MINUTES) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt.toISOString();
}

function parseDate(dateString) {
  const timestamp = Date.parse(dateString);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function canSendNewVerification(user) {
  if (!user.emailVerificationLastSentAt) {
    return true;
  }

  const lastSent = parseDate(user.emailVerificationLastSentAt);
  if (!lastSent) {
    return true;
  }

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastSent.getTime()) / 1000);
  return elapsedSeconds >= DEFAULT_VERIFICATION_RESEND_INTERVAL_SECONDS;
}

async function sendVerificationEmail(to, code) {
  if (!RESEND_API_KEY) {
    throw new Error('PLAYTALK_RESEND_API_KEY não configurada.');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: RESEND_EMAIL_FROM,
      to: [to],
      subject: 'Código de verificação PlayTalk',
      html: `<p>Seu código de verificação é <strong>${code}</strong>.</p><p>Ele expira em ${DEFAULT_VERIFICATION_EXPIRATION_MINUTES} minutos.</p>`
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao enviar e-mail: ${response.status} - ${text}`);
  }
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

function computeRecentCps(stats) {
  if (!stats || !stats.totalChars || !stats.totalTime) {
    return 0;
  }
  const seconds = stats.totalTime / 1000;
  return seconds > 0 ? stats.totalChars / seconds : 0;
}

function seedFromString(value) {
  return Array.from(String(value)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomInRange(seed, min, max) {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  return Math.floor(seededRandom(seed) * (safeMax - safeMin + 1)) + safeMin;
}

function createBotSnapshot(profile, index = 0) {
  if (!profile || !profile.name) {
    return null;
  }
  const baseSeed = seedFromString(profile.key || profile.name) + index;
  const totalPhrases = randomInRange(baseSeed, 200, 500);
  const accuracy = randomInRange(baseSeed + 1, 65, 98);
  const correctPhrases = Math.min(totalPhrases, Math.max(1, Math.round(totalPhrases * (accuracy / 100))));
  const avgChars = randomInRange(baseSeed + 2, 14, 26);
  const correctChars = correctPhrases * avgChars;
  const secondsPerPhrase = randomInRange(baseSeed + 3, 3, 6);
  const totalTime = Math.max(1, totalPhrases * secondsPerPhrase * 1000);
  const cps = correctChars / (totalTime / 1000);
  const fastCps = cps * 1.05;
  const diamantes = randomInRange(baseSeed + 4, 5, 40);
  const points = correctPhrases * randomInRange(baseSeed + 5, 2, 6);
  const bestStreak = randomInRange(baseSeed + 6, 8, 32);
  const currentStreak = Math.min(bestStreak, randomInRange(baseSeed + 7, 3, bestStreak));
  const monthlyPoints = Math.round(points * 0.4);
  const level = randomInRange(baseSeed + 8, 3, 22);
  const recentPhraseCount = randomInRange(baseSeed + 9, 12, 48);

  return {
    key: `bot-${profile.key || profile.name}`,
    username: profile.name,
    displayName: profile.name,
    avatar: profile.avatar || DEFAULT_AVATAR_URL,
    cps,
    accuracy,
    points,
    diamantes,
    bestStreak,
    currentStreak,
    monthlyPoints,
    totalPhrases,
    correctPhrases,
    totalTime,
    correctChars,
    fastCps,
    recentPhraseCount,
    level,
    modes: {}
  };
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
  const seconds = totals.totalTime > 0 ? totals.totalTime / 1000 : 0;
  const cps = seconds > 0 ? totals.correctChars / seconds : 0;
  const recentStats = normalizeRecentPhraseStatsValue(data.recentPhraseStats || {});
  const recentCps = computeRecentCps(recentStats);
  const recentPhraseCount = Array.isArray(recentStats.entries) ? recentStats.entries.length : 0;
  const accuracy = totals.totalPhrases > 0
    ? (totals.correctPhrases / totals.totalPhrases) * 100
    : 0;
  const bestStreak = Math.max(
    normalizePositiveInteger(data.bestStreak),
    normalizePositiveInteger(data.currentStreak)
  );
  const fastCps = recentPhraseCount > 0 && recentStats.totalTime > 0 ? recentCps : cps;

  const totalPoints = Math.max(
    normalizePositiveInteger(data.points),
    totals.correctPhrases
  );

  const level = normalizePositiveInteger(
    data.generalProgress && data.generalProgress.level
  ) || normalizePositiveInteger(data.pastaAtual) || 1;

  const modeBreakdown = {};
  Object.entries(data.modeStats || {}).forEach(([modeKey, stats]) => {
    modeBreakdown[modeKey] = buildModeSnapshot(modeKey, stats || {});
  });

  return {
    key,
    username: normalized.username || key,
    displayName: parseDisplayName(normalized),
    avatar: parseAvatar(data.avatar),
    cps,
    accuracy,
    points: totalPoints,
    diamantes: totals.diamantes,
    bestStreak,
    currentStreak: normalizePositiveInteger(data.currentStreak),
    monthlyPoints: computeMonthlyPoints(data.monthlyStats),
    totalPhrases: totals.totalPhrases,
    correctPhrases: totals.correctPhrases,
    totalTime: totals.totalTime,
    correctChars: totals.correctChars,
    fastCps,
    recentPhraseCount,
    recentPhraseWindow: RECENT_PHRASE_LIMIT,
    level,
    modes: modeBreakdown
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

  BOT_PROFILES.forEach((profile, index) => {
    const botSnapshot = createBotSnapshot(profile, index);
    if (botSnapshot) {
      snapshots.push(botSnapshot);
    }
  });

  const fast = limitEntries(sortEntries(snapshots, [
    { key: 'cps', direction: 'desc' },
    { key: 'fastCps', direction: 'desc' },
    { key: 'recentPhraseCount', direction: 'desc' },
    { key: 'accuracy', direction: 'desc' },
    { key: 'diamantes', direction: 'desc' },
    { key: 'points', direction: 'desc' }
  ]));

  const points = limitEntries(sortEntries(snapshots, [
    { key: 'points', direction: 'desc' },
    { key: 'cps', direction: 'desc' },
    { key: 'accuracy', direction: 'desc' }
  ]));

  const diamonds = limitEntries(sortEntries(snapshots, [
    { key: 'diamantes', direction: 'desc' },
    { key: 'points', direction: 'desc' },
    { key: 'cps', direction: 'desc' }
  ]));

  const streak = limitEntries(sortEntries(snapshots, [
    { key: 'bestStreak', direction: 'desc' },
    { key: 'currentStreak', direction: 'desc' },
    { key: 'points', direction: 'desc' }
  ]));

  const accuracyRanking = limitEntries(sortEntries(snapshots, [
    { key: 'accuracy', direction: 'desc' },
    { key: 'cps', direction: 'desc' },
    { key: 'points', direction: 'desc' }
  ]));

  const levelRanking = limitEntries(sortEntries(snapshots, [
    { key: 'level', direction: 'desc' },
    { key: 'points', direction: 'desc' },
    { key: 'accuracy', direction: 'desc' }
  ]));

  const monthly = limitEntries(sortEntries(
    snapshots.filter(player => player.monthlyPoints > 0),
    [
      { key: 'monthlyPoints', direction: 'desc' },
      { key: 'points', direction: 'desc' },
      { key: 'cps', direction: 'desc' }
    ]
  ));

  const legends = limitEntries(sortEntries(
    snapshots.filter(player => (
      player.cps >= LEGEND_REQUIREMENTS.cps &&
      player.accuracy >= LEGEND_REQUIREMENTS.accuracy &&
      player.diamantes >= LEGEND_REQUIREMENTS.diamonds
    )),
    [
      { key: 'cps', direction: 'desc' },
      { key: 'diamantes', direction: 'desc' },
      { key: 'accuracy', direction: 'desc' },
      { key: 'points', direction: 'desc' }
    ]
  ));

  return { fast, points, diamonds, streak, monthly, legends, accuracy: accuracyRanking, level: levelRanking };
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
      email: DEFAULT_USER.email,
      emailVerified: DEFAULT_USER.emailVerified,
      emailVerifiedAt: DEFAULT_USER.emailVerifiedAt,
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

app.use(express.json({ limit: '20mb' }));
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

app.post('/api/email/verification-code', async (req, res) => {
  const { key, email } = req.body || {};

  if (!key) {
    res.status(400).json({ success: false, message: 'Usuário inválido.' });
    return;
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ success: false, message: 'Informe um e-mail válido.', field: 'email' });
    return;
  }

  const normalizedEmail = email.trim();

  try {
    const database = await readDatabase();
    const entry = database.users[key];

    if (!entry) {
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }

    ensureUserDefaults(entry);

    if (!canSendNewVerification(entry)) {
      res.status(429).json({
        success: false,
        message: 'Aguarde antes de solicitar um novo código.',
        retryAfterSeconds: DEFAULT_VERIFICATION_RESEND_INTERVAL_SECONDS
      });
      return;
    }

    const code = createVerificationCode();

    entry.email = normalizedEmail;
    entry.emailVerified = false;
    entry.emailVerifiedAt = null;
    entry.emailVerificationCode = code;
    entry.emailVerificationExpiresAt = computeVerificationExpiry();
    entry.emailVerificationAttempts = 0;
    entry.emailVerificationLastSentAt = new Date().toISOString();

    await sendVerificationEmail(normalizedEmail, code);
    await writeDatabase(database);

    res.json({ success: true, message: 'Código de verificação enviado.' });
  } catch (error) {
    console.error('Erro ao enviar código de verificação:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar código de verificação.' });
  }
});

app.post('/api/email/verify', async (req, res) => {
  const { key, code } = req.body || {};

  if (!key || !code) {
    res.status(400).json({ success: false, message: 'Usuário e código são obrigatórios.' });
    return;
  }

  try {
    const database = await readDatabase();
    const entry = database.users[key];

    if (!entry) {
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }

    ensureUserDefaults(entry);

    if (!entry.emailVerificationCode || !entry.emailVerificationExpiresAt) {
      res.status(400).json({ success: false, message: 'Nenhum código ativo. Solicite um novo envio.' });
      return;
    }

    const expiryDate = parseDate(entry.emailVerificationExpiresAt);
    if (!expiryDate || expiryDate.getTime() < Date.now()) {
      entry.emailVerificationCode = null;
      entry.emailVerificationExpiresAt = null;
      await writeDatabase(database);
      res.status(400).json({ success: false, message: 'Código expirado. Solicite um novo envio.' });
      return;
    }

    if (entry.emailVerificationAttempts >= DEFAULT_VERIFICATION_MAX_ATTEMPTS) {
      entry.emailVerificationCode = null;
      entry.emailVerificationExpiresAt = null;
      await writeDatabase(database);
      res.status(429).json({ success: false, message: 'Muitas tentativas. Solicite um novo código.' });
      return;
    }

    if (String(code).trim() !== String(entry.emailVerificationCode)) {
      entry.emailVerificationAttempts += 1;
      await writeDatabase(database);
      res.status(400).json({ success: false, message: 'Código inválido.' });
      return;
    }

    entry.emailVerified = true;
    entry.emailVerifiedAt = new Date().toISOString();
    entry.emailVerificationCode = null;
    entry.emailVerificationExpiresAt = null;
    entry.emailVerificationAttempts = 0;
    entry.emailVerificationLastSentAt = null;

    await writeDatabase(database);

    res.json({
      success: true,
      message: 'E-mail verificado com sucesso.',
      emailVerifiedAt: entry.emailVerifiedAt
    });
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    res.status(500).json({ success: false, message: 'Erro ao verificar código.' });
  }
});

app.post('/api/users/register', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username) {
    res.status(400).json({ success: false, message: 'Informe um nome de usuário.', field: 'username' });
    return;
  }
  if (!password) {
    res.status(400).json({ success: false, message: 'Informe uma senha.', field: 'password' });
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
      password,
      email: '',
      emailVerified: false,
      emailVerifiedAt: null,
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
        email: entry.email || '',
        emailVerified: Boolean(entry.emailVerified),
        emailVerifiedAt: entry.emailVerifiedAt || null,
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
        email: entry.email || '',
        emailVerified: Boolean(entry.emailVerified),
        emailVerifiedAt: entry.emailVerifiedAt || null,
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
