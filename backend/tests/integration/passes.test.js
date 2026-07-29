const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/pool');

describe('Passes API', () => {
  test('create -> verify happy path', async () => {
    const createRes = await request(app).post('/passes').send({
      guest_name: 'Jane Doe',
      host_reference: 'John Host',
      valid_date: '2099-01-01',
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('PENDING');
    expect(createRes.body.code).toHaveLength(8);

    const verifyRes = await request(app)
      .post('/passes/verify')
      .send({ code: createRes.body.code });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.pass.status).toBe('USED');
    expect(verifyRes.body.pass.used_at).not.toBeNull();
  });

  test('verifying the same code twice returns 409 on the second attempt', async () => {
    const createRes = await request(app).post('/passes').send({
      guest_name: 'Jane Doe',
      host_reference: 'John Host',
      valid_date: '2099-01-01',
    });

    const code = createRes.body.code;

    const firstVerify = await request(app).post('/passes/verify').send({ code });
    expect(firstVerify.status).toBe(200);

    const secondVerify = await request(app).post('/passes/verify').send({ code });
    expect(secondVerify.status).toBe(409);
    expect(secondVerify.body.error).toMatch(/already been used/i);
  });

  test('verifying a pass whose valid_date has passed returns 409 EXPIRED', async () => {
    const insertResult = await pool.query(
      `INSERT INTO passes (code, guest_name, host_reference, valid_date, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING code`,
      ['EXPIRED1', 'Jane Doe', 'John Host', '2020-01-01']
    );
    const code = insertResult.rows[0].code;

    const verifyRes = await request(app).post('/passes/verify').send({ code });

    expect(verifyRes.status).toBe(409);
    expect(verifyRes.body.error).toMatch(/expired/i);
  });

  test('verifying an unknown code returns 404', async () => {
    const verifyRes = await request(app).post('/passes/verify').send({ code: 'NOTREAL1' });
    expect(verifyRes.status).toBe(404);
  });

  test('creating a pass with missing fields returns 400', async () => {
    const res = await request(app).post('/passes').send({ guest_name: 'Jane Doe' });
    expect(res.status).toBe(400);
  });
});
