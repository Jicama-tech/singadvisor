/**
 * Compatibility shim: components ported from the Next app import their public
 * form actions from "@/app/actions" — here those names resolve to the
 * client-side implementations in src/actions.ts without touching every
 * call site.
 */
export * from "@/actions";
