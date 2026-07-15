import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * The authenticated principal attached to the request by JwtStrategy.
 * Kept deliberately small — just what handlers need to act on behalf of the
 * caller.
 */
export interface AuthUser {
  userId: string;
  catName: string;
}

/**
 * Injects the current {@link AuthUser} into a controller handler, e.g.
 * `getBalance(@CurrentUser() user: AuthUser)`. Removes the repeated
 * `req.user` boilerplate from every guarded endpoint (DRY).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
