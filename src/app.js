const express = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());

// Endpoint simples para health-check (Render usa para verificar que o serviço está vivo).
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);

module.exports = app;
