import type { Controller, ControllerKind } from "../runtime/core.ts";
import type { ActionIntent, ActionType } from "./actions.ts";
import type { Observation, ActorView } from "./observation.ts";

export class KeyboardDevice {
  #held = new Set<string>();
  #edges = new Set<string>();
  #tick = -1;
  #sample = { held: new Set<string>(), edges: new Set<string>() };
  down(code: string): void {
    if (!this.#held.has(code)) {
      this.#held.add(code);
      this.#edges.add(code);
    }
  }
  up(code: string): void {
    this.#held.delete(code);
  }
  setKeys(codes: string[]): void {
    const next = new Set(codes);
    for (const k of this.#held) if (!next.has(k)) this.up(k);
    for (const k of next) this.down(k);
  }
  clear(): void {
    this.#held.clear();
    this.#edges.clear();
    this.#tick = -1;
  }
  sample(tick: number): { held: Set<string>; edges: Set<string> } {
    if (this.#tick !== tick) {
      this.#sample = { held: new Set(this.#held), edges: new Set(this.#edges) };
      this.#edges.clear();
      this.#tick = tick;
    }
    return this.#sample;
  }
}

export class KeyboardController implements Controller<Observation, ActionIntent> {
  readonly id: string;
  readonly kind = "human" as const;
  readonly device: KeyboardDevice;
  readonly playerNumber: 1 | 2;
  constructor(id: string, device: KeyboardDevice, playerNumber: 1 | 2 = 1) {
    this.id = id;
    this.device = device;
    this.playerNumber = playerNumber;
  }
  observe(o: Readonly<Observation>): ActionIntent[] {
    const { held, edges } = this.device.sample(o.tick);
    if (!o.self) return [];
    const actorId = o.self.id;
    const actions: ActionIntent[] = [];
    if (this.playerNumber === 1) {
      if (edges.has("KeyM") && (o.phase === "play" || o.phase === "map"))
        actions.push({
          actorId,
          type: "SET_PHASE",
          params: { phase: o.phase === "play" ? "map" : "play" },
        });
      if (o.phase === "play") {
        if (edges.has("KeyH") && !o.duel) {
          actions.push({
            actorId,
            type: "TRANSFER_AUTHORITY",
            params: {
              to: o.auto ? "human:1" : "bot:lead",
              capabilities: ["movement", "combat", "navigation", "inventory"],
            },
          });
          actions.push({ actorId, type: "SET_AUTONOMY", params: { active: !o.auto } });
        }
        if (edges.has("KeyB"))
          actions.push({ actorId, type: "SUMMON_AGENT", params: { agent: "wren" } });
        if (edges.has("KeyP"))
          actions.push({ actorId, type: "SUMMON_AGENT", params: { agent: "partner" } });
      }
    }
    if (o.phase !== "play" || !o.self.alive) return actions;
    const secondary = this.playerNumber === 2;
    const fallback = !secondary && !o.crew.some((p) => p.role === "partner");
    const down = (p: string, s: string) =>
      secondary ? held.has(s) : held.has(p) || (fallback && held.has(s));
    const edge = (p: string, s: string) =>
      secondary ? edges.has(s) : edges.has(p) || (fallback && edges.has(s));
    const x = Number(down("KeyD", "ArrowRight")) - Number(down("KeyA", "ArrowLeft"));
    const y = Number(down("KeyS", "ArrowDown")) - Number(down("KeyW", "ArrowUp"));
    if (x || y) actions.push({ actorId, type: "MOVE", params: { x, y } });
    if (edge("KeyJ", "KeyU")) actions.push({ actorId, type: "ATTACK_LIGHT", params: {} });
    if (edge("KeyK", "KeyI")) actions.push({ actorId, type: "ATTACK_HEAVY", params: {} });
    if (edge("Space", "KeyO")) actions.push({ actorId, type: "JUMP", params: {} });
    if (!secondary) {
      if (held.has("ShiftLeft") || held.has("ShiftRight"))
        actions.push({ actorId, type: "BLOCK", params: { active: true } });
      if (held.has("KeyC")) actions.push({ actorId, type: "CROUCH", params: { active: true } });
      if (held.has("KeyQ"))
        actions.push({ actorId, type: "INTERACT", params: { kind: "hide", active: true } });
      if (edges.has("KeyF")) actions.push({ actorId, type: "SPECIAL", params: {} });
      if (edges.has("KeyE")) actions.push({ actorId, type: "INTERACT", params: { kind: "shop" } });
      if (edges.has("KeyR")) actions.push({ actorId, type: "USE_ITEM", params: { item: "stars" } });
      if (edges.has("KeyG")) actions.push({ actorId, type: "USE_ITEM", params: { item: "smoke" } });
    }
    return actions;
  }
}

type Stick = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  jump: boolean;
  crouch: boolean;
};
const idle = (): Stick => ({
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
  jump: false,
  crouch: false,
});
const distance = (a: ActorView, b: ActorView) => Math.hypot(a.x - b.x, a.y - b.y);
function nearest(list: ActorView[], self: ActorView): ActorView | null {
  let best: ActorView | null = null;
  let d = 1e9;
  for (const a of list) {
    const n = distance(a, self);
    if (a.alive && n < d) {
      best = a;
      d = n;
    }
  }
  return best;
}
function chase(self: ActorView, x: number, y: number): Stick {
  const dx = x - self.x,
    dy = y - self.y;
  return {
    ...idle(),
    left: dx < -24,
    right: dx > 24,
    up: dy < -14,
    down: dy > 14,
    punch: Math.abs(dx) < 42 && Math.abs(dy) < 26,
  };
}

/** The original botStick and mateStick decision thresholds, extracted intact. */
export function localBotStick(
  o: Readonly<Observation>,
  role: "lead" | "partner" | "wren" | "sable",
): Stick {
  const self = o.self;
  if (!self) return idle();
  const foes = o.visibleActors.filter((f) => f.role === "foe" && f.alive);
  if (role === "sable") {
    const prey = nearest(
      o.crew.filter((p) => p.alive),
      self,
    );
    return prey ? chase(self, prey.x, prey.y) : chase(self, self.x, self.y);
  }
  const foe = nearest(foes, self);
  const player = o.crew.find((c) => c.role === "player");
  if (role === "wren") {
    const lead = player?.alive ? player : (o.crew.find((c) => c.role === "partner") ?? self);
    const quiet = o.alert < 40 && !(foe && foe.aggro && distance(foe, self) < 90);
    if (quiet || !foe) {
      const tx = lead.x - lead.face * 54,
        ty = lead.y + 8;
      return {
        ...idle(),
        left: self.x > tx + 10,
        right: self.x < tx - 10,
        up: self.y > ty + 12,
        down: self.y < ty - 12,
        crouch: o.alert > 8 && o.alert < 40 && Math.abs(self.x - tx) < 24,
      };
    }
    const dx = foe.x - self.x,
      dy = foe.y - self.y;
    return {
      ...idle(),
      left: dx < -26,
      right: dx > 26,
      up: dy < -14,
      down: dy > 14,
      punch: Math.abs(dx) < 42 && Math.abs(dy) < 26,
    };
  }
  const rival = o.visibleActors.find((f) => f.role === "rival" && f.alive) ?? null;
  if (rival && distance(rival, self) < (foe ? distance(foe, self) : 1e9))
    return chase(self, rival.x, rival.y);
  if (foe && (o.alert >= 34 || foe.aggro || foe.boss || distance(foe, self) < 120))
    return chase(self, foe.x, foe.y);
  const lead = role === "lead" ? null : player?.alive ? player : null;
  if (lead) return chase(self, lead.x - lead.face * 50, lead.y);
  return { ...idle(), crouch: o.alert > 10 && o.alert < 50 };
}
export class LocalBotController implements Controller<Observation, ActionIntent> {
  readonly id: string;
  readonly kind = "bot" as const;
  readonly role: "lead" | "partner" | "wren" | "sable";
  constructor(id: string, role: LocalBotController["role"]) {
    this.id = id;
    this.role = role;
  }
  observe(o: Readonly<Observation>): ActionIntent[] {
    if (!o.self?.alive || o.phase !== "play") return [];
    const s = localBotStick(o, this.role),
      actorId = o.self.id;
    const list: ActionIntent[] = [];
    const x = Number(s.right) - Number(s.left),
      y = Number(s.down) - Number(s.up);
    if (x || y) list.push({ actorId, type: "MOVE", params: { x, y } });
    if (s.punch) list.push({ actorId, type: "ATTACK_LIGHT", params: {} });
    if (s.kick) list.push({ actorId, type: "ATTACK_HEAVY", params: {} });
    if (s.jump) list.push({ actorId, type: "JUMP", params: {} });
    if (s.crouch) list.push({ actorId, type: "CROUCH", params: { active: true } });
    return list.filter((a) => o.allowedActions.includes(a.type));
  }
  /** Legacy auto-leave policy, observed after the simulation's quiet-room timer. */
  navigate(o: Readonly<Observation>): ActionIntent[] {
    if (
      this.role !== "lead" ||
      !o.auto ||
      o.phase !== "play" ||
      !o.self?.alive ||
      !o.allowedActions.includes("ENTER_ROOM")
    )
      return [];
    const exit = o.exits.find((e) => !e.locked);
    return exit
      ? [
          {
            actorId: o.self.id,
            type: "ENTER_ROOM",
            params: { direction: exit.direction, automatic: true },
          },
        ]
      : [];
  }
}
export class ReplayController implements Controller<Observation, ActionIntent> {
  readonly id: string;
  readonly kind = "replay" as const;
  readonly frames: Readonly<Record<number, readonly ActionIntent[]>>;
  constructor(id: string, frames: ReplayController["frames"]) {
    this.id = id;
    this.frames = structuredClone(frames);
  }
  observe(o: Readonly<Observation>): readonly ActionIntent[] {
    return structuredClone(this.frames[o.tick] ?? []);
  }
}

/** Async providers/transport live outside simulation; resolved intents enter a tick. */
export interface IntentPort extends Controller<Observation, ActionIntent> {
  enqueue(intents: readonly ActionIntent[]): void;
}
export interface LLMController extends IntentPort {
  readonly kind: "model";
}
export interface RemoteController extends IntentPort {
  readonly kind: "remote";
}
export interface ScriptController extends Controller<Observation, ActionIntent> {
  readonly kind: "script";
}
export interface GamepadController extends Controller<Observation, ActionIntent> {
  readonly kind: "human";
}
export class BufferedController implements IntentPort {
  readonly id: string;
  readonly kind: ControllerKind;
  #pending: ActionIntent[] = [];
  constructor(id: string, kind: ControllerKind) {
    this.id = id;
    this.kind = kind;
  }
  enqueue(intents: readonly ActionIntent[]): void {
    this.#pending.push(...structuredClone(intents));
  }
  observe(_observation: Readonly<Observation>): ActionIntent[] {
    const out = this.#pending;
    this.#pending = [];
    return out;
  }
}
export const PLAY_ACTIONS: ActionType[] = [
  "MOVE",
  "JUMP",
  "CROUCH",
  "BLOCK",
  "ATTACK_LIGHT",
  "ATTACK_HEAVY",
  "SPECIAL",
  "INTERACT",
  "USE_ITEM",
  "EQUIP",
  "ENTER_ROOM",
];
