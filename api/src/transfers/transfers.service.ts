import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  IdempotencyConflictException,
  InsufficientFundsException,
  RecipientNotFoundException,
  SelfTransferException,
} from '../common/exceptions/domain.exceptions';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { Wallet } from '../wallets/wallet.entity';
import { WalletsService } from '../wallets/wallets.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Transfer } from './transfer.entity';

/** A transfer as presented to a client, resolved to human-readable handles. */
export interface TransferView {
  id: string;
  amount: number;
  status: string;
  createdAt: Date;
  senderCatName: string;
  recipientCatName: string;
}

/** A history row also carries the direction relative to the viewing cat. */
export interface TransferHistoryItem extends TransferView {
  direction: 'sent' | 'received';
}

/**
 * The heart of MeowPay: moving treats from one cat to another, correctly.
 *
 * Correctness properties this service guarantees:
 *  - **Atomic**   debit + credit + ledger write happen in ONE DB transaction.
 *  - **No overdraft**  debit is a conditional UPDATE that only succeeds if the
 *                      balance covers it, safe even under concurrent sends.
 *  - **Idempotent**  a repeated idempotencyKey never moves treats twice.
 */
@Injectable()
export class TransfersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly walletsService: WalletsService,
    @InjectRepository(Transfer)
    private readonly transfersRepository: Repository<Transfer>,
  ) {}

  /**
   * Send `amount` treats from the authenticated sender to `recipientCatName`.
   */
  async createTransfer(
    senderUserId: string,
    dto: CreateTransferDto,
  ): Promise<TransferView> {
    // 1. Resolve both parties up front (cheap, outside the transaction).
    const recipient = await this.usersService.findByCatName(
      dto.recipientCatName,
    );
    if (!recipient) {
      throw new RecipientNotFoundException(dto.recipientCatName);
    }
    if (recipient.id === senderUserId) {
      // Self-transfer is a no-op that would only muddy the ledger.
      throw new SelfTransferException();
    }

    const senderWallet = await this.walletsService.findByUserId(senderUserId);
    const recipientWallet = await this.walletsService.findByUserId(
      recipient.id,
    );
    if (!senderWallet || !recipientWallet) {
      // Every account is created with a wallet; a missing one is a real fault.
      throw new RecipientNotFoundException(dto.recipientCatName);
    }

    const sender = await this.usersService.findById(senderUserId);

    // 2. Idempotency fast-path: if this key was already used, return that
    //    transfer instead of creating a new one — as long as it describes the
    //    SAME send. A different send reusing a key is a client bug (409).
    const existing = await this.transfersRepository.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      this.assertSameTransfer(existing, senderWallet.id, recipientWallet.id, dto.amount);
      return this.toView(existing, sender!.catName, recipient.catName);
    }

    // 3. Move the money atomically.
    let transfer: Transfer;
    try {
      transfer = await this.dataSource.transaction(async (manager) => {
        // 3a. Debit the sender ONLY if the balance covers it. The check and
        //     decrement are a single statement, so concurrent sends cannot
        //     race past a stale balance read and overdraw the wallet.
        const debited = await this.walletsService.tryDebit(
          senderWallet.id,
          dto.amount,
          manager,
        );
        if (!debited) {
          // Throwing rolls the whole transaction back — nothing was moved.
          throw new InsufficientFundsException();
        }

        // 3b. Credit the recipient.
        await this.walletsService.credit(
          recipientWallet.id,
          dto.amount,
          manager,
        );

        // 3c. Write the immutable ledger row. The UNIQUE idempotencyKey means
        //     that if two identical requests race past step 2, the second
        //     insert fails here and the whole transaction rolls back — so the
        //     duplicate never results in a second debit.
        const repo = manager.getRepository(Transfer);
        const row = repo.create({
          senderWalletId: senderWallet.id,
          recipientWalletId: recipientWallet.id,
          amount: dto.amount,
          status: 'COMPLETED',
          idempotencyKey: dto.idempotencyKey,
        });
        return repo.save(row);
      });
    } catch (err) {
      // Lost the idempotency race: the other request already committed this
      // exact transfer. Treat our attempt as a replay and return theirs.
      if (this.isIdempotencyRace(err)) {
        const winner = await this.transfersRepository.findOneOrFail({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        return this.toView(winner, sender!.catName, recipient.catName);
      }
      throw err;
    }

    return this.toView(transfer, sender!.catName, recipient.catName);
  }

  /**
   * All transfers the given cat took part in, newest first, each tagged with
   * whether they sent or received. One joined query — no N+1 lookups.
   */
  async getHistoryForUser(userId: string): Promise<TransferHistoryItem[]> {
    const wallet = await this.walletsService.findByUserId(userId);
    if (!wallet) return [];

    const rows = await this.transfersRepository
      .createQueryBuilder('t')
      .leftJoin(Wallet, 'sw', 'sw.id = t.senderWalletId')
      .leftJoin(User, 'su', 'su.id = sw.userId')
      .leftJoin(Wallet, 'rw', 'rw.id = t.recipientWalletId')
      .leftJoin(User, 'ru', 'ru.id = rw.userId')
      .select([
        't.id AS id',
        't.amount AS amount',
        't.status AS status',
        't.createdAt AS "createdAt"',
        't.senderWalletId AS "senderWalletId"',
        'su.catName AS "senderCatName"',
        'ru.catName AS "recipientCatName"',
      ])
      .where('t.senderWalletId = :wid OR t.recipientWalletId = :wid', {
        wid: wallet.id,
      })
      .orderBy('t.createdAt', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      status: r.status,
      // The raw query returns SQLite's UTC datetime string ("YYYY-MM-DD HH:MM:SS")
      // with no timezone marker. Normalise it to a real ISO-8601 Date so the
      // history endpoint's timestamps match the POST /transfers response and
      // clients can't misread them as local time.
      createdAt: this.toDate(r.createdAt),
      senderCatName: r.senderCatName,
      recipientCatName: r.recipientCatName,
      direction: r.senderWalletId === wallet.id ? 'sent' : 'received',
    }));
  }

  /** Reject reuse of an idempotency key for a materially different transfer. */
  private assertSameTransfer(
    existing: Transfer,
    senderWalletId: string,
    recipientWalletId: string,
    amount: number,
  ): void {
    const same =
      existing.senderWalletId === senderWalletId &&
      existing.recipientWalletId === recipientWalletId &&
      existing.amount === amount;
    if (!same) {
      throw new IdempotencyConflictException();
    }
  }

  private toView(
    transfer: Transfer,
    senderCatName: string,
    recipientCatName: string,
  ): TransferView {
    return {
      id: transfer.id,
      amount: transfer.amount,
      status: transfer.status,
      createdAt: transfer.createdAt,
      senderCatName,
      recipientCatName,
    };
  }

  /** Parse a value that may be a Date or a SQLite UTC datetime string. */
  private toDate(value: string | Date): Date {
    if (value instanceof Date) return value;
    // "2026-07-15 22:37:56" (UTC, no zone) -> a proper UTC Date.
    return new Date(value.replace(' ', 'T') + 'Z');
  }

  private isIdempotencyRace(err: unknown): boolean {
    const message = (err as { message?: string })?.message ?? '';
    return message.includes('UNIQUE constraint failed');
  }
}
