import { stateHash } from "../runtime/hash.ts";
import { CONTENT_HASH, RUNTIME_VERSION, type RuntimeSnapshot } from "./runtime.ts";

const KEY = "oak-rumble-browser-checkpoint-v3";

type Envelope = {
  schemaVersion: 1;
  savedAt: number;
  snapshot: RuntimeSnapshot;
  hash: string;
};

export function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function body(snapshot: RuntimeSnapshot, savedAt: number) {
  return { schemaVersion: 1 as const, savedAt, snapshot };
}

export function encodeCheckpoint(snapshot: RuntimeSnapshot, savedAt = Date.now()): string {
  // Browser storage is JSON. Normalize before hashing so the durable form,\n  // not an in-memory object with undefined-valued properties, defines integrity.\n  const normalized = JSON.parse(JSON.stringify(snapshot)) as RuntimeSnapshot;
  const value = body(normalized, savedAt);
  return JSON.stringify({ ...value, hash: stateHash(value) });
}

export function decodeCheckpoint(text: string): RuntimeSnapshot {
  const parsed = JSON.parse(text) as Partial<Envelope>;
  if (
    parsed.schemaVersion !== 1 ||
    typeof parsed.savedAt !== "number" ||
    !parsed.snapshot ||
    typeof parsed.hash !== "string"
  )
    throw new Error("Invalid checkpoint envelope");
  const expected = stateHash(body(parsed.snapshot, parsed.savedAt));
  if (expected !== parsed.hash) throw new Error("Checkpoint integrity mismatch");
  if (
    parsed.snapshot.schemaVersion !== 1 ||
    parsed.snapshot.game !== "oak-street-rumble" ||
    parsed.snapshot.runtimeVersion !== RUNTIME_VERSION ||
    parsed.snapshot.contentHash !== CONTENT_HASH
  )
    throw new Error("Checkpoint runtime/content version mismatch");
  return parsed.snapshot;
}

export class BrowserCheckpointStore {
  #storage: Storage | null;
  constructor(storage: Storage | null = browserStorage()) {
    this.#storage = storage;
  }
  load(): { snapshot: RuntimeSnapshot | null; error?: string } {
    try {
      const text = this.#storage?.getItem(KEY);
      return { snapshot: text ? decodeCheckpoint(text) : null };
    } catch (error) {
      return {
        snapshot: null,
        error: error instanceof Error ? error.message : "Checkpoint unreadable",
      };
    }
  }
  save(snapshot: RuntimeSnapshot): { ok: boolean; error?: string } {
    try {
      if (!this.#storage) throw new Error("Browser storage unavailable");
      this.#storage.setItem(KEY, encodeCheckpoint(snapshot));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Checkpoint save failed" };
    }
  }
  clear(): void {
    this.#storage?.removeItem(KEY);
  }
}
