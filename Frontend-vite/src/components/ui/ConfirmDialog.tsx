import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";

/**
 * The admin's confirmation dialog, on the app's own Dialog primitive.
 *
 * It replaces the browser's confirm(), which renders as OS chrome — the wrong
 * typeface, the wrong colours, no dark mode, and a "localhost:3200 says" line
 * above every carefully written prompt.
 *
 * A hook that hands back its own dialog, rather than a provider:
 *
 * - Native confirm() is synchronous and a React dialog cannot be, so every
 *   caller changes shape anyway. `await confirm({…})` keeps that change to one
 *   line — the familiar `if (!confirm(x)) return;` guard survives as
 *   `if (!(await confirm(x))) return;`.
 * - The alternative is a provider at the app root, which would put a dialog
 *   nobody on the public site can open into every public page's tree to serve
 *   six admin call sites. A confirmation belongs to the screen that asks, and
 *   the screen that asks is the one that must render it.
 * - It stays usable from a plain event handler: `confirm` is a stable function
 *   returning a promise, callable from anywhere in the component.
 *
 * The contract the callers depend on: exactly one answer per ask. Cancel, the
 * close button, Escape and a click on the backdrop all answer false — the same
 * early return the native dialog gave — and the promise is never left hanging,
 * including when the screen unmounts with the dialog still open.
 *
 * What this deliberately does NOT do is own the work it confirms. The answer is
 * all it has to give: the request behind it belongs to the caller, where the
 * row's own busy state already lives (see RegistrationsList's `verifying`,
 * CourseParticipants' `busyId`). A dialog that stayed open holding a spinner
 * would be a second, competing report of the same in-flight write.
 */

export type ConfirmOptions = {
  /** The question, as the dialog's heading — the first line of the prompt the
   * native confirm() used to show. */
  title: string;
  /** What agreeing does, in a paragraph under the heading. */
  message: string;
  /** The quieter half of the old `\n\n` prompt, set below the message: the
   * balance a confirmation leaves outstanding, the cascade a delete takes with
   * it. */
  detail?: string;
  /** Defaults to "Confirm". Name the act — "Delete", "Confirm payment" — since
   * it is the last thing read before the click. */
  confirmLabel?: string;
  /**
   * "danger" for anything that destroys or cannot be undone: it turns the
   * confirm button red (Button's own danger variant), marks the message with
   * the alert icon, and opens with Cancel focused so a stray Enter costs
   * nothing. Benign confirmations stay accent and open with the confirm button
   * focused, which is the whole point of asking them quickly.
   */
  tone?: "accent" | "danger";
};

export function useConfirm(): {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmDialog: ReactNode;
} {
  const [asked, setAsked] = useState<ConfirmOptions | null>(null);
  /** The other half of an open dialog: the resolver of the promise the caller
   * is sitting on. Spent as it is read, so one ask is answered exactly once. */
  const answer = useRef<((agreed: boolean) => void) | null>(null);
  const confirmId = useId();
  const cancelId = useId();

  /**
   * The one way out, whichever control was pressed. Reading the resolver clears
   * it, which is what stops a double-click firing the caller's request twice:
   * React batches the state update, so the second click can still land on a
   * dialog that is on screen for another frame — and finds nothing left to
   * answer with.
   */
  const settle = useCallback((agreed: boolean) => {
    const resolve = answer.current;
    answer.current = null;
    setAsked(null);
    resolve?.(agreed);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        // Nothing can reach the trigger behind the backdrop, so a second ask
        // while one is open is defensive — but a promise nobody will ever
        // answer is worse than a "no", so the one being replaced gets one.
        answer.current?.(false);
        answer.current = resolve;
        setAsked(options);
      }),
    [],
  );

  // A screen can be left with the dialog still standing: the route moves, the
  // panel that asked collapses. The awaited promise goes with it rather than
  // leaving the caller's handler suspended forever.
  useEffect(
    () => () => {
      answer.current?.(false);
      answer.current = null;
    },
    [],
  );

  const danger = asked?.tone === "danger";

  const confirmDialog = asked ? (
    <Dialog
      open
      onClose={() => settle(false)}
      title={asked.title}
      initialFocusId={danger ? cancelId : confirmId}
      className="max-w-md"
    >
      <div className="flex gap-4">
        {danger && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <Icon name="alert" size={20} />
          </span>
        )}
        {/* The old prompts carried two lines separated by `\n\n`; they are two
            different weights of statement, so they are set as two. */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-[var(--text-secondary)]">{asked.message}</p>
          {asked.detail && (
            <p className="text-sm text-[var(--text-muted)]">{asked.detail}</p>
          )}
        </div>
      </div>

      {/* Stacked below sm, where "Confirm payment" beside "Cancel" is wider
          than the panel — reversed so the answer stays the top button. */}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button id={cancelId} type="button" variant="secondary" onClick={() => settle(false)}>
          Cancel
        </Button>
        <Button
          id={confirmId}
          type="button"
          variant={danger ? "danger" : "primary"}
          onClick={() => settle(true)}
        >
          {asked.confirmLabel ?? "Confirm"}
        </Button>
      </div>
    </Dialog>
  ) : null;

  return { confirm, confirmDialog };
}
