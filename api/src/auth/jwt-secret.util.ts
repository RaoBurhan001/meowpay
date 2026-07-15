import { ConfigService } from '@nestjs/config';

/**
 * Resolves the JWT signing/verification secret, failing CLOSED in production.
 *
 * A money app must never sign tokens with a publicly-known default. If
 * JWT_SECRET is unset while running in production we throw at startup rather
 * than silently booting with a guessable secret (which would let anyone forge
 * a token for any account). Outside production we allow a dev default so a
 * fresh clone runs with zero config. Centralised here so the module and the
 * passport strategy stay in lockstep.
 */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be set in production — refusing to start with a default secret.',
    );
  }
  return 'dev-super-secret-change-me';
}
