const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurada. Defina a env var no Render.');
}

function signAuthToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'playtalk-api',
    audience: 'playtalk-client'
  });
}

function extractBearerToken(authHeader = '') {
  if (typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function authenticateRequest(req) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return { success: false, status: 401, message: 'Token ausente.' };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: 'playtalk-api',
      audience: 'playtalk-client'
    });

    return { success: true, payload };
  } catch (error) {
    return { success: false, status: 401, message: 'Token inválido ou expirado.' };
  }
}

module.exports = {
  signAuthToken,
  authenticateRequest
};
