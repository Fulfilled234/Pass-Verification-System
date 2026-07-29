const crypto = require('crypto');

// Unambiguous alphabet (no 0/O, 1/I) since codes may be read off a screen or typed.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/**
 * Generates a random, human-typeable pass code.
 * Uniqueness is enforced at the DB level (unique constraint on `code`),
 * not here — this just produces a candidate.
 */
function generatePassCode() {
  let code = '';
  const bytes = crypto.randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

module.exports = { generatePassCode, ALPHABET, CODE_LENGTH };
