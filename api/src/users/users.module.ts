import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Exposes {@link UsersService} to any module that needs to look up or create
 * accounts (AuthModule), and serves the recipient-search endpoint. Keeping
 * users in their own module makes the dependency explicit and the service
 * unit-testable in isolation.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
