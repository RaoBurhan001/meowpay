import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards routes behind a valid JWT. Applied with `@UseGuards(JwtAuthGuard)`.
 * A thin, named wrapper over passport's `'jwt'` strategy so controllers read
 * clearly and we have a single place to extend auth behaviour later.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
