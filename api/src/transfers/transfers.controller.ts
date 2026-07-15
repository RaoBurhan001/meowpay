import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransferDto } from './dto/create-transfer.dto';
import {
  DEFAULT_HISTORY_LIMIT,
  PaginatedTransfers,
  TransfersService,
  TransferView,
} from './transfers.service';

/**
 * The "send treats" endpoints. Both are JWT-guarded: the sender is always the
 * authenticated cat (taken from the token), never a field in the request, so
 * one cat can never spend another's treats.
 */
@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Send treats to another cat (idempotent, atomic)' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferView> {
    return this.transfersService.createTransfer(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List the authenticated cat\'s transfer history (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: DEFAULT_HISTORY_LIMIT })
  history(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(DEFAULT_HISTORY_LIMIT), ParseIntPipe)
    limit: number,
  ): Promise<PaginatedTransfers> {
    return this.transfersService.getHistoryForUser(user.userId, page, limit);
  }
}
