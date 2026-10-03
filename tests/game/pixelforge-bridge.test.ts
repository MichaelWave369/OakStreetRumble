import assert from "node:assert/strict";
import test from "node:test";

import {
  OAK_PIXELFORGE_BRIDGE_METHODS,
  createOakPixelForgeBridge,
} from "../../src/pixelforge/bridge-v1.ts";
import type { RuntimeSnapshot } from "../../src/game/runtime.ts";

test("Oak exposes exactly the PixelForge Runtime Bridge v1 surface", () => {
  const bridge = createOakPixelForgeBridge({ seed: 369 });

  assert.deepEqual(
    Object.keys(bridge).sort(),
    [...OAK_PIXELFORGE_BRIDGE_METHODS].sort(),
  );
  assert.deepEqual(bridge.describe(), {
    protocol: "pixelforge-runtime-bridge",
    version: 1,
    gameId: "oak-street-rumble",
    runtimeVersion: "oak-runtime-kernel/1",
    deterministic: true,
  });

  assert.equal("state" in bridge, false);
  assert.equal("world" in bridge, false);
  assert.equal("runtime" in bridge, false);
});

test("PixelForge registration gives observation but no authority", () => {
  const bridge = createOakPixelForgeBridge();

  bridge.registerController({
    id: "script:pixelforge",
    kind: "script",
    binding: "player",
    profile: "nearby",
  });

  const observation = bridge.observe("script:pixelforge");
  assert.equal(Object.isFrozen(observation), true);
  assert.equal(observation.self?.id, "player:reed");
  assert.deepEqual(observation.allowedActions, []);
});

test("Oak can be inhabited through PixelForge bridge without bypassing authority", () => {
  const bridge = createOakPixelForgeBridge({ seed: 369 });

  bridge.registerController({
    id: "script:pixelforge",
    kind: "script",
    binding: "player",
    profile: "nearby",
  });

  const initialHuman = bridge.observe("human:1");
  assert.equal(initialHuman.self?.id, "player:reed");

  const beginReceipt = bridge.submit("human:1", {
    actorId: initialHuman.self!.id,
    type: "BEGIN_RUN",
    params: { characterId: "brick" },
  });
  assert.deepEqual(beginReceipt, { queued: true, tick: 0 });

  const beginEvents = bridge.advance();
  assert.ok(
    beginEvents.some(
      (event) =>
        event.type === "ACTION_ACCEPTED" &&
        event.controllerId === "human:1" &&
        event.payload.actionType === "BEGIN_RUN",
    ),
  );

  const beforeDelegation = bridge.observe("script:pixelforge");
  assert.equal(beforeDelegation.self?.id, "player:brick");
  assert.deepEqual(beforeDelegation.allowedActions, []);

  bridge.submit("human:1", {
    actorId: beforeDelegation.self!.id,
    type: "TRANSFER_AUTHORITY",
    params: {
      to: "script:pixelforge",
      capabilities: ["movement", "combat", "navigation", "inventory"],
    },
  });
  bridge.advance();

  const observation = bridge.observe("script:pixelforge");
  assert.ok(observation.allowedActions.includes("MOVE"));
  assert.ok(observation.allowedActions.includes("ATTACK_LIGHT"));
  assert.ok(observation.allowedActions.includes("ENTER_ROOM"));
  assert.ok(observation.allowedActions.includes("USE_ITEM"));
  assert.equal(observation.allowedActions.includes("BUY"), false);
  assert.equal(observation.allowedActions.includes("TRANSFER_AUTHORITY"), false);
  assert.equal(observation.allowedActions.includes("BEGIN_RUN"), false);

  const startX = observation.self!.x;
  const receipt = bridge.submit("script:pixelforge", {
    actorId: observation.self!.id,
    type: "MOVE",
    params: { x: 1, y: 0 },
    correlationId: "pixelforge:move:1",
  });
  assert.deepEqual(receipt, { queued: true, tick: 2 });

  const events = bridge.advance();
  const accepted = events.find(
    (event) =>
      event.type === "ACTION_ACCEPTED" &&
      event.controllerId === "script:pixelforge" &&
      event.payload.actionType === "MOVE",
  );

  assert.ok(accepted);
  assert.equal(accepted.correlationId, "pixelforge:move:1");
  assert.ok(bridge.observe("script:pixelforge").self!.x > startX);

  const grants = bridge.authority()["player:brick"];
  assert.deepEqual(grants.movement, ["script:pixelforge"]);
  assert.deepEqual(grants.combat, ["script:pixelforge"]);
  assert.deepEqual(grants.navigation, ["script:pixelforge"]);
  assert.deepEqual(grants.inventory, ["script:pixelforge"]);
  assert.deepEqual(grants.purchases, ["human:1"]);
  assert.deepEqual(grants.authority, ["human:1"]);
  assert.deepEqual(grants.session, ["human:1"]);
});

test("bridge exports immutable checkpoints and restores the same governed state", () => {
  const bridge = createOakPixelForgeBridge({ seed: 8128 });
  const initial = bridge.observe("human:1");

  bridge.submit("human:1", {
    actorId: initial.self!.id,
    type: "BEGIN_RUN",
    params: { characterId: "reed" },
  });
  bridge.advance();

  const snapshot = bridge.snapshot();
  const recording = bridge.recording();

  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(recording), true);
  assert.equal(typeof bridge.hash(), "string");

  const restored = createOakPixelForgeBridge({
    snapshot: snapshot as RuntimeSnapshot,
  });
  assert.equal(restored.hash(), bridge.hash());
  assert.deepEqual(restored.snapshot(), snapshot);
});

test("events(since) is index-based and returns immutable copies", () => {
  const bridge = createOakPixelForgeBridge();
  const initial = bridge.observe("human:1");

  bridge.submit("human:1", {
    actorId: initial.self!.id,
    type: "BEGIN_RUN",
    params: { characterId: "reed" },
  });
  bridge.advance();

  const all = bridge.events();
  const tail = bridge.events(Math.max(0, all.length - 1));

  assert.equal(Object.isFrozen(all), true);
  assert.equal(tail.length, Math.min(1, all.length));
  if (tail[0]) assert.equal(Object.isFrozen(tail[0]), true);
  assert.throws(() => bridge.events(-1), /non-negative integer/i);
});
