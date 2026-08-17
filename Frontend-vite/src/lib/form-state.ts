/**
 * Shared shape for every form action's return value.
 *
 * This lives outside the "use server" modules on purpose: a file marked
 * "use server" may only export async functions, so exporting the
 * `emptyFormState` constant from there fails at runtime (the page 500s with
 * "A 'use server' file can only export async functions, found object").
 */
export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /**
   * What the user typed. React resets an uncontrolled form once its action
   * resolves, so without echoing these back a single mistyped field would
   * wipe everything else the user had entered.
   */
  values?: Record<string, string>;
};

export const emptyFormState: FormState = { ok: false };

/** Fields never worth repopulating, or actively unsafe to echo back. */
const NEVER_ECHO = new Set(["password", "resume"]);

/** Collect the string entries of a submission so a failed form can refill. */
export function collectValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (NEVER_ECHO.has(key)) continue;
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
