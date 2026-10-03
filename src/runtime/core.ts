/** Provider-, renderer-, game-, and transport-independent runtime primitives. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type ControllerKind = "human" | "bot" | "replay" | "remote" | "script" | "model";
export type Capability =
  | "movement"
  | "combat"
  | "navigation"
  | "inventory"
  | "purchases"
  | "crew"
  | "authority"
  | "session";
export const CAPABILITIES: readonly Capability[] = [
  "movement",
  "combat",
  "navigation",
  "inventory",
  "purchases",
  "crew",
  "authority",
  "session",
];
export interface Controller<Observation, Intent> {
  readonly id: string;
  readonly kind: ControllerKind;
  observe(observation: Readonly<Observation>): readonly Intent[];
}
export interface ActionEnvelope {
  id: string;
  actorId: string;
  controllerId: string;
  tick: number;
  type: string;
  params: object;
  schemaVersion: 1;
  causalParent?: string;
  correlationId?: string;
}
export interface RuleEvent {
  type: string;
  sourceId?: string;
  targetId?: string;
  causalParent?: string;
  payload: { [key: string]: Json };
}
export interface GameEvent extends RuleEvent {
  id: string;
  tick: number;
  schemaVersion: 1;
  controllerId?: string;
  correlationId?: string;
}
export type AuthorityState = Record<string, Partial<Record<Capability, string[]>>>;

export function immutable<T>(value: T): Readonly<T> {
  const visit = (v: unknown) => {
    if (!v || typeof v !== "object" || Object.isFrozen(v)) return;
    Object.values(v).forEach(visit);
    Object.freeze(v);
  };
  const copy: T = structuredClone(value);
  visit(copy);
  return copy;
}

export class ActionBus<A extends ActionEnvelope> {
  #queue: A[] = [];
  enqueue(action: A): void {
    this.#queue.push(structuredClone(action));
  }
  drain(): A[] {
    const batch = this.#queue;
    this.#queue = [];
    return batch;
  }
}

export class Authority {
  #grants: AuthorityState;
  constructor(state: AuthorityState = {}) {
    this.#grants = structuredClone(state);
  }
  allows(
    actorId: string,
    controllerId: string,
    kind: ControllerKind,
    capability: Capability,
  ): boolean {
    if (capability === "purchases" && kind !== "human") return false;
    return this.#grants[actorId]?.[capability]?.includes(controllerId) === true;
  }
  assign(actorId: string, capability: Capability, controllers: readonly string[]): void {
    this.#grants[actorId] ??= {};
    this.#grants[actorId][capability] = [...controllers];
  }
  remove(actorId: string): void {
    delete this.#grants[actorId];
  }
  snapshot(): AuthorityState {
    return structuredClone(this.#grants);
  }
}

/** Immutable entries and copied exports; there is no truncate or edit operation. */
export class RealityLedger {
  #events: Readonly<GameEvent>[] = [];
  constructor(events: readonly GameEvent[] = []) {
    for (const event of events) {
      if (
        event.id !== `e:${this.#events.length + 1}` ||
        event.schemaVersion !== 1 ||
        !Number.isSafeInteger(event.tick) ||
        event.tick < 0 ||
        (this.#events.length && event.tick < this.#events[this.#events.length - 1].tick)
      )
        throw new Error("Invalid ledger sequence");
      this.#events.push(immutable(event));
    }
  }
  append(
    tick: number,
    event: RuleEvent & { controllerId?: string; correlationId?: string },
  ): Readonly<GameEvent> {
    if (
      !Number.isSafeInteger(tick) ||
      tick < 0 ||
      (this.#events.length && tick < this.#events[this.#events.length - 1].tick)
    )
      throw new Error("Invalid ledger tick");
    const stored = immutable({
      ...event,
      id: `e:${this.#events.length + 1}`,
      tick,
      schemaVersion: 1 as const,
    });
    this.#events.push(stored);
    return stored;
  }
  get length(): number {
    return this.#events.length;
  }
  since(index = 0): readonly Readonly<GameEvent>[] {
    return this.#events.slice(index);
  }
  snapshot(): GameEvent[] {
    return structuredClone(this.#events) as GameEvent[];
  }
}
