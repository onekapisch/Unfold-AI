import { createSavedRepository } from "../core/saved/savedRepository";
import { routeMessage } from "./messageRouter";

const repository = createSavedRepository();
const worker = self as unknown as ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  (event as ExtendableEvent).waitUntil(worker.skipWaiting());
});

self.addEventListener("activate", (event) => {
  (event as ExtendableEvent).waitUntil(worker.clients.claim());
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void routeMessage(message, repository).then(sendResponse);
  return true;
});

export {};
