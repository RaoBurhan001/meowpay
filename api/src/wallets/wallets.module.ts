import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { Wallet } from './wallet.entity';

/**
 * Wallet persistence + the balance/debit/credit primitives. Exports
 * {@link WalletsService} so AuthModule (registration) and TransfersModule
 * (money movement) can reuse the same battle-tested wallet operations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
