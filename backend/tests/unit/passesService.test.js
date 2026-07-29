jest.mock('../../src/db/pool', () => ({ query: jest.fn() }));

const pool = require('../../src/db/pool');
const { createPass, verifyPass } = require('../../src/services/passesService');

function makePassRow(overrides = {}) {
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000000',
    code: 'ABCD2345',
    guest_name: 'Jane Doe',
    host_reference: 'John Host',
    valid_date: '2099-01-01',
    status: 'PENDING',
    used_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  pool.query.mockReset();
});

describe('createPass', () => {
  test('inserts and returns the created row on first attempt', async () => {
    const row = makePassRow();
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const result = await createPass({
      guestName: 'Jane Doe',
      hostReference: 'John Host',
      validDate: '2099-01-01',
    });

    expect(result).toEqual(row);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('retries with a new code when the generated code collides', async () => {
    const conflictError = new Error('duplicate key value violates unique constraint');
    conflictError.code = '23505';
    const row = makePassRow();

    pool.query.mockRejectedValueOnce(conflictError).mockResolvedValueOnce({ rows: [row] });

    const result = await createPass({
      guestName: 'Jane Doe',
      hostReference: 'John Host',
      validDate: '2099-01-01',
    });

    expect(result).toEqual(row);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('propagates non-collision errors immediately', async () => {
    const dbError = new Error('connection refused');
    pool.query.mockRejectedValueOnce(dbError);

    await expect(
      createPass({ guestName: 'Jane Doe', hostReference: 'John Host', validDate: '2099-01-01' })
    ).rejects.toThrow('connection refused');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

describe('verifyPass status transitions', () => {
  test('returns VERIFIED when a PENDING pass is redeemed', async () => {
    const row = makePassRow({ status: 'USED', used_at: '2026-01-02T00:00:00.000Z' });
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const outcome = await verifyPass('ABCD2345');

    expect(outcome.result).toBe('VERIFIED');
    expect(outcome.pass.status).toBe('USED');
  });

  test('returns EXPIRED when the conditional update flips status to EXPIRED', async () => {
    const row = makePassRow({ status: 'EXPIRED', valid_date: '2020-01-01' });
    pool.query.mockResolvedValueOnce({ rows: [row] });

    const outcome = await verifyPass('ABCD2345');

    expect(outcome.result).toBe('EXPIRED');
  });

  test('returns ALREADY_USED when no row matches PENDING and existing status is USED', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [makePassRow({ status: 'USED' })] });

    const outcome = await verifyPass('ABCD2345');

    expect(outcome.result).toBe('ALREADY_USED');
  });

  test('returns EXPIRED when no row matches PENDING and existing status is already EXPIRED', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [makePassRow({ status: 'EXPIRED' })] });

    const outcome = await verifyPass('ABCD2345');

    expect(outcome.result).toBe('EXPIRED');
  });

  test('returns NOT_FOUND when the code does not exist at all', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    const outcome = await verifyPass('NOPE0000');

    expect(outcome.result).toBe('NOT_FOUND');
  });
});
