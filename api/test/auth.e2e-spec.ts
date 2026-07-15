import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';

/**
 * End-to-end auth flow against a real (in-memory) database: register → the
 * account is funded and queryable, duplicates are rejected, and login guards
 * credentials correctly.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  const cat = {
    email: 'felix@meowpay.cat',
    password: 'password123',
    catName: 'felix',
    displayName: 'Felix',
  };

  it('registers a cat, funds its wallet, and returns a token', async () => {
    const res = await http().post('/auth/register').send(cat).expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toMatchObject({ catName: 'felix', email: cat.email });

    // The new wallet is funded with STARTING_BALANCE (100 in the test env).
    const balance = await http()
      .get('/wallets/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(balance.body).toEqual({ balance: 100, catName: 'felix' });
  });

  it('rejects a duplicate email with 409', async () => {
    await http()
      .post('/auth/register')
      .send({ ...cat, catName: 'felix2' })
      .expect(409);
  });

  it('rejects an invalid registration body with 400', async () => {
    await http()
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short', catName: 'x', displayName: '' })
      .expect(400);
  });

  it('logs in with correct credentials', async () => {
    const res = await http()
      .post('/auth/login')
      .send({ email: cat.email, password: cat.password })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects login with a wrong password (401) without revealing which field failed', async () => {
    const res = await http()
      .post('/auth/login')
      .send({ email: cat.email, password: 'wrong-password' })
      .expect(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('rejects access to a protected route without a token (401)', async () => {
    await http().get('/wallets/me').expect(401);
  });
});
