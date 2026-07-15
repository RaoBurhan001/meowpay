import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  user: { id: string; catName: string; displayName: string; email: string };
}

/**
 * Handles registration and login. Passwords are hashed here and never stored
 * or logged in plaintext. Token issuance is centralised in {@link issueToken}
 * so register and login stay consistent (DRY).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly walletsService: WalletsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create an account and its wallet in ONE transaction: either both the
   * user and the funded wallet exist, or neither does. A new wallet is seeded
   * with STARTING_BALANCE treats — a demo convenience standing in for the
   * human top-up flow, which is out of scope for this slice.
   */
  async register(dto: RegisterDto): Promise<AuthResult> {
    // Fail fast on obvious duplicates for a friendly 409 (the unique indexes
    // are the real guard against races).
    if (await this.usersService.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists.');
    }
    if (await this.usersService.findByCatName(dto.catName)) {
      throw new ConflictException('This catName is already taken.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const startingBalance = Number(this.config.get('STARTING_BALANCE', 100));

    let user: User;
    try {
      user = await this.dataSource.transaction(async (manager) => {
        const created = await this.usersService.create(
          {
            email: dto.email,
            passwordHash,
            catName: dto.catName,
            displayName: dto.displayName,
          },
          manager,
        );
        await this.walletsService.createForUser(
          created.id,
          startingBalance,
          manager,
        );
        return created;
      });
    } catch (err) {
      // A unique-constraint violation from a concurrent duplicate registration.
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Email or catName is already taken.');
      }
      throw err;
    }

    return this.buildResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    // Verify against the stored hash even conceptually of a missing user —
    // we return the same error for "no such user" and "wrong password" so the
    // API does not reveal which emails are registered.
    const passwordOk =
      !!user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.buildResult(user);
  }

  private buildResult(user: User): AuthResult {
    return {
      accessToken: this.issueToken(user),
      user: {
        id: user.id,
        catName: user.catName,
        displayName: user.displayName,
        email: user.email,
      },
    };
  }

  private issueToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, catName: user.catName };
    return this.jwtService.sign(payload);
  }

  private isUniqueViolation(err: unknown): boolean {
    const message = (err as { message?: string })?.message ?? '';
    return message.includes('UNIQUE constraint failed');
  }
}
