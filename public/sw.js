// Bellefy — Service Worker v5
const CACHE = "bellefy-v5";
const OFFLINE_URL = "/";

const PRECACHE = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).catch(() => {})
  );
  self.clients.claim();
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Bellefy", {
      body: data.body ?? "",
      icon: data.icon ?? "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url ?? "/" },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      const w = list.find((c) => c.url === url && "focus" in c);
      return w ? w.focus() : clients.openWindow(url);
    })
  );
});

// ── Fetch: network-first, sem cachear HTML de navegação ──────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora: não-GET, APIs, cross-origin, assets Next.js (já têm hash no nome)
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Apenas assets estáticos (ícones, manifest) vão pro cache
  if (PRECACHE.some((p) => url.pathname === p)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Navegação: sempre network-first, fallback offline simples
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
  }
});
