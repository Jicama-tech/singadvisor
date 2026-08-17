/** Full-viewport skeleton shown under the single top-level Suspense boundary
 * while a lazy page chunk loads (eventsh's LoadingScreen equivalent). */
export default function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center surface-sunken">
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
        Loading…
      </div>
    </div>
  );
}
