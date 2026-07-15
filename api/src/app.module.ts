import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    AuthModule,
    UsersModule,
    WalletsModule,
    TransfersModule,
  ],
})
export class AppModule {}
