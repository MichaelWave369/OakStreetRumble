import assert from "node:assert/strict";
import test from "node:test";

import * as engine from "../../src/game/engine.ts";
import { SHOPS } from "../../src/game/content.ts";
import { OakRuntime, replay } from "../../src/game/runtime.ts";
import type { ActionParams, ActionType } from "../../src/game/actions.ts";

const runtimeOnly = new Set([
  "sourceId",
  "causalParent",
  "pendingEvents",
  "actionCauses",
  "attackCause",
]);

function gameplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(gameplay);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !runtimeOnly.has(key))
        .map(([key, nested]) => [key, gameplay(nested)]),
    );
  return value;
}

function fixture(edit?: (world: engine.World) => void, character = "reed") {
  const world = engine.createWorld({ seed: 369 });
  engine.beginRun(world, character);
  world.foes = [];
  world.shots = [];
  world.pendingEvents = [];
  edit?.(world);
  return new OakRuntime({ world: world as any });
}

function action<K extends ActionType>(
  runtime: OakRuntime,
  type: K,
  params: ActionParams[K],
  controllerId = "human:1",
  actorId = runtime.state.player.id,
) {
  runtime.submit(controllerId, { actorId, type, params });
}

function advance(runtime: OakRuntime, ticks: number) {
  for (let i = 0; i < ticks; i++) runtime.advance();
}

test("preserved engine keeps exact original human movement tuning", () => {
  const runtime = fixture();
  const start = runtime.state.player.x;

  for (let i = 0; i < 60; i++) {
    action(runtime, "MOVE", { x: 1, y: 0 });
    runtime.advance();
  }

  assert.ok(Math.abs(runtime.state.player.x - start - 186) < 1e-9);
});

test("light attack keeps damage/combo/meter/healing and causal controller provenance", () => {
  const runtime = fixture((world) => {
    const foeWorld = engine.createWorld({ seed: 72 });
    engine.beginRun(foeWorld, "reed");
    const foe = foeWorld.foes[0];
    Object.assign(foe, {
      id: "test:foe",
      x: world.player.x + 26,
      y: world.player.y,
      hp: 100,
      maxHp: 100,
      cool: 99,
      timer: 99,
      inv: 0,
      aggro: false,
      agent: false,
      boss: false,
    });
    world.foes = [foe];
    world.player.hp -= 10;
  });

  action(runtime, "ATTACK_LIGHT", {});
  runtime.advance();
  assert.equal(runtime.state.foes[0].hp, 100);

  advance(runtime, 16);

  assert.equal(runtime.state.foes[0].hp, 87);
  assert.equal(runtime.state.player.combo, 1);
  assert.ok(runtime.state.player.meter > 0);
  assert.equal(runtime.state.player.hp, 70);

  const landed = runtime.events.find((event) => event.type === "ATTACK_LANDED");
  assert.equal(landed?.controllerId, "human:1");
  assert.ok(landed?.causalParent?.startsWith("a:"));
});

test("Quiet Wrap retains crouched-behind quiet attack behavior", () => {
  const runtime = fixture((world) => {
    const foeWorld = engine.createWorld({ seed: 72 });
    engine.beginRun(foeWorld, "reed");
    const foe = foeWorld.foes[0];
    Object.assign(foe, {
      id: "test:foe",
      x: world.player.x + 26,
      y: world.player.y,
      face: 1,
      hp: 100,
      maxHp: 100,
      cool: 99,
      timer: 99,
      inv: 0,
      aggro: false,
      agent: false,
      boss: false,
    });
    world.foes = [foe];
    world.player.gear.push("wrap");
  });

  action(runtime, "CROUCH", { active: true });
  runtime.advance();
  action(runtime, "CROUCH", { active: true });
  action(runtime, "ATTACK_LIGHT", {});
  runtime.advance();
  advance(runtime, 16);

  const landed = runtime.events.find((event) => event.type === "ATTACK_LANDED");
  assert.equal(landed?.payload.quiet, true);
  assert.ok(runtime.state.alert < 20);
});

test("shop purchase uses original price and effect through governed action", () => {
  const runtime = fixture((world) => {
    world.player.x = world.shops[0].x;
    world.player.y = 350;
    world.player.cash = 50;
  });

  action(runtime, "INTERACT", { kind: "shop" });
  runtime.advance();
  assert.equal(runtime.state.phase, "shop");
  const shopId = runtime.state.shopId!;
  const price = SHOPS[shopId].price;
  const before = runtime.state.player.cash;

  action(runtime, "BUY", { shopId });
  runtime.advance();

  assert.equal(runtime.state.player.cash, before - price);
  assert.equal(runtime.state.phase, "play");
  assert.ok(runtime.events.some((event) => event.type === "PURCHASE_COMPLETED"));
});

test("detection still respects crouch and smoke", () => {
  const make = () =>
    fixture((world) => {
      const foeWorld = engine.createWorld({ seed: 72 });
      engine.beginRun(foeWorld, "reed");
      const foe = foeWorld.foes[0];
      Object.assign(foe, {
        id: "test:watcher",
        x: world.player.x - 100,
        y: world.player.y,
        face: 1,
        hp: 100,
        maxHp: 100,
        cool: 99,
        timer: 99,
        inv: 0,
        aggro: false,
        agent: false,
        boss: false,
      });
      world.foes = [foe];
    });

  const upright = make();
  upright.advance();
  assert.ok(upright.state.alert > 0);

  const crouched = make();
  action(crouched, "CROUCH", { active: true });
  crouched.advance();
  assert.equal(crouched.state.alert, 0);

  const smoked = make();
  const snapshot = smoked.snapshot();
  snapshot.world.smoke = 2;
  const smokeRuntime = new OakRuntime({ snapshot });
  smokeRuntime.advance();
  assert.equal(smokeRuntime.state.alert, 0);
});

test("runtime and preserved engine remain tick-parity for a human control trace", () => {
  const direct = engine.createWorld({ seed: 1337 });
  engine.beginRun(direct, "reed");
  direct.alert = 100;

  const runtimeWorld = engine.createWorld({ seed: 1337 });
  engine.beginRun(runtimeWorld, "reed");
  runtimeWorld.alert = 100;
  const runtime = new OakRuntime({ world: runtimeWorld as any });

  for (let tick = 0; tick < 600; tick++) {
    const input = engine.emptyInput();

    if (tick < 80) {
      input.right = true;
      action(runtime, "MOVE", { x: 1, y: 0 });
    } else if (tick < 140) {
      input.up = true;
      input.crouch = true;
      action(runtime, "MOVE", { x: 0, y: -1 });
      action(runtime, "CROUCH", { active: true });
    } else if (tick < 200) {
      input.right = true;
      input.block = true;
      action(runtime, "MOVE", { x: 1, y: 0 });
      action(runtime, "BLOCK", { active: true });
    } else if (tick % 45 === 0) {
      input.punch = true;
      action(runtime, "ATTACK_LIGHT", {});
    }

    engine.step(direct, 1 / 60, input);
    runtime.advance();

    assert.deepEqual(
      gameplay(runtime.state),
      gameplay(direct),
      `gameplay drift at tick ${tick}`,
    );
  }
});

test("recorded preserved-gameplay run replays exactly", () => {
  const runtime = fixture();
  for (let i = 0; i < 180; i++) {
    if (i < 90) action(runtime, "MOVE", { x: 1, y: i % 4 === 0 ? -1 : 0 });
    if (i === 100) action(runtime, "ATTACK_LIGHT", {});
    runtime.advance();
  }

  const recording = JSON.parse(JSON.stringify(runtime.recording()));
  const result = replay(recording);

  assert.equal(result.hash(), runtime.hash());
  assert.deepEqual(result.snapshot(), runtime.snapshot());
});
