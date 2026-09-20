import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { PageHeading } from "@/components/admin/AdminUI";
import {
  MembershipPlanForm,
  type MembershipPlanFormShape,
} from "@/components/admin/MembershipPlanForm";
import { saveMembershipPlan } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import type { MembershipPlanDoc } from "@/lib/membershipsClient";

/** Minor units → the major ones the admin typed. The only conversion on the
 * way in; adminActions does the matching one on the way out. */
function toFormShape(plan: MembershipPlanDoc): MembershipPlanFormShape {
  return {
    id: plan._id,
    name: plan.name,
    description: plan.description,
    price: plan.priceCents / 100,
    currency: plan.currency,
    durationDays: plan.durationDays,
    perks: plan.perks,
    published: plan.published,
  };
}

export default function MembershipPlanEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<MembershipPlanFormShape | undefined>(undefined);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        // There is no single-plan admin route: the list is short by nature, so
        // the row is picked out of it rather than adding an endpoint whose
        // only caller would be this page.
        const res = await adminFetch(`${__API_URL__}/memberships/admin/plans`);
        if (res.ok && !cancelled) {
          const all = (await res.json()) as MembershipPlanDoc[];
          const found = all.find((p) => p._id === id);
          if (found) setPlan(toFormShape(found));
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!user) return null;

  const onSubmit = async (fd: FormData): Promise<FormState> => {
    const result = await saveMembershipPlan(fd);
    if (result.ok) navigate("/admin/memberships/plans");
    return result;
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title={id ? "Edit plan" : "New membership plan"}
        description={
          id
            ? "Changes apply to the plan as sold from now on — memberships already bought keep the terms they were sold on."
            : "Set the price, the term and what it includes."
        }
      />
      {loaded && <MembershipPlanForm plan={plan} action={onSubmit} />}
    </div>
  );
}
