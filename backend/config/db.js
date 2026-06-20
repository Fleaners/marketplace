const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const isRailwayInternal = /railway\.internal/.test(connectionString || '');
const useSsl = process.env.PGSSL === 'true' || (process.env.NODE_ENV === 'production' && !isRailwayInternal);

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
