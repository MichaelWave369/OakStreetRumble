import {
  ActionBus,
  Authority,
  CAPABILITIES,
  RealityLedger,
  immutable,
  type AuthorityState,
  type Capability,
  type Controller,
  type ControllerKind,
  type GameEvent,
  type Json,
} from "../runtime/core.ts";
import { stateHash } from "../runtime/hash.ts";
import {
  ACTION_CAPABILITY,
  validIntent,
  type ActionIntent,
  type ActionType,
  type GameAction,
} from "./actions.ts";
import { BufferedController, LocalBotController } from "./controllers.ts";
import { observeWorld, type Observation, type ObservationProfile } from "./observation.ts";
import { CHARACTERS, CLANS, GEAR, GRUNT_NAMES, LEVELS, ROOMS, SHOPS, ROOM_LINES, BOSS_LINES } from "./content.ts";
import type { Meta } from "./meta-storage.ts";
import type { Player, World } from "./model.ts";
import { ContractRules, TICK_SECONDS, type OakRules } from "./rules.ts";
import { LegacyOakRules } from "./legacy-rules.ts";

export const RUNTIME_VERSION = "oak-runtime-kernel/1";
export const CONTENT_HASH = stateHash({
  CHARACTERS,
  CLANS,
  GEAR,
  GRUNT_NAMES,
  LEVELS,
  ROOMS,
  SHOPS,
  ROOM_LINES,
  BOSS_LINES,
});

type Binding = "player" | "partner" | "wren" | "rival";

export type ControllerDescriptor = {
  id: string;
  kind: ControllerKind;
  binding: Binding;
  profile: ObservationProfile;
  stage: "external" | "local";
  botRole?: LocalBotController["role"];
};

type Registration = ControllerDescriptor & {
  controller: Controller<Observation, ActionIntent>;
};

export type SubmittedIntent = {
  controllerId: string;
  intent: unknown;
  tick: number;
};

export type ReplayFrame = {
  tick: number;
  roots: SubmittedIntent[];
};

export type RuntimeSnapshot = {
  schemaVersion: 1;
  game: "oak-street-rumble";
  runtimeVersion: string;
  rulesVersion: string;
  contentHash: string;
  tick: number;
  nextAction: number;
  world: World;
  authority: AuthorityState;
  controllers: ControllerDescriptor[];
  ledger: GameEvent[];
};

export type ReplayRecording = {
  schemaVersion: 1;
  initial: RuntimeSnapshot;
  frames: ReplayFrame[];
  finalHash: string;
};

export type ActionDecision = {
  id: string;
  type: string;
  accepted: boolean;
  reason: string;
  controllerId: string;
  actorId: string;
};

/**
 * Deterministic controller/authority/action/ledger kernel.
 *
 * Game rules are injected. The default LegacyOakRules adapter preserves Oak's
 * verified gameplay while the kernel remains controller/provider/renderer independent.
 * No DOM, audio, storage, network, wall clock, fetch or model call belongs here.
 */
export class OakRuntime {
  #world: World;
  #tick: number;
  #nextAction: number;
  #authority: Authority;
  #ledger: RealityLedger;
  #rules: OakRules;
  #registrations = new Map<string, Registration>();
  #bus = new ActionBus<GameAction>();
  #pending: SubmittedIntent[] = [];
  #frames: ReplayFrame[] = [];
  #initial: RuntimeSnapshot;
  #lastDecision: ActionDecision | null = null;

  constructor(
    options: {
      seed?: number;
      meta?: Meta;
      world?: World;
      snapshot?: RuntimeSnapshot;
      rules?: OakRules;
    } = {},
  ) {
    this.#rules = options.rules ?? new LegacyOakRules();
    const saved = options.snapshot;

    if (
      saved &&
      (saved.schemaVersion !== 1 ||
        saved.game !== "oak-street-rumble" ||
        saved.runtimeVersion !== RUNTIME_VERSION ||
        saved.contentHash !== CONTENT_HASH ||
        saved.rulesVersion !== this.#rules.version)
    )
      throw new Error("Unsupported runtime/rules/content version");

    this.#world = saved
      ? structuredClone(saved.world)
      : options.world
        ? structuredClone(options.world)
        : this.#rules.createWorld({ seed: options.seed, meta: options.meta });
    this.#tick = saved?.tick ?? 0;
    this.#nextAction = saved?.nextAction ?? 1;
    this.#authority = new Authority(saved?.authority);
    this.#ledger = new RealityLedger(saved?.ledger);

    this.#installDefaults();

    if (saved) {
      this.#registrations.clear();
      for (const d of saved.controllers) {
        const controller = d.botRole
          ? new LocalBotController(d.id, d.botRole)
          : new BufferedController(d.id, d.kind);
        this.#registrations.set(d.id, { ...structuredClone(d), controller });
      }
    } else {
      this.#syncAuthority(true);
    }

    this.#initial = this.snapshot();
  }

  #installDefaults(): void {
    for (const [id, binding] of [
      ["human:1", "player"],
      ["human:2", "partner"],
    ] as const) {
      const controller = new BufferedController(id, "human");
      this.#registrations.set(id, {
        id,
        kind: "human",
        binding,
        profile: "room",
        stage: "external",
        controller,
      });
    }

    for (const [id, binding, botRole] of [
      ["bot:lead", "player", "lead"],
      ["bot:partner", "partner", "partner"],
      ["bot:wren", "wren", "wren"],
      ["bot:sable", "rival", "sable"],
    ] as const) {
      const controller = new LocalBotController(id, botRole);
      this.#registrations.set(id, {
        id,
        kind: "bot",
        binding,
        profile: "room",
        stage: "local",
        botRole,
        controller,
      });
    }
  }

  register(
    controller: Controller<Observation, ActionIntent>,
    binding: Binding = "player",
    profile: ObservationProfile = "nearby",
  ): void {
    if (!controller.id || controller.id.length > 128 || controller.id.startsWith("bot:"))
      throw new Error("Invalid or reserved controller identifier");
    if (this.#frames.length)
      throw new Error("Register controller topology before advancing or restore a checkpoint");
    this.#registrations.set(controller.id, {
      id: controller.id,
      kind: controller.kind,
      binding,
      profile,
      stage: "external",
      controller,
    });
  }

  get tick(): number {
    return this.#tick;
  }

  get state(): Readonly<World> {
    return immutable(this.#world);
  }

  get events(): readonly Readonly<GameEvent>[] {
    return this.#ledger.since();
  }

  get authority(): AuthorityState {
    return this.#authority.snapshot();
  }

  get lastDecision(): Readonly<ActionDecision> | null {
    return this.#lastDecision ? immutable(this.#lastDecision) : null;
  }

  observe(controllerId: string, actorId?: string): Readonly<Observation> {
    const registration = this.#registrations.get(controllerId);
    if (!registration) throw new Error("Controller is not registered");
    const bound = this.#actor(registration.binding);
    if (actorId && actorId !== bound?.id)
      throw new Error("Observation is outside the controller's actor binding");
    const id = actorId ?? bound?.id ?? "absent";
    return observeWorld(
      this.#world,
      this.#tick,
      id,
      this.#allowed(id, controllerId),
      registration.profile,
    );
  }

  submit(controllerId: string, intent: unknown, tick = this.#tick): void {
    let copy: unknown;
    try {
      copy = JSON.parse(JSON.stringify(intent));
    } catch {
      copy = null;
    }
    this.#pending.push({ controllerId, intent: copy, tick });
  }

  advance(roots: readonly SubmittedIntent[] = []): readonly Readonly<GameEvent>[] {
    const eventStart = this.#ledger.length;
    if (this.#frames.length === 0) this.#initial = this.snapshot();

    const frameRoots: SubmittedIntent[] = [
      ...this.#pending.map((root) => structuredClone(root)),
      ...structuredClone(roots),
    ];
    this.#pending = [];

    // External controllers may contribute resolved intents at the current tick.
    for (const registration of this.#registrations.values()) {
      if (registration.stage !== "external") continue;
      for (const intent of registration.controller.observe(this.observe(registration.id)))
        frameRoots.push({
          controllerId: registration.id,
          intent: structuredClone(intent),
          tick: this.#tick,
        });
    }

    for (const root of frameRoots) this.#receive(root);

    // Local deterministic policies are regenerated from observation during replay.
    for (const registration of this.#registrations.values()) {
      if (registration.stage !== "local") continue;
      const actor = this.#actor(registration.binding);
      if (!actor) continue;
      for (const intent of registration.controller.observe(this.observe(registration.id)))
        this.#receive({ controllerId: registration.id, intent, tick: this.#tick });
    }

    for (const action of this.#bus.drain()) this.#apply(action);
    for (const event of this.#rules.step(this.#world, TICK_SECONDS))
      this.#appendRuleEvent(event);

    this.#frames.push({
      tick: this.#tick,
      roots: structuredClone(frameRoots),
    });
    this.#tick += 1;
    return this.#ledger.since(eventStart);
  }

  #receive(root: SubmittedIntent): void {
    const registration = this.#registrations.get(root.controllerId);
    if (!registration) {
      this.#rejectRoot(root, "UNKNOWN_CONTROLLER");
      return;
    }
    if (root.tick !== this.#tick) {
      this.#rejectRoot(root, "WRONG_TICK");
      return;
    }
    if (!validIntent(root.intent)) {
      this.#rejectRoot(root, "MALFORMED_ACTION");
      return;
    }

    const bound = this.#actor(registration.binding);
    if (!bound || root.intent.actorId !== bound.id) {
      this.#rejectRoot(root, bound ? "CONTROLLER_ACTOR_MISMATCH" : "UNKNOWN_ACTOR");
      return;
    }

    const capability = ACTION_CAPABILITY[root.intent.type];
    if (
      !this.#authority.allows(
        root.intent.actorId,
        root.controllerId,
        registration.kind,
        capability,
      )
    ) {
      this.#rejectRoot(root, "AUTHORITY_DENIED");
      return;
    }

    if (root.intent.type === "TRANSFER_AUTHORITY") {
      const target = this.#registrations.get(root.intent.params.to);
      if (!target) {
        this.#rejectRoot(root, "UNKNOWN_TARGET_CONTROLLER");
        return;
      }
      if (this.#actor(target.binding)?.id !== bound.id) {
        this.#rejectRoot(root, "CONTROLLER_ACTOR_MISMATCH");
        return;
      }
      if (
        root.intent.params.capabilities.some(
          (cap) => (cap === "purchases" && target.kind !== "human") ||
            ((cap === "authority" || cap === "session") && target.kind !== "human"),
        )
      ) {
        this.#rejectRoot(root, "HUMAN_ONLY_CAPABILITY");
        return;
      }
    }

    const action: GameAction = {
      ...structuredClone(root.intent),
      id: `a:${this.#nextAction++}`,
      controllerId: root.controllerId,
      tick: this.#tick,
      schemaVersion: 1,
    };
    this.#bus.enqueue(action);
  }

  #apply(action: GameAction): void {
    const result = this.#rules.apply(this.#world, action, TICK_SECONDS);

    this.#lastDecision = {
      id: action.id,
      type: action.type,
      accepted: result.accepted,
      reason: result.reason,
      controllerId: action.controllerId,
      actorId: action.actorId,
    };

    this.#ledger.append(this.#tick, {
      type: result.accepted ? "ACTION_ACCEPTED" : "ACTION_REJECTED",
      sourceId: action.actorId,
      controllerId: action.controllerId,
      correlationId: action.correlationId,
      payload: {
        actionId: action.id,
        actionType: action.type,
        reason: result.reason,
        action: structuredClone(action) as unknown as Json,
      },
    });

    if (!result.accepted) return;

    if (action.type === "TRANSFER_AUTHORITY") {
      for (const capability of action.params.capabilities)
        this.#authority.assign(action.actorId, capability, [action.params.to]);
      this.#appendRuleEvent({
        type: "AUTHORITY_TRANSFERRED",
        sourceId: action.actorId,
        causalParent: action.id,
        payload: {
          to: action.params.to,
          capabilities: [...action.params.capabilities],
        },
      }, action);
    }

    if (action.type === "BEGIN_RUN") this.#syncAuthority(true);
    if (action.type === "SUMMON_AGENT") this.#syncAuthority();

    for (const event of result.events ?? []) this.#appendRuleEvent(event, action);
  }

  #appendRuleEvent(event: {
    type: string;
    sourceId?: string;
    targetId?: string;
    causalParent?: string;
    payload: Record<string, Json>;
  }, action?: GameAction): void {
    this.#ledger.append(this.#tick, {
      ...event,
      causalParent: event.causalParent ?? action?.id,
      controllerId: action?.controllerId,
      correlationId: action?.correlationId,
    });
  }

  #rejectRoot(root: SubmittedIntent, reason: string): void {
    const intent =
      root.intent && typeof root.intent === "object"
        ? (root.intent as { actorId?: unknown; type?: unknown })
        : {};
    const id = `a:${this.#nextAction++}`;
    const actorId = typeof intent.actorId === "string" ? intent.actorId : "unknown";
    const type = typeof intent.type === "string" ? intent.type : "unknown";
    this.#lastDecision = {
      id,
      type,
      accepted: false,
      reason,
      controllerId: root.controllerId,
      actorId,
    };
    this.#ledger.append(this.#tick, {
      type: "ACTION_REJECTED",
      sourceId: actorId,
      controllerId: root.controllerId,
      payload: {
        actionId: id,
        actionType: type,
        reason,
      },
    });
  }

  #actor(binding: Binding): Player | null {
    return binding === "player"
      ? this.#world.player
      : binding === "partner"
        ? this.#world.partner
        : binding === "wren"
          ? this.#world.mate
          : this.#world.rival;
  }

  #actorById(id: string): Player | null {
    return [this.#world.player, this.#world.partner, this.#world.mate, this.#world.rival]
      .find((actor) => actor?.id === id) ?? null;
  }

  #allowed(actorId: string, controllerId: string): ActionType[] {
    const registration = this.#registrations.get(controllerId);
    const actor = this.#actorById(actorId);
    if (!registration || !actor) return [];
    return (Object.keys(ACTION_CAPABILITY) as ActionType[]).filter((type) =>
      this.#authority.allows(
        actorId,
        controllerId,
        registration.kind,
        ACTION_CAPABILITY[type],
      ),
    );
  }

  #syncAuthority(reset = false): void {
    const actors = [
      this.#world.player,
      this.#world.partner,
      this.#world.mate,
      this.#world.rival,
    ].filter((actor): actor is Player => !!actor);

    const current = this.#authority.snapshot();
    for (const actorId of Object.keys(current))
      if (!actors.some((actor) => actor.id === actorId)) this.#authority.remove(actorId);

    for (const actor of actors) {
      if (!reset && current[actor.id]) continue;

      if (actor === this.#world.player) {
        for (const capability of CAPABILITIES) {
          const owner =
            ["purchases", "crew", "authority", "session"].includes(capability)
              ? "human:1"
              : this.#world.auto
                ? "bot:lead"
                : "human:1";
          this.#authority.assign(actor.id, capability as Capability, [owner]);
        }
      } else {
        const owner =
          actor === this.#world.mate
            ? "bot:wren"
            : actor === this.#world.rival
              ? "bot:sable"
              : actor.callsign === "BOT"
                ? "bot:partner"
                : "human:2";
        this.#authority.assign(actor.id, "movement", [owner]);
        this.#authority.assign(actor.id, "combat", [owner]);
      }
    }
  }

  snapshot(): RuntimeSnapshot {
    const controllers = [...this.#registrations.values()].map(
      ({ controller: _controller, ...descriptor }) => descriptor,
    );
    return structuredClone({
      schemaVersion: 1 as const,
      game: "oak-street-rumble" as const,
      runtimeVersion: RUNTIME_VERSION,
      rulesVersion: this.#rules.version,
      contentHash: CONTENT_HASH,
      tick: this.#tick,
      nextAction: this.#nextAction,
      world: this.#world,
      authority: this.#authority.snapshot(),
      controllers,
      ledger: this.#ledger.snapshot(),
    });
  }

  hash(): string {
    return stateHash(this.snapshot());
  }

  recording(): ReplayRecording {
    return structuredClone({
      schemaVersion: 1 as const,
      initial: this.#initial,
      frames: this.#frames,
      finalHash: this.hash(),
    });
  }
}

export function replay(
  recording: ReplayRecording,
  rules: OakRules = new LegacyOakRules(),
): OakRuntime {
  if (recording.schemaVersion !== 1) throw new Error("Unsupported replay schema");
  const runtime = new OakRuntime({ snapshot: recording.initial, rules });
  for (const frame of recording.frames) {
    if (frame.tick !== runtime.tick) throw new Error("Replay tick gap");
    runtime.advance(frame.roots);
  }
  if (runtime.hash() !== recording.finalHash) throw new Error("Replay diverged");
  return runtime;
}
