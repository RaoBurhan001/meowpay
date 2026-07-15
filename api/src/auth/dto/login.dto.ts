import { IsEmail, IsString, MinLength } from 'class-validator';

/** Validated shape of a login request. */
export class LoginDto {
  @IsEmail({}, { message: 'A valid email is required.' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  password: string;
}
