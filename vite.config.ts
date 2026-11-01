// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        // Registration happens in src/pwa.ts (guarded wrapper), never auto-injected.
        injectRegister: null,
        includeAssets: ["favicon.png", "icons/*"],
        manifest: {
          id: "/",
          name: "ECHO",
          short_name: "ECHO",
          description:
            "One tap builds a structured emergency message with live location and sends it over WhatsApp. Does not replace emergency services.",
          display: "standalone",
          start_url: "/",
          scope: "/",
          theme_color: "#000000",
          background_color: "#000000",
          lang: "en",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/icons/maskable-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          navigateFallback: "/",
          globPatterns: ["**/*.{js,mjs,css,html,png,svg,ico,woff,woff2,json,webmanifest}"],
          navigateFallbackDenylist: [/^\/api\//],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  },
});
