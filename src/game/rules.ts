import { CHARACTERS, GEAR, ROOMS, roomById, type Dir, type GearId } from "./content.ts";
import type { GameAction } from "./actions.ts";
import type { Player, World } from "./model.ts";
import type { Meta } from "./meta-storage.ts";
import type { RuleEvent } from "../runtime/core.ts";

export const TICK_RATE = 60;
export const TICK_SECONDS = 1 / TICK_RATE;

export type RuleResult = {
  accepted: boolean;
  reason: string;
  events?: RuleEvent[];
};

export type MoveOrigin = {
  id: string;
  controllerId: string;
};

export type RuleTickHooks = {
  prepareActor(actorId: string): void;
  requestExit(request: {
    direction: Dir;
    automatic: boolean;
    move?: MoveOrigin;
  }): void;
};

export interface OakRules {
  readonly version: string;
  createWorld(options?: { seed?: number; meta?: Meta }): World;
  apply(world: World, action: GameAction, dt: number): RuleResult;
  step(world: World, dt: number, hooks?: RuleTickHooks): RuleEvent[];
}

/**
 * Small deterministic rules adapter used to prove the runtime boundary before
 * the complete preserved Oak combat engine is imported. It deliberately owns
 * only session, locomotion, posture, authority-neutral navigation and phase
 * behavior. Combat/shop mechanics remain rejected until the legacy rules adapter
 * lands, so this file cannot silently redefine Oak's existing numeric gameplay.
 */
export class ContractRules implements OakRules {
  readonly version = "oak-contract-rules/1";

  createWorld(options: { seed?: number; meta?: Meta } = {}): World {
    const meta = options.meta ?? { best: 0, clears: 0, last: "reed" };
    const def = CHARACTERS.find((c) => c.id === meta.last) ?? CHARACTERS[0];
    const player = makePlayer(def.id);
    return {
      phase: "title",
      level: 0,
      player,
      foes: [],
      shots: [],
      drops: [],
      floaters: [],
      shops: [],
      time: 0,
      shake: 0,
      hitstop: 0,
      banner: "",
      bannerT: 0,
      clearT: null,
      shopId: null,
      best: meta.best,
      clears: meta.clears,
      picked: def.id,
      room: "oak",
      alert: 0,
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
      randomState: (options.seed ?? 369) >>> 0,
      actorSequence: 0,
      pendingEvents: [],
      actionCauses: {},
      detected: [],
    };
  }

  apply(world: World, intent: GameAction, dt: number): RuleResult {
    const actor = findPlayer(world, intent.actorId);
    if (!actor) return { accepted: false, reason: "UNKNOWN_ACTOR" };

    switch (intent.type) {
      case "BEGIN_RUN": {
        const def = CHARACTERS.find((c) => c.id === intent.params.characterId);
        if (!def) return { accepted: false, reason: "UNKNOWN_CHARACTER" };
        world.player = makePlayer(def.id);
        world.picked = def.id;
        world.phase = "play";
        world.room = "oak";
        world.level = 0;
        world.visited = ["oak"];
        world.cleared = [];
        world.taken = [];
        world.auto = !!intent.params.options?.auto;
        world.duel = !!intent.params.options?.duel;
        world.banner = world.auto ? "Agents have the street." : "";
        return {
          accepted: true,
          reason: "OK",
          events: [{
            type: "RUN_STARTED",
            sourceId: world.player.id,
            payload: { room: world.room, characterId: def.id },
          }],
        };
      }
      case "SET_PHASE": {
        const next = intent.params.phase;
        if (next === "map" && world.phase === "play") world.phase = "map";
        else if (next === "play" && world.phase === "map") world.phase = "play";
        else if (["title", "select", "story"].includes(next)) world.phase = next;
        else return { accepted: false, reason: "INVALID_PHASE_TRANSITION" };
        return { accepted: true, reason: "OK" };
      }
      case "SET_AUTONOMY":
        if (world.duel) return { accepted: false, reason: "DUEL_AUTHORITY_LOCKED" };
        world.auto = intent.params.active;
        world.banner = world.auto ? "Agents have the body" : "You have the body";
        return {
          accepted: true,
          reason: "OK",
          events: [{
            type: "AUTONOMY_MODE_CHANGED",
            sourceId: actor.id,
            payload: { active: world.auto },
          }],
        };
      case "MOVE": {
        if (world.phase !== "play") return { accepted: false, reason: "NOT_PLAYING" };
        if (!actor.alive) return { accepted: false, reason: "ACTOR_DEFEATED" };
        const speed = 150 + actor.agi * 18;
        actor.x = clamp(actor.x + intent.params.x * speed * dt, 32, 928);
        if (actor.z === 0)
          actor.y = clamp(actor.y + intent.params.y * speed * 0.72 * dt, 268, 470);
        if (intent.params.x) actor.face = intent.params.x > 0 ? 1 : -1;
        actor.state = intent.params.x || intent.params.y ? "walk" : "idle";
        return { accepted: true, reason: "OK" };
      }
      case "CROUCH":
        if (world.phase !== "play") return { accepted: false, reason: "NOT_PLAYING" };
        actor.state = intent.params.active ? "crouch" : "idle";
        return { accepted: true, reason: "OK" };
      case "BLOCK":
        if (world.phase !== "play") return { accepted: false, reason: "NOT_PLAYING" };
        actor.state = intent.params.active ? "block" : "idle";
        return { accepted: true, reason: "OK" };
      case "JUMP":
        if (world.phase !== "play") return { accepted: false, reason: "NOT_PLAYING" };
        if (actor.z > 0) return { accepted: false, reason: "ALREADY_AIRBORNE" };
        actor.z = 1;
        actor.vz = 430;
        actor.state = "jump";
        return { accepted: true, reason: "OK" };
      case "ENTER_ROOM":
        return enter(world, actor, intent.params.direction, intent.params.automatic === true);
      case "EQUIP":
        if (!actor.gear.includes(intent.params.gearId))
          return { accepted: false, reason: "ITEM_NOT_OWNED" };
        return {
          accepted: true,
          reason: "OK",
          events: [{
            type: "ITEM_EQUIPPED",
            sourceId: actor.id,
            payload: { gear: intent.params.gearId },
          }],
        };
      case "TRANSFER_AUTHORITY":
        // The runtime owns authority state; the rules layer only protects game state.
        return { accepted: true, reason: "OK" };
      case "RETRY":
        return world.phase === "lose"
          ? ((world.phase = "play"), (actor.alive = true), (actor.hp = actor.maxHp), {
              accepted: true,
              reason: "OK",
            })
          : { accepted: false, reason: "NOT_DEFEATED" };
      case "ATTACK_LIGHT":
      case "ATTACK_HEAVY":
      case "SPECIAL":
      case "INTERACT":
      case "USE_ITEM":
      case "BUY":
      case "SUMMON_AGENT":
        return { accepted: false, reason: "LEGACY_RULES_NOT_IMPORTED" };
    }
  }

  step(world: World, dt: number, _hooks?: RuleTickHooks): RuleEvent[] {
    world.time += dt;
    for (const actor of [world.player, world.partner, world.mate, world.rival]) {
      if (!actor?.alive || actor.z <= 0) continue;
      actor.z += actor.vz * dt;
      actor.vz -= 980 * dt;
      if (actor.z <= 0) {
        actor.z = 0;
        actor.vz = 0;
        actor.state = "idle";
      }
    }
    world.bannerT = Math.max(0, world.bannerT - dt);
    world.smoke = Math.max(0, world.smoke - dt);
    world.smokeCd = Math.max(0, world.smokeCd - dt);
    world.starCd = Math.max(0, world.starCd - dt);
    return [];
  }
}

function makePlayer(charId: string): Player {
  const def = CHARACTERS.find((c) => c.id === charId) ?? CHARACTERS[0];
  return {
    id: `player:${def.id}`,
    name: def.name,
    x: 90,
    y: 370,
    z: 0,
    vz: 0,
    vx: 0,
    face: 1,
    hp: def.hp,
    maxHp: def.hp,
    pwr: def.pwr,
    agi: def.agi,
    state: "idle",
    timer: 0,
    inv: 0,
    stun: 0,
    alive: true,
    boss: false,
    clan: def.clan,
    pattern: null,
    cool: 1,
    didSummon: false,
    dash: 0,
    charge: 0,
    scale: 2.35,
    title: "",
    aggro: false,
    agent: false,
    cash: 18,
    meter: 0,
    special: def.special,
    charId: def.id,
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
  };
}

function findPlayer(world: World, actorId: string): Player | null {
  return [world.player, world.partner, world.mate, world.rival].find((p) => p?.id === actorId) ?? null;
}

function enter(world: World, actor: Player, direction: Dir, automatic: boolean): RuleResult {
  if (world.phase !== "play") return { accepted: false, reason: "NOT_PLAYING" };
  if (world.duel) return { accepted: false, reason: "DUEL_ROOM_LOCKED" };
  const exit = roomById(world.room).exits.find((e) => e.dir === direction);
  if (!exit) return { accepted: false, reason: "NO_EXIT" };
  if (exit.need && !actor.gear.includes(exit.need))
    return { accepted: false, reason: "CAPABILITY_REQUIRED" };

  if (!automatic) {
    const atEdge =
      direction === "left" ? actor.x <= 40 :
      direction === "right" ? actor.x >= 920 :
      direction === "up" ? actor.y <= 290 :
      actor.y >= 458;
    if (!atEdge) return { accepted: false, reason: "EXIT_OUT_OF_REACH" };
  } else if (!world.auto) return { accepted: false, reason: "AUTO_TRAVERSAL_UNAVAILABLE" };

  world.room = exit.to;
  world.level = Math.max(0, ROOMS.findIndex((r) => r.id === exit.to));
  if (!world.visited.includes(exit.to)) world.visited.push(exit.to);
  actor.x = direction === "left" ? 870 : direction === "right" ? 80 : actor.x;
  actor.y = direction === "up" ? 446 : direction === "down" ? 304 : actor.y;
  return {
    accepted: true,
    reason: "OK",
    events: [
      { type: "ACTOR_ENTERED_ROOM", sourceId: actor.id, payload: { room: exit.to } },
      ...(exit.need
        ? [{ type: "DOOR_UNLOCKED", sourceId: actor.id, payload: { gear: exit.need as GearId } } as RuleEvent]
        : []),
    ],
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
