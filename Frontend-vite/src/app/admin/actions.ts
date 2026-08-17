/**
 * Compatibility shim: components ported from the Next app import their admin
 * mutations from "@/app/admin/actions" — here those names resolve to the
 * client-side implementations in src/adminActions.ts without touching every
 * call site. (The events family — saveEvent etc. — lands here with the
 * Events phase.)
 */
export * from "@/adminActions";
