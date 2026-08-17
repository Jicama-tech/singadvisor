import { subscribe } from "@/app/actions";
import { useClientAction } from "@/components/forms/FormShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function NewsletterForm() {
  const { state, pending, onSubmit } = useClientAction(subscribe);

  if (state.ok) {
    return (
      <p
        role="status"
        className="rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-on-soft)]"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex gap-2">
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="min-w-0"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "Join"}
        </Button>
      </div>
      {(state.errors?.email || state.message) && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.errors?.email ?? state.message}
        </p>
      )}
    </form>
  );
}
