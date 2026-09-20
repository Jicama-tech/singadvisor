import { useEffect, useState } from "react";
import { saveMembershipPlan } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { fetchPerkOptions, type MembershipPerkOption } from "@/lib/membershipsClient";

export type MembershipPlanFormShape = {
  id: string;
  name: string;
  description: string;
  /** Major units, because that is what the admin types. adminActions converts
   * to the minor units the Backend stores. */
  price: number;
  currency: string;
  durationDays: number;
  perks: string[];
  published: boolean;
};

/** What the duration field offers, with the free-text box behind "Custom".
 * Terms in this business are round numbers, and typing 365 every time is a
 * worse default than picking "1 year". */
const TERMS = [
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 730, label: "2 years" },
];

const CURRENCIES = ["SGD", "USD", "MYR", "INR"];

export function MembershipPlanForm({
  plan,
  action = saveMembershipPlan,
}: {
  plan?: MembershipPlanFormShape;
  action?: (formData: FormData) => Promise<FormState | void>;
}) {
  /**
   * The catalogue comes from the Backend rather than a copy kept here, so a
   * perk added there appears on this form without a frontend change and cannot
   * drift from what the API will actually accept.
   */
  const [perkOptions, setPerkOptions] = useState<MembershipPerkOption[]>([]);
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

  /** Which perks are ticked. Tracked in React rather than left to the DOM so
   * the checkboxes stay controlled and a failed submit repopulates them. */
  const [perks, setPerks] = useState<string[]>(plan?.perks ?? []);
  const togglePerk = (key: string, on: boolean) =>
    setPerks((current) =>
      on ? [...new Set([...current, key])] : current.filter((p) => p !== key),
    );

  const [term, setTerm] = useState<string>(() => {
    const days = plan?.durationDays ?? 365;
    return TERMS.some((t) => t.days === days) ? String(days) : "custom";
  });

  return (
    <AdminForm
      action={action}
      id={plan?.id}
      cancelHref="/admin/memberships/plans"
      submitLabel={plan ? "Save changes" : "Create plan"}
    >
      {(errors, values) => {
        // Unchecked boxes are absent from FormData entirely, so a checkbox can
        // only be read back once a submission has actually happened.
        const submitted = Object.keys(values).length > 0;
        return (
          <>
            <FormSection title="The plan">
              <Field label="Name" htmlFor="mp-name" required error={errors.name}>
                <Input
                  id="mp-name"
                  name="name"
                  required
                  placeholder="Gold"
                  defaultValue={values.name ?? plan?.name}
                />
              </Field>

              <Field
                label="Description"
                htmlFor="mp-description"
                hint="One or two lines, shown on the plan card."
                error={errors.description}
              >
                <Textarea
                  id="mp-description"
                  name="description"
                  rows={2}
                  defaultValue={values.description ?? plan?.description}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Price"
                  htmlFor="mp-price"
                  hint="Leave at 0 for a free tier — it activates the moment it is taken, with no payment step."
                  error={errors.price}
                >
                  <Input
                    id="mp-price"
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={values.price ?? plan?.price ?? 0}
                  />
                </Field>

                <Field label="Currency" htmlFor="mp-currency" error={errors.currency}>
                  <Select
                    id="mp-currency"
                    name="currency"
                    key={values.currency ?? plan?.currency ?? "SGD"}
                    defaultValue={values.currency ?? plan?.currency ?? "SGD"}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Term"
                  htmlFor="mp-term"
                  hint="Counted from the day the membership is activated."
                  error={errors.durationDays}
                >
                  <Select
                    id="mp-term"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  >
                    {TERMS.map((t) => (
                      <option key={t.days} value={t.days}>
                        {t.label}
                      </option>
                    ))}
                    <option value="custom">Custom…</option>
                  </Select>
                </Field>

                {/* The submitted field either way — a hidden input for a picked
                    term, a real box for a custom one — so the action reads one
                    name and never has to know which control was on screen. */}
                {term === "custom" ? (
                  <Field label="Days" htmlFor="mp-days" error={errors.durationDays}>
                    <Input
                      id="mp-days"
                      name="durationDays"
                      type="number"
                      min={1}
                      max={3650}
                      defaultValue={values.durationDays ?? plan?.durationDays ?? 365}
                    />
                  </Field>
                ) : (
                  <input type="hidden" name="durationDays" value={term} />
                )}
              </div>
            </FormSection>

            <FormSection
              title="Perks"
              description="What this plan includes. Membership does not change what a course costs — only what a member can read and receive."
            >
              {perkOptions.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Loading the perk list…</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {perkOptions.map((perk) => {
                    const checked = perks.includes(perk.key);
                    return (
                      <label key={perk.key} className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          name="perks"
                          value={perk.key}
                          checked={checked}
                          onChange={(e) => togglePerk(perk.key, e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                        />
                        <span>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {perk.label}
                          </span>
                          <span className="block text-xs text-[var(--text-muted)]">
                            {perk.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </FormSection>

            <FormSection title="Visibility">
              <Toggle
                name="published"
                label="Published"
                hint="Unpublished plans are hidden from the public list and cannot be bought."
                defaultChecked={
                  submitted ? values.published === "true" : (plan?.published ?? false)
                }
              />
            </FormSection>
          </>
        );
      }}
    </AdminForm>
  );
}
