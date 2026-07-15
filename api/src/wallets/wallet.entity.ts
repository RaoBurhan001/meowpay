import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * A wallet holds a single account's treat balance.
 *
 * `balance` is stored as an INTEGER count of treats. Treats are whole,
 * indivisible units, so integer arithmetic is exact — we never risk the
 * rounding drift that floating-point money representations introduce.
 */
@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', default: 0 })
  balance: number;

  /**
   * Optimistic-concurrency guard. TypeORM bumps this on every managed save,
   * so two racing updates to the same wallet cannot both commit against the
   * same version. Documented as a second line of defence — the primary
   * overdraft guard is the conditional balance UPDATE in TransfersService.
   */
  @VersionColumn()
  version: number;

  @OneToOne(() => User, (user) => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
