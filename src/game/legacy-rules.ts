import { ACTION_CAPABILITY, type GameAction } from "./actions.ts";
import {
  BOT,
  TOP,
  VW,
  beginRun,
  buyShop,
  closeShop,
  createWorld,
  emptyInput,
  leaveThroughExit,
  retryLevel,
  step,
  toggleMate,
  togglePartner,
  type Input,
  type Player as EnginePlayer,
  type World as EngineWorld,
} from "./engine.ts";
import { SHOPS, roomById } from "./content.ts";
import type { Meta } from "./meta-storage.ts";
import type { World } from "./model.ts";
import type { RuleEvent } from "../runtime/core.ts";
import type { OakRules, RuleResult } from "./rules.ts";

const DT = 1 / 60;

type MoveOrigin = { id: string; controllerId: string };

export class LegacyOakRules implements OakRules {
  readonly version = "oak-legacy-rules/1";
  #inputs = new Map<string, Input>();
  #moves = new Map<string, MoveOrigin>();

  createWorld(options: { seed?: number; meta?: Meta } = {}): World {
    return createWorld(options) as unknown as World;
  }

  apply(world: World, action: GameAction, _dt: number): RuleResult {
    const w = world as unknown as EngineWorld;
    const actor = actorById(w, action.actorId);
    if (!actor) return { accepted: false, reason: "UNKNOWN_ACTOR" };

    const reason = this.#ruleRejection(w, action, actor);
    if (reason) return { accepted: false, reason };

    w.actionCauses[actor.id] ??= {};
    w.actionCauses[actor.id][ACTION_CAPABILITY[action.type]] = action.id;

    const input = this.#inputs.get(actor.id) ?? emptyInput();
    this.#inputs.set(actor.id, input);

    switch (action.type) {
      case "MOVE":
        this.#moves.set(actor.id, { id: action.id, controllerId: action.controllerId });
        input.left = action.params.x < 0;
        input.right = action.params.x > 0;
        input.up = action.params.y < 0;
        input.down = action.params.y > 0;
        break;
      case "JUMP":
        input.jump = true;
        break;
      case "CROUCH":
        input.crouch = action.params.active;
        break;
      case "BLOCK":
        input.block = action.params.active;
        break;
      case "ATTACK_LIGHT":
        input.punch = true;
        actor.attackCause = action.id;
        break;
      case "ATTACK_HEAVY":
        input.kick = true;
        actor.attackCause = action.id;
        break;
      case "SPECIAL":
        input.special = true;
        actor.attackCause = action.id;
        break;
      case "USE_ITEM":
        if (action.params.item === "stars") input.throwStar = true;
        else input.smoke = true;
        break;
      case "INTERACT":
        if (action.params.kind === "close-shop") closeShop(w);
        else if (action.params.kind === "hide") input.hide = action.params.active ?? true;
        else input.shop = true;
        break;
      case "BUY":
        buyShop(w);
        break;
      case "EQUIP":
        w.pendingEvents.push({
          type: "ITEM_EQUIPPED",
          sourceId: actor.id,
          payload: { gear: action.params.gearId },
        });
        break;
      case "ENTER_ROOM":
        leaveThroughExit(w, action.params.direction, action.params.automatic === true);
        break;
      case "SUMMON_AGENT":
        if (action.params.agent === "wren") toggleMate(w);
        else togglePartner(w);
        break;
      case "TRANSFER_AUTHORITY":
        // Runtime owns the authority map; rules only validate game-state constraints.
        break;
      case "SET_AUTONOMY":
        w.auto = action.params.active;
        w.banner = w.auto ? "Agents have the body" : "You have the body";
        w.bannerT = 1.5;
        w.log.push(w.banner);
        w.pendingEvents.push({
          type: "AUTONOMY_MODE_CHANGED",
          sourceId: actor.id,
          causalParent: action.id,
          payload: { active: action.params.active },
        });
        break;
      case "BEGIN_RUN":
        beginRun(w, action.params.characterId, action.params.options);
        this.#inputs.clear();
        this.#moves.clear();
        break;
      case "RETRY":
        retryLevel(w);
        break;
      case "SET_PHASE":
        w.phase = action.params.phase;
        this.#inputs.clear();
        this.#moves.clear();
        break;
    }

    return { accepted: true, reason: "ALLOW", events: drain(w) };
  }

  step(world: World, dt = DT): RuleEvent[] {
    const w = world as unknown as EngineWorld;

    if (w.phase === "play") {
      step(w, dt, emptyInput(), {
        forActor: (actor) => this.#inputs.get(actor.id) ?? emptyInput(),
        requestExit: (direction, automatic) => {
          const move = this.#moves.get(w.player.id);
          if (move) {
            w.actionCauses[w.player.id] ??= {};
            w.actionCauses[w.player.id].navigation = move.id;
          }
          // This derived transition is downstream of an already validated MOVE.
          // The next runtime rung will promote it to an explicit derived action.
          leaveThroughExit(w, direction, automatic);
        },
      });
    } else {
      // Match the preserved browser/runtime behavior: menus/maps advance only clock.
      w.time += dt;
    }

    this.#inputs.clear();
    this.#moves.clear();
    return drain(w);
  }

  #ruleRejection(w: EngineWorld, a: GameAction, p: EnginePlayer): string {
    const primary = p === w.player;

    if (
      !primary &&
      !["MOVE", "JUMP", "CROUCH", "ATTACK_LIGHT", "ATTACK_HEAVY", "BLOCK"].includes(a.type)
    )
      return "PRIMARY_ACTOR_REQUIRED";

    if (a.type === "BEGIN_RUN")
      return ["title", "select", "story", "win", "lose"].includes(w.phase)
        ? ""
        : "SESSION_ALREADY_ACTIVE";

    if (a.type === "SET_PHASE") {
      const next = a.params.phase;
      if (next === "play") return w.phase === "map" ? "" : "INVALID_PHASE_TRANSITION";
      if (next === "map") return w.phase === "play" ? "" : "INVALID_PHASE_TRANSITION";
      return ["title", "select", "story", "win", "lose", "map", "play"].includes(w.phase)
        ? ""
        : "INVALID_PHASE_TRANSITION";
    }

    if (a.type === "RETRY") return w.phase === "lose" ? "" : "NOT_DEFEATED";

    if (a.type === "BUY")
      return w.phase !== "shop"
        ? "NOT_IN_SHOP"
        : w.shopId !== a.params.shopId
          ? "WRONG_SHOP"
          : p.cash < SHOPS[a.params.shopId].price
            ? "INSUFFICIENT_CASH"
            : "";

    if (a.type === "INTERACT" && a.params.kind === "close-shop")
      return w.phase === "shop" ? "" : "NOT_IN_SHOP";

    if (w.phase !== "play") return "NOT_PLAYING";

    if (a.type === "TRANSFER_AUTHORITY") return w.duel ? "DUEL_AUTHORITY_LOCKED" : "";
    if (a.type === "SET_AUTONOMY") return w.duel ? "DUEL_AUTHORITY_LOCKED" : "";
    if (a.type === "SUMMON_AGENT") return "";

    if (!p.alive) return "ACTOR_DEFEATED";

    const busy = ["punch", "kick", "hurt", ...(primary ? ["special"] : [])].includes(p.state);
    const pending = this.#inputs.get(p.id);

    if (["JUMP", "ATTACK_LIGHT", "ATTACK_HEAVY", "SPECIAL", "USE_ITEM"].includes(a.type)) {
      if (busy) return "ACTOR_BUSY";
      if (
        pending &&
        (pending.punch ||
          pending.kick ||
          pending.jump ||
          pending.special ||
          pending.throwStar ||
          pending.smoke)
      )
        return "ACTION_CONFLICT";
    }

    if (a.type === "JUMP" && (p.z > 0 || p.hiding))
      return p.hiding ? "ACTOR_HIDING" : "ALREADY_AIRBORNE";

    if (a.type === "SPECIAL" && p.meter < 100) return "METER_REQUIRED";

    if (
      a.type === "USE_ITEM" &&
      (!p.gear.includes(a.params.item) ||
        (a.params.item === "stars" ? w.starCd > 0 : w.smokeCd > 0))
    )
      return "ITEM_UNAVAILABLE";

    if (a.type === "INTERACT" && a.params.kind === "hide" && !p.gear.includes("crate"))
      return "CAPABILITY_REQUIRED";

    if (
      a.type === "INTERACT" &&
      a.params.kind === "shop" &&
      !w.shops.some((s) => Math.abs(s.x - p.x) < 64 && p.y < 400)
    )
      return "SHOP_OUT_OF_REACH";

    if (a.type === "EQUIP" && !p.gear.includes(a.params.gearId)) return "ITEM_NOT_OWNED";

    if (a.type === "ENTER_ROOM") {
      if (w.duel) return "DUEL_ROOM_LOCKED";
      const exit = roomById(w.room).exits.find((e) => e.dir === a.params.direction);
      if (!exit) return "NO_EXIT";
      if (exit.need && !p.gear.includes(exit.need)) return "CAPABILITY_REQUIRED";

      if (a.params.automatic) {
        if (!w.auto || w.foes.some((f) => f.alive) || w.clearT === null || w.clearT > 0)
          return "AUTO_TRAVERSAL_UNAVAILABLE";
      } else if (
        !(a.params.direction === "left"
          ? p.x <= 40
          : a.params.direction === "right"
            ? p.x >= VW - 40
            : a.params.direction === "up"
              ? p.y <= TOP + 22
              : p.y >= BOT - 12)
      )
        return "EXIT_OUT_OF_REACH";
    }

    return "";
  }
}

function actorById(w: EngineWorld, id: string): EnginePlayer | null {
  return [w.player, w.partner, w.mate, w.rival].find((p) => p?.id === id) ?? null;
}

function drain(w: EngineWorld): RuleEvent[] {
  const out = w.pendingEvents;
  w.pendingEvents = [];
  return out;
}
