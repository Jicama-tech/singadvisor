/**
 * Who is asking for a piece of content.
 *
 * Deliberately tiny, and deliberately a required-with-a-default argument on
 * every gated read rather than something fished out of a request. Two
 * consequences, both the point:
 *
 * 1. **Fail closed by signature.** Every existing caller of a gated method —
 *    the admin screens, ShareService's OG renderer, the cron, whatever gets
 *    written next — keeps compiling and silently receives the anonymous,
 *    withheld answer. Opening the gate takes a deliberate argument that can
 *    only be built by verifying something.
 *
 * 2. **One gate, not several.** ShareService calls BlogService.findBySlugPublic
 *    and NewsletterService.findBySlugPublic in-process. A gate bolted to the
 *    controller, or added as a parallel "members" route, is bypassed by that
 *    caller by construction. Putting it inside the read itself means there is
 *    no way out of the service that skips it.
 *
 * It says nothing about WHO the viewer is — no email, no id. A membership is
 * the only question any of this asks, and carrying an identity around would
 * invite reads that are about the person rather than the entitlement.
 */
export type Viewer = {
  isMember: boolean;
};

/** The default for every gated read. Named rather than written inline so the
 * call sites read as a decision rather than an oversight. */
export const ANONYMOUS: Viewer = { isMember: false };

/** Built only after a credential has actually been verified. */
export function memberViewer(isMember: boolean): Viewer {
  return { isMember };
}

/**
 * The view behind the admin guard: the people who write the content can read
 * it.
 *
 * Named rather than an inline `{ isMember: true }` so that every place the gate
 * is deliberately open is greppable, and so nobody reaches for the literal on a
 * public path. Only ever passed from a route carrying JwtAuthGuard, or from a
 * service method that exists solely to serve one.
 */
export const PRIVILEGED: Viewer = { isMember: true };
