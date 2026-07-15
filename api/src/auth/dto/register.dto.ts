import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Validated shape of a registration request. The global ValidationPipe
 * rejects anything that violates these rules with a 400 before the request
 * ever reaches the controller, so the service can trust its input.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'A valid email is required.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(72, { message: 'Password must be at most 72 characters.' })
  password: string;

  /** Public handle used to address transfers; letters, numbers, _ and -. */
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'catName may only contain letters, numbers, underscore or dash.',
  })
  catName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  displayName: string;
}
