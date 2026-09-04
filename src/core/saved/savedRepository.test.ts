import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { exportJson, exportMarkdown, importJson } from "./export";
import { createSavedRepository } from "./savedRepository";
import type { SavedInsightInput } from "./types";
import { validateSavedInsightInput } from "./validation";

const validInput: SavedInsightInput = {
  providerId: "chatgpt",
  conversationUrl: "https://chatgpt.com/c/example",
  pageTitle: "Model evaluation",
  sectionTitle: "Cost guardrails",
  text: "Measure latency and total cost before rollout.",
  note: "Use this in the launch review.",
};

describe("saved insight validation", () => {
  it("rejects oversized saved text", () => {
    expect(() =>
      validateSavedInsightInput({ ...validInput, text: "x".repeat(100_001) }),
    ).toThrow("Saved text exceeds 100000 characters");
  });

  it("rejects non-web conversation URLs", () => {
    expect(() =>
      validateSavedInsightInput({ ...validInput, conversationUrl: "javascript:alert(1)" }),
    ).toThrow("Conversation URL must use http or https");
  });
});

describe("createSavedRepository", () => {
  let factory: IDBFactory;

  beforeEach(() => {
    factory = new IDBFactory();
  });

  it("creates, searches, updates, and deletes local insights", async () => {
    const repository = createSavedRepository({
      factory,
      databaseName: "saved-crud",
      now: () => 1_788_510_000_000,
      createId: () => "insight-1",
    });

    const created = await repository.create(validInput);
    expect(created.id).toBe("insight-1");
    await expect(repository.search("LATENCY")).resolves.toEqual([created]);
    await expect(repository.search("missing")).resolves.toEqual([]);

    const updated = await repository.updateNote(created.id, "Approved for launch");
    expect(updated.note).toBe("Approved for launch");
    await repository.delete(created.id);
    await expect(repository.list()).resolves.toEqual([]);
  });

  it("preserves existing records when the soft limit blocks a new save", async () => {
    const repository = createSavedRepository({
      factory,
      databaseName: "saved-limit",
      maxEstimatedBytes: 250,
      createId: (() => {
        let id = 0;
        return () => `insight-${++id}`;
      })(),
    });
    await repository.create({ ...validInput, text: "a".repeat(20) });

    await expect(repository.create({ ...validInput, text: "b".repeat(200) })).rejects.toThrow(
      "Saved insights storage limit reached",
    );
    await expect(repository.list()).resolves.toHaveLength(1);
  });
});

describe("saved insight export", () => {
  it("round-trips a versioned JSON backup", () => {
    const record = {
      ...validInput,
      id: "insight-1",
      createdAt: 1_788_510_000_000,
      updatedAt: 1_788_510_000_000,
      schemaVersion: 1 as const,
    };

    expect(importJson(exportJson([record], 1_788_510_100_000))).toEqual([record]);
  });

  it("exports readable Markdown without executable HTML", () => {
    const markdown = exportMarkdown([{
      ...validInput,
      id: "insight-1",
      pageTitle: "<script>alert(1)</script>",
      createdAt: 1_788_510_000_000,
      updatedAt: 1_788_510_000_000,
      schemaVersion: 1,
    }]);

    expect(markdown).not.toContain("<script>");
    expect(markdown).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(markdown).toContain("Cost guardrails");
    expect(markdown).toContain("Measure latency and total cost");
  });

  it("rejects invalid backup schemas", () => {
    expect(() => importJson('{"schemaVersion":99,"insights":[]}')).toThrow(
      "Unsupported Saved insights backup",
    );
  });
});
