import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletsService } from './wallets.service';

/**
 * Read access to the caller's own wallet. Guarded by JWT — a cat can only
 * ever see its own balance, identified from the token, never a wallet id in
 * the URL.
 */
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  async getMyBalance(
    @CurrentUser() user: AuthUser,
  ): Promise<{ balance: number; catName: string }> {
    const balance = await this.walletsService.getBalanceByUserId(user.userId);
    return { balance, catName: user.catName };
  }
}
