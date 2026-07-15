import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from '../wallets/wallet.entity';

/**
 * A MeowPay account. In the whimsy this is a cat; in the domain it is the
 * authenticated principal that owns exactly one wallet.
 *
 * `catName` doubles as the public handle used to address a transfer
 * ("send treats to whiskers"), so it is unique and indexed.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  /** bcrypt hash — the plaintext password never leaves the auth service. */
  @Column()
  passwordHash: string;

  @Index({ unique: true })
  @Column()
  catName: string;

  @Column()
  displayName: string;

  /** One account owns exactly one wallet; the wallet holds the balance. */
  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;
}
