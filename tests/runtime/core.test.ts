import assert from "node:assert/strict";
import test from "node:test";

import {
  ActionBus,
  Authority,
  RealityLedger,
  type ActionEnvelope,
} from "../../src/runtime/core.ts";
import { stateHash } from "../../src/runtime/hash.ts";
import { random } from "../../src/runtime/random.ts";

test("ActionBus preserves FIFO order and copies queued actions", () => {
  const bus = new ActionBus<ActionEnvelope>();
  const first: ActionEnvelope = {
    id: "a:1",
    actorId: "player:reed",
    controllerId: "human:1",
    tick: 1,
    type: "MOVE",
    params: { x: 1, y: 0 },
    schemaVersion: 1,
  };
  bus.enqueue(first);
  first.params = { x: -1, y: 0 };
  bus.enqueue({
    ...first,
    id: "a:2",
    tick: 2,
  });

  const batch = bus.drain();
  assert.deepEqual(batch.map((action) => action.id), ["a:1", "a:2"]);
  assert.deepEqual(batch[0].params, { x: 1, y: 0 });
  assert.equal(bus.drain().length, 0);
});

test("Authority is explicit and purchases remain human-only", () => {
  const authority = new Authority();
  authority.assign("player:reed", "movement", ["human:1", "bot:1"]);
  authority.assign("player:reed", "purchases", ["human:1", "bot:1"]);

  assert.equal(authority.allows("player:reed", "human:1", "human", "movement"), true);
  assert.equal(authority.allows("player:reed", "bot:1", "bot", "movement"), true);
  assert.equal(authority.allows("player:reed", "human:1", "human", "purchases"), true);
  assert.equal(authority.allows("player:reed", "bot:1", "bot", "purchases"), false);
});

test("RealityLedger is append-only, ordered and exported by copy", () => {
  const ledger = new RealityLedger();
  const stored = ledger.append(4, {
    type: "ACTION_ACCEPTED",
    sourceId: "player:reed",
    controllerId: "human:1",
    payload: { action: "MOVE" },
  });

  assert.equal(stored.id, "e:1");
  assert.equal(Object.isFrozen(stored), true);
  const snapshot = ledger.snapshot();
  snapshot[0].payload.action = "tampered";
  assert.equal(ledger.snapshot()[0].payload.action, "MOVE");

  assert.throws(
    () =>
      ledger.append(3, {
        type: "OUT_OF_ORDER",
        payload: {},
      }),
    /Invalid ledger tick/,
  );
});

test("stateHash is stable across object key order", () => {
  assert.equal(
    stateHash({ b: 2, a: { y: 4, x: 3 } }),
    stateHash({ a: { x: 3, y: 4 }, b: 2 }),
  );
});

test("seeded random stream is deterministic and serializable", () => {
  const left = { randomState: 369 };
  const right = { randomState: 369 };
  const l = Array.from({ length: 8 }, () => random(left));
  const r = Array.from({ length: 8 }, () => random(right));

  assert.deepEqual(l, r);
  assert.equal(left.randomState, right.randomState);
});
