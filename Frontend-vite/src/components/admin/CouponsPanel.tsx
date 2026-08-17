
import { useActionState, useEffect, useState } from "react";
import { deleteCouponAction, saveCoupon, toggleCouponActive } from "@/app/admin/actions";
import { AdminEmpty, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { FormError, SubmitButton } from "@/components/forms/FormShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { emptyFormState } from "@/lib/form-state";
import type { CouponRow } from "@/lib/events-admin-client";
import { formatDate } from "@/lib/utils";

/**
 * eventsh's own Coupons tab (CouponsManager.tsx) uses a modal dialog; this
 * app has no Dialog primitive and its own convention is inline
 * expand-in-place forms (nothing in the codebase uses a modal for
 * create/edit) — so "New coupon" / "Edit" open an inline Panel instead,
 * closed again once the save action succeeds.
 */
export function CouponsPanel({
  coupons,
  events,
}: {
  coupons: CouponRow[];
  events: { _id: string; title: string }[];
}) {
  const [editing, setEditing] = useState<CouponRow | "new" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {coupons.length} coupon{coupons.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setEditing(editing === "new" ? null : "new")}>
          <Icon name="plus" size={16} />
          New coupon
        </Button>
      </div>

      {editing && (
        <CouponForm
          coupon={editing === "new" ? null : editing}
          events={events}
          onDone={() => setEditing(null)}
        />
      )}

      <Panel>
        {coupons.length === 0 ? (
          <AdminEmpty message="No coupons yet. Create your first one." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Usage</Th>
                <Th>Expires</Th>
                <Th>Applies to</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id} className="hover:bg-[var(--surface-sunken)]">
                  <Td className="font-medium text-[var(--text-primary)]">{c.code}</Td>
                  <Td className="text-[var(--text-secondary)]">
                    {c.discountType === "PERCENTAGE"
                      ? `${c.discountPercentage ?? 0}%`
                      : c.flatDiscountAmount ?? 0}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {c.usedCount}
                    {c.maxUsage ? ` / ${c.maxUsage}` : ""}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {formatDate(c.expiryDate)}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {c.eventIds.length === 0
                      ? "All events"
                      : `${c.eventIds.length} event${c.eventIds.length === 1 ? "" : "s"}`}
                  </Td>
                  <Td>
                    <form action={toggleCouponActive}>
                      <input type="hidden" name="id" value={c._id} />
                      <input type="hidden" name="isActive" value={(!c.isActive).toString()} />
                      <button
                        type="submit"
                        aria-label={`${c.isActive ? "Deactivate" : "Activate"} ${c.code}`}
                      >
                        <Badge tone={c.isActive ? "success" : "neutral"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </form>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${c.code}`}
                        onClick={() => setEditing(c)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="pencil" size={15} />
                      </button>
                      <DeleteButton id={c._id} action={deleteCouponAction} label={c.code} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}

function CouponForm({
  coupon,
  events,
  onDone,
}: {
  coupon: CouponRow | null;
  events: { _id: string; title: string }[];
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(saveCoupon, emptyFormState);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT">(
    coupon?.discountType ?? "PERCENTAGE",
  );

  // No redirect here (unlike saveEvent) — this form stays inline on the same
  // page, so success is "close the form", not "navigate away".
  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Panel className="p-6">
      <form action={formAction} className="flex flex-col gap-4">
        {coupon && <input type="hidden" name="id" value={coupon._id} />}
        <FormError state={state} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" htmlFor="coupon-code" error={state.errors?.code} required>
            <Input
              id="coupon-code"
              name="code"
              defaultValue={state.values?.code ?? coupon?.code}
              disabled={!!coupon}
              required
            />
          </Field>

          <Field label="Discount type" htmlFor="coupon-discountType">
            <Select
              id="coupon-discountType"
              name="discountType"
              defaultValue={discountType}
              onChange={(e) => setDiscountType(e.target.value as "PERCENTAGE" | "FLAT")}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FLAT">Flat amount</option>
            </Select>
          </Field>

          {discountType === "PERCENTAGE" ? (
            <Field label="Discount %" htmlFor="coupon-discountPercentage" required>
              <Input
                id="coupon-discountPercentage"
                name="discountPercentage"
                type="number"
                min={1}
                max={100}
                defaultValue={coupon?.discountPercentage}
                required
              />
            </Field>
          ) : (
            <Field label="Flat discount" htmlFor="coupon-flatDiscountAmount" required>
              <Input
                id="coupon-flatDiscountAmount"
                name="flatDiscountAmount"
                type="number"
                min={1}
                defaultValue={coupon?.flatDiscountAmount}
                required
              />
            </Field>
          )}

          <Field label="Minimum order amount" htmlFor="coupon-minOrderAmount" hint="Optional">
            <Input
              id="coupon-minOrderAmount"
              name="minOrderAmount"
              type="number"
              min={0}
              defaultValue={coupon?.minOrderAmount}
            />
          </Field>

          <Field
            label="Max usage"
            htmlFor="coupon-maxUsage"
            hint="Optional — leave blank for unlimited"
          >
            <Input
              id="coupon-maxUsage"
              name="maxUsage"
              type="number"
              min={1}
              defaultValue={coupon?.maxUsage}
            />
          </Field>

          <Field
            label="Expiry date"
            htmlFor="coupon-expiryDate"
            error={state.errors?.expiryDate}
            required
          >
            <Input
              id="coupon-expiryDate"
              name="expiryDate"
              type="date"
              defaultValue={coupon?.expiryDate ? coupon.expiryDate.slice(0, 10) : undefined}
              required
            />
          </Field>
        </div>

        <Field
          label="Applies to"
          htmlFor="coupon-eventIds"
          hint="Leave everything unchecked for an organizer-wide coupon."
        >
          <div
            id="coupon-eventIds"
            className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-xl border border-[var(--border-strong)] p-3"
          >
            {events.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No events yet.</p>
            ) : (
              events.map((e) => (
                <label key={e._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="eventIds"
                    value={e._id}
                    defaultChecked={coupon?.eventIds.includes(e._id)}
                    className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                  />
                  {e.title}
                </label>
              ))
            )}
          </div>
        </Field>

        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Saving…">
            {coupon ? "Save changes" : "Create coupon"}
          </SubmitButton>
          <button
            type="button"
            onClick={onDone}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </Panel>
  );
}
