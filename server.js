const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const staticDir = (() => {
  const customDir = process.env.STATIC_DIR;
  if (customDir) {
    return path.resolve(__dirname, customDir);
  }

  const distPath = path.join(__dirname, 'dist');
  return fs.existsSync(distPath) ? distPath : __dirname;
})();

const USERS_DIR = path.join(__dirname, 'data', 'users');
const SESSION_COOKIE_NAME = 'session_token';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

fs.mkdirSync(USERS_DIR, { recursive: true });

/**
 * In-memory session storage. For production, replace with persistent storage.
 * @type {Map<string, { email: string, expires: number }>}
 */
const sessions = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Parse cookies from the request header.
 * @param {express.Request} req
 * @returns {Record<string, string>}
 */
function parseCookies(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    acc[name] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

/**
 * Create a PBKDF2 hash for the provided password.
 * @param {string} password
 * @param {string} [salt]
 * @returns {string}
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 310000, 32, 'sha256')
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify whether the provided password matches the stored hash.
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) {
    return false;
  }

  try {
    const testHash = hashPassword(password, salt).split(':')[1];
    const testBuffer = Buffer.from(testHash, 'hex');
    const originalBuffer = Buffer.from(originalHash, 'hex');
    if (testBuffer.length !== originalBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(testBuffer, originalBuffer);
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
}

/**
 * Convert an email address to a safe filename.
 * @param {string} email
 * @returns {string}
 */
function userFilename(email) {
  const normalized = email.trim().toLowerCase();
  const encoded = Buffer.from(normalized)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${encoded}.json`;
}

/**
 * Load a user record from disk.
 * @param {string} email
 * @returns {null | { email: string, passwordHash: string, createdAt: string, progress?: any }}
 */
function loadUser(email) {
  const filePath = path.join(USERS_DIR, userFilename(email));
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Erro ao analisar o arquivo do usuário ${email}:`, error);
    return null;
  }
}

/**
 * Save a user record to disk.
 * @param {object} user
 */
function saveUser(user) {
  const filePath = path.join(USERS_DIR, userFilename(user.email));
  fs.writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf-8');
}

/**
 * Create a new session token and attach it to the response.
 * @param {express.Response} res
 * @param {string} email
 */
function createSession(res, email) {
  const token = crypto.randomBytes(24).toString('hex');
  const expires = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { email, expires });
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}`
  );
}

/**
 * Remove a session token and clear the cookie.
 * @param {express.Response} res
 * @param {string} token
 */
function clearSession(res, token) {
  if (token) {
    sessions.delete(token);
  }
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
}

/**
 * Retrieve the logged user from the request cookies if available.
 * @param {express.Request} req
 * @returns {{ email: string | null, token: string | null }}
 */
function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return { email: null, token: null };
  }

  const session = sessions.get(token);
  if (!session) {
    return { email: null, token: null };
  }

  if (session.expires < Date.now()) {
    sessions.delete(token);
    return { email: null, token: null };
  }

  session.expires = Date.now() + SESSION_TTL_MS;
  return { email: session.email, token };
}

/**
 * Attach the logged-in user (if any) to the request.
 */
app.use((req, res, next) => {
  const { email, token } = getSessionFromRequest(req);
  if (email) {
    req.userEmail = email;
    req.sessionToken = token;
  }
  next();
});

function validateEmail(email) {
  return /.+@.+\..+/.test(email);
}

function requireAuth(req, res, next) {
  if (!req.userEmail) {
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ message: 'Autenticação necessária.' });
  }
  next();
}

app.post('/api/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Informe um e-mail e uma senha.' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Informe um e-mail válido.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'A senha deve conter pelo menos 6 caracteres.' });
  }

  if (loadUser(email)) {
    return res.status(409).json({ message: 'Já existe um usuário com este e-mail.' });
  }

  const user = {
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    progress: {},
  };

  saveUser(user);
  createSession(res, user.email);

  return res.status(201).json({ message: 'Usuário criado com sucesso.', email: user.email });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Informe um e-mail e uma senha.' });
  }

  const user = loadUser(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }

  createSession(res, user.email);
  return res.json({ message: 'Login realizado com sucesso.', email: user.email });
});

app.post('/api/logout', requireAuth, (req, res) => {
  clearSession(res, req.sessionToken);
  res.json({ message: 'Logout realizado com sucesso.' });
});

app.get('/api/session', (req, res) => {
  if (!req.userEmail) {
    return res.json({ authenticated: false });
  }
  res.json({ authenticated: true, email: req.userEmail });
});

app.get('/api/progress', requireAuth, (req, res) => {
  const user = loadUser(req.userEmail);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }
  res.json({ progress: user.progress || {} });
});

app.post('/api/progress', requireAuth, (req, res) => {
  const { progress } = req.body || {};
  if (typeof progress !== 'object' || progress === null) {
    return res.status(400).json({ message: 'Envie um progresso válido.' });
  }

  const user = loadUser(req.userEmail);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  user.progress = progress;
  saveUser(user);
  res.json({ message: 'Progresso salvo com sucesso.' });
});

app.get('/login', (req, res) => {
  if (req.userEmail) {
    return res.redirect('/');
  }

  res.sendFile(path.join(staticDir, 'login.html'));
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.userEmail) {
    const allowedPaths = ['/login', '/favicon.ico'];
    const allowedPrefixes = ['/api/', '/css/login', '/js/auth', '/images/login'];

    if (allowedPaths.includes(req.path)) {
      return next();
    }

    if (allowedPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    if (req.path === '/' || req.path.endsWith('.html')) {
      return res.redirect('/login');
    }
  }
  next();
});

app.use(express.static(staticDir));

app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'))) {
    res.status(404).send('Página não encontrada.');
    return;
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Serving static content from ${staticDir}`);
  console.log(`Server running on port ${PORT}`);
});
