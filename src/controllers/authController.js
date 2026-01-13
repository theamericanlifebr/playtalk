const authService = require('../services/authService');
const { isValidEmail, isValidPassword } = require('../utils/validators');

async function register(req, res) {
  const { email, password } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'E-mail inválido.' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  // Normalizamos e-mail para evitar duplicidade por diferença de caixa.
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await authService.findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }

    const user = await authService.createUser({ email: normalizedEmail, password });
    // Gera JWT assinado para ser usado nas próximas requisições.
    const token = authService.generateToken(user.id);

    return res.status(201).json({
      user,
      token
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return res.status(500).json({ message: 'Erro interno ao registrar usuário.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ message: 'Credenciais inválidas.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await authService.findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }

    const passwordMatches = await authService.verifyPassword(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
    }

    const token = authService.generateToken(user.id);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return res.status(500).json({ message: 'Erro interno ao autenticar usuário.' });
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = {
  register,
  login,
  me
};
