import assert from "node:assert/strict";
import test from "node:test";

import * as engine from "../../src/game/engine.ts";
import { ROOMS } from "../../src/game/content.ts";
import {
  KeyboardController,
  KeyboardDevice,
  LocalBotController,
  PLAY_ACTIONS,
} from "../../src/game/controllers.ts";
import { observeWorld } from "../../src/game/observation.ts";
import { OakRuntime } from "../../src/game/runtime.ts";
import type { ActionIntent, RunOptions } from "../../src/game/actions.ts";
import type { Input, Player, World } from "../../src/game/engine.ts";

const runtimeOnly = new Set([
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

function botInput(
  controller: LocalBotController,
  world: World,
  tick: number,
  actor: Player,
): Input {
  const observation = observeWorld(world as any, tick, actor.id, PLAY_ACTIONS, "room");
  return intentsToInput(controller.observe(observation));
}

function intentsToInput(intents: readonly ActionIntent[]): Input {
  const input = engine.emptyInput();
  for (const intent of intents) {
    switch (intent.type) {
      case "MOVE":
        input.left = intent.params.x < 0;
        input.right = intent.params.x > 0;
        input.up = intent.params.y < 0;
        input.down = intent.params.y > 0;
        break;
      case "JUMP":
        input.jump = true;
        break;
      case "CROUCH":
        input.crouch = intent.params.active;
        break;
      case "BLOCK":
        input.block = intent.params.active;
        break;
      case "ATTACK_LIGHT":
        input.punch = true;
        break;
      case "ATTACK_HEAVY":
        input.kick = true;
        break;
      case "SPECIAL":
        input.special = true;
        break;
      case "USE_ITEM":
        if (intent.params.item === "stars") input.throwStar = true;
        else input.smoke = true;
        break;
      case "INTERACT":
        if (intent.params.kind === "shop") input.shop = true;
        if (intent.params.kind === "hide") input.hide = intent.params.active ?? true;
        break;
      default:
        break;
    }
  }
  return input;
}

function keyInput(
  held: ReadonlySet<string>,
  previous: ReadonlySet<string>,
  partnerPresent: boolean,
  playerNumber: 1 | 2,
): Input {
  const edge = (key: string) => held.has(key) && !previous.has(key);
  const input = engine.emptyInput();

  if (playerNumber === 2) {
    input.left = held.has("ArrowLeft");
    input.right = held.has("ArrowRight");
    input.up = held.has("ArrowUp");
    input.down = held.has("ArrowDown");
    input.punch = edge("KeyU");
    input.kick = edge("KeyI");
    input.jump = edge("KeyO");
    return input;
  }

  input.left = held.has("KeyA") || (!partnerPresent && held.has("ArrowLeft"));
  input.right = held.has("KeyD") || (!partnerPresent && held.has("ArrowRight"));
  input.up = held.has("KeyW") || (!partnerPresent && held.has("ArrowUp"));
  input.down = held.has("KeyS") || (!partnerPresent && held.has("ArrowDown"));
  input.punch = edge("KeyJ") || (!partnerPresent && edge("KeyU"));
  input.kick = edge("KeyK") || (!partnerPresent && edge("KeyI"));
  input.jump = edge("Space") || (!partnerPresent && edge("KeyO"));
  input.special = edge("KeyF");
  input.block = held.has("ShiftLeft") || held.has("ShiftRight");
  input.crouch = held.has("KeyC");
  input.shop = edge("KeyE");
  input.hide = held.has("KeyQ");
  input.throwStar = edge("KeyR");
  input.smoke = edge("KeyG");
  return input;
}

function directStep(
  world: World,
  tick: number,
  held: ReadonlySet<string>,
  previous: ReadonlySet<string>,
  bots: {
    lead: LocalBotController;
    partner: LocalBotController;
    wren: LocalBotController;
    sable: LocalBotController;
  },
) {
  const playerHuman = keyInput(held, previous, !!world.partner, 1);
  const partnerHuman = keyInput(held, previous, true, 2);

  if (world.phase === "play") {
    engine.step(world, 1 / 60, engine.emptyInput(), {
      forActor: (actor) => {
        if (actor === world.player)
          return world.auto ? botInput(bots.lead, world, tick, actor) : playerHuman;
        if (actor === world.partner)
          return world.auto || actor.callsign === "BOT"
            ? botInput(bots.partner, world, tick, actor)
            : partnerHuman;
        if (actor === world.mate) return botInput(bots.wren, world, tick, actor);
        if (actor === world.rival) return botInput(bots.sable, world, tick, actor);
        return engine.emptyInput();
      },
      requestExit: (direction, automatic) => engine.leaveThroughExit(world, direction, automatic),
    });
  } else {
    world.time += 1 / 60;
  }
}

function compare(
  seed: number,
  opts: RunOptions,
  ticks: number,
  keys: (tick: number) => string[] = () => [],
  char = "reed",
  alert = 0,
) {
  const direct = engine.createWorld({ seed });
  engine.beginRun(direct, char, opts);
  direct.alert = alert;

  const governed = engine.createWorld({ seed });
  engine.beginRun(governed, char, opts);
  governed.alert = alert;

  const runtime = new OakRuntime({ world: governed as any });
  const device = new KeyboardDevice();
  runtime.register(new KeyboardController("human:1", device), "player", "room");
  runtime.register(new KeyboardController("human:2", device, 2), "partner", "room");

  const bots = {
    lead: new LocalBotController("ref:lead", "lead"),
    partner: new LocalBotController("ref:partner", "partner"),
    wren: new LocalBotController("ref:wren", "wren"),
    sable: new LocalBotController("ref:sable", "sable"),
  };

  assert.deepEqual(gameplay(runtime.state), gameplay(direct));
  let previous = new Set<string>();

  for (let tick = 0; tick < ticks; tick++) {
    const held = new Set(keys(tick));
    const edge = (key: string) => held.has(key) && !previous.has(key);

    if (edge("KeyH")) engine.toggleAuto(direct);
    if (edge("KeyM"))
      direct.phase =
        direct.phase === "play" ? "map" : direct.phase === "map" ? "play" : direct.phase;

    directStep(direct, tick, held, previous, bots);
    device.setKeys([...held]);
    runtime.advance();
    previous = held;

    assert.deepEqual(
      gameplay(runtime.state),
      gameplay(direct),
      `gameplay drift at seed ${seed}, tick ${tick}`,
    );
  }
}

for (const seed of [1, 369, 8128])
  test(`full parity: calm agent crew matches every tick (seed ${seed})`, () =>
    compare(seed, { auto: true, mate: true, partnerId: "mara", partnerBot: true }, 1200));

test("full parity: Sable duel matches every tick", () =>
  compare(21, { duel: true }, 1200));

test("full parity: human movement/combat/block/crouch and arrow fallback", () => {
  compare(369, {}, 900, (tick) => {
    if (tick < 80) return ["KeyD"];
    if (tick < 160) return ["KeyW", "KeyC"];
    if (tick < 220) return ["ShiftLeft", "KeyD"];
    if (tick < 500) return tick % 22 === 0 ? ["KeyJ"] : ["KeyD"];
    if (tick < 620) return tick % 28 === 0 ? ["KeyK"] : ["KeyS"];
    if (tick < 700) return ["ArrowLeft"];
    return tick % 60 === 0 ? ["Space"] : [];
  });
});

test("full parity: human partner and Wren keep sequential within-tick observations", () =>
  compare(112, { mate: true, partnerId: "mara" }, 700, (tick) => [
    ...(tick < 160 ? ["KeyD"] : []),
    ...(tick < 240 ? ["ArrowRight"] : []),
    ...(tick % 30 === 0 ? ["KeyU", "KeyJ"] : []),
  ]));

for (const room of ROOMS.filter((r) => r.boss))
  test(`full parity: ${room.boss!.name} boss numeric state and spawns`, () => {
    const direct = engine.createWorld({ seed: 7 });
    engine.beginRun(direct, "brick");
    engine.enterRoom(direct, room.id, 600, 360);

    const governed = engine.createWorld({ seed: 7 });
    engine.beginRun(governed, "brick");
    engine.enterRoom(governed, room.id, 600, 360);

    for (const world of [direct, governed]) {
      world.foes = world.foes.filter((foe) => foe.boss);
      world.alert = 100;
      world.player.inv = 100;
      Object.assign(world.foes[0], {
        cool: 0,
        timer: 0,
        hp: world.foes[0].maxHp * 0.5,
      });
    }

    const runtime = new OakRuntime({ world: governed as any });
    for (let tick = 0; tick < 240; tick++) {
      engine.step(direct, 1 / 60, engine.emptyInput());
      runtime.advance();
      assert.deepEqual(gameplay(runtime.state), gameplay(direct), `boss drift at tick ${tick}`);
    }
  });

for (const seed of [1, 369, 8128])
  test(`full parity: active agent crew combat matches every tick (seed ${seed})`, () =>
    compare(
      seed,
      { auto: true, mate: true, partnerId: "mara", partnerBot: true },
      2400,
      () => [],
      "reed",
      100,
    ));

test("full parity: H preserves tuning/banner/log while authority transfers", () =>
  compare(369, {}, 600, (tick) => (tick === 20 || tick === 400 ? ["KeyH"] : [])));

test("full parity: map freezes gameplay/presentation while clock advances", () =>
  compare(369, {}, 300, (tick) =>
    tick === 30 || tick === 150 ? ["KeyM"] : tick < 20 ? ["KeyD"] : [],
  ));
