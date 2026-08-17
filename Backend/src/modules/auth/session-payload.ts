/**
 * Deliberately shaped to match Frontend/src/lib/auth.ts's `SessionPayload`
 * exactly, so a token signed here verifies against the Frontend's existing
 * jose-based `verifySession` without any change to that code (acceptance
 * criteria, Phase 1 of the modernization proposal). Operators (Settings →
 * Operators) sign in through the same login endpoint and carry their
 * main-sidebar access keys in the token so the SPA can filter the nav
 * without an extra round trip.
 */
export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: 'owner' | 'editor' | 'operator';
  /** Operator only — the main-sidebar keys this account may see. */
  tabs?: string[];
};
