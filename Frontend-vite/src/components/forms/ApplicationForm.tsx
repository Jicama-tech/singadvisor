
import { useRef, useState } from "react";
import { submitApplication } from "@/app/actions";
import { FormError, FormSuccess, SubmitButton, useClientAction } from "@/components/forms/FormShell";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { PhoneField } from "@/components/ui/PhoneField";
import { Icon } from "@/components/ui/Icon";
import {
  RESUME_ACCEPTED_EXTENSIONS,
  RESUME_MAX_BYTES,
} from "@/lib/constants";

export function ApplicationForm({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  const { state, pending, onSubmit } = useClientAction(submitApplication);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Client-side size check is a courtesy so a large file is not uploaded only
  // to be rejected; the server re-checks it regardless.
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setFileError(null);
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      setFileError("That file is over 5 MB. Please upload a smaller version.");
      setFileName(null);
      e.target.value = "";
      return;
    }
    setFileError(null);
    setFileName(file.name);
  }

  if (state.ok && state.message) return <FormSuccess message={state.message} />;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="jobId" value={jobId} />

      <FormError state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="app-name" required error={state.errors?.name}>
          <Input
            id="app-name"
            defaultValue={state.values?.name}
            name="name"
            required
            autoComplete="name"
            placeholder="Jane Tan"
            aria-invalid={!!state.errors?.name}
          />
        </Field>

        <Field label="Email" htmlFor="app-email" required error={state.errors?.email}>
          <Input
            id="app-email"
            defaultValue={state.values?.email}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jane@example.com"
            aria-invalid={!!state.errors?.email}
          />
        </Field>

        <PhoneField
          name="phone"
          label="Contact number"
          required
          defaultValue={state.values?.phone}
          error={state.errors?.phone}
        />

        <Field
          label="LinkedIn"
          htmlFor="app-linkedin"
          hint="Optional"
          error={state.errors?.linkedin}
        >
          <Input
            id="app-linkedin"
            defaultValue={state.values?.linkedin}
            name="linkedin"
            type="url"
            placeholder="https://linkedin.com/in/…"
            aria-invalid={!!state.errors?.linkedin}
          />
        </Field>
      </div>

      <Field
        label="Portfolio or website"
        htmlFor="app-portfolio"
        hint="Optional — especially useful for design roles"
        error={state.errors?.portfolio}
      >
        <Input
          id="app-portfolio"
          defaultValue={state.values?.portfolio}
          name="portfolio"
          type="url"
          placeholder="https://…"
          aria-invalid={!!state.errors?.portfolio}
        />
      </Field>

      {/* ---- Resume upload ------------------------------------------- */}
      <Field
        label="Resume"
        htmlFor="app-resume"
        hint={`PDF, DOC or DOCX · up to 5 MB`}
        error={fileError ?? state.errors?.resume}
      >
        <input
          ref={inputRef}
          id="app-resume"
          name="resume"
          type="file"
          accept={RESUME_ACCEPTED_EXTENSIONS.join(",")}
          onChange={onFileChange}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-4 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
            <Icon name={fileName ? "check" : "upload"} size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
              {fileName ?? "Choose a file"}
            </span>
            <span className="block text-xs text-[var(--text-muted)]">
              {fileName ? "Click to replace" : "or drag it onto this box"}
            </span>
          </span>
        </button>
      </Field>

      <Field
        label={`Why this role?`}
        htmlFor="app-cover"
        required
        hint="A short paragraph is plenty. We read every one."
        error={state.errors?.coverLetter}
      >
        <Textarea
          id="app-cover"
          defaultValue={state.values?.coverLetter}
          name="coverLetter"
          rows={6}
          required
          placeholder={`I'm applying for ${jobTitle} because…`}
          aria-invalid={!!state.errors?.coverLetter}
        />
      </Field>

      <SubmitButton pendingLabel="Submitting…" className="w-full sm:w-auto">
        Submit application
      </SubmitButton>

      <p className="text-xs text-[var(--text-muted)]">
        Your application is used only for this role and kept for 12 months. We
        reply to every applicant, either way.
      </p>
    </form>
  );
}
