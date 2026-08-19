import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { ACCESS_TABS, ACCESS_TAB_LABELS } from "@/lib/access-tabs";

/**
 * Settings → Operators: staff accounts with main-sidebar tab access.
 * Create/edit inline (the app's expand-in-place convention), access
 * granted per sidebar section with the same labels the admin sees in the
 * sidebar itself.
 */

type OperatorRow = {
  _id: string;
  name: string;
  email: string;
  accessTabs: string[];
  active: boolean;
  createdAt: string;
};

const GROUPS: { label: string; tabs: (keyof typeof ACCESS_TAB_LABELS)[] }[] = [
  { label: "Content", tabs: ["landing", "trainings", "events", "consultancy", "careers", "blog"] },
  { label: "Inbox", tabs: ["registrations", "enquiries", "applications", "messages"] },
  { label: "Other", tabs: ["overview", "settings"] },
];

export function OperatorsPanel() {
  const [operators, setOperators] = useState<OperatorRow[] | null>(null);
  const [editing, setEditing] = useState<OperatorRow | "new" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(`${__API_URL__}/operators`);
      if (res.ok) setOperators((await res.json()) as OperatorRow[]);
    } catch {
      setError("Could not load operators.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(op: OperatorRow) {
    await adminFetch(`${__API_URL__}/operators/${op._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !op.active }),
    });
    await load();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove operator "${name}"? They will no longer be able to sign in.`)) return;
    await adminFetch(`${__API_URL__}/operators/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {operators?.length ?? "…"} operator{operators?.length === 1 ? "" : "s"} — each signs in with their own
          email/password and sees only the sections granted below.
        </p>
        <Button size="sm" onClick={() => setEditing(editing === "new" ? null : "new")}>
          <Icon name="plus" size={16} />
          New operator
        </Button>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-on-soft)]">{message}</p>}

      {editing && (
        <OperatorForm
          key={editing === "new" ? "new" : editing._id}
          operator={editing === "new" ? null : editing}
          onDone={async () => {
            setEditing(null);
            setMessage("");
            await load();
          }}
          onError={setError}
        />
      )}

      <Panel>
        {operators && operators.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
            No operators yet — create the first one above.
          </p>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Operator</Th>
                <Th>Access</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(operators ?? []).map((op) => (
                <tr key={op._id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <span className="font-medium text-[var(--text-primary)]">{op.name}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{op.email}</span>
                  </Td>
                  <Td>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {op.accessTabs.length === 0
                        ? "No access"
                        : op.accessTabs
                            .map((t) => ACCESS_TAB_LABELS[t as keyof typeof ACCESS_TAB_LABELS] ?? t)
                            .join(" · ")}
                    </span>
                  </Td>
                  <Td>
                    <button type="button" onClick={() => toggleActive(op)} aria-label={`${op.active ? "Deactivate" : "Activate"} ${op.name}`}>
                      <Badge tone={op.active ? "success" : "neutral"}>{op.active ? "Active" : "Disabled"}</Badge>
                    </button>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${op.name}`}
                        onClick={() => setEditing(op)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="pencil" size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${op.name}`}
                        onClick={() => remove(op._id, op.name)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                      >
                        <Icon name="trash" size={16} />
                      </button>
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

function OperatorForm({
  operator,
  onDone,
  onError,
}: {
  operator: OperatorRow | null;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tabs, setTabs] = useState<string[]>(operator?.accessTabs ?? ["overview"]);
  // Browsers ignore autoComplete="off" on password fields they can pair with
  // the email input above and autofill the operator's saved password when the
  // edit form reopens. readOnly-until-focus is the reliable block — the field
  // becomes editable only once the user actually clicks in to type.
  const [passwordFocused, setPasswordFocused] = useState(false);

  function toggleTab(tab: string) {
    setTabs((prev) => (prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab]));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    setSaving(true);
    onError("");
    try {
      const res = await adminFetch(
        operator ? `${__API_URL__}/operators/${operator._id}` : `${__API_URL__}/operators`,
        {
          method: operator ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            accessTabs: tabs,
            ...(password ? { password } : {}),
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const m = body?.message;
        throw new Error(Array.isArray(m) ? m.join(" ") : m || "Could not save the operator.");
      }
      await onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save the operator.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="op-name" required>
            <Input id="op-name" name="name" required defaultValue={operator?.name} />
          </Field>
          <Field label="Email (their sign-in)" htmlFor="op-email" required>
            <Input id="op-email" name="email" type="email" required defaultValue={operator?.email} />
          </Field>
          <Field
            label={operator ? "New password" : "Password"}
            htmlFor="op-password"
            required={!operator}
            hint={operator ? "Leave blank to keep the current one." : "At least 8 characters."}
          >
            <Input
              id="op-password"
              name="password"
              type="password"
              autoComplete="off"
              readOnly={Boolean(operator) && !passwordFocused}
              onFocus={() => setPasswordFocused(true)}
              required={!operator}
              minLength={8}
            />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-[var(--text-primary)]">
            Access — which sidebar sections they can use
          </legend>
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{group.label}</p>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.tabs.map((tab) => (
                  <label key={tab} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={tabs.includes(tab)}
                      onChange={() => toggleTab(tab)}
                      className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                    />
                    {ACCESS_TAB_LABELS[tab]}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : operator ? "Save changes" : "Create operator"}
          </Button>
          <button
            type="button"
            onClick={() => void onDone()}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </Panel>
  );
}
