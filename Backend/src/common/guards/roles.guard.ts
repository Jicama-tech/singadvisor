// common/guards/roles.guard.ts
//
// Must run AFTER JwtAuthGuard on a route (it reads req.user, which
// JwtAuthGuard populates) — apply as @UseGuards(JwtAuthGuard, RolesGuard).
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

type RequestUser = { role?: string };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const role = request.user?.role;

    if (!role || !required.includes(role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
