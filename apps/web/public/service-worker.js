/*
  JeffreysPrompts PWA Service Worker
  - Caches registry payloads for offline search
  - Provides offline fallback for /api/prompts
  - Caches key static assets and icons
*/

const STATIC_CACHE = "jfp-static-v1";
const RUNTIME_CACHE = "jfp-runtime";
const REGISTRY_CACHE_PREFIX = "jfp-registry-";

const REGISTRY_URL = "/registry.json";
const REGISTRY_MANIFEST_URL = "/registry.manifest.json";
const MANIFEST_URL = "/manifest.json";
const ICONS = [
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

async function getRegistryVersion() {
  try {
    const res = await fetch(REGISTRY_MANIFEST_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.version === "string") return data.version;
    }
  } catch {}

  try {
    const cached = await caches.match(REGISTRY_MANIFEST_URL);
    if (cached) {
      const data = await cached.json();
      if (data && typeof data.version === "string") return data.version;
    }
  } catch {}

  return "unknown";
}

async function openRegistryCache() {
  const version = await getRegistryVersion();
  const cacheName = `${REGISTRY_CACHE_PREFIX}${version}`;
  const cache = await caches.open(cacheName);
  return { cache, cacheName };
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const { cache: registryCache } = await openRegistryCache();
      try {
        await registryCache.addAll([REGISTRY_URL, REGISTRY_MANIFEST_URL]);
      } catch {}

      const staticCache = await caches.open(STATIC_CACHE);
      try {
        await staticCache.addAll(["/", MANIFEST_URL, ...ICONS]);
      } catch {}
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const { cacheName } = await openRegistryCache();
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith(REGISTRY_CACHE_PREFIX) && key !== cacheName) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    cache.put(request, res.clone());
  }
  return res;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Network error and no cache.");
  }
}

async function registryCacheFirst(request) {
  const { cache } = await openRegistryCache();
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    cache.put(request, res.clone());
  }
  return res;
}

async function apiPromptsHandler(request) {
  try {
    const res = await networkFirst(request, RUNTIME_CACHE);
    return res;
  } catch {
    const { cache } = await openRegistryCache();
    const fallback = await cache.match(REGISTRY_URL);
    if (fallback) return fallback;
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/api/prompts") {
    event.respondWith(apiPromptsHandler(request));
    return;
  }

  if (url.pathname === REGISTRY_URL || url.pathname === REGISTRY_MANIFEST_URL) {
    event.respondWith(registryCacheFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/") || url.pathname === MANIFEST_URL) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match("/");
        return cached ?? new Response("Offline", { status: 503 });
      })
    );
  }
});
