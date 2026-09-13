/** Enrolment.sfcClaimWindowClosesAt for a run ending at `runEndsAt`: the day
 * before the run ends. Null while the run has no sessions to end with. */
export function sfcClaimWindowClosesAt(runEndsAt: Date | null): Date | null {
  return runEndsAt ? new Date(runEndsAt.getTime() - 24 * 60 * 60 * 1000) : null;
}
