/**
 * Deliberately shaped to match Frontend/src/lib/auth.ts's `SessionPayload`
 * exactly, so a token signed here verifies against the Frontend's existing
 * jose-based `verifySession` without any change to that code (acceptance
 * criteria, Phase 1 of the modernization proposal).
 */
export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: 'owner' | 'editor';
};
