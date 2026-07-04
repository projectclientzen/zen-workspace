// Service worker Zen — PWA installability + Web Push notification.
// Sengaja TIDAK cache-first untuk data app (semua data live dari Supabase),
// cuma pass-through fetch supaya syarat "installable" PWA terpenuhi dan
// browser tetap dapat menampilkan push notification walau tab ditutup.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through murni — tidak intercept/cache apa pun, tapi handler fetch
// tetap perlu ada supaya browser menganggap PWA ini "installable".
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Zen", body: event.data.text() };
  }

  const title = payload.title || "Zen";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-96.png",
    data: { url: payload.url || "/" },
    tag: payload.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
