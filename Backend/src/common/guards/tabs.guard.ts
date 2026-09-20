// common/guards/tabs.guard.ts
//
// Must run AFTER JwtAuthGuard on a route (it reads req.user, which
// JwtAuthGuard populates) — apply as @UseGuards(JwtAuthGuard, TabsGuard).
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TABS_KEY } from '../decorators/tabs.decorator';

type RequestUser = { role?: string; tabs?: string[] };

/**
 * Enforces operator tab access on the API.
 *
 * `accessTabs` existed before this guard and was never checked anywhere on the
 * server. AuthService wrote the list into the JWT and the SPA used it to
 * filter the sidebar and guard routes — which is a display rule, not an
 * authorization one. An operator granted only "blog" could take the token out
 * of their own browser and call any admin endpoint: read every membership with
 * its email, phone and Google id, export the whole CRM, mark a payment
 * verified. Proven, not theorised: a token carrying tabs:['blog'] returned a
 * full membership document from GET /memberships.
 *
 * NON-OPERATORS ARE EXEMPT, and that is not a loophole. Owners and editors
 * carry no `tabs` claim at all (see AuthService) — the list is an operator-only
 * concept. Requiring it of everyone would lock the actual administrators out
 * of the dashboard on the first deploy.
 *
 * A route with no @Tabs() is unguarded by this, exactly as RolesGuard ignores a
 * route with no @Roles(). Both guards are opt-in per route.
 */
@Injectable()
export class TabsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(TABS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    // Only operators are scoped by tabs; see the note above.
    if (user?.role !== 'operator') return true;

    const held = user.tabs ?? [];
    if (!required.some((tab) => held.includes(tab))) {
      throw new ForbiddenException('Your account does not have access to that section.');
    }
    return true;
  }
}
