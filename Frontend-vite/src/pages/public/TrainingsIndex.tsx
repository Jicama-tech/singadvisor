import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { TrainingCard } from "@/components/cards/TrainingCard";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHero } from "@/components/ui/Section";
import { TRAINING_CATEGORIES } from "@/lib/constants";
import { fetchTrainings, type TrainingDoc } from "@/lib/contentClient";
import { cn } from "@/lib/utils";

type TrainingsData = {
  trainings: TrainingDoc[];
  total: number;
  countFor: (c: string) => number;
};

export default function TrainingsIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  // Only honour a category we actually recognise, so a hand-edited URL falls
  // back to "all" rather than silently returning nothing.
  const rawCategory = searchParams.get("category") ?? "";
  const category = (TRAINING_CATEGORIES as readonly string[]).includes(rawCategory)
    ? rawCategory
    : undefined;

  const [data, setData] = useState<TrainingsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await fetchTrainings();
      if (cancelled) return;

      const published = all.filter((t) => t.published);
      const countFor = (c: string) => published.filter((t) => t.category === c).length;

      setData({
        trainings: published
          .filter((t) => !category || t.category === category)
          .filter(
            (t) =>
              !query ||
              t.title.toLowerCase().includes(query.toLowerCase()) ||
              t.summary.toLowerCase().includes(query.toLowerCase()),
          )
          .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
        total: published.length,
        countFor,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [category, query]);

  if (!data) {
    return (
      <MarketingShell>
        <div className="container-page py-24">
          <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
        </div>
      </MarketingShell>
    );
  }

  const filterHref = (c?: string) => {
    const sp = new URLSearchParams();
    if (c) sp.set("category", c);
    if (query) sp.set("q", query);
    const s = sp.toString();
    return s ? `/trainings?${s}` : "/trainings";
  };

  return (
    <MarketingShell>
      <Helmet>
        <title>Trainings — SingAdvisor</title>
        <meta
          name="description"
          content="Practical training programmes for students, corporate teams and professionals in Singapore — time, money, health, emotions, leadership and communication."
        />
      </Helmet>

      <PageHero
        eyebrow="Trainings"
        title="Programmes that survive contact with a real week"
        description="Every session ends with something concrete — a system, a script, a decision you can act on. Filter by who it's built for, or search for a specific topic."
      />

      <div className="container-page py-12 md:py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Filter by audience" className="flex flex-wrap gap-2">
            <FilterChip to={filterHref()} active={!category}>
              All <span className="opacity-60">{data.total}</span>
            </FilterChip>
            {TRAINING_CATEGORIES.map((c) => (
              <FilterChip key={c} to={filterHref(c)} active={category === c}>
                {c} <span className="opacity-60">{data.countFor(c)}</span>
              </FilterChip>
            ))}
          </nav>

          <form
            className="flex gap-2 lg:w-80"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get("q") ?? "").trim();
              const next: Record<string, string> = {};
              if (category) next.category = category;
              if (q) next.q = q;
              setSearchParams(next);
            }}
          >
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="training-search" className="sr-only">
              Search trainings
            </label>
            <Input
              id="training-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search programmes…"
            />
            <Button type="submit" variant="secondary" size="md" aria-label="Search">
              <Icon name="search" size={18} />
            </Button>
          </form>
        </div>

        <p className="mt-8 text-sm text-[var(--text-secondary)]" aria-live="polite">
          {data.trainings.length} programme{data.trainings.length === 1 ? "" : "s"}
          {category ? ` for ${category.toLowerCase()} audiences` : ""}
          {query ? ` matching “${query}”` : ""}
        </p>

        {data.trainings.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing matches those filters"
              description="Try a broader search term, or clear the filters to see everything we run."
              action={
                <Link
                  to="/trainings"
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Clear filters
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.trainings.map((t) => (
              <TrainingCard key={t._id} training={t} />
            ))}
          </div>
        )}
      </div>
    </MarketingShell>
  );
}

function FilterChip({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "surface-sunken text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </Link>
  );
}
