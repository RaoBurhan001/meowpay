import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { buildDataSourceOptions } from './database/data-source';
import { TransfersModule } from './transfers/transfers.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';

/**
 * Root module. Loads env config globally, opens the SQLite connection from the
 * shared options factory, and composes the feature modules that make up the
 * "send treats" slice.
 *
 * A global rate limiter (ThrottlerGuard) caps requests per IP as a baseline
 * abuse/brute-force defence; the login route tightens this further. Limits are
 * env-configurable so tests can run without tripping them.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60_000), // window, ms
        limit: Number(process.env.THROTTLE_LIMIT ?? 100), // requests / window / IP
      },
    ]),
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    AuthModule,
    UsersModule,
    WalletsModule,
    TransfersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
