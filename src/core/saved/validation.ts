import type { SavedInsight, SavedInsightInput } from "./types";

const MAX_TEXT_LENGTH = 100_000;
const MAX_NOTE_LENGTH = 4_000;
const MAX_TITLE_LENGTH = 300;
const MAX_PROVIDER_LENGTH = 40;

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
}

function readString(
  record: Record<string, unknown>,
  key: string,
  maximum: number,
): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }
  if (value.length > maximum) {
    throw new Error(`${key} exceeds ${maximum} characters`);
  }
  return value;
}

function validateUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Conversation URL must be valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Conversation URL must use http or https");
  }
  return url.toString();
}

export function validateSavedInsightInput(value: unknown): SavedInsightInput {
  assertRecord(value, "Saved insight must be an object");
  const rawText = value.text;
  if (typeof rawText !== "string") throw new Error("text must be a string");
  if (rawText.length > MAX_TEXT_LENGTH) {
    throw new Error(`Saved text exceeds ${MAX_TEXT_LENGTH} characters`);
  }

  return {
    providerId: readString(value, "providerId", MAX_PROVIDER_LENGTH),
    conversationUrl: validateUrl(readString(value, "conversationUrl", 2_048)),
    pageTitle: readString(value, "pageTitle", MAX_TITLE_LENGTH),
    sectionTitle: readString(value, "sectionTitle", MAX_TITLE_LENGTH),
    text: rawText,
    note: readString(value, "note", MAX_NOTE_LENGTH),
  };
}

export function validateSavedInsight(value: unknown): SavedInsight {
  assertRecord(value, "Saved insight must be an object");
  const input = validateSavedInsightInput(value);
  const id = value.id;
  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;
  if (typeof id !== "string" || id.length === 0 || id.length > 200) {
    throw new Error("Saved insight id is invalid");
  }
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) {
    throw new Error("Saved insight timestamps are invalid");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported saved insight schema");
  }
  return {
    ...input,
    id,
    createdAt: createdAt as number,
    updatedAt: updatedAt as number,
    schemaVersion: 1,
  };
}
