const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const poolConfig = connectionString ? { connectionString } : {};

// Render typically requires SSL for managed PostgreSQL connections.
poolConfig.ssl = process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false };

const pool = new Pool(poolConfig);

module.exports = pool;
