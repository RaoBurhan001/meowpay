import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransferDto } from './dto/create-transfer.dto';
import {
  TransferHistoryItem,
  TransfersService,
  TransferView,
} from './transfers.service';

/**
 * The "send treats" endpoints. Both are JWT-guarded: the sender is always the
 * authenticated cat (taken from the token), never a field in the request, so
 * one cat can never spend another's treats.
 */
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferView> {
    return this.transfersService.createTransfer(user.userId, dto);
  }

  @Get()
  history(@CurrentUser() user: AuthUser): Promise<TransferHistoryItem[]> {
    return this.transfersService.getHistoryForUser(user.userId);
  }
}
