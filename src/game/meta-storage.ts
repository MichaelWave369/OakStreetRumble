import type { World } from "./engine.ts";

export type Meta = { best: number; clears: number; last: string };
export const META_KEY = "oak-rumble-v1";
export const DEFAULT_META: Meta = { best: 0, clears: 0, last: "reed" };
export interface StringStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }

export function loadMeta(storage: StringStorage): Meta {
  try {
    const p = JSON.parse(storage.getItem(META_KEY) ?? "null");
    if (!p || typeof p !== "object") return { ...DEFAULT_META };
    return { best: Number.isSafeInteger(p.best) && p.best >= 0 ? p.best : 0, clears: Number.isSafeInteger(p.clears) && p.clears >= 0 ? p.clears : 0, last: typeof p.last === "string" ? p.last : "reed" };
  } catch { return { ...DEFAULT_META }; }
}
export function saveMeta(storage: StringStorage, w: World): boolean {
  try {
    storage.setItem(META_KEY, JSON.stringify({ best: w.best, clears: w.clears, last: w.player.charId || w.picked }));
    return true;
  } catch { return false; }
}
