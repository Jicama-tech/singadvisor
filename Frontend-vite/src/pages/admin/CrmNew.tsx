import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FormSection } from "@/components/admin/AdminForm";
import { PageHeading } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { createContact } from "@/lib/crmClient";

export default function CrmNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSaving(true);
    try {
      const contact = await createContact({
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
      });
      navigate(`/admin/crm/${contact._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the contact.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeading title="New contact" description="Add someone who didn't come through a form." />

      <FormSection title="Details">
        <Field label="Email" htmlFor="new-email" required>
          <Input
            id="new-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="new-name">
            <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="new-phone">
            <Input id="new-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="Company" htmlFor="new-company">
          <Input id="new-company" value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Create contact"}
          </Button>
          <button
            type="button"
            onClick={() => navigate("/admin/crm")}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      </FormSection>
    </form>
  );
}
