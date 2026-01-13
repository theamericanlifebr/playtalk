require('dotenv').config();
const pool = require('./pool');

const migrationSql = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    progress JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

async function runMigration() {
  try {
    // pgcrypto fornece gen_random_uuid(), útil para IDs seguros e distribuídos.
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await pool.query(migrationSql);
    console.log('Migração concluída com sucesso.');
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigration();
