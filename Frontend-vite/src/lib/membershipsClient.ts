/**
 * The membership module's wire types and reads.
 *
 * The perk catalogue is NOT redeclared here. It is served from the Backend at
 * /memberships/perks, which is the same list the plan schema's enum and the
 * save DTO validate against — a second copy in the frontend would be a fifth
 * place to edit and the one place nothing would catch drifting.
 */

/** Mirrors MEMBERSHIP_PERKS in the Backend's membership-perks.ts. */
export type MembershipPerkOption = {
  key: string;
  label: string;
  description: string;
};

export type MembershipPlanDoc = {
  _id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  durationDays: number;
  perks: string[];
  published: boolean;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type MembershipStatus = "pending" | "active" | "expired" | "cancelled";
export type MembershipPaymentStatus = "not-required" | "unpaid" | "claimed" | "paid";

export type MembershipDoc = {
  _id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  planId: string;
  /** Snapshotted at purchase, so the row still names what was bought after the
   * plan is renamed or archived — and so this list needs no join. */
  planName: string;
  perks: string[];
  durationDays: number;
  status: MembershipStatus;
  startDate: string | null;
  endDate: string | null;
  amountCents: number;
  currency: string;
  paymentStatus: MembershipPaymentStatus;
  paymentRef: string | null;
  payerReference: string | null;
  paymentClaimedAt: string | null;
  paymentVerifiedAt: string | null;
  createdAt?: string;
};

/** Public — the catalogue, for the admin form's tickboxes. Falls back to an
 * empty list rather than throwing: a form that cannot reach the API should
 * still render its other fields instead of blanking the page. */
export async function fetchPerkOptions(): Promise<MembershipPerkOption[]> {
  try {
    const res = await fetch(`${__API_URL__}/memberships/perks`);
    if (!res.ok) return [];
    return (await res.json()) as MembershipPerkOption[];
  } catch {
    return [];
  }
}

/** Public — the plans on sale. */
export async function fetchPublicPlans(): Promise<MembershipPlanDoc[]> {
  const res = await fetch(`${__API_URL__}/memberships/plans`);
  if (!res.ok) return [];
  return (await res.json()) as MembershipPlanDoc[];
}
