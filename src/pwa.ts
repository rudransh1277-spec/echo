// ECHO service-worker registration wrapper.
// The ONLY place that registers /sw.js. Refuses everywhere except
// production builds outside Lovable previews/iframes, and supports ?sw=off.

function isPreviewHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  const labels = h.split(".");
  const first = labels[0] ?? "";
  const previewLabel = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first);
  if (
    previewLabel &&
    (h.endsWith(".lovable.app") ||
      h.endsWith(".gpt-eng.com") ||
      h.endsWith(".gptengineer.run"))
  ) {
    return true;
  }
  if (
    /^project--.+-(dev\.)?lovable\.app$/.test(h) ||
    /^project--.+-(dev\.)?gpt-eng\.com$/.test(h) ||
    /^project--.+-(dev\.)?gptengineer\.run$/.test(h)
  ) {
    return true;
  }
  return (
    h === "lovableproject.com" ||
    h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" ||
    h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" ||
    h.endsWith(".beta.lovable.dev")
  );
}

async function unregisterEchoServiceWorker() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const script = registration.active?.scriptURL ?? "";
      if (script.endsWith("/sw.js")) {
        await registration.unregister();
      }
    }
  } catch {
    /* ignore */
  }
}

export function registerEchoServiceWorker() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname) ||
    url.searchParams.has("sw");

  if (refused) {
    void unregisterEchoServiceWorker();
    return;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support unavailable */
    });
  }
}
