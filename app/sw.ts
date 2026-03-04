import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || "WineJourney";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "default",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/";

  // Validate URL is same-origin or a relative path to prevent open redirects
  let safeUrl = "/";
  try {
    const resolved = new URL(rawUrl, self.location.origin);
    if (resolved.origin === self.location.origin) {
      safeUrl = resolved.pathname + resolved.search + resolved.hash;
    }
  } catch {
    safeUrl = "/";
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(safeUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(safeUrl);
      })
  );
});

serwist.addEventListeners();
