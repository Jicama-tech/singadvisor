
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * The app's one and only modal primitive — everything else in this codebase
 * uses inline expand-in-place forms (see CouponsPanel.tsx). A real focused
 * surface (image cropping, the admin's confirmations, Phase 8's venue-designer
 * dialogs) genuinely needs a modal, so this exists deliberately narrow — sized
 * for that, not a general-purpose dialog system.
 *
 * The keyboard half lives here rather than in each consumer because it is the
 * same promise every time: aria-modal="true" tells a screen reader the rest of
 * the page has gone, and that is only true if focus comes in here, stays here
 * while the dialog is open, and goes back to whatever opened it on the way out.
 * ConfirmDialog made that load-bearing — it is opened from a trash icon partway
 * down a long table, and losing that row on the way back would be the whole
 * cost of having asked.
 */

/** Everything the browser would Tab to inside the panel, in document order.
 * Enough for the dialogs this app actually has — buttons, links, fields — and
 * deliberately not a general focus-trap implementation. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  initialFocusId,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /**
   * The id of the control that should hold focus when the dialog opens.
   * Defaults to the panel, which announces the title and leaves the first Tab
   * to find the rest; a dialog whose whole answer is one button (ConfirmDialog)
   * points this at the button it wants pressed instead. An id rather than a ref
   * because Button is a plain function component and cannot be given one.
   */
  initialFocusId?: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Tab is caged for the reason aria-modal is set: the page behind is gone
      // as far as assistive tech is concerned, so the keyboard must not be able
      // to walk back into it.
      const panel = panelRef.current;
      if (!panel) return;
      const stops = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      // The panel itself holds focus on open, and nothing precedes it — so a
      // backwards Tab from there is an exit too, not just one off the first
      // control.
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement;
    // getElementById rather than a selector: useId's values contain colons,
    // which querySelector would read as the start of a pseudo-class.
    const target = initialFocusId ? document.getElementById(initialFocusId) : null;
    (target ?? panelRef.current)?.focus();
    return () => {
      // Back to the row's own icon, not the top of the document. A trigger that
      // went with the record it deleted is detached by now, and focusing a
      // detached node is a no-op rather than a jump.
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, [open, initialFocusId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          "flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised shadow-[var(--shadow-lift)] focus:outline-none",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 id={titleId} className="text-lg">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
