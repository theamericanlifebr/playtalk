const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const USERS_DB_PATH = path.join(DATA_DIR, 'users.json');

const SESSION_COOKIE = 'playtalk_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias
const sessions = new Map();

const DEFAULT_USER = {
  username: 'PlayTalk',
  password: 'tatatata'
};

const MEDAL_ORDER = ['diamante', 'ouro', 'prata', 'bronze', 'chumbo', 'gesso'];
const MEDAL_WEIGHTS = {
  diamante: 12,
  ouro: 8,
  prata: 4,
  bronze: 2,
  chumbo: 1,
  gesso: 0
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
  pastaAtual: { type: 'number', default: 1 },
  tutorialDone: { type: 'boolean', default: false },
  ilifeDone: { type: 'boolean', default: false },
  levelDetails: { type: 'json', default: [] },
  totalTime: { type: 'number', default: 0 },
  shareResults: { type: 'boolean', default: false },
  avatar: { type: 'string', default: '' },
  generalProgress: { type: 'json', default: { level: 1, xp: 0 } },
  modeProgress: { type: 'json', default: {} },
  medalLog: { type: 'json', default: [] },
  bestCpm: { type: 'number', default: 0 },
  bestSequentialCorrect: { type: 'number', default: 0 },
  currentSequentialCorrect: { type: 'number', default: 0 },
  monthlyAccuracy: { type: 'json', default: {} }
};

function generateSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function parseCookies(req) {
  const header = req.headers && req.headers.cookie;
  if (!header) {
    return {};
  }
  return header.split(';').reduce((acc, entry) => {
    const [name, ...rest] = entry.split('=');
    if (!name) {
      return acc;
    }
    const key = name.trim();
    const value = rest.join('=').trim();
    acc[key] = decodeURIComponent(value || '');
    return acc;
  }, {});
}

function getSession(sessionId) {
  if (!sessionId) {
    return null;
  }
  const entry = sessions.get(sessionId);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return entry;
}

function touchSession(sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) {
    return;
  }
  entry.expiresAt = Date.now() + SESSION_TTL_MS;
}

function issueSession(res, userKey) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, { key: userKey, expiresAt: Date.now() + SESSION_TTL_MS });
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/'
  });
  return sessionId;
}

function clearSession(res, sessionId) {
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.cookie(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
}

function sanitizeUserResponse(key, entry) {
  if (!entry) {
    return null;
  }
  return {
    key,
    username: entry.username,
    data: entry.data
  };
}

function clampNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function mergeFlagEntries(current, incoming) {
  const base = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current }
    : {};
  if (!incoming || typeof incoming !== 'object') {
    return base;
  }
  for (const [key, value] of Object.entries(incoming)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      base[key] = mergeFlagEntries(base[key], value);
    } else if (typeof value === 'boolean') {
      base[key] = Boolean(value) || Boolean(base[key]);
    } else if (value !== undefined) {
      base[key] = value;
    }
  }
  return base;
}

function mergeStatObject(current, incoming) {
  const base = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current }
    : {};
  if (!incoming || typeof incoming !== 'object') {
    return base;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === 'number') {
      const currentNumber = Number.isFinite(merged[key]) ? Number(merged[key]) : 0;
      merged[key] = Math.max(currentNumber, Number(value));
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeStatObject(merged[key], value);
    } else if (Array.isArray(value)) {
      merged[key] = value.slice();
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function mergeModeStats(current, incoming) {
  const base = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current }
    : {};
  if (!incoming || typeof incoming !== 'object') {
    return base;
  }
  const merged = { ...base };
  for (const [mode, stats] of Object.entries(incoming)) {
    merged[mode] = mergeStatObject(merged[mode], stats);
  }
  return merged;
}

function mergeModeProgress(current, incoming) {
  const base = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current }
    : {};
  if (!incoming || typeof incoming !== 'object') {
    return base;
  }
  const merged = { ...base };
  for (const [modeKey, value] of Object.entries(incoming)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    const existing = merged[modeKey] && typeof merged[modeKey] === 'object'
      ? { ...merged[modeKey] }
      : {};
    const currentLevel = Number.isFinite(existing.level) ? Math.max(1, Math.floor(existing.level)) : 0;
    const currentXp = Number.isFinite(existing.xp) ? Math.max(0, Math.floor(existing.xp)) : 0;
    const incomingLevel = Number.isFinite(value.level) ? Math.max(1, Math.floor(value.level)) : null;
    const incomingXp = Number.isFinite(value.xp) ? Math.max(0, Math.floor(value.xp)) : null;
    if (incomingLevel !== null) {
      if (incomingLevel > currentLevel) {
        existing.level = incomingLevel;
        existing.xp = incomingXp !== null ? incomingXp : 0;
      } else if (incomingLevel === currentLevel) {
        if (incomingXp !== null) {
          existing.xp = Math.max(currentXp, incomingXp);
        }
        if (!existing.level) {
          existing.level = incomingLevel;
        }
      }
    } else if (incomingXp !== null) {
      existing.xp = Math.max(currentXp, incomingXp);
    }
    if (incomingLevel === null && currentLevel) {
      existing.level = currentLevel;
    }
    if (!existing.level && incomingLevel !== null) {
      existing.level = incomingLevel;
    }
    if (!existing.level) {
      existing.level = Math.max(1, incomingLevel || currentLevel || 1);
    }
    if (!Number.isFinite(existing.xp)) {
      existing.xp = incomingXp !== null ? incomingXp : currentXp;
    }
    merged[modeKey] = existing;
  }
  return merged;
}

function mergeMonthlyAccuracy(current, incoming) {
  const base = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current }
    : {};
  if (!incoming || typeof incoming !== 'object') {
    return base;
  }
  const merged = { ...base };
  for (const [month, value] of Object.entries(incoming)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    const currentEntry = merged[month] && typeof merged[month] === 'object'
      ? { ...merged[month] }
      : { correct: 0, total: 0 };
    const nextCorrect = clampNumber(value.correct, 0);
    const nextTotal = clampNumber(value.total, 0);
    currentEntry.correct = Math.max(clampNumber(currentEntry.correct, 0), nextCorrect);
    currentEntry.total = Math.max(clampNumber(currentEntry.total, 0), nextTotal);
    merged[month] = currentEntry;
  }
  return merged;
}

function mergeMedalLog(current, incoming) {
  const combined = [];
  if (Array.isArray(current)) {
    combined.push(...current);
  }
  if (Array.isArray(incoming)) {
    combined.push(...incoming);
  }
  return sanitizeMedalLog(combined);
}

function mergeLevelDetails(current, incoming) {
  const existing = Array.isArray(current) ? current.slice() : [];
  const next = Array.isArray(incoming) ? incoming : [];
  if (!next.length) {
    return existing;
  }
  if (!existing.length) {
    return next.slice();
  }
  const seen = new Set(existing.map((item) => {
    try {
      return JSON.stringify(item);
    } catch (err) {
      return null;
    }
  }).filter(Boolean));
  next.forEach((item) => {
    let key;
    try {
      key = JSON.stringify(item);
    } catch (err) {
      key = null;
    }
    if (!key || !seen.has(key)) {
      existing.push(item);
      if (key) {
        seen.add(key);
      }
    }
  });
  return existing;
}

function mergeGeneralProgress(current, incoming) {
  const baseLevel = Number.isFinite(current && current.level) ? Math.max(1, Math.floor(current.level)) : 1;
  const baseXp = Number.isFinite(current && current.xp) ? Math.max(0, Math.floor(current.xp)) : 0;
  const merged = { level: baseLevel, xp: baseXp };
  if (!incoming || typeof incoming !== 'object') {
    return merged;
  }
  const nextLevel = Number.isFinite(incoming.level) ? Math.max(1, Math.floor(incoming.level)) : null;
  const nextXp = Number.isFinite(incoming.xp) ? Math.max(0, Math.floor(incoming.xp)) : null;
  if (nextLevel !== null) {
    if (nextLevel > merged.level) {
      merged.level = nextLevel;
      merged.xp = nextXp !== null ? nextXp : 0;
    } else if (nextLevel === merged.level && nextXp !== null) {
      merged.xp = Math.max(merged.xp, nextXp);
    } else if (nextLevel < merged.level && nextXp !== null && merged.xp === 0) {
      merged.xp = nextXp;
    }
  } else if (nextXp !== null) {
    merged.xp = Math.max(merged.xp, nextXp);
  }
  return merged;
}

function mergeProgressData(existingData, incomingData) {
  const current = existingData && typeof existingData === 'object' ? { ...existingData } : {};
  const incoming = incomingData && typeof incomingData === 'object' ? incomingData : {};

  const merged = { ...current };

  if (incoming.acertosTotais !== undefined) {
    merged.acertosTotais = Math.max(clampNumber(current.acertosTotais, 0), clampNumber(incoming.acertosTotais, 0));
  }
  if (incoming.errosTotais !== undefined) {
    merged.errosTotais = Math.max(clampNumber(current.errosTotais, 0), clampNumber(incoming.errosTotais, 0));
  }
  if (incoming.tentativasTotais !== undefined) {
    merged.tentativasTotais = Math.max(clampNumber(current.tentativasTotais, 0), clampNumber(incoming.tentativasTotais, 0));
  }
  if (incoming.points !== undefined) {
    merged.points = Math.max(clampNumber(current.points, 0), clampNumber(incoming.points, 0));
  }
  if (incoming.playerBalance !== undefined) {
    merged.playerBalance = clampNumber(incoming.playerBalance, 0);
  }
  if (incoming.displayName !== undefined) {
    merged.displayName = typeof incoming.displayName === 'string' ? incoming.displayName : current.displayName;
  }
  if (incoming.modeStats !== undefined) {
    merged.modeStats = mergeModeStats(current.modeStats, incoming.modeStats);
  }
  if (incoming.completedModes !== undefined) {
    merged.completedModes = mergeFlagEntries(current.completedModes, incoming.completedModes);
  }
  if (incoming.unlockedModes !== undefined) {
    merged.unlockedModes = mergeFlagEntries(current.unlockedModes, incoming.unlockedModes);
  }
  if (incoming.modeIntroShown !== undefined) {
    merged.modeIntroShown = mergeFlagEntries(current.modeIntroShown, incoming.modeIntroShown);
  }
  if (incoming.pastaAtual !== undefined) {
    merged.pastaAtual = Math.max(clampNumber(current.pastaAtual, 1), clampNumber(incoming.pastaAtual, 1));
  }
  if (incoming.tutorialDone !== undefined) {
    merged.tutorialDone = Boolean(incoming.tutorialDone);
  }
  if (incoming.ilifeDone !== undefined) {
    merged.ilifeDone = Boolean(incoming.ilifeDone);
  }
  if (incoming.levelDetails !== undefined) {
    merged.levelDetails = mergeLevelDetails(current.levelDetails, incoming.levelDetails);
  }
  if (incoming.totalTime !== undefined) {
    merged.totalTime = Math.max(clampNumber(current.totalTime, 0), clampNumber(incoming.totalTime, 0));
  }
  if (incoming.shareResults !== undefined) {
    merged.shareResults = Boolean(incoming.shareResults);
  }
  if (incoming.avatar !== undefined) {
    merged.avatar = typeof incoming.avatar === 'string' ? incoming.avatar : current.avatar;
  }
  if (incoming.generalProgress !== undefined) {
    merged.generalProgress = mergeGeneralProgress(current.generalProgress, incoming.generalProgress);
  }
  if (incoming.modeProgress !== undefined) {
    merged.modeProgress = mergeModeProgress(current.modeProgress, incoming.modeProgress);
  }
  if (incoming.medalLog !== undefined) {
    merged.medalLog = mergeMedalLog(current.medalLog, incoming.medalLog);
  }
  if (incoming.bestCpm !== undefined) {
    merged.bestCpm = Math.max(clampNumber(current.bestCpm, 0), clampNumber(incoming.bestCpm, 0));
  }
  if (incoming.bestSequentialCorrect !== undefined) {
    merged.bestSequentialCorrect = Math.max(
      clampNumber(current.bestSequentialCorrect, 0),
      clampNumber(incoming.bestSequentialCorrect, 0)
    );
  }
  if (incoming.currentSequentialCorrect !== undefined) {
    merged.currentSequentialCorrect = Math.max(0, clampNumber(incoming.currentSequentialCorrect, 0));
  }
  if (incoming.monthlyAccuracy !== undefined) {
    merged.monthlyAccuracy = mergeMonthlyAccuracy(current.monthlyAccuracy, incoming.monthlyAccuracy);
  }

  return merged;
}

function sanitizeMedalLog(log) {
  if (!Array.isArray(log)) {
    return [];
  }
  return log
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const medal = MEDAL_ORDER.includes(entry.medal) ? entry.medal : null;
      if (!medal) {
        return null;
      }
      return {
        medal,
        timestamp: clampNumber(entry.timestamp, Date.now()),
        mode: clampNumber(entry.mode, 0),
        accuracy: clampNumber(entry.accuracy, 0),
        correct: clampNumber(entry.correct, 0),
        total: clampNumber(entry.total, 0)
      };
    })
    .filter(Boolean)
    .slice(-500);
}

function sanitizeMonthlyAccuracy(map) {
  if (!map || typeof map !== 'object') {
    return {};
  }
  const entries = Object.entries(map)
    .filter(([key, value]) => typeof key === 'string' && value && typeof value === 'object')
    .map(([key, value]) => {
      const normalized = {
        correct: clampNumber(value.correct, 0),
        total: clampNumber(value.total, 0)
      };
      return [key, normalized];
    });
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const limited = entries.slice(-24);
  return limited.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

const MEDAL_GRADIENTS = {
  diamante: ['#7fc8ff', '#d9f3ff'],
  ouro: ['#f5b700', '#ffe680'],
  prata: ['#ced3d9', '#f8f9fb'],
  bronze: ['#a76a3a', '#f1c388'],
  chumbo: ['#6f7a82', '#9aa4ab'],
  gesso: ['#8f6b4a', '#e7d2b5']
};

function buildAuraGradient(segments) {
  if (!segments.length) {
    return '';
  }
  let cursor = 0;
  const stops = [];
  segments.forEach((segment) => {
    const colors = MEDAL_GRADIENTS[segment.medal] || ['#8ea6ff', '#cfe2ff'];
    const sweep = Math.max(0, Math.min(360, segment.ratio * 360));
    const end = cursor + sweep;
    const mid = cursor + sweep * 0.6;
    stops.push(`${colors[0]} ${cursor.toFixed(2)}deg`);
    stops.push(`${colors[1]} ${mid.toFixed(2)}deg`);
    stops.push(`${colors[0]} ${end.toFixed(2)}deg`);
    cursor = end;
  });
  stops.push('#e0edff 360deg');
  return `conic-gradient(${stops.join(', ')})`;
}

function computeAuraScore(log) {
  const entries = sanitizeMedalLog(log);
  const counts = MEDAL_ORDER.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
  entries.forEach((entry) => {
    counts[entry.medal] += 1;
  });
  const total = Object.values(counts).reduce((acc, value) => acc + value, 0);
  if (!total) {
    return { total: 0, score: 0, segments: [], gradient: '', hasAura: false };
  }
  const ranked = MEDAL_ORDER
    .map((medal) => ({ medal, count: counts[medal], weight: MEDAL_WEIGHTS[medal] }))
    .filter((item) => item.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.weight - a.weight;
    })
    .slice(0, 3);
  const subsetTotal = ranked.reduce((acc, item) => acc + item.count, 0) || 1;
  const segments = ranked.map((item) => ({
    medal: item.medal,
    ratio: item.count / subsetTotal,
    weight: item.weight
  }));
  const score = segments.reduce((acc, segment) => acc + segment.weight * segment.ratio, 0);
  const gradient = total >= 10 ? buildAuraGradient(segments) : '';
  return {
    total,
    score,
    segments,
    gradient,
    hasAura: total >= 10 && Boolean(gradient)
  };
}

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
  user.data.medalLog = sanitizeMedalLog(user.data.medalLog);
  user.data.bestCpm = clampNumber(user.data.bestCpm, 0);
  user.data.bestSequentialCorrect = Math.max(0, Math.floor(clampNumber(user.data.bestSequentialCorrect, 0)));
  user.data.currentSequentialCorrect = Math.max(0, Math.floor(clampNumber(user.data.currentSequentialCorrect, 0)));
  user.data.monthlyAccuracy = sanitizeMonthlyAccuracy(user.data.monthlyAccuracy);
  return user;
}

function extractPlayerProfile(entry) {
  const user = ensureUserDefaults({ ...entry, data: { ...entry.data } });
  const data = user.data || {};
  const displayName = (typeof data.displayName === 'string' && data.displayName.trim())
    ? data.displayName.trim()
    : (user.username || 'Jogador');
  const avatar = (typeof data.avatar === 'string' && data.avatar.trim()) ? data.avatar.trim() : '';
  const general = data.generalProgress && typeof data.generalProgress === 'object'
    ? data.generalProgress
    : { level: 1 };
  const levelValue = clampNumber(general.level || data.pastaAtual || 1, 1);
  const level = Math.max(1, Math.floor(levelValue));
  const aura = computeAuraScore(data.medalLog);
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthEntry = data.monthlyAccuracy && data.monthlyAccuracy[monthKey]
    ? data.monthlyAccuracy[monthKey]
    : { correct: 0, total: 0 };
  const monthTotal = Math.max(0, clampNumber(monthEntry.total, 0));
  const monthCorrect = Math.max(0, clampNumber(monthEntry.correct, 0));
  const monthAccuracy = monthTotal > 0
    ? Math.max(0, Math.min(1, monthCorrect / monthTotal))
    : 0;
  return {
    key: entry.key,
    username: entry.username,
    displayName,
    avatar,
    level,
    bestCpm: Math.max(0, clampNumber(data.bestCpm, 0)),
    totalPoints: Math.max(0, clampNumber(data.points, 0)),
    aura,
    monthlyAccuracy: monthAccuracy,
    monthlyStats: { correct: monthCorrect, total: monthTotal },
    bestSequential: Math.max(0, Math.floor(clampNumber(data.bestSequentialCorrect, 0)))
  };
}

function createPlaceholder(position) {
  return {
    position,
    displayName: 'Vazio',
    avatar: '',
    level: 0,
    bestCpm: 0,
    totalPoints: 0,
    aura: { hasAura: false, gradient: '', score: 0, total: 0 },
    monthlyAccuracy: 0,
    monthlyStats: { correct: 0, total: 0 },
    bestSequential: 0,
    metric: 0
  };
}

function buildRanking(players, metricSelector, options = {}) {
  const { descending = true, minMetric = null, predicate = null } = options;
  const populated = players
    .map((player) => {
      const metric = metricSelector(player);
      return { ...player, metric };
    })
    .filter((player) => {
      if (typeof predicate === 'function' && !predicate(player)) {
        return false;
      }
      if (minMetric === null) {
        return true;
      }
      return player.metric >= minMetric;
    })
    .sort((a, b) => {
      const diff = (descending ? b.metric - a.metric : a.metric - b.metric);
      if (diff !== 0) {
        return diff;
      }
      if (descending) {
        return a.displayName.localeCompare(b.displayName);
      }
      return a.displayName.localeCompare(b.displayName);
    })
    .slice(0, 20)
    .map((player, index) => ({ ...player, position: index + 1 }));

  while (populated.length < 20) {
    populated.push(createPlaceholder(populated.length + 1));
  }
  return populated;
}

function computeRankings(users) {
  const profiles = Object.entries(users || {}).map(([key, value]) => extractPlayerProfile({ key, ...value }));
  const level = buildRanking(profiles, (player) => player.level, { descending: true });
  const speed = buildRanking(profiles, (player) => player.bestCpm, { descending: true, minMetric: 0.01 });
  const points = buildRanking(profiles, (player) => player.totalPoints, { descending: true });
  const aura = buildRanking(profiles, (player) => player.aura.score, {
    descending: true,
    predicate: (player) => player.aura && player.aura.hasAura
  });
  const monthly = buildRanking(profiles, (player) => player.monthlyAccuracy, { descending: true, minMetric: 0.0001 });
  const streak = buildRanking(profiles, (player) => player.bestSequential, { descending: true });

  return {
    level,
    speed,
    points,
    aura,
    monthly,
    streak
  };
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

app.use((req, res, next) => {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE];
  const session = getSession(sessionId);
  if (session) {
    touchSession(sessionId);
    req.session = { id: sessionId, key: session.key };
  } else {
    if (sessionId) {
      clearSession(res, sessionId);
    }
    req.session = null;
  }
  next();
});

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

app.get('/api/session', async (req, res) => {
  const session = req.session;
  if (!session || !session.key) {
    res.json({ success: true, user: null });
    return;
  }

  try {
    const database = await readDatabase();
    const entry = database.users[session.key];
    if (!entry) {
      clearSession(res, session.id);
      res.json({ success: true, user: null });
      return;
    }

    ensureUserDefaults(entry);
    res.json({
      success: true,
      user: sanitizeUserResponse(session.key, entry)
    });
  } catch (error) {
    console.error('Erro ao recuperar sessão ativa:', error);
    res.status(500).json({ success: false, message: 'Erro ao recuperar sessão.' });
  }
});

app.get('/api/rankings', async (req, res) => {
  try {
    const database = await readDatabase();
    const rankings = computeRankings(database.users);
    res.json({
      success: true,
      rankings,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar rankings:', error);
    res.status(500).json({ success: false, message: 'Erro ao gerar rankings.' });
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

    issueSession(res, key);

    res.status(201).json({
      success: true,
      user: sanitizeUserResponse(key, user)
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

    issueSession(res, key);

    res.json({
      success: true,
      user: sanitizeUserResponse(key, entry)
    });
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar usuário.' });
  }
});

app.post('/api/users/update', async (req, res) => {
  const session = req.session;
  const { key: bodyKey, data, password, username } = req.body || {};

  if (!session || !session.key) {
    res.status(401).json({ success: false, message: 'Sessão inválida.' });
    return;
  }

  if (bodyKey && bodyKey !== session.key) {
    res.status(403).json({ success: false, message: 'Sessão não corresponde ao usuário informado.' });
    return;
  }

  try {
    const database = await readDatabase();
    const entry = database.users[session.key];

    if (!entry) {
      clearSession(res, session.id);
      res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }

    if (username && typeof username === 'string') {
      entry.username = username.trim();
    }

    if (password && typeof password === 'string' && password.length) {
      entry.password = password;
    }

    if (data && typeof data === 'object') {
      entry.data = mergeProgressData(entry.data, data);
    }

    ensureUserDefaults(entry);
    await writeDatabase(database);

    res.json({
      success: true,
      user: sanitizeUserResponse(session.key, entry)
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
  }
});

app.post('/api/users/logout', (req, res) => {
  const session = req.session;
  if (session && session.id) {
    clearSession(res, session.id);
  } else {
    clearSession(res);
  }
  req.session = null;
  res.json({ success: true });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Serving static content from ${staticDir}`);
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
