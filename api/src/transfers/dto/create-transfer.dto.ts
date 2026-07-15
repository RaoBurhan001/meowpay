import {
  IsInt,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Upper bound on a single transfer. Number.MAX_SAFE_INTEGER is the point past
 * which JS integer arithmetic loses precision, so we reject beyond it with a
 * clear message instead of letting an unsafe value slip through to the
 * balance check.
 */
const MAX_TREATS = Number.MAX_SAFE_INTEGER;

/**
 * Validated shape of a "send treats" request.
 *
 * `amount` must be a positive integer — treats are whole, indivisible units,
 * so fractional or zero/negative amounts are rejected at the edge.
 */
export class CreateTransferDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  recipientCatName: string;

  @IsInt({ message: 'amount must be a whole number of treats.' })
  @IsPositive({ message: 'amount must be greater than zero.' })
  @Max(MAX_TREATS, { message: 'amount is too large.' })
  amount: number;

  /**
   * Client-generated unique key for this logical send. Re-submitting the same
   * key (a double-click, a retry after a dropped response) will NOT move
   * treats twice — see TransfersService.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  idempotencyKey: string;
}
