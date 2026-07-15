import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from '../wallets/wallet.entity';

export type TransferStatus = 'COMPLETED';

/**
 * The immutable ledger record of one treat movement. Every successful
 * transfer writes exactly one row here inside the same DB transaction that
 * moved the money, so the ledger can never disagree with wallet balances.
 *
 * We record who sent, who received, and how much — the audit trail a money
 * product must keep. Rows are never updated or deleted.
 */
@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet)
  senderWallet: Wallet;

  @Column()
  senderWalletId: string;

  @ManyToOne(() => Wallet)
  recipientWallet: Wallet;

  @Column()
  recipientWalletId: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'varchar', default: 'COMPLETED' })
  status: TransferStatus;

  /**
   * Client-supplied idempotency key. UNIQUE so a retried/duplicate submit
   * of the *same* logical transfer collides here instead of moving treats
   * twice. See TransfersService for how a collision is turned into a
   * safe "return the original transfer" response.
   */
  @Index({ unique: true })
  @Column()
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
