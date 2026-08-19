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
  const match = COUNTRIES.map((c) => c.dialCode)
    .filter((dial) => {
      if (s === dial) return true;
      const rest = s.slice(dial.length);
      return rest.startsWith(" ") || /^\d+$/.test(rest.trim());
    })
    .sort((a, b) => b.length - a.length)[0];
  if (match) {
    const code =
      COUNTRIES.find((c) => c.dialCode === match)?.code.toLowerCase() ?? defaultCountry;
    return { code, national: s.slice(match.length).trim() };
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

  function emit(nextCode: string, nextNational: string) {
    setCode(nextCode);
    setNational(nextNational);
    if (controlled) onChange?.(combine(nextCode, nextNational));
  }

  return (
    <Field label={label} htmlFor={`${name}-national`} hint={hint} error={error} required={required}>
      <div className="flex gap-2">
        <Select
          aria-label={`${label} country code`}
          value={code}
          onChange={(e) => emit(e.target.value, national)}
          className="w-36 shrink-0 sm:w-40"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code.toLowerCase()}>
              {c.name} ({c.dialCode})
            </option>
          ))}
        </Select>
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
          className="min-w-0 flex-1"
        />
      </div>
      {/* The real form field: FormData reads `name` from this hidden input. */}
      <input type="hidden" name={name} value={combined} />
    </Field>
  );
}
