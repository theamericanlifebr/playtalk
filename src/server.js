require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL não configurado. Configure a variável de ambiente antes do deploy.');
}

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET não configurado. Gere um segredo forte para produção.');
}

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
