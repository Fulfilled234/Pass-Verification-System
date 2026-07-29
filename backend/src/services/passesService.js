const pool = require('../db/pool');
const { generatePassCode } = require('../utils/passCode');

const MAX_CODE_ATTEMPTS = 5;

/**
 * Creates a pass with a guaranteed-unique code.
 * Collisions are astronomically unlikely at this alphabet/length, but since
 * uniqueness is enforced by the DB constraint, we retry on conflict rather
 * than trusting probability alone.
 */
async function createPass({ guestName, hostReference, validDate }) {
  let lastError;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generatePassCode();
    try {
      const result = await pool.query(
        `INSERT INTO passes (code, guest_name, host_reference, valid_date)
         VALUES ($1, $2, $3, $4)
         RETURNING id, code, guest_name, host_reference, valid_date, status, used_at, created_at`,
        [code, guestName, hostReference, validDate]
      );
      return result.rows[0];
    } catch (err) {
      // 23505 = unique_violation. Retry with a fresh code; anything else, bubble up.
      if (err.code === '23505') {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Failed to generate a unique pass code');
}

module.exports = { createPass };
