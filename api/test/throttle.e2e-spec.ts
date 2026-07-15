import { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * Proves the login rate limiter triggers. The functional suites disable
 * throttling (they make many requests from one IP), so this suite tightens the
 * login limit and loads a FRESH app module so the module + controller pick up
 * the low limit at evaluation time.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;

  beforeAll(async () => {
    process.env.THROTTLE_AUTH_LIMIT = '3';
    process.env.THROTTLE_AUTH_TTL = '60000';
    jest.resetModules();
    // Fresh require so AuthController's @Throttle reads the low limit above.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createTestApp } = require('./app.factory');
    app = await createTestApp();
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after too many login attempts from one IP', async () => {
    const body = { email: 'nobody@meowpay.cat', password: 'whatever' };

    // The first 3 pass the guard (they 401 on bad credentials — not throttled).
    for (let i = 0; i < 3; i++) {
      const res = await http().post('/auth/login').send(body);
      expect(res.status).toBe(401);
    }

    // The 4th within the window is blocked by the rate limiter.
    const limited = await http().post('/auth/login').send(body);
    expect(limited.status).toBe(429);
  });
});
