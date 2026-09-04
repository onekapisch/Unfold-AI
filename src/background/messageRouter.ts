import type { SavedRepository } from "../core/saved/savedRepository";
import { validateSavedInsight, validateSavedInsightInput } from "../core/saved/validation";

export type ExtensionResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    throw new Error("Saved insight id is invalid");
  }
  return value;
}

function validNote(value: unknown): string {
  if (typeof value !== "string" || value.length > 4_000) {
    throw new Error("Saved insight note is invalid");
  }
  return value;
}

export async function routeMessage(
  message: unknown,
  repository: SavedRepository,
): Promise<ExtensionResponse> {
  try {
    if (!isRecord(message) || typeof message.type !== "string") {
      throw new Error("Unsupported extension message");
    }
    switch (message.type) {
      case "saved:create":
        return { ok: true, data: await repository.create(validateSavedInsightInput(message.input)) };
      case "saved:list": {
        if (message.query === undefined) return { ok: true, data: await repository.list() };
        if (typeof message.query !== "string" || message.query.length > 300) {
          throw new Error("Saved insight search is invalid");
        }
        return { ok: true, data: await repository.search(message.query) };
      }
      case "saved:update-note":
        return {
          ok: true,
          data: await repository.updateNote(validId(message.id), validNote(message.note)),
        };
      case "saved:delete":
        await repository.delete(validId(message.id));
        return { ok: true };
      case "saved:clear":
        await repository.clear();
        return { ok: true };
      case "saved:replace":
        if (!Array.isArray(message.insights)) throw new Error("Saved insight backup is invalid");
        await repository.replaceAll(message.insights.map(validateSavedInsight));
        return { ok: true };
      default:
        throw new Error("Unsupported extension message");
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Extension request failed" };
  }
}
