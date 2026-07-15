import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';

/**
 * End-to-end proof of the "send treats" slice against a real (in-memory)
 * database. These tests exercise the whole pipeline — HTTP → guard → service
 * → SQL transaction → persisted balances — and assert the correctness
 * properties a money product must hold: exact balances, idempotency, and no
 * overdraft even under concurrent sends.
 */
describe('Transfers (e2e)', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  /** Register a fresh cat and return its bearer token. */
  async function registerCat(name: string): Promise<string> {
    const res = await http()
      .post('/auth/register')
      .send({
        email: `${name}@meowpay.cat`,
        password: 'password123',
        catName: name,
        displayName: name,
      })
      .expect(201);
    return res.body.accessToken;
  }

  async function balanceOf(token: string): Promise<number> {
    const res = await http()
      .get('/wallets/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.balance;
  }

  function send(token: string, body: Record<string, unknown>) {
    return http()
      .post('/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  it('moves treats end to end: sender debited, recipient credited, ledger recorded for both', async () => {
    const alice = await registerCat('alice');
    const bob = await registerCat('bob');

    await send(alice, { recipientCatName: 'bob', amount: 40, idempotencyKey: 'e2e-1' }).expect(201);

    // Balances reflect the move exactly (both started at 100).
    expect(await balanceOf(alice)).toBe(60);
    expect(await balanceOf(bob)).toBe(140);

    // The transfer appears in both histories with the right direction.
    const aliceHist = await http().get('/transfers').set('Authorization', `Bearer ${alice}`).expect(200);
    const bobHist = await http().get('/transfers').set('Authorization', `Bearer ${bob}`).expect(200);
    expect(aliceHist.body).toHaveLength(1);
    expect(aliceHist.body[0]).toMatchObject({ direction: 'sent', amount: 40, recipientCatName: 'bob' });
    expect(bobHist.body[0]).toMatchObject({ direction: 'received', amount: 40, senderCatName: 'alice' });
  });

  it('rejects sending more treats than the sender holds (400) and leaves balances untouched', async () => {
    const carol = await registerCat('carol');
    const dave = await registerCat('dave');

    await send(carol, { recipientCatName: 'dave', amount: 101, idempotencyKey: 'e2e-poor' }).expect(400);

    expect(await balanceOf(carol)).toBe(100);
    expect(await balanceOf(dave)).toBe(100);
  });

  it('rejects a cat sending to itself (400)', async () => {
    const erin = await registerCat('erin');
    await send(erin, { recipientCatName: 'erin', amount: 10, idempotencyKey: 'e2e-self' }).expect(400);
  });

  it('rejects sending to an unknown cat (404)', async () => {
    const frank = await registerCat('frank');
    await send(frank, { recipientCatName: 'ghost', amount: 10, idempotencyKey: 'e2e-ghost' }).expect(404);
  });

  it('rejects a non-positive / non-integer amount (400)', async () => {
    const grace = await registerCat('grace');
    await registerCat('heidi');
    await send(grace, { recipientCatName: 'heidi', amount: 0, idempotencyKey: 'e2e-zero' }).expect(400);
    await send(grace, { recipientCatName: 'heidi', amount: -5, idempotencyKey: 'e2e-neg' }).expect(400);
    await send(grace, { recipientCatName: 'heidi', amount: 2.5, idempotencyKey: 'e2e-frac' }).expect(400);
    expect(await balanceOf(grace)).toBe(100); // nothing moved
  });

  it('rejects an out-of-range amount cleanly (400), not as insufficient funds', async () => {
    const olivia = await registerCat('olivia');
    await registerCat('peter');
    const res = await send(olivia, {
      recipientCatName: 'peter',
      amount: 99999999999999999999,
      idempotencyKey: 'e2e-huge',
    }).expect(400);
    // Rejected by validation with a clear reason — never reaches the balance check.
    expect(JSON.stringify(res.body.message)).toMatch(/too large|whole number/i);
  });

  it('returns history timestamps as ISO-8601 (consistent with the POST response)', async () => {
    const quinn = await registerCat('quinn');
    await registerCat('rita');
    await send(quinn, { recipientCatName: 'rita', amount: 10, idempotencyKey: 'e2e-iso' }).expect(201);

    const hist = await http().get('/transfers').set('Authorization', `Bearer ${quinn}`).expect(200);
    // e.g. "2026-07-15T22:37:56.000Z" — parseable and timezone-aware.
    expect(hist.body[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(Number.isNaN(Date.parse(hist.body[0].createdAt))).toBe(false);
  });

  it('is idempotent: re-submitting the same key does NOT charge twice', async () => {
    const ivan = await registerCat('ivan');
    const judy = await registerCat('judy');
    const key = 'e2e-idem';

    const first = await send(ivan, { recipientCatName: 'judy', amount: 25, idempotencyKey: key }).expect(201);
    const second = await send(ivan, { recipientCatName: 'judy', amount: 25, idempotencyKey: key }).expect(201);

    // Same transfer returned both times, and only ONE debit happened.
    expect(second.body.id).toBe(first.body.id);
    expect(await balanceOf(ivan)).toBe(75); // 100 - 25, not - 50
    expect(await balanceOf(judy)).toBe(125);
  });

  it('never overdraws under concurrent sends (only what the balance covers succeeds)', async () => {
    const mia = await registerCat('mia'); // starts with 100
    const nick = await registerCat('nick');

    // Fire 10 concurrent sends of 20 each. The wallet holds 100, so at most 5
    // can succeed; the conditional debit must reject the rest — never letting
    // the balance go negative.
    const attempts = Array.from({ length: 10 }, (_, i) =>
      send(mia, { recipientCatName: 'nick', amount: 20, idempotencyKey: `e2e-conc-${i}` }),
    );
    const results = await Promise.allSettled(attempts.map((a) => a.then((r) => r.status)));
    const successes = results.filter((r) => r.status === 'fulfilled' && r.value === 201).length;

    expect(successes).toBe(5);
    expect(await balanceOf(mia)).toBe(0); // exactly drained, never negative
    expect(await balanceOf(nick)).toBe(200); // 100 + 5*20
  });
});
