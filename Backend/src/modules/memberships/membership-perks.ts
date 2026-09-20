/**
 * What a plan can promise, as a closed list rather than free text.
 *
 * eventsh-v1's equivalent is `perks: string[]` — whatever the organizer typed,
 * rendered on a card and meaning nothing to the code. That is fine for a
 * bullet list and useless for anything that has to be enforced: no amount of
 * string matching turns "Free newsletter!!" into a subscription.
 *
 * These are keys instead: the admin ticks them, the plan stores them, and code
 * can act on a key where free text gives it nothing to act on.
 *
 * What each one currently DOES, since it differs and the form no longer says:
 *
 * - `emails` is the only one any code reads. Activation subscribes the member
 *   (MembershipsService.applyPerks); expiry or cancellation unsubscribes, but
 *   only what the membership itself subscribed.
 * - `early-access` and `members-content` are recorded on the plan and shown to
 *   the reader, and nothing gates on either. Members-only articles and issues
 *   are real and work — but the gate asks `isActiveMember`, which is
 *   deliberately perk-agnostic, so ticking `members-content` changes nothing.
 *   Making it load-bearing would mean a plan could be sold whose members
 *   silently cannot open the thing they joined for.
 *
 * A `course-discount` perk used to sit here, cutting a percentage off every
 * enrolment. It was removed deliberately: a membership no longer changes what
 * a course costs, and nothing in this codebase may reduce a training's price.
 * The field it depended on is gone from both entities too — see
 * scripts/drop-membership-discount.ts for the data side.
 *
 * Adding a perk is adding an entry here: the DTO validates against these keys,
 * the plan schema's enum validates against them, and the admin form renders
 * from them, so a new one cannot be half-wired.
 */
export const MEMBERSHIP_PERKS = [
  {
    key: 'emails',
    label: 'Receive emails',
    description: 'Newsletter and announcement emails.',
  },
  {
    key: 'early-access',
    label: 'Early access to new courses & events',
    description: 'Recorded on the membership and listed on the plan.',
  },
  {
    key: 'members-content',
    label: 'Members-only content',
    description: 'Recorded on the membership and listed on the plan.',
  },
] as const;

export type MembershipPerk = (typeof MEMBERSHIP_PERKS)[number]['key'];

/** The same list as bare keys, for the schema enum and the DTO's @IsIn. */
export const MEMBERSHIP_PERK_KEYS = MEMBERSHIP_PERKS.map(
  (perk) => perk.key,
) as MembershipPerk[];

/** Named rather than spelled out at the call sites that switch on them, so a
 * renamed key breaks the build instead of silently never matching. */
export const PERK_EMAILS: MembershipPerk = 'emails';
