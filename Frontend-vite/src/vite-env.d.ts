/// <reference types="vite/client" />

/** Compile-time globals injected by vite.config.ts's `define` — the only env
 * mechanism this app uses, mirroring eventsh-v1's frontend exactly. */
declare const __API_URL__: string;
/** Public (unauthenticated) base URL of the dedicated eventsh instance —
 * public reads (event listings/detail) go here directly; anything needing
 * the organizer API key goes through the Backend's /eventsh/* proxy. */
declare const __EVENTSH_PUBLIC_URL__: string;
/** The single organizer's id on the dedicated eventsh instance — public
 * config, not a secret (see vite.config.ts). */
declare const __EVENTSH_ORGANIZER_ID__: string;
