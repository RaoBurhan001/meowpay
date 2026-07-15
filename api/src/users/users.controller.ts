import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

/**
 * Read access to other cats, used by the recipient autocomplete. Guarded by
 * JWT and always excludes the caller, so it only ever surfaces valid transfer
 * targets and never leaks anything beyond a public handle + display name.
 */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search cats by catName prefix (recipient autocomplete)' })
  search(
    @CurrentUser() user: AuthUser,
    @Query('q') q = '',
  ): Promise<Array<{ catName: string; displayName: string }>> {
    return this.usersService.searchByCatName(q, user.userId);
  }
}
