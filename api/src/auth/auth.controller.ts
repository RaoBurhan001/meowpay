import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthResult, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// A stricter, env-configurable rate limit for login than the global default —
// the primary defence against password brute-forcing.
const LOGIN_LIMIT = Number(process.env.THROTTLE_AUTH_LIMIT ?? 5);
const LOGIN_TTL = Number(process.env.THROTTLE_AUTH_TTL ?? 60_000);

/**
 * Thin HTTP layer for authentication. Validation is handled by the global
 * ValidationPipe against the DTOs; all logic lives in {@link AuthService}.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new cat (creates a funded wallet) and return a JWT' })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) // login is not a resource creation
  @Throttle({ default: { limit: LOGIN_LIMIT, ttl: LOGIN_TTL } })
  @ApiOperation({ summary: 'Log in with email + password and return a JWT' })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }
}
