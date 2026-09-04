import { createSavedRepository } from "../core/saved/savedRepository";
import { routeMessage } from "./messageRouter";

const repository = createSavedRepository();

browser.runtime.onMessage.addListener((message: unknown) => routeMessage(message, repository));

export {};
