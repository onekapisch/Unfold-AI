import { createSavedRepository } from "../core/saved/savedRepository";
import { routeMessage } from "./messageRouter";

const repository = createSavedRepository();

browser.runtime.onMessage.addListener((message: unknown) => routeMessage(message, repository));
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void browser.tabs.create({ url: browser.runtime.getURL("src/onboarding/onboarding.html") });
  }
});

export {};
