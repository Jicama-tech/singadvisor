import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";

/** GET /whatsapp/broadcasts/contacts — enough to recognise and tick someone.
 * The number is masked; the server looks the real one up when it sends. */
export type PickableContact = {
  _id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  tags: string[];
  phone: string;
  /** Why this contact cannot be ticked, or null. */
  blocked: string | null;
};

/** The server's per-campaign ceiling. */
export const MAX_PICK = 500;

/**
 * Tick the people a campaign goes to, as in kioscart-v1's composer: search,
 * select all of what the search shows, and see at a glance who cannot be
 * messaged and why — no number, opted out — rather than finding out from the
 * skip list after the fact.
 */
export function WhatsappContactPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [contacts, setContacts] = useState<PickableContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let live = true;
    void (async () => {
      const res = await adminFetch(`${__API_URL__}/whatsapp/broadcasts/contacts`);
      if (!live) return;
      if (!res.ok) {
        setError("Could not load the contact list.");
        return;
      }
      setContacts((await res.json()) as PickableContact[]);
    })();
    return () => {
      live = false;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!contacts) return [];
    if (!needle) return contacts;
    return contacts.filter((c) =>
      [c.name, c.email, c.company, c.role, ...c.tags].some((f) => f.toLowerCase().includes(needle)),
    );
  }, [contacts, q]);

  const chosen = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    if (chosen.has(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < MAX_PICK) onChange([...selected, id]);
  }

  /** Everything the search shows that can be messaged, on top of what is
   * already ticked, up to the ceiling. */
  function selectShown() {
    const next = [...selected];
    const have = new Set(next);
    for (const c of visible) {
      if (next.length >= MAX_PICK) break;
      if (!c.blocked && !have.has(c._id)) {
        next.push(c._id);
        have.add(c._id);
      }
    }
    onChange(next);
  }

  function clearShown() {
    const shown = new Set(visible.map((c) => c._id));
    onChange(selected.filter((id) => !shown.has(id)));
  }

  if (error) {
    return <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, company, role or tag"
          className="max-w-sm"
          aria-label="Search contacts"
        />
        <button
          type="button"
          onClick={selectShown}
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          {q.trim() ? "Select all shown" : "Select all"}
        </button>
        <button
          type="button"
          onClick={clearShown}
          className="text-sm font-medium text-[var(--text-secondary)] hover:underline"
        >
          {q.trim() ? "Clear shown" : "Select none"}
        </button>
        <span className="ml-auto text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{selected.length}</span> of{" "}
          {contacts?.length ?? "…"} selected
          {selected.length >= MAX_PICK && ` (the limit for one campaign)`}
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--border-subtle)]">
        {contacts === null ? (
          <p className="p-4 text-sm text-[var(--text-muted)]">Loading contacts…</p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-sm text-[var(--text-muted)]">No contacts match.</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {visible.map((c) => {
              const checked = chosen.has(c._id);
              const disabled = !!c.blocked || (!checked && selected.length >= MAX_PICK);
              return (
                <li key={c._id}>
                  <label
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${
                      disabled ? "opacity-60" : "cursor-pointer hover:bg-[var(--surface-sunken)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled && !checked}
                      onChange={() => toggle(c._id)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[var(--text-primary)]">
                        {c.name || c.email}
                      </span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">
                        {[c.company, c.role, c.phone].filter(Boolean).join(" · ") || c.email}
                      </span>
                    </span>
                    {c.blocked && <Badge tone="neutral">{c.blocked}</Badge>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
