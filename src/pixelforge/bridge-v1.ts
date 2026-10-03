import { BufferedController } from "../game/controllers.ts";
import type { ActionIntent } from "../game/actions.ts";
import type { ObservationProfile } from "../game/observation.ts";
import {
  OakRuntime,
  RUNTIME_VERSION,
  type ReplayRecording,
  type RuntimeSnapshot,
  type SubmittedIntent,
} from "../game/runtime.ts";
import { immutable, type ControllerKind } from "../runtime/core.ts";

export const PIXELFORGE_RUNTIME_BRIDGE_PROTOCOL = "pixelforge-runtime-bridge";
export const PIXELFORGE_RUNTIME_BRIDGE_VERSION = 1;

export type PixelForgeBinding = "player" | "partner" | "wren" | "rival";

export type PixelForgeControllerDescriptor = {
  id: string;
  kind: ControllerKind;
  binding?: PixelForgeBinding;
  profile?: ObservationProfile;
};

export type OakPixelForgeBridgeOptions = {
  seed?: number;
  snapshot?: RuntimeSnapshot;
};

const BRIDGE_METHODS = [
  "describe",
  "registerController",
  "observe",
  "submit",
  "advance",
  "events",
  "snapshot",
  "recording",
  "authority",
  "hash",
] as const;

function wire<T>(value: T): Readonly<T> {
  const encoded = JSON.stringify(value);
  if (encoded === undefined)
    throw new TypeError("PixelForge bridge value is not JSON serializable");
  return immutable(JSON.parse(encoded) as T);
}

function validControllerDescriptor(
  value: PixelForgeControllerDescriptor,
): value is PixelForgeControllerDescriptor {
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    ["human", "bot", "replay", "remote", "script", "model"].includes(value.kind) &&
    (value.binding === undefined ||
      ["player", "partner", "wren", "rival"].includes(value.binding)) &&
    (value.profile === undefined ||
      ["nearby", "room", "radar"].includes(value.profile))
  );
}

/**
 * Oak's PixelForge Runtime Bridge v1 adapter.
 *
 * This surface deliberately exposes the governed runtime port, not Oak's World,
 * combat implementation, renderer, RNG or legacy engine helpers.
 */
export function createOakPixelForgeBridge(
  options: OakPixelForgeBridgeOptions = {},
) {
  const runtime = new OakRuntime(options);

  return Object.freeze({
    describe() {
      return wire({
        protocol: PIXELFORGE_RUNTIME_BRIDGE_PROTOCOL,
        version: PIXELFORGE_RUNTIME_BRIDGE_VERSION,
        gameId: "oak-street-rumble",
        runtimeVersion: RUNTIME_VERSION,
        deterministic: true,
      });
    },

    registerController(descriptor: PixelForgeControllerDescriptor) {
      if (!validControllerDescriptor(descriptor))
        throw new TypeError("Invalid PixelForge controller descriptor");

      runtime.register(
        new BufferedController(descriptor.id, descriptor.kind),
        descriptor.binding ?? "player",
        descriptor.profile ?? "nearby",
      );
      return { ok: true as const };
    },

    observe(controllerId: string, actorId?: string) {
      return wire(runtime.observe(controllerId, actorId));
    },

    submit(
      controllerId: string,
      intent: ActionIntent | unknown,
      tick = runtime.tick,
    ) {
      runtime.submit(controllerId, intent, tick);
      return wire({ queued: true as const, tick });
    },

    advance(roots: readonly SubmittedIntent[] = []) {
      return wire(runtime.advance(roots));
    },

    events(since = 0) {
      if (!Number.isSafeInteger(since) || since < 0)
        throw new TypeError("events(since) requires a non-negative integer");
      return wire(runtime.events.slice(since));
    },

    snapshot(): Readonly<RuntimeSnapshot> {
      return wire(runtime.snapshot());
    },

    recording(): Readonly<ReplayRecording> {
      return wire(runtime.recording());
    },

    authority() {
      return wire(runtime.authority);
    },

    hash() {
      return runtime.hash();
    },
  });
}

export const OAK_PIXELFORGE_BRIDGE_METHODS = Object.freeze([
  ...BRIDGE_METHODS,
]);
