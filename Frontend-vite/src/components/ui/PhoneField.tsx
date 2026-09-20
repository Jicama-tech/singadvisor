import { useEffect, useState } from "react";
import { COUNTRIES } from "@/data/countries";
import { Field, Input, Select } from "@/components/ui/Field";

/**
 * Phone input with a country (dial code) dropdown, matching the rest of the
 * design system. The value that flows to the backend is one combined string
 * ("+65 9123 4567") — exactly what the single-string phone fields always
 * expected — carried by a hidden input under `name`, so existing uncontrolled
 * FormData flows keep working unchanged.
 *
 * Uncontrolled: pass `name` + `defaultValue` and submit the surrounding form.
 * Controlled: pass `value` + `onChange(combined)` and drop the hidden input
 * (no FormData in those forms — it's simply ignored).
 */

function dialCodeFor(code: string): string {
  return (
    COUNTRIES.find((c) => c.code.toLowerCase() === code.toLowerCase())?.dialCode ?? "+65"
  );
}

/** Split a stored "+65 9123 4567" string into { code, national }. */
function parseStored(stored: string, defaultCountry: string): { code: string; national: string } {
  const s = (stored || "").trim();
  if (!s) return { code: defaultCountry, national: "" };
  // Longest dial-code prefix wins so "+1268..." matches Antigua, not "+1".
  // Accept both "+65 9123 4567" (canonical) and legacy "+6591234567" (no
  // space) — only when what follows the dial code is all digits, so bare
  // national numbers never match.
  //
  // `startsWith` is load-bearing and was missing: without it every dial code
  // of the right LENGTH matched, because the check only looked at what came
  // after slicing that many characters off. A saved "+65 9123 4567" then
  // matched "+93" (Afghanistan) — same length, and character 3 onwards is
  // still " 9123 4567" — and "+65 81234567" matched "+1268", which sliced
  // four characters and silently dropped two digits of the real number. Every
  // stored number came back with the wrong country, some of them truncated.
  const match = COUNTRIES.map((c) => c.dialCode)
    .filter((dial) => {
      if (!s.startsWith(dial)) return false;
      if (s === dial) return true;
      const rest = s.slice(dial.length);
      return rest.startsWith(" ") || /^\d+$/.test(rest.trim());
    })
    .sort((a, b) => b.length - a.length)[0];
  if (match) {
    // Several countries share a dial code (+1 is the US, Canada and more).
    // Prefer the one the field is already defaulted to, so a US-defaulted
    // field showing "+1 415…" does not silently relabel itself Canada;
    // otherwise take the first listed, which at least stays deterministic.
    const owners = COUNTRIES.filter((c) => c.dialCode === match);
    const preferred =
      owners.find((c) => c.code.toLowerCase() === defaultCountry.toLowerCase()) ?? owners[0];
    return {
      code: preferred?.code.toLowerCase() ?? defaultCountry,
      national: s.slice(match.length).trim(),
    };
  }
  // Bare national number without a dial code — keep it as typed.
  return { code: defaultCountry, national: s };
}

function combine(code: string, national: string): string {
  const n = national.trim();
  return n ? `${dialCodeFor(code)} ${n}` : "";
}

export function PhoneField({
  name,
  label,
  hint,
  error,
  required,
  placeholder = "9123 4567",
  defaultValue,
  defaultCountry = "sg",
  value,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  /** Validation message from the server round-trip (useClientAction forms). */
  error?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  defaultCountry?: string;
  /** Controlled mode: the combined "+65 9123 4567" value. */
  value?: string;
  /** Controlled mode: called with the combined value ("" when cleared). */
  onChange?: (combined: string) => void;
}) {
  const controlled = value !== undefined;
  const initial = controlled ? (value ?? "") : (defaultValue ?? "");
  const parsed = parseStored(initial, defaultCountry);
  const [code, setCode] = useState(parsed.code);
  const [national, setNational] = useState(parsed.national);

  // Controlled mode: the parent owns the combined string — re-derive the
  // display parts whenever it changes (including clears).
  useEffect(() => {
    if (controlled) {
      const p = parseStored(value ?? "", defaultCountry);
      setCode(p.code);
      setNational(p.national);
    }
  }, [controlled, value, defaultCountry]);

  const combined = combine(code, national);
  const selected = COUNTRIES.find((c) => c.code.toLowerCase() === code.toLowerCase());

  /** Left room for the dial code shown inside the input. Three buckets rather
   * than a measurement: "+65" is 3 characters, "+971" is 4, "+1784" is 5, and
   * nothing in the list is longer. */
  const dial = dialCodeFor(code);
  const prefixPadding = dial.length <= 3 ? 'pl-12' : dial.length === 4 ? 'pl-14' : 'pl-16';

  function emit(nextCode: string, nextNational: string) {
    setCode(nextCode);
    setNational(nextNational);
    if (controlled) onChange?.(combine(nextCode, nextNational));
  }

  return (
    <Field label={label} htmlFor={`${name}-national`} hint={hint} error={error} required={required}>
      <div className="flex gap-2">
        {/* Narrow on purpose: the number is what people type and read back,
            and the country is chosen once. The closed control truncates the
            name — "Singapo…" — which costs nothing, because the open list is
            sized by the browser to its own content, not to this width.

            The option label keeps the NAME FIRST. Native select type-ahead
            matches from the start of the label, and with two hundred
            countries typing "sing" is how anyone finds Singapore; putting the
            dial code first would have made every option start with "+" and
            broken that outright. `title` gives the full name on hover for the
            truncated case. */}
        {/* The width goes on this WRAPPER, not on the <Select>.
            Every control carries `w-full` from controlBase, `cn` is a plain
            join rather than tailwind-merge, and Tailwind emits `.w-full`
            AFTER `.w-24` — so at equal specificity a width class passed to
            Select loses, silently. The old `w-36 sm:w-40` here never applied
            at all: the select took the whole row and squeezed the number box
            down to nothing, which is precisely how this looked wrong. Sizing
            the parent and letting the select fill it cannot be overridden. */}
        <div className="w-24 shrink-0 sm:w-28">
          <Select
            aria-label={`${label} country code`}
            title={selected ? `${selected.name} (${selected.dialCode})` : undefined}
            value={code}
            onChange={(e) => emit(e.target.value, national)}
            // Ellipsis rather than a hard clip. `truncate` is safe to pass
            // through here where a width class is not: nothing in controlBase
            // sets overflow or text-overflow, so there is no later rule for it
            // to lose to.
            className="truncate"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code.toLowerCase()}>
                {c.name} ({c.dialCode})
              </option>
            ))}
          </Select>
        </div>
        {/* The dial code rides on the NUMBER, not in the dropdown.
            "Singapore (+65)" needs about 105px of text room, so even the old
            160px select only just fitted it — shrinking the select at all
            would have hidden the one part of it that has to be visible while
            you type. Moving it here makes it more visible than before (it sits
            against the digits it belongs to) and frees the select to be a
            narrow chooser whose truncated name costs nothing. */}
        <div className="relative min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-base text-[var(--text-secondary)] sm:text-[0.9375rem]"
          >
            {dial}
          </span>
          <Input
            id={`${name}-national`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={national}
            placeholder={placeholder}
            required={required}
            aria-invalid={!!error}
            onChange={(e) => emit(code, e.target.value)}
            // Padding sized to THIS dial code, not to the longest one in the
            // world. A flat pl-16 reserved room for "+1784" on every field,
            // and in a two-column grid — the Contact page — that left about
            // forty pixels for the digits: "+65   912" and the rest cut off.
            // Written as whole literal class names because Tailwind scans the
            // source for them and would not see an interpolated one.
            className={`w-full min-w-0 ${prefixPadding}`}
          />
        </div>
      </div>
      {/* The real form field: FormData reads `name` from this hidden input. */}
      <input type="hidden" name={name} value={combined} />
    </Field>
  );
}
