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

/**
 * Verifies a pass by code.
 *
 * Redemption is race-safe: the UPDATE only touches rows that are still
 * PENDING, so two concurrent verify requests for the same code can't both
 * succeed — the DB's row-level lock during the UPDATE serializes them, and
 * only one will match `WHERE status = 'PENDING'`.
 *
 * Returns one of:
 *   { result: 'VERIFIED', pass }   - just marked USED
 *   { result: 'ALREADY_USED', pass } - was already USED (double-verify)
 *   { result: 'EXPIRED', pass }    - valid_date has passed
 *   { result: 'NOT_FOUND' }        - no pass with that code
 */
async function verifyPass(code) {
  // First check for expiry against a PENDING pass with today's date past valid_date.
  // We fold both the expiry check and the redemption into one statement so
  // there's no window between "check" and "update" for a race to slip through.
  const result = await pool.query(
    `UPDATE passes
     SET status = CASE
           WHEN valid_date < CURRENT_DATE THEN 'EXPIRED'::pass_status
           ELSE 'USED'::pass_status
         END,
         used_at = CASE
           WHEN valid_date < CURRENT_DATE THEN used_at
           ELSE now()
         END
     WHERE code = $1 AND status = 'PENDING'
     RETURNING id, code, guest_name, host_reference, valid_date, status, used_at, created_at`,
    [code]
  );

  if (result.rows.length > 0) {
    const pass = result.rows[0];
    return { result: pass.status === 'EXPIRED' ? 'EXPIRED' : 'VERIFIED', pass };
  }

  // No row updated: either the code doesn't exist, or it's already USED/EXPIRED.
  const existing = await pool.query(
    `SELECT id, code, guest_name, host_reference, valid_date, status, used_at, created_at
     FROM passes WHERE code = $1`,
    [code]
  );

  if (existing.rows.length === 0) {
    return { result: 'NOT_FOUND' };
  }

  const pass = existing.rows[0];
  return { result: pass.status === 'EXPIRED' ? 'EXPIRED' : 'ALREADY_USED', pass };
}

module.exports = { createPass, verifyPass };
