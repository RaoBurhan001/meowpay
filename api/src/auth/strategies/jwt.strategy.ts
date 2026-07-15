import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../decorators/current-user.decorator';
import { resolveJwtSecret } from '../jwt-secret.util';

/** The claims we sign into every access token. */
export interface JwtPayload {
  sub: string; // userId
  catName: string;
}

/**
 * Validates the `Authorization: Bearer <token>` header. passport-jwt has
 * already verified the signature and expiry by the time `validate` runs, so
 * we simply project the trusted claims into the {@link AuthUser} that
 * `@CurrentUser()` will expose to handlers.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return { userId: payload.sub, catName: payload.catName };
  }
}
