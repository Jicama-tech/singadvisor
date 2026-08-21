import { useEffect, useState } from "react";
import { fetchPostFeedback, setFeedbackFeatured, type FeedbackEntry } from "@/adminActions";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={14}
          filled={n <= value}
          className={n <= value ? "text-[var(--accent)]" : "text-[var(--border-strong)]"}
        />
      ))}
    </div>
  );
}

/** Admin-only view of reader feedback for a Blog post — rating, message,
 * and the Google-authenticated email, verified server-side. Each entry has
 * a "Show on blog page" toggle — only entries the admin explicitly
 * approves ever appear publicly. Only shown once a post has an id (i.e.
 * editing, not creating — there's nothing to fetch feedback for yet). */
export function BlogFeedbackPanel({ postId }: { postId: string }) {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPostFeedback(postId);
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load feedback.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function handleToggleFeatured(entry: FeedbackEntry, next: boolean) {
    setTogglingId(entry._id);
    setEntries((prev) => prev.map((e) => (e._id === entry._id ? { ...e, featured: next } : e)));
    try {
      await setFeedbackFeatured(postId, entry._id, next);
    } catch (err) {
      setEntries((prev) => prev.map((e) => (e._id === entry._id ? { ...e, featured: entry.featured } : e)));
      setError(err instanceof Error ? err.message : "Failed to update feedback.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon name="message-circle" size={16} className="text-[var(--accent)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Reader feedback {entries.length > 0 && `(${entries.length})`}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading feedback…</p>
      ) : error ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No feedback yet.</p>
      ) : (
        <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div key={entry._id} className="rounded-xl border border-[var(--border-subtle)] p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <Stars value={entry.rating} />
                <span className="text-xs text-[var(--text-muted)]">{formatDate(entry.createdAt)}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {entry.email}
                {entry.name && <span className="text-[var(--text-muted)]"> · {entry.name}</span>}
              </p>
              {entry.message && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{entry.message}</p>
              )}
              <label className="mt-2 flex cursor-pointer select-none items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
                <input
                  type="checkbox"
                  checked={entry.featured}
                  disabled={togglingId === entry._id}
                  onChange={(e) => void handleToggleFeatured(entry, e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                />
                <span className={`text-xs ${entry.featured ? "text-[var(--accent)] font-medium" : "text-[var(--text-muted)]"}`}>
                  {entry.featured ? "Shown on blog page" : "Show on blog page"}
                </span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
