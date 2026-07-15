import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';

/**
 * E2E for the recipient-search endpoint that powers the autocomplete: prefix
 * matching, case-insensitivity, self-exclusion, and auth.
 */
describe('Users search (e2e)', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());

    // Seed a few cats; keep the token of the first as the caller.
    const reg = async (name: string) =>
      http()
        .post('/auth/register')
        .send({ email: `${name}@meowpay.cat`, password: 'password123', catName: name, displayName: name })
        .expect(201);

    const me = await reg('whiskers');
    token = me.body.accessToken;
    await reg('whisketta');
    await reg('mittens');
  });

  afterAll(async () => {
    await app.close();
  });

  function search(q: string) {
    return http().get(`/users/search?q=${encodeURIComponent(q)}`).set('Authorization', `Bearer ${token}`);
  }

  it('matches by case-insensitive prefix', async () => {
    const res = await search('WHISK').expect(200);
    const names = res.body.map((c: { catName: string }) => c.catName).sort();
    // Matches "whisketta" but NOT the caller "whiskers" (self is excluded).
    expect(names).toContain('whisketta');
    expect(names).not.toContain('whiskers');
  });

  it('finds a distinct recipient by prefix', async () => {
    const res = await search('mit').expect(200);
    expect(res.body).toEqual([{ catName: 'mittens', displayName: 'mittens' }]);
  });

  it('returns an empty list for no match', async () => {
    const res = await search('zzz').expect(200);
    expect(res.body).toEqual([]);
  });

  it('requires authentication', async () => {
    await http().get('/users/search?q=mit').expect(401);
  });
});
