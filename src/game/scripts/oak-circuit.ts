import type { ActionIntent } from "../actions.ts";
import type { GearId, RoomId } from "../content.ts";
import type { Observation, ActorView } from "../observation.ts";

const PICKUPS: Partial<Record<RoomId, GearId>> = {
  pier: "grip",
  roof: "stars",
  school: "lens",
  vent: "crate",
  court: "wrap",
  gym: "wire",
  circuit: "smoke",
};

function has(o: Readonly<Observation>, gear: GearId): boolean {
  return o.self?.gear.includes(gear) === true;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestThreat(o: Readonly<Observation>): ActorView | null {
  if (!o.self) return null;
  let best: ActorView | null = null;
  let d = Infinity;
  for (const actor of o.visibleActors) {
    if (!actor.alive || !["foe", "rival"].includes(actor.role)) continue;
    const next = distance(o.self, actor);
    if (next < d) {
      d = next;
      best = actor;
    }
  }
  return best;
}

function moveToward(
  actorId: string,
  x: number,
  y: number,
  tx: number,
  ty: number,
  correlationId: string,
): ActionIntent[] {
  const dx = tx - x;
  const dy = ty - y;
  const mx = Math.abs(dx) > 18 ? Math.sign(dx) : 0;
  const my = Math.abs(dy) > 12 ? Math.sign(dy) : 0;
  if (!mx && !my) return [];
  return [{
    actorId,
    type: "MOVE",
    params: { x: mx, y: my },
    correlationId,
  }];
}

function nextRoom(o: Readonly<Observation>): RoomId | null {
  switch (o.room) {
    case "oak":
      if (!has(o, "grip")) return "pier";
      if (!has(o, "stars")) return "roof";
      return "pier";
    case "roof":
      return "oak";
    case "pier":
      if (!has(o, "grip")) return null;
      return has(o, "stars") ? "mall" : "oak";
    case "mall":
      // Recover backward if combat/knockback ever carried the actor ahead of
      // the intended capability order.
      if (!has(o, "stars")) return "pier";
      if (!has(o, "lens")) return "school";
      if (!has(o, "crate")) return "vent";
      if (!has(o, "wrap")) return "vent";
      return "school";
    case "vent":
      if (!has(o, "crate")) return null;
      return has(o, "wrap") ? "mall" : "court";
    case "court":
      if (!has(o, "wrap")) return null;
      return "vent";
    case "school":
      if (!has(o, "lens")) return null;
      if (!has(o, "stars") || !has(o, "crate") || !has(o, "wrap")) return "mall";
      return has(o, "wire") ? "circuit" : "gym";
    case "gym":
      if (!has(o, "wire")) return null;
      return "school";
    case "circuit":
      if (!has(o, "stars") || !has(o, "crate") || !has(o, "wrap") || !has(o, "wire"))
        return "school";
      if (!has(o, "smoke")) return null;
      return "sanctum";
    case "sanctum":
      return null;
    default:
      return null;
  }
}

/**
 * Observation-only Oak mission policy.
 *
 * It knows the mission's semantic route, but it does not know or receive the
 * mutable World. Pickups must enter the observation window before exact
 * coordinates can be targeted.
 */
export function oakCircuitMission(
  o: Readonly<Observation>,
): readonly ActionIntent[] {
  const self = o.self;
  if (!self?.alive || o.phase !== "play") return [];

  const correlationId = `oak-circuit:${o.tick}`;
  const can = (type: ActionIntent["type"]) => o.allowedActions.includes(type);

  const threat = nearestThreat(o);
  if (
    threat &&
    can("ATTACK_LIGHT") &&
    self.state !== "hurt" &&
    self.state !== "punch" &&
    self.state !== "kick" &&
    self.state !== "special"
  ) {
    const dx = threat.x - self.x;
    const dy = threat.y - self.y;
    const close = Math.abs(dx) < 42 && Math.abs(dy) < 26;

    if (close) {
      if (self.meter >= 100 && can("SPECIAL"))
        return [{
          actorId: self.id,
          type: "SPECIAL",
          params: {},
          correlationId,
        }];
      return [{
        actorId: self.id,
        type: "ATTACK_LIGHT",
        params: {},
        correlationId,
      }];
    }

    // Do not chase. Route movement owns navigation; combat is local defense.
    // Enemies that pursue the actor will enter striking range on their own.
  }

  const pickup = PICKUPS[o.room];
  if (pickup && !has(o, pickup) && can("MOVE")) {
    const object = o.nearbyObjects.find((item) => item.id === pickup);
    // Search the room center until the pickup enters bounded perception.
    const target = object ?? { x: 480, y: 350 };
    return moveToward(self.id, self.x, self.y, target.x, target.y, correlationId);
  }

  const targetRoom = nextRoom(o);
  if (!targetRoom || !can("MOVE")) return [];

  const exit = o.exits.find((candidate) => candidate.to === targetRoom);
  if (!exit || exit.locked) return [];

  const vector =
    exit.direction === "left"
      ? { x: -1, y: 0 }
      : exit.direction === "right"
        ? { x: 1, y: 0 }
        : exit.direction === "up"
          ? { x: 0, y: -1 }
          : { x: 0, y: 1 };

  return [{
    actorId: self.id,
    type: "MOVE",
    params: vector,
    correlationId,
  }];
}
