"use client";

import { cn } from "@/lib/utils";
import type { LandingVariant } from "@/lib/landing-client";

const OPTIONS: { value: LandingVariant; label: string; description: string }[] = [
  { value: "modern", label: "Modern", description: "The original design — balanced and familiar." },
  { value: "minimal", label: "Minimal", description: "Calmer, more compact, less decoration." },
  { value: "bold", label: "Bold", description: "Bigger type, more visual weight." },
];

export function VariantPicker({
  value,
  onChange,
}: {
  value: LandingVariant;
  onChange: (variant: LandingVariant) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* Submitted with the rest of the form — the picker itself is just UI. */}
      <input type="hidden" name="variant" value={value} />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            value === option.value
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
          )}
        >
          <span
            className={cn(
              "block text-sm font-semibold",
              value === option.value ? "text-[var(--accent-on-soft)]" : "text-[var(--text-primary)]",
            )}
          >
            {option.label}
          </span>
          <span
            className={cn(
              "mt-0.5 block text-xs",
              value === option.value ? "text-[var(--accent-on-soft)]/80" : "text-[var(--text-muted)]",
            )}
          >
            {option.description}
          </span>
        </button>
      ))}
    </div>
  );
}
