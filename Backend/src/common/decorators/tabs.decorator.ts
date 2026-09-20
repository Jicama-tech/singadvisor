import { SetMetadata } from '@nestjs/common';
import type { AccessTab } from '../../modules/operators/access-tabs';

export const TABS_KEY = 'access_tabs';

/**
 * Which main-sidebar tab an operator needs to reach this route.
 *
 * Typed to AccessTab rather than string, so a tab that is renamed in
 * access-tabs.ts breaks the build here instead of silently guarding nothing —
 * a guard that never matches is worse than no guard, because it looks present.
 *
 * Checked by TabsGuard, which must run after JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, TabsGuard)
 *   @Tabs('crm')
 */
export const Tabs = (...tabs: AccessTab[]) => SetMetadata(TABS_KEY, tabs);
