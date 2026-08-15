import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Route-level role gate, checked by RolesGuard against req.user.role. */
export const Roles = (...roles: Array<'owner' | 'editor'>) => SetMetadata(ROLES_KEY, roles);
