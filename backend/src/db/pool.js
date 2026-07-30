const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Without this, an error on an idle client (e.g. the connection being
// dropped by the DB server) is an unhandled 'error' event and crashes
// the whole process. Log it and let the pool recover instead.
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client:', err.message);
});

module.exports = pool;
