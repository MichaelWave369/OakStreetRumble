import assert from "node:assert/strict";
import test from "node:test";

import { validIntent } from "../../src/game/actions.ts";
import {
  BufferedController,
  KeyboardController,
  KeyboardDevice,
  LocalBotController,
} from "../../src/game/controllers.ts";
import { observeWorld, type Observation } from "../../src/game/observation.ts";
import type { Actor, Player, World } from "../../src/game/model.ts";

function actor(partial: Partial<Actor> = {}): Actor {
  return {
    id: "foe:1",
    name: "Dock Rat",
    x: 135,
    y: 370,
    z: 0,
    vz: 0,
    vx: 0,
    face: -1,
    hp: 30,
    maxHp: 30,
    pwr: 1,
    agi: 1,
    state: "idle",
    timer: 0,
    inv: 0,
    stun: 0,
    alive: true,
    boss: false,
    clan: "rats",
    pattern: null,
    cool: 0,
    didSummon: false,
    dash: 0,
    charge: 0,
    scale: 2,
    title: "",
    aggro: true,
    agent: false,
    ...partial,
  };
}

function player(partial: Partial<Player> = {}): Player {
  return {
    ...actor({ id: "player:reed", name: "Reed", x: 100, face: 1, ...partial }),
    cash: 18,
    meter: 0,
    special: "rush",
    charId: "reed",
    combo: 0,
    hitdone: false,
    buff: 0,
    weapon: 0,
    charm: 0,
    kx: 0,
    rushLeft: 0,
    rushGap: 0,
    gear: [],
    hiding: false,
    callsign: "",
    stealthAttack: false,
    ...partial,
  };
}

function world(): World {
  return {
    phase: "play",
    level: 0,
    player: player(),
    foes: [actor()],
    shots: [],
    drops: [],
    floaters: [],
    shops: [{ id: "burger", x: 180 }],
    time: 0,
    shake: 0,
    hitstop: 0,
    banner: "",
    bannerT: 0,
    clearT: null,
    shopId: null,
    best: 0,
    clears: 0,
    picked: "reed",
    room: "oak",
    alert: 37,
    smoke: 0,
    smokeCd: 0,
    starCd: 0,
    taken: [],
    cleared: [],
    visited: ["oak"],
    mate: null,
    partner: null,
    log: [],
    heard: [],
    auto: false,
    duel: false,
    rival: null,
    randomState: 369,
    actorSequence: 1,
    pendingEvents: [],
    actionCauses: {},
    detected: [],
  };
}

function observation(overrides: Partial<Observation> = {}): Observation {
  const w = world();
  return {
    ...(observeWorld(
      w,
      12,
      w.player.id,
      ["MOVE", "ATTACK_LIGHT", "TRANSFER_AUTHORITY"],
      "room",
    ) as Observation),
    ...overrides,
  };
}

test("strict action validation accepts known grammar and rejects extra or malformed data", () => {
  assert.equal(
    validIntent({ actorId: "player:reed", type: "MOVE", params: { x: 1, y: 0 } }),
    true,
  );
  assert.equal(
    validIntent({ actorId: "player:reed", type: "MOVE", params: { x: 2, y: 0 } }),
    false,
  );
  assert.equal(
    validIntent({
      actorId: "player:reed",
      type: "MOVE",
      params: { x: 1, y: 0, admin: true },
    }),
    false,
  );
  assert.equal(
    validIntent({ actorId: "player:reed", type: "TELEPORT", params: {} }),
    false,
  );
});

test("observation is immutable, bounded and exposes capability-gated exits", () => {
  const w = world();
  const o = observeWorld(w, 7, w.player.id, ["MOVE", "ATTACK_LIGHT"]);
  assert.equal(Object.isFrozen(o), true);
  assert.equal(o.self?.id, "player:reed");
  assert.equal(o.visibleActors.some((a) => a.id === "foe:1"), true);
  assert.equal(o.exits.find((e) => e.to === "roof")?.locked, true);
  assert.equal(o.alert, 40);
  assert.deepEqual(o.allowedActions, ["MOVE", "ATTACK_LIGHT"]);
});

test("keyboard controller turns device state into intents instead of mutating world state", () => {
  const device = new KeyboardDevice();
  const controller = new KeyboardController("human:1", device, 1);
  device.down("KeyD");
  device.down("KeyJ");

  const intents = controller.observe(observation());
  assert.equal(intents.some((a) => a.type === "MOVE" && a.params.x === 1), true);
  assert.equal(intents.some((a) => a.type === "ATTACK_LIGHT"), true);
});

test("local bot decides only from observation data", () => {
  const controller = new LocalBotController("bot:lead", "lead");
  const intents = controller.observe(observation());
  assert.equal(intents.some((a) => a.type === "ATTACK_LIGHT"), true);
});

test("buffered async controller drains resolved intents exactly once", () => {
  const controller = new BufferedController("model:test", "model");
  controller.enqueue([
    { actorId: "player:reed", type: "MOVE", params: { x: 1, y: 0 } },
  ]);
  assert.equal(controller.observe(observation()).length, 1);
  assert.equal(controller.observe(observation()).length, 0);
});
