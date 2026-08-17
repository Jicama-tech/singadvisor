import { useState, type FormEvent } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Panel } from "@/components/admin/AdminUI";

/**
 * Settings → Profile: the logged-in user's own display name and password
 * (works for admins AND operators — the backend dispatches by token role).
 */
export function ProfilePanel({
  name,
  email,
  onMessage,
  onError,
}: {
  name: string;
  email: string;
  onMessage: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newName = String(fd.get("name") ?? "");
    setSavingName(true);
    onError("");
    try {
      const res = await adminFetch(`${__API_URL__}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Could not save your name.");
      }
      onMessage("Profile saved.");
      // The JWT still carries the old name until the next login — that only
      // affects the sidebar display name; refresh for consistency.
      window.location.reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save your name.");
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    if (newPassword.length < 8) {
      onError("New password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    onError("");
    try {
      const res = await adminFetch(`${__API_URL__}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Could not change your password.");
      }
      onMessage("Password changed.");
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not change your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel className="p-6">
        <h2 className="text-lg">Profile</h2>
        <form onSubmit={saveName} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="p-name" required>
              <Input id="p-name" name="name" required defaultValue={name} />
            </Field>
            <Field label="Email (sign-in)" htmlFor="p-email">
              <Input id="p-email" value={email} disabled />
            </Field>
          </div>
          <div>
            <Button type="submit" disabled={savingName}>
              {savingName ? "Saving…" : "Save name"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-lg">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password" htmlFor="p-current" required>
              <Input id="p-current" name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="New password" htmlFor="p-new" hint="At least 8 characters" required>
              <Input id="p-new" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
          </div>
          <div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
