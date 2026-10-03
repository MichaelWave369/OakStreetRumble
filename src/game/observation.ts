import { GEAR, roomById, type RoomId, type GearId, type Dir } from "./content.ts";
import type { Actor, Player, World, Phase } from "./engine.ts";
import { immutable } from "../runtime/core.ts";
import type { ActionType } from "./actions.ts";

export type ObservationProfile = "nearby" | "room" | "radar";
export type ActorView = Pick<
  Actor,
  "id" | "name" | "x" | "y" | "z" | "face" | "hp" | "maxHp" | "state" | "alive" | "boss" | "aggro"
> & { role: "player" | "partner" | "wren" | "foe" | "rival" };
export type SelfView = ActorView & Pick<Player, "cash" | "meter" | "charId" | "gear" | "callsign">;
export type Observation = {
  schemaVersion: 1;
  tick: number;
  phase: Phase;
  room: RoomId;
  self: SelfView | null;
  visibleActors: ActorView[];
  crew: ActorView[];
  nearbyObjects: { id: string; kind: string; x: number; y: number }[];
  exits: { direction: Dir; to: RoomId; locked: boolean; capability?: GearId }[];
  alert: number;
  auto: boolean;
  duel: boolean;
  allowedActions: ActionType[];
};

export function actorRole(w: World, actor: Actor): ActorView["role"] {
  return actor === w.player
    ? "player"
    : actor === w.partner
      ? "partner"
      : actor === w.mate
        ? "wren"
        : actor === w.rival
          ? "rival"
          : "foe";
}
function view(w: World, actor: Actor): ActorView {
  const { id, name, x, y, z, face, hp, maxHp, state, alive, boss, aggro } = actor;
  return {
    id,
    name,
    x,
    y,
    z,
    face,
    hp,
    maxHp,
    state,
    alive,
    boss,
    aggro,
    role: actorRole(w, actor),
  };
}
export function observeWorld(
  w: World,
  tick: number,
  actorId: string,
  allowedActions: ActionType[],
  profile: ObservationProfile = "nearby",
): Readonly<Observation> {
  const actor = [w.player, w.partner, w.mate, w.rival].find((p) => p?.id === actorId) ?? null;
  const room = roomById(w.room);
  // The legacy local bots deliberately get whole-room positions (all are on the
  // reference canvas). Other controllers default to bounded local perception.
  const inRange = (a: { x: number; y: number }, range: number) =>
    actor && Math.hypot(a.x - actor.x, a.y - actor.y) <= range;
  const fullRoom = profile === "room";
  const radar = profile === "radar" && actor?.gear.includes("wire");
  const crew = [w.player, w.partner, w.mate]
    .filter((p): p is Player => !!p && (p.id === actorId || fullRoom || radar || !!inRange(p, 360)))
    .map((p) => view(w, p));
  const visible = [
    ...w.foes,
    ...(w.rival ? [w.rival] : []),
    ...[w.player, w.partner, w.mate].filter((p): p is Player => !!p),
  ]
    .filter(
      (p) =>
        p.id !== actorId &&
        p.alive &&
        (fullRoom || radar || (inRange(p, 360) && (actorRole(w, p) !== "foe" || w.smoke <= 0))),
    )
    .map((p) => view(w, p));
  const objects: Observation["nearbyObjects"] = [];
  for (const shop of w.shops)
    if (fullRoom || inRange({ x: shop.x, y: 350 }, 160))
      objects.push({ id: shop.id, kind: "shop", x: shop.x, y: 350 });
  w.drops.forEach((d, i) => {
    if (fullRoom || inRange(d, 160))
      objects.push({ id: `drop:${i}`, kind: d.kind, x: d.x, y: d.y });
  });
  if (room.gear && !w.taken.includes(room.gear) && (fullRoom || inRange({ x: 520, y: 350 }, 160)))
    objects.push({ id: room.gear, kind: GEAR[room.gear].name, x: 520, y: 350 });
  const self = actor
    ? {
        ...view(w, actor),
        cash: actor.cash,
        meter: actor.meter,
        charId: actor.charId,
        gear: [...actor.gear],
        callsign: actor.callsign,
      }
    : null;
  return immutable({
    schemaVersion: 1 as const,
    tick,
    phase: w.phase,
    room: w.room,
    self,
    visibleActors: visible,
    crew,
    nearbyObjects: objects,
    exits: room.exits.map((e) => ({
      direction: e.dir,
      to: e.to,
      locked: !!e.need && !actor?.gear.includes(e.need),
      ...(e.need ? { capability: e.need } : {}),
    })),
    alert: fullRoom || radar ? w.alert : Math.round(w.alert / 10) * 10,
    auto: w.auto,
    duel: w.duel,
    allowedActions: [...allowedActions],
  });
}
