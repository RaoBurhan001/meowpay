import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  IdempotencyConflictException,
  InsufficientFundsException,
  RecipientNotFoundException,
  SelfTransferException,
} from '../common/exceptions/domain.exceptions';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { Transfer } from './transfer.entity';
import { TransfersService } from './transfers.service';

/**
 * Pure unit tests for the money-movement rules. Every dependency is mocked so
 * these assert the SERVICE'S logic in isolation (no database) — the atomic
 * behaviour itself is proven end-to-end in the e2e suite.
 */
describe('TransfersService', () => {
  let service: TransfersService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let walletsService: jest.Mocked<Partial<WalletsService>>;
  let transfersRepo: { findOne: jest.Mock; findOneOrFail: jest.Mock; createQueryBuilder: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let savedRow: any;

  const SENDER = { id: 'sender-id', catName: 'whiskers' };
  const RECIPIENT = { id: 'recipient-id', catName: 'mittens' };
  const SENDER_WALLET = { id: 'sw-1', userId: SENDER.id, balance: 100 };
  const RECIPIENT_WALLET = { id: 'rw-1', userId: RECIPIENT.id, balance: 0 };

  const dto = { recipientCatName: 'mittens', amount: 30, idempotencyKey: 'key-1' };

  beforeEach(async () => {
    savedRow = undefined;

    // A transaction manager whose Transfer repo records what was saved.
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        create: (x: any) => x,
        save: jest.fn(async (row: any) => {
          savedRow = { ...row, id: 't-1', status: 'COMPLETED', createdAt: new Date('2026-01-01') };
          return savedRow;
        }),
      }),
    };

    dataSource = {
      // Run the callback immediately with our fake manager.
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };

    usersService = {
      findByCatName: jest.fn(),
      findById: jest.fn(),
    };

    walletsService = {
      findByUserId: jest.fn(),
      tryDebit: jest.fn(),
      credit: jest.fn(),
    };

    transfersRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneOrFail: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransfersService,
        { provide: DataSource, useValue: dataSource },
        { provide: UsersService, useValue: usersService },
        { provide: WalletsService, useValue: walletsService },
        { provide: getRepositoryToken(Transfer), useValue: transfersRepo },
      ],
    }).compile();

    service = moduleRef.get(TransfersService);

    // Default happy-path wiring; individual tests override as needed.
    (usersService.findByCatName as jest.Mock).mockResolvedValue(RECIPIENT);
    (usersService.findById as jest.Mock).mockResolvedValue(SENDER);
    (walletsService.findByUserId as jest.Mock).mockImplementation(async (id: string) =>
      id === SENDER.id ? SENDER_WALLET : RECIPIENT_WALLET,
    );
    (walletsService.tryDebit as jest.Mock).mockResolvedValue(true);
    (walletsService.credit as jest.Mock).mockResolvedValue(undefined);
  });

  it('completes a valid transfer: debits sender, credits recipient, writes ledger', async () => {
    const view = await service.createTransfer(SENDER.id, dto);

    expect(walletsService.tryDebit).toHaveBeenCalledWith(SENDER_WALLET.id, 30, expect.anything());
    expect(walletsService.credit).toHaveBeenCalledWith(RECIPIENT_WALLET.id, 30, expect.anything());
    expect(savedRow).toMatchObject({
      senderWalletId: SENDER_WALLET.id,
      recipientWalletId: RECIPIENT_WALLET.id,
      amount: 30,
      idempotencyKey: 'key-1',
    });
    expect(view).toMatchObject({
      amount: 30,
      senderCatName: 'whiskers',
      recipientCatName: 'mittens',
      status: 'COMPLETED',
    });
  });

  it('rejects a transfer to a non-existent cat', async () => {
    (usersService.findByCatName as jest.Mock).mockResolvedValue(null);
    await expect(service.createTransfer(SENDER.id, dto)).rejects.toBeInstanceOf(
      RecipientNotFoundException,
    );
    expect(walletsService.tryDebit).not.toHaveBeenCalled();
  });

  it('rejects a cat sending treats to itself', async () => {
    (usersService.findByCatName as jest.Mock).mockResolvedValue(SENDER);
    await expect(service.createTransfer(SENDER.id, dto)).rejects.toBeInstanceOf(
      SelfTransferException,
    );
    expect(walletsService.tryDebit).not.toHaveBeenCalled();
  });

  it('rejects and rolls back when the sender cannot cover the amount', async () => {
    (walletsService.tryDebit as jest.Mock).mockResolvedValue(false); // overdraft guard trips
    await expect(service.createTransfer(SENDER.id, dto)).rejects.toBeInstanceOf(
      InsufficientFundsException,
    );
    // Debit failed => we must never credit the recipient.
    expect(walletsService.credit).not.toHaveBeenCalled();
    expect(savedRow).toBeUndefined();
  });

  it('is idempotent: a repeated key returns the original transfer without moving treats again', async () => {
    transfersRepo.findOne.mockResolvedValue({
      id: 't-original',
      senderWalletId: SENDER_WALLET.id,
      recipientWalletId: RECIPIENT_WALLET.id,
      amount: 30,
      status: 'COMPLETED',
      idempotencyKey: 'key-1',
      createdAt: new Date('2026-01-01'),
    });

    const view = await service.createTransfer(SENDER.id, dto);

    expect(view.id).toBe('t-original');
    expect(dataSource.transaction).not.toHaveBeenCalled(); // no second debit/credit
    expect(walletsService.tryDebit).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key for a materially different transfer', async () => {
    transfersRepo.findOne.mockResolvedValue({
      id: 't-original',
      senderWalletId: SENDER_WALLET.id,
      recipientWalletId: RECIPIENT_WALLET.id,
      amount: 999, // different amount than the incoming dto (30)
      status: 'COMPLETED',
      idempotencyKey: 'key-1',
      createdAt: new Date('2026-01-01'),
    });

    await expect(service.createTransfer(SENDER.id, dto)).rejects.toBeInstanceOf(
      IdempotencyConflictException,
    );
  });
});
