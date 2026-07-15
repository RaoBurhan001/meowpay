import { DataSource, DataSourceOptions } from 'typeorm';
import { Transfer } from '../transfers/transfer.entity';
import { User } from '../users/user.entity';
import { Wallet } from '../wallets/wallet.entity';

/**
 * Single source of truth for TypeORM connection options.
 *
 * Reused in three places so the schema/entity list can never drift between
 * them: the Nest runtime (AppModule), the seed script, and e2e tests.
 * Tests pass `:memory:` to get a throwaway database per run.
 *
 * `synchronize: true` auto-creates the schema from the entities. That keeps
 * a fresh clone runnable with zero migration steps — an intentional trade-off
 * for a demo slice; a production build would use versioned migrations instead
 * (noted in the README).
 */
export function buildDataSourceOptions(
  databasePath = process.env.DATABASE_PATH || 'meowpay.sqlite',
): DataSourceOptions {
  return {
    type: 'better-sqlite3',
    database: databasePath,
    entities: [User, Wallet, Transfer],
    synchronize: true,
    // better-sqlite3 is synchronous; enabling shared cache is unnecessary.
  };
}

/**
 * Standalone DataSource for scripts that run outside the Nest DI container
 * (the seed script, TypeORM CLI). Nest itself builds its own DataSource via
 * TypeOrmModule using the same options factory above.
 */
export const AppDataSource = new DataSource(buildDataSourceOptions());
