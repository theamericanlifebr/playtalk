const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const USERS_DB_PATH = path.join(DATA_DIR, 'users.json');

const PROGRESS_SCHEMA = {
  acertosTotais: { type: 'number', default: 0 },
  errosTotais: { type: 'number', default: 0 },
  tentativasTotais: { type: 'number', default: 0 },
  points: { type: 'number', default: 0 },
  modeStats: { type: 'json', default: {} },
  completedModes: { type: 'json', default: {} },
  unlockedModes: { type: 'json', default: {} },
  modeIntroShown: { type: 'json', default: {} },
  pastaAtual: { type: 'number', default: 1 },
  tutorialDone: { type: 'boolean', default: false },
  ilifeDone: { type: 'boolean', default: false },
  levelDetails: { type: 'json', default: [] },
  totalTime: { type: 'number', default: 0 }
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

ensureDataDirectory();

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
