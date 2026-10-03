import assert from "node:assert/strict";
import test from "node:test";

import {
  BrowserCheckpointStore,
  decodeCheckpoint,
  encodeCheckpoint,
} from "../../src/game/browser-persistence.ts";
import { OakRuntime } from "../../src/game/runtime.ts";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("browser checkpoint round-trips a complete governed snapshot", () => {
  const runtime = new OakRuntime({ seed: 369 });
  runtime.submit("human:1", {
    actorId: runtime.state.player.id,
    type: "BEGIN_RUN",
    params: { characterId: "reed" },
  });
  runtime.advance();
  const snapshot = runtime.snapshot();

  const restored = decodeCheckpoint(encodeCheckpoint(snapshot, 1234));
  assert.deepEqual(restored, snapshot);

  const resumed = new OakRuntime({ snapshot: restored });
  assert.equal(resumed.hash(), runtime.hash());
});

test("browser checkpoint detects tampering", () => {
  const runtime = new OakRuntime();
  const encoded = JSON.parse(encodeCheckpoint(runtime.snapshot(), 1234));
  encoded.snapshot.world.player.cash = 999999;
  assert.throws(() => decodeCheckpoint(JSON.stringify(encoded)), /integrity/i);
});

test("browser checkpoint store degrades cleanly when storage throws", () => {
  const broken = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() {},
  } as unknown as Storage;
  const store = new BrowserCheckpointStore(broken);
  assert.equal(store.load().snapshot, null);
  assert.equal(store.save(new OakRuntime().snapshot()).ok, false);
});
