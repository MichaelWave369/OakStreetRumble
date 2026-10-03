import { ROOMS, type RoomId } from "./content.ts";
import type { RuntimeSnapshot } from "./runtime.ts";
import { immutable } from "../runtime/core.ts";

const ZONES: Readonly<Record<string, readonly RoomId[]>> = {
  "oak-block": ["oak", "roof", "warehouse"],
  waterfront: ["pier", "hold"],
  "mall-building": ["mall", "vent", "court"],
  "school-building": ["school", "gym"],
  "signal-zone": ["circuit", "sanctum", "relay"],
};
/** A hierarchical view over concrete content, preserving the complete active
 * encounter inside the trusted snapshot. Inactive encounters are unknown;
 * the original respawn/backtracking rules are not changed by a summary. */
export function nestedWorld(snapshot: RuntimeSnapshot) {
  const w = snapshot.world;
  return immutable({
    id: "oak-world",
    kind: "WORLD",
    districts: [
      {
        id: "oak-district",
        kind: "DISTRICT",
        zones: Object.entries(ZONES).map(([id, ids]) => ({
          id,
          kind: "ZONE",
          rooms: ids.map((roomId) => ({
            id: roomId,
            kind: "ROOM",
            name: ROOMS.find((r) => r.id === roomId)?.name,
            discovered: w.visited.includes(roomId),
            cleared: w.cleared.includes(roomId),
            encounter:
              roomId === w.room
                ? {
                    id: `${roomId}:encounter`,
                    kind: "ENCOUNTER",
                    actors: [w.player, w.partner, w.mate, w.rival, ...w.foes].filter(Boolean),
                    objects: { shots: w.shots, drops: w.drops },
                    alert: w.alert,
                  }
                : null,
          })),
        })),
      },
    ],
  });
}
export function districtObservation(snapshot: RuntimeSnapshot) {
  const w = snapshot.world;
  return immutable({
    id: "oak-district",
    discoveredRooms: w.visited.length,
    quietRooms: w.cleared.length,
    zones: Object.entries(ZONES).map(([id, ids]) => ({
      id,
      discovered: ids.filter((r) => w.visited.includes(r)).length,
      quiet: ids.filter((r) => w.cleared.includes(r)).length,
      active: ids.includes(w.room),
    })),
    alertBand: w.alert > 70 ? "evasion" : w.alert > 28 ? "caution" : "hidden",
  });
}
