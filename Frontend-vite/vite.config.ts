import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Mirrors eventsh-v1's frontend/vite.config.ts conventions: the only runtime
// env-injection mechanism is the compile-time `__API_URL__` global (declared
// in src/vite-env.d.ts), consumed as a bare identifier across the app — no
// import.meta.env.VITE_API_URL scattered through components.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    server: { port: 3200 },
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
      __EVENTSH_PUBLIC_URL__: JSON.stringify(env.VITE_EVENTSH_PUBLIC_URL),
      // Not a secret — it appears in eventsh's public organizer-scoped URLs
      // (the dedicated instance's public routes are addressed by organizer
      // id, and the old site already exposed these paths). Anything that
      // needs the API key goes through the Backend's /eventsh/* proxy.
      __EVENTSH_ORGANIZER_ID__: JSON.stringify(env.VITE_EVENTSH_ORGANIZER_ID),
      // Blog reader feedback's "Sign in with Google" — a public OAuth client
      // id (not a secret; Google's own docs say so), verified against the
      // matching GOOGLE_CLIENT_ID server-side on every submission.
      __GOOGLE_CLIENT_ID__: JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "helmet-vendor": ["react-helmet-async"],
          },
        },
      },
    },
  };
});
