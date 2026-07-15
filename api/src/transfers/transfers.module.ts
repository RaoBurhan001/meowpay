import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { Transfer } from './transfer.entity';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

/**
 * The transfer slice. Reuses UsersService (resolve cats by handle) and
 * WalletsService (the atomic debit/credit primitives) rather than
 * re-implementing them — the composition that keeps money logic in one place.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Transfer]), UsersModule, WalletsModule],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
