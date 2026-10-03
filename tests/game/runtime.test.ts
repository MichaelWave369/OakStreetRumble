import assert from "node:assert/strict";
import test from "node:test";

import { BufferedController } from "../../src/game/controllers.ts";
import { ContractRules } from "../../src/game/rules.ts";
import { OakRuntime, replay } from "../../src/game/runtime.ts";

function begin(r: OakRuntime, characterId = "reed") {
  r.submit("human:1", {
    actorId: r.state.player.id,
    type: "BEGIN_RUN",
    params: { characterId },
  });
  r.advance();
  assert.equal(r.state.phase, "play");
}

function move(r: OakRuntime, x: -1 | 0 | 1, y: -1 | 0 | 1, controllerId = "human:1") {
  r.submit(controllerId, {
    actorId: r.state.player.id,
    type: "MOVE",
    params: { x, y },
  });
  r.advance();
}

test("runtime applies deterministic movement through authority + Action Bus", () => {
  const r = new OakRuntime({ seed: 369 });
  begin(r);
  const start = r.state.player.x;

  for (let i = 0; i < 60; i++) move(r, 1, 0);

  assert.ok(Math.abs(r.state.player.x - start - 186) < 1e-9);
  assert.ok(r.events.some((e) => e.type === "ACTION_ACCEPTED"));
  assert.equal(r.tick, 61);
});

test("malformed and unknown-controller roots are attributed and cannot mutate state", () => {
  const r = new OakRuntime();
  begin(r);
  const x = r.state.player.x;

  r.submit("human:1", {
    actorId: r.state.player.id,
    type: "MOVE",
    params: { x: 99, y: 0 },
  });
  r.advance();
  assert.equal(r.lastDecision?.reason, "MALFORMED_ACTION");
  assert.equal(r.state.player.x, x);

  r.submit("stranger", {
    actorId: r.state.player.id,
    type: "MOVE",
    params: { x: 1, y: 0 },
  });
  r.advance();
  assert.equal(r.lastDecision?.reason, "UNKNOWN_CONTROLLER");
  assert.equal(r.state.player.x, x);
});

test("authority can be handed to the lead bot without granting management rights", () => {
  const r = new OakRuntime();
  begin(r);

  r.submit("human:1", {
    actorId: r.state.player.id,
    type: "TRANSFER_AUTHORITY",
    params: { to: "bot:lead", capabilities: ["movement", "navigation"] },
  });
  r.advance();
  assert.equal(r.lastDecision?.accepted, true);
  assert.deepEqual(r.authority[r.state.player.id].movement, ["bot:lead"]);
  assert.deepEqual(r.authority[r.state.player.id].authority, ["human:1"]);

  const x = r.state.player.x;
  move(r, 1, 0, "human:1");
  assert.equal(r.lastDecision?.reason, "AUTHORITY_DENIED");
  assert.equal(r.state.player.x, x);

  move(r, 1, 0, "bot:lead");
  assert.ok(r.state.player.x > x);
});

test("registration gives observation access but never grants authority", () => {
  const r = new OakRuntime();
  r.register(new BufferedController("remote:1", "remote"));
  begin(r);
  const observation = r.observe("remote:1");
  assert.equal(observation.self?.id, r.state.player.id);
  assert.deepEqual(observation.allowedActions, []);

  r.submit("remote:1", {
    actorId: r.state.player.id,
    type: "MOVE",
    params: { x: 1, y: 0 },
  });
  r.advance();
  assert.equal(r.lastDecision?.reason, "AUTHORITY_DENIED");
});

test("capability-gated exits reject before traversal and preserve world state", () => {
  const rules = new ContractRules();
  const world = rules.createWorld();
  world.phase = "play";
  world.player.y = 268;
  const r = new OakRuntime({ world, rules });

  r.submit("human:1", {
    actorId: r.state.player.id,
    type: "ENTER_ROOM",
    params: { direction: "up" },
  });
  r.advance();

  assert.equal(r.lastDecision?.reason, "CAPABILITY_REQUIRED");
  assert.equal(r.state.room, "oak");
});

test("same initial snapshot plus same roots produces the same complete hash", () => {
  const seed = new OakRuntime({ seed: 90210 });
  begin(seed);
  const initial = seed.snapshot();

  const a = new OakRuntime({ snapshot: initial });
  const b = new OakRuntime({ snapshot: initial });

  for (let i = 0; i < 120; i++) {
    const roots = [{
      controllerId: "human:1",
      tick: a.tick,
      intent: {
        actorId: a.state.player.id,
        type: "MOVE",
        params: { x: i % 2 ? 1 : 0, y: i % 3 ? 0 : 1 },
      },
    }];
    a.advance(roots);
    b.advance(structuredClone(roots));
  }

  assert.equal(a.hash(), b.hash());
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test("recording replays exactly without rerunning external providers", () => {
  const r = new OakRuntime({ seed: 369 });
  begin(r);
  for (let i = 0; i < 90; i++) move(r, i % 2 ? 1 : 0, i % 5 === 0 ? -1 : 0);

  const recording = JSON.parse(JSON.stringify(r.recording()));
  const again = replay(recording);

  assert.equal(again.hash(), r.hash());
  assert.deepEqual(again.snapshot(), r.snapshot());
});
