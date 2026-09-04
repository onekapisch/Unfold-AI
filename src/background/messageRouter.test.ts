import { describe, expect, it, vi } from "vitest";
import type { SavedInsight } from "../core/saved/types";
import type { SavedRepository } from "../core/saved/savedRepository";
import { routeMessage } from "./messageRouter";

const insight: SavedInsight = {
  id: "one",
  providerId: "chatgpt",
  conversationUrl: "https://chatgpt.com/c/one",
  pageTitle: "A useful answer",
  sectionTitle: "Rollout",
  text: "Measure first.",
  note: "",
  createdAt: 10,
  updatedAt: 10,
  schemaVersion: 1,
};

function repository(): SavedRepository {
  return {
    create: vi.fn().mockResolvedValue(insight),
    list: vi.fn().mockResolvedValue([insight]),
    search: vi.fn().mockResolvedValue([insight]),
    updateNote: vi.fn().mockResolvedValue({ ...insight, note: "keep" }),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe("routeMessage", () => {
  it("validates and routes a save request", async () => {
    const saved = repository();
    const response = await routeMessage({
      type: "saved:create",
      input: {
        providerId: "chatgpt",
        conversationUrl: "https://chatgpt.com/c/one",
        pageTitle: "A useful answer",
        sectionTitle: "Rollout",
        text: "Measure first.",
        note: "",
      },
    }, saved);

    expect(saved.create).toHaveBeenCalledOnce();
    expect(response).toEqual({ ok: true, data: insight });
  });

  it("rejects malformed or unknown messages", async () => {
    await expect(routeMessage({ type: "saved:delete", id: "" }, repository())).resolves.toEqual({
      ok: false,
      error: "Saved insight id is invalid",
    });
    await expect(routeMessage({ type: "system:wipe" }, repository())).resolves.toEqual({
      ok: false,
      error: "Unsupported extension message",
    });
  });

  it("searches locally and normalizes repository failures", async () => {
    const saved = repository();
    await expect(routeMessage({ type: "saved:list", query: "rollout" }, saved)).resolves.toEqual({
      ok: true,
      data: [insight],
    });
    expect(saved.search).toHaveBeenCalledWith("rollout");

    vi.mocked(saved.list).mockRejectedValue(new Error("database unavailable"));
    await expect(routeMessage({ type: "saved:list" }, saved)).resolves.toEqual({
      ok: false,
      error: "database unavailable",
    });
  });
});
