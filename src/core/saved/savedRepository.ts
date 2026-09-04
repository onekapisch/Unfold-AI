import type { SavedInsight, SavedInsightInput } from "./types";
import { validateSavedInsight, validateSavedInsightInput } from "./validation";

const STORE_NAME = "insights";
const DEFAULT_MAX_ESTIMATED_BYTES = 5 * 1024 * 1024;

interface RepositoryOptions {
  factory?: IDBFactory;
  databaseName?: string;
  maxEstimatedBytes?: number;
  now?: () => number;
  createId?: () => string;
}

export interface SavedRepository {
  create(input: SavedInsightInput): Promise<SavedInsight>;
  list(): Promise<SavedInsight[]>;
  search(query: string): Promise<SavedInsight[]>;
  updateNote(id: string, note: string): Promise<SavedInsight>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  replaceAll(insights: SavedInsight[]): Promise<void>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed")), { once: true });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("IndexedDB transaction failed")), { once: true });
  });
}

function estimateBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function estimateContentBytes(insights: SavedInsight[]): number {
  return insights.reduce((total, insight) => total + estimateBytes([
    insight.providerId,
    insight.conversationUrl,
    insight.pageTitle,
    insight.sectionTitle,
    insight.text,
    insight.note,
  ]), 0);
}

function defaultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `insight-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createSavedRepository(options: RepositoryOptions = {}): SavedRepository {
  const factory = options.factory ?? globalThis.indexedDB;
  const databaseName = options.databaseName ?? "unfold-ai";
  const maximumBytes = options.maxEstimatedBytes ?? DEFAULT_MAX_ESTIMATED_BYTES;
  const now = options.now ?? Date.now;
  const createId = options.createId ?? defaultId;

  const openDatabase = async (): Promise<IDBDatabase> => {
    if (!factory) throw new Error("IndexedDB is unavailable");
    const request = factory.open(databaseName, 1);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("providerId", "providerId");
      }
    });
    return requestResult(request);
  };

  const list = async (): Promise<SavedInsight[]> => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const insights = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as SavedInsight[];
      await transactionComplete(transaction);
      return insights.sort((left, right) => right.updatedAt - left.updatedAt);
    } finally {
      database.close();
    }
  };

  const create = async (input: SavedInsightInput): Promise<SavedInsight> => {
    const validated = validateSavedInsightInput(input);
    const timestamp = now();
    const insight: SavedInsight = {
      ...validated,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    };
    const existing = await list();
    if (estimateContentBytes([...existing, insight]) > maximumBytes) {
      throw new Error("Saved insights storage limit reached");
    }
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).add(insight);
      await transactionComplete(transaction);
      return insight;
    } finally {
      database.close();
    }
  };

  return {
    create,
    list,
    async search(query: string): Promise<SavedInsight[]> {
      const needle = query.trim().toLocaleLowerCase();
      if (!needle) return list();
      return (await list()).filter((insight) =>
        [insight.pageTitle, insight.sectionTitle, insight.text, insight.note, insight.providerId]
          .some((value) => value.toLocaleLowerCase().includes(needle)),
      );
    },
    async updateNote(id: string, note: string): Promise<SavedInsight> {
      const match = (await list()).find((insight) => insight.id === id);
      if (!match) throw new Error("Saved insight not found");
      const validated = validateSavedInsightInput({ ...match, note });
      const updated: SavedInsight = { ...match, ...validated, updatedAt: now() };
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(updated);
        await transactionComplete(transaction);
        return updated;
      } finally {
        database.close();
      }
    },
    async delete(id: string): Promise<void> {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(id);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
    async clear(): Promise<void> {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).clear();
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
    async replaceAll(insights: SavedInsight[]): Promise<void> {
      const validated = insights.map(validateSavedInsight);
      if (estimateContentBytes(validated) > maximumBytes) {
        throw new Error("Saved insights storage limit reached");
      }
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        validated.forEach((insight) => store.put(insight));
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
  };
}
