import * as bcrypt from 'bcryptjs';
import 'reflect-metadata';
import { Transfer } from '../transfers/transfer.entity';
import { User } from '../users/user.entity';
import { Wallet } from '../wallets/wallet.entity';
import { AppDataSource } from './data-source';

/**
 * Seeds a handful of demo cats so a reviewer can log in and send treats
 * immediately after a fresh clone. Idempotent: skips cats that already exist,
 * so it is safe to run repeatedly.
 *
 * All demo cats share the password below (printed on completion). This is a
 * demo affordance only — never do this in a real system.
 */
const DEMO_PASSWORD = 'password123';

const DEMO_CATS = [
  { email: 'whiskers@meowpay.cat', catName: 'whiskers', displayName: 'Whiskers', balance: 500 },
  { email: 'mittens@meowpay.cat', catName: 'mittens', displayName: 'Mittens', balance: 300 },
  { email: 'tom@meowpay.cat', catName: 'tom', displayName: 'Tom', balance: 100 },
];

async function seed(): Promise<void> {
  const ds = await AppDataSource.initialize();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = ds.getRepository(User);
  const wallets = ds.getRepository(Wallet);

  for (const cat of DEMO_CATS) {
    const exists = await users.findOne({ where: { catName: cat.catName } });
    if (exists) {
      // eslint-disable-next-line no-console
      console.log(`- ${cat.catName} already exists, skipping`);
      continue;
    }
    // Create the account and its funded wallet together.
    const user = await users.save(
      users.create({
        email: cat.email,
        passwordHash,
        catName: cat.catName,
        displayName: cat.displayName,
      }),
    );
    await wallets.save(wallets.create({ userId: user.id, balance: cat.balance }));
    // eslint-disable-next-line no-console
    console.log(`+ seeded ${cat.catName} with ${cat.balance} treats`);
  }

  // Touch Transfer so the import is retained and the table is ensured.
  void Transfer;

  await ds.destroy();
  // eslint-disable-next-line no-console
  console.log(`\nDone. Log in with any cat's email and password "${DEMO_PASSWORD}".`);
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
