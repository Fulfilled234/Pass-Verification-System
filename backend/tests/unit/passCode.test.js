const { generatePassCode, ALPHABET, CODE_LENGTH } = require('../../src/utils/passCode');

describe('generatePassCode', () => {
  test('produces a code of the configured length', () => {
    const code = generatePassCode();
    expect(code).toHaveLength(CODE_LENGTH);
  });

  test('only uses characters from the defined alphabet', () => {
    const code = generatePassCode();
    for (const char of code) {
      expect(ALPHABET).toContain(char);
    }
  });

  test('excludes visually ambiguous characters', () => {
    const code = generatePassCode();
    expect(code).not.toMatch(/[01OI]/);
  });

  test('generates distinct codes across repeated calls', () => {
    const codes = new Set();
    for (let i = 0; i < 500; i++) {
      codes.add(generatePassCode());
    }
    // With this alphabet/length, collisions in 500 draws should not occur.
    expect(codes.size).toBe(500);
  });
});
