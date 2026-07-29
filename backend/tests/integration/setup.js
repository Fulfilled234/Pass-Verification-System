require('dotenv').config();
const pool = require('../../src/db/pool');

beforeEach(async () => {
  await pool.query('TRUNCATE TABLE passes');
});

afterAll(async () => {
  await pool.end();
});
