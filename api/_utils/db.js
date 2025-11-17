const fs = require('fs');
const path = require('path');

const fsPromises = fs.promises;

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DATA_ROOT = process.env.PLAYTALK_DATA_DIR
  ? path.resolve(process.env.PLAYTALK_DATA_DIR)
  : DEFAULT_DATA_DIR;
const USERS_DB_PATH = process.env.PLAYTALK_USERS_DB
  ? path.resolve(process.env.PLAYTALK_USERS_DB)
  : path.join(DATA_ROOT, 'users.json');
const DATA_DIR = path.dirname(USERS_DB_PATH);

const PROGRESS_SCHEMA = {
  acertosTotais: { type: 'number', default: 0 },
  errosTotais: { type: 'number', default: 0 },
  tentativasTotais: { type: 'number', default: 0 },
  points: { type: 'number', default: 0 },
  displayName: { type: 'string', default: '' },
  modeStats: { type: 'json', default: {} },
  completedModes: { type: 'json', default: {} },
  unlockedModes: { type: 'json', default: {} },
  modeIntroShown: { type: 'json', default: {} },
  generalProgress: { type: 'json', default: { level: 1, xp: 0 } },
  modeProgress: { type: 'json', default: {} },
  tutorialDone: { type: 'boolean', default: false },
  ilifeDone: { type: 'boolean', default: false },
  levelDetails: { type: 'json', default: [] },
  totalTime: { type: 'number', default: 0 },
  shareResults: { type: 'boolean', default: false },
  avatar: { type: 'string', default: '' },
  recentPhraseStats: {
    type: 'json',
    default: { entries: [], totalChars: 0, totalTime: 0 }
  }
};

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

async function ensureDataDirectory() {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
}

async function readDatabase() {
  await ensureDataDirectory();
  try {
    const raw = await fsPromises.readFile(USERS_DB_PATH, 'utf8');
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
  await ensureDataDirectory();
  const payload = {
    users: data.users || {},
    updatedAt: new Date().toISOString()
  };
  await fsPromises.writeFile(USERS_DB_PATH, JSON.stringify(payload, null, 2));
  return payload;
}

module.exports = {
  DATA_DIR,
  USERS_DB_PATH,
  PROGRESS_SCHEMA,
  normalizeKey,
  createDefaultData,
  ensureUserDefaults,
  readDatabase,
  writeDatabase
};
