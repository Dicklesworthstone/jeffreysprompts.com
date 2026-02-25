// JeffreysPrompts Service Worker
// Enables offline access with cached registry data
//
// Version is derived from /registry.manifest.json so caches rotate
// automatically when the registry changes.  Static assets use a
// separate, long-lived cache.

const STATIC_CACHE = "jfp-static-v1";
const REGISTRY_CACHE_PREFIX = "jfp-registry-";

const REGISTRY_URL = "/registry.json";
const REGISTRY_MANIFEST_URL = "/registry.manifest.json";

const STATIC_PRECACHE = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch the registry version from the manifest (network-first, cache fallback). */
async function getRegistryVersion() {
  try {
    const res = await fetch(REGISTRY_MANIFEST_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.version === "string") return data.version;
    }
  } catch { /* network unavailable */ }

  try {
    const cached = await caches.match(REGISTRY_MANIFEST_URL);
    if (cached) {
      const data = await cached.json();
      if (data && typeof data.version === "string") return data.version;
    }
  } catch { /* cache miss */ }

  return "unknown";
}

/** Open (or create) the versioned registry cache. */
async function openRegistryCache() {
  const version = await getRegistryVersion();
  const cacheName = `${REGISTRY_CACHE_PREFIX}${version}`;
  const cache = await caches.open(cacheName);
  return { cache, cacheName, version };
}

/** Cache-first with background revalidation for static assets. */
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

/** Network-first with cache fallback. */
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

// ---------------------------------------------------------------------------
// Lifecycle events
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Cache registry files in versioned cache
      const { cache: registryCache } = await openRegistryCache();
      try {
        await registryCache.addAll([REGISTRY_URL, REGISTRY_MANIFEST_URL]);
      } catch { /* non-fatal: may be offline */ }

      // Cache static assets in long-lived cache
      const staticCache = await caches.open(STATIC_CACHE);
      try {
        await staticCache.addAll(STATIC_PRECACHE);
      } catch { /* non-fatal */ }
    })()
  );
  // NOTE: We intentionally do NOT call self.skipWaiting() here.
  // The app's update banner (useServiceWorker hook) detects the waiting
  // worker and lets the user choose when to activate it.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Remove stale registry caches that don't match the current version
      const { cacheName: currentCache } = await openRegistryCache();
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith(REGISTRY_CACHE_PREFIX) && key !== currentCache) {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

// ---------------------------------------------------------------------------
// Fetch strategies
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // --- API: /api/prompts  (network-first, registry.json fallback) ---
  if (url.pathname.startsWith("/api/prompts")) {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request, STATIC_CACHE);
        } catch {
          // Network failed and no exact cache hit — fall back to registry.json
          const { cache } = await openRegistryCache();
          const fallback = await cache.match(REGISTRY_URL);
          if (fallback) {
            const registry = await fallback.json();
            return new Response(JSON.stringify(registry), {
              headers: {
                "Content-Type": "application/json",
                "X-Offline-Fallback": "true",
              },
            });
          }
          return new Response(
            JSON.stringify({ error: "offline", message: "No cached data available" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }
      })()
    );
    return;
  }

  // --- Registry files  (stale-while-revalidate via versioned cache) ---
  if (url.pathname === REGISTRY_URL || url.pathname === REGISTRY_MANIFEST_URL) {
    event.respondWith(
      (async () => {
        const { cache } = await openRegistryCache();
        const cached = await cache.match(request);

        // Background revalidation (fire and forget)
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);

        if (cached) {
          fetchPromise.catch(() => {});
          return cached;
        }

        const networkRes = await fetchPromise;
        if (networkRes) return networkRes;

        return new Response(
          JSON.stringify({ error: "offline", message: "Registry unavailable" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })()
    );
    return;
  }

  // --- Static assets  (cache-first) ---
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname === "/manifest.json" ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(
        () =>
          new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
      )
    );
    return;
  }

  // --- Navigation  (network-first, cached home fallback) ---
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match("/");
        return (
          cached ??
          new Response("<h1>Offline</h1>", {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  // --- Default: network with cache fallback ---
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return (
        cached ??
        new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        })
      );
    })
  );
});

// ---------------------------------------------------------------------------
// Message channel
// ---------------------------------------------------------------------------

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }

  if (event.data === "getVersion") {
    getRegistryVersion()
      .then((version) => {
        const cacheName = `${REGISTRY_CACHE_PREFIX}${version}`;
        event.ports[0].postMessage({ version, cacheName });
      })
      .catch((err) => {
        console.error("Failed to get registry version", err);
      });
  }
});

getRegistryVersion()
  .then((v) => {
    console.log("[SW] Service Worker loaded, registry version:", v);
  })
  .catch(() => {
    console.log("[SW] Service Worker loaded, registry version: unknown");
  });