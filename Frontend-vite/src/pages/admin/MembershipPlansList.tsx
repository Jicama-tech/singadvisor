import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { setMembershipPlanArchived } from "@/adminActions";
import { fetchPerkOptions, type MembershipPerkOption, type MembershipPlanDoc } from "@/lib/membershipsClient";
import { formatPrice } from "@/lib/utils";

/** Days → the words the form offered, so the column reads back the way it was
 * entered. Anything unrecognised keeps its day count, which is honest for a
 * custom term. */
function formatTerm(days: number): string {
  const known: Record<number, string> = {
    30: "1 month",
    90: "3 months",
    180: "6 months",
    365: "1 year",
    730: "2 years",
  };
  return known[days] ?? `${days} days`;
}

export default function MembershipPlansList() {
  const { user } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const [plans, setPlans] = useState<MembershipPlanDoc[] | null>(null);
  const [perkOptions, setPerkOptions] = useState<MembershipPerkOption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/memberships/admin/plans`);
    if (res.ok) setPlans((await res.json()) as MembershipPlanDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const options = await fetchPerkOptions();
      if (!cancelled) setPerkOptions(options);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** The label the catalogue gives a key, falling back to the key itself so an
   * unknown perk shows as something rather than disappearing. */
  const perkLabel = (key: string) =>
    perkOptions.find((p) => p.key === key)?.label ?? key;

  async function toggleArchive(plan: MembershipPlanDoc) {
    const archiving = !plan.archived;
    if (archiving) {
      const agreed = await confirm({
        title: `Archive “${plan.name}”?`,
        message: "It comes off the public list straight away and cannot be bought again.",
        detail:
          "Memberships already sold on it keep running to the end of their term, and stay readable here.",
        confirmLabel: "Archive",
        tone: "danger",
      });
      if (!agreed) return;
    }
    setBusyId(plan._id);
    try {
      await setMembershipPlanArchived(plan._id, archiving);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (!user) return null;

  const live = (plans ?? []).filter((p) => !p.archived);

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Membership plans"
        description={`${live.length} live plan${live.length === 1 ? "" : "s"}${
          plans && plans.length > live.length ? ` · ${plans.length - live.length} archived` : ""
        }`}
        action={
          <ButtonLink to="/admin/memberships/plans/new" size="sm">
            <Icon name="plus" size={16} />
            New plan
          </ButtonLink>
        }
      />

      <Panel>
        {plans && plans.length === 0 ? (
          <AdminEmpty message="No membership plans yet. Create your first one." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Plan</Th>
                <Th>Price</Th>
                <Th>Term</Th>
                <Th>Perks</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(plans ?? []).map((plan) => (
                <tr key={plan._id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <Link
                      to={`/admin/memberships/plans/${plan._id}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                    >
                      {plan.name}
                    </Link>
                    {plan.description && (
                      <span className="block text-xs text-[var(--text-muted)]">
                        {plan.description}
                      </span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {plan.priceCents > 0 ? formatPrice(plan.priceCents, plan.currency) : "Free"}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {formatTerm(plan.durationDays)}
                  </Td>
                  <Td>
                    {plan.perks.length === 0 ? (
                      <span className="text-xs text-[var(--text-muted)]">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {plan.perks.map((key) => (
                          <Badge key={key} tone="neutral">
                            {perkLabel(key)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {plan.archived ? (
                      <Badge tone="neutral">Archived</Badge>
                    ) : (
                      <Badge tone={plan.published ? "success" : "neutral"}>
                        {plan.published ? "On sale" : "Draft"}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/admin/memberships/plans/${plan._id}`}
                        aria-label={`Edit ${plan.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="pencil" size={15} />
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === plan._id}
                        onClick={() => void toggleArchive(plan)}
                      >
                        {plan.archived ? "Restore" : "Archive"}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {confirmDialog}
    </div>
  );
}
