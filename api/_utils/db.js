const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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

const DATABASE_URL = process.env.DATABASE_URL;
const PG_HOST = process.env.PGHOST;
const PG_PORT = process.env.PGPORT;
const PG_DATABASE = process.env.PGDATABASE;
const PG_USER = process.env.PGUSER;
const PG_PASSWORD = process.env.PGPASSWORD;
const PG_SSLMODE = process.env.PGSSLMODE;

const shouldUseSsl = process.env.PGSSL === 'true'
  || PG_SSLMODE === 'require'
  || (DATABASE_URL && DATABASE_URL.includes('render.com'))
  || (PG_HOST && PG_HOST.includes('render.com'));

const sslConfig = shouldUseSsl
  ? {
      rejectUnauthorized: false
    }
  : false;

const poolOptions = DATABASE_URL
  ? {
      connectionString: DATABASE_URL,
      ssl: sslConfig
    }
  : {
      host: PG_HOST,
      port: PG_PORT ? Number(PG_PORT) : undefined,
      database: PG_DATABASE,
      user: PG_USER,
      password: PG_PASSWORD,
      ssl: sslConfig
    };

console.log('DB CONFIG (runtime)', {
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  databaseUrlHost: process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).host
    : null,
  pgHost: process.env.PGHOST || null,
  pgDatabase: process.env.PGDATABASE || null,
  pgUser: process.env.PGUSER || null,
  ssl: Boolean(poolOptions.ssl)
});


if (!DATABASE_URL && !(PG_HOST && PG_DATABASE && PG_USER)) {
  throw new Error(
    'PostgreSQL não configurado. Defina DATABASE_URL ou PGHOST/PGDATABASE/PGUSER (+ PGPASSWORD).'
  );
}

const poolOptions = DATABASE_URL
  ? { connectionString: DATABASE_URL, ssl: sslConfig }
  : { host: PG_HOST, port: PG_PORT ? Number(PG_PORT) : undefined, database: PG_DATABASE, user: PG_USER, password: PG_PASSWORD, ssl: sslConfig };

console.log('DB RUNTIME ID', {
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  databaseUrlHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : null,
  pgHost: process.env.PGHOST || null,
  pgDatabase: process.env.PGDATABASE || null,
  pgUser: process.env.PGUSER || null
});

const pool = new Pool(poolOptions);
const AUTH_SCHEMA_PATH = path.join(__dirname, '..', '..', 'sql', 'auth_schema.sql');
let schemaReadyPromise = null;

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

async function query(text, params) {
  return pool.query(text, params);
}

async function ensureAuthSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const schemaSql = await fs.promises.readFile(AUTH_SCHEMA_PATH, 'utf8');
      await query(schemaSql);
    })().catch(error => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

async function getUserByKey(key) {
  const result = await query(
    `SELECT username_key, username, password_hash, data, created_at, updated_at
     FROM public.users
     WHERE username_key = $1`,
    [key]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const user = ensureUserDefaults({
    key: row.username_key,
    username: row.username,
    passwordHash: row.password_hash,
    data: row.data || {}
  });

  return {
    ...user,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createUser({ key, username, passwordHash, data }) {
  const normalized = ensureUserDefaults({
    key,
    username,
    passwordHash,
    data: data || createDefaultData()
  });

  const result = await query(
    `INSERT INTO public.users (username_key, username, password_hash, data)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING username_key, username, password_hash, data, created_at, updated_at`,
    [normalized.key, normalized.username, normalized.passwordHash, JSON.stringify(normalized.data)]
  );

  const row = result.rows[0];

  return {
    key: row.username_key,
    username: row.username,
    passwordHash: row.password_hash,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function updateUser({ key, username, passwordHash, data }) {
  const fields = [];
  const values = [];

  if (typeof username === 'string' && username.trim()) {
    fields.push(`username = $${fields.length + 1}`);
    values.push(username.trim());
  }

  if (typeof passwordHash === 'string' && passwordHash) {
    fields.push(`password_hash = $${fields.length + 1}`);
    values.push(passwordHash);
  }

  if (data && typeof data === 'object') {
    fields.push(`data = $${fields.length + 1}::jsonb`);
    values.push(JSON.stringify(data));
  }

  if (fields.length === 0) {
    return getUserByKey(key);
  }

  values.push(key);

  const result = await query(
    `UPDATE public.users
     SET ${fields.join(', ')}
     WHERE username_key = $${values.length}
     RETURNING username_key, username, password_hash, data, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    key: row.username_key,
    username: row.username,
    passwordHash: row.password_hash,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  PROGRESS_SCHEMA,
  normalizeKey,
  createDefaultData,
  ensureUserDefaults,
  query,
  ensureAuthSchema,
  getUserByKey,
  createUser,
  updateUser
};
