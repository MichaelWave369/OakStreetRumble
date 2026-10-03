import assert from "node:assert/strict";
import test from "node:test";

import * as engine from "../../src/game/engine.ts";
import { BufferedController } from "../../src/game/controllers.ts";
import { OakRuntime } from "../../src/game/runtime.ts";

function edgeWorld() {
  const world = engine.createWorld({ seed: 369 });
  engine.beginRun(world, "reed");
  world.foes = [];
  world.shots = [];
  world.pendingEvents = [];
  world.player.x = 929;
  world.player.y = 380;
  return world;
}

function acceptedAction(runtime: OakRuntime, type: string) {
  return runtime.events.find(
    (event) =>
      event.type === "ACTION_ACCEPTED" &&
      (event.payload.action as { type?: string } | undefined)?.type === type,
  );
}

test("manual edge traversal becomes a first-class derived ENTER_ROOM action", () => {
  const runtime = new OakRuntime({ world: edgeWorld() as any });

  runtime.submit("human:1", {
    actorId: runtime.state.player.id,
    type: "MOVE",
    params: { x: 1, y: 0 },
  });
  runtime.advance();

  assert.equal(runtime.state.room, "pier");
  const move = acceptedAction(runtime, "MOVE");
  const enter = acceptedAction(runtime, "ENTER_ROOM");

  assert.ok(move);
  assert.ok(enter);
  assert.equal(enter.controllerId, "human:1");
  assert.equal(enter.causalParent, move.payload.actionId);
  assert.equal(
    (enter.payload.action as { causalParent?: string }).causalParent,
    move.payload.actionId,
  );
});

test("derived traversal cannot impersonate a separate navigation authority", () => {
  const runtime = new OakRuntime({ world: edgeWorld() as any });
  runtime.register(new BufferedController("agent:nav", "remote"), "player", "room");

  runtime.submit("human:1", {
    actorId: runtime.state.player.id,
    type: "TRANSFER_AUTHORITY",
    params: { to: "agent:nav", capabilities: ["navigation"] },
  });
  runtime.advance();

  runtime.submit("human:1", {
    actorId: runtime.state.player.id,
    type: "MOVE",
    params: { x: 1, y: 0 },
  });
  runtime.advance();

  assert.equal(runtime.state.room, "oak");

  const move = [...runtime.events]
    .reverse()
    .find(
      (event) =>
        event.type === "ACTION_ACCEPTED" &&
        (event.payload.action as { type?: string } | undefined)?.type === "MOVE",
    );
  const denied = [...runtime.events]
    .reverse()
    .find(
      (event) =>
        event.type === "ACTION_REJECTED" &&
        event.payload.actionType === "ENTER_ROOM",
    );

  assert.ok(move);
  assert.ok(denied);
  assert.equal(denied.controllerId, "human:1");
  assert.equal(denied.payload.reason, "AUTHORITY_DENIED");
  assert.equal(denied.causalParent, move.payload.actionId);
});

test("automatic quiet-room traversal is derived through bot:lead navigation authority", () => {
  const world = edgeWorld();
  world.auto = true;
  world.player.x = 500;
  world.clearT = 0;

  const runtime = new OakRuntime({ world: world as any });
  runtime.advance();

  assert.equal(runtime.state.room, "pier");
  const enter = acceptedAction(runtime, "ENTER_ROOM");
  assert.ok(enter);
  assert.equal(enter.controllerId, "bot:lead");
  assert.equal(
    (enter.payload.action as { params?: { automatic?: boolean } }).params?.automatic,
    true,
  );
});
