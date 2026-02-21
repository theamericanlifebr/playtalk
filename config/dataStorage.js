const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const CUSTOM_DATA_DIR = process.env.PLAYTALK_DATA_DIR && process.env.PLAYTALK_DATA_DIR.trim();
const CUSTOM_DATA_FILE = process.env.PLAYTALK_DATA_FILE && process.env.PLAYTALK_DATA_FILE.trim();
const RUNTIME_DATA_DIR = path.join(APP_ROOT, 'runtime-data');
const SEED_DATA_FILE = (() => {
  const candidates = [
    path.join(APP_ROOT, 'www', 'data', 'users.json'),
    path.join(APP_ROOT, 'data', 'users.json')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
})();

const DATA_DIR = CUSTOM_DATA_FILE
  ? path.dirname(path.resolve(CUSTOM_DATA_FILE))
  : CUSTOM_DATA_DIR
    ? path.resolve(CUSTOM_DATA_DIR)
    : RUNTIME_DATA_DIR;

const USERS_DB_PATH = CUSTOM_DATA_FILE
  ? path.resolve(CUSTOM_DATA_FILE)
  : path.join(DATA_DIR, 'users.json');

function createEmptyPayload() {
  return { users: {}, updatedAt: new Date().toISOString() };
}

function loadSeedPayload() {
  if (fs.existsSync(SEED_DATA_FILE)) {
    try {
      const raw = fs.readFileSync(SEED_DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed.users || typeof parsed.users !== 'object') {
        parsed.users = {};
      }
      if (!parsed.updatedAt) {
        parsed.updatedAt = new Date().toISOString();
      }
      return parsed;
    } catch (error) {
      console.warn('[dataStorage] Falha ao ler arquivo seed:', error);
    }
  }
  return createEmptyPayload();
}

function ensureDataDirectorySync() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureDatabaseFileSync() {
  ensureDataDirectorySync();
  if (!fs.existsSync(USERS_DB_PATH)) {
    const payload = loadSeedPayload();
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(payload, null, 2));
  }
}

async function ensureDatabaseFile() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.promises.access(USERS_DB_PATH, fs.constants.F_OK);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    const payload = loadSeedPayload();
    await fs.promises.writeFile(USERS_DB_PATH, JSON.stringify(payload, null, 2));
  }
}

module.exports = {
  DATA_DIR,
  USERS_DB_PATH,
  ensureDatabaseFileSync,
  ensureDatabaseFile,
  loadSeedPayload,
  createEmptyPayload
};
