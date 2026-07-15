import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Wallet } from './wallet.entity';

/**
 * Owns all persistence and balance mutation for {@link Wallet}.
 *
 * The debit/credit primitives here are the ones the transfer flow relies on
 * for correctness, so they are written to be race-safe and are always meant
 * to be called inside a surrounding DB transaction (they accept the
 * transaction's {@link EntityManager}).
 */
@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletsRepository: Repository<Wallet>,
  ) {}

  private repo(manager?: EntityManager): Repository<Wallet> {
    return manager ? manager.getRepository(Wallet) : this.walletsRepository;
  }

  createForUser(
    userId: string,
    initialBalance: number,
    manager?: EntityManager,
  ): Promise<Wallet> {
    const repo = this.repo(manager);
    const wallet = repo.create({ userId, balance: initialBalance });
    return repo.save(wallet);
  }

  findByUserId(userId: string): Promise<Wallet | null> {
    return this.walletsRepository.findOne({ where: { userId } });
  }

  /** Balance for the current user; throws if the wallet is somehow missing. */
  async getBalanceByUserId(userId: string): Promise<number> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found for this account.');
    }
    return wallet.balance;
  }

  /**
   * Atomically debit `amount` from a wallet **only if it can cover it**.
   *
   * The overdraft guard is the SQL `WHERE balance >= :amount` clause, not a
   * prior read: the check and the decrement are a single statement, so two
   * concurrent transfers can never both pass a stale "enough funds" read and
   * drive the balance negative. We return whether a row was actually changed;
   * `false` means insufficient funds and the caller must roll back.
   *
   * (This conditional-UPDATE approach is used instead of pessimistic row locks
   * because TypeORM's SQLite driver does not support them — and it is portable
   * to any SQL database.)
   */
  async tryDebit(
    walletId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => 'balance - :amount' })
      .where('id = :walletId AND balance >= :amount', { walletId, amount })
      .setParameter('amount', amount)
      .execute();

    // `affected` is the number of rows updated: 1 = debited, 0 = too poor.
    return (result.affected ?? 0) > 0;
  }

  /** Credit `amount` to a wallet. Always succeeds for a valid wallet id. */
  async credit(
    walletId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => 'balance + :amount' })
      .where('id = :walletId', { walletId })
      .setParameter('amount', amount)
      .execute();
  }
}
