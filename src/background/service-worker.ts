// MV3 service worker.
// Must call skipWaiting + clients.claim or Chrome flags the extension as
// "waiting to activate" and shows an error under Manage Extensions.

self.addEventListener("install", (event) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event as any).waitUntil((self as any).skipWaiting());
});

self.addEventListener("activate", (event) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event as any).waitUntil((self as any).clients.claim());
});

export {};
