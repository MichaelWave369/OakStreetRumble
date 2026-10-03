import { CHARACTERS, GEAR, SHOPS, type Dir, type GearId, type ShopId } from "./content.ts";
import type { Phase } from "./engine.ts";
import { CAPABILITIES, type ActionEnvelope, type Capability } from "../runtime/core.ts";

export type RunOptions = {
  auto?: boolean;
  mate?: boolean;
  partnerId?: string;
  partnerBot?: boolean;
  duel?: boolean;
};
export type ActionParams = {
  MOVE: { x: number; y: number };
  JUMP: Record<string, never>;
  CROUCH: { active: boolean };
  BLOCK: { active: boolean };
  ATTACK_LIGHT: Record<string, never>;
  ATTACK_HEAVY: Record<string, never>;
  SPECIAL: Record<string, never>;
  INTERACT: { kind: "shop" | "close-shop" | "hide"; active?: boolean };
  USE_ITEM: { item: "stars" | "smoke" };
  BUY: { shopId: ShopId };
  EQUIP: { gearId: GearId };
  ENTER_ROOM: { direction: Dir; automatic?: boolean };
  TRANSFER_AUTHORITY: { to: string; capabilities: Capability[] };
  SUMMON_AGENT: { agent: "wren" | "partner" };
  BEGIN_RUN: { characterId: string; options?: RunOptions };
  RETRY: Record<string, never>;
  SET_PHASE: { phase: Phase };
  SET_AUTONOMY: { active: boolean };
};
export type ActionType = keyof ActionParams;
export type ActionIntent = {
  [K in ActionType]: {
    actorId: string;
    type: K;
    params: ActionParams[K];
    causalParent?: string;
    correlationId?: string;
  };
}[ActionType];
export type GameAction = ActionIntent &
  Omit<ActionEnvelope, "actorId" | "type" | "params" | "causalParent" | "correlationId">;
export const ACTION_CAPABILITY: Record<ActionType, Capability> = {
  MOVE: "movement",
  JUMP: "movement",
  CROUCH: "movement",
  BLOCK: "combat",
  ATTACK_LIGHT: "combat",
  ATTACK_HEAVY: "combat",
  SPECIAL: "combat",
  INTERACT: "inventory",
  USE_ITEM: "inventory",
  BUY: "purchases",
  EQUIP: "inventory",
  ENTER_ROOM: "navigation",
  TRANSFER_AUTHORITY: "authority",
  SUMMON_AGENT: "crew",
  BEGIN_RUN: "session",
  RETRY: "session",
  SET_PHASE: "session",
  SET_AUTONOMY: "session",
};
export function record(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
const textId = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 128;
function keys(p: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(p).every((k) => allowed.includes(k));
}

/** Strict runtime validation: TypeScript annotations cannot validate network/model data. */
export function validIntent(value: unknown): value is ActionIntent {
  if (
    !record(value) ||
    !keys(value, ["actorId", "type", "params", "causalParent", "correlationId"]) ||
    !textId(value.actorId) ||
    !textId(value.type) ||
    !Object.hasOwn(ACTION_CAPABILITY, value.type) ||
    !record(value.params)
  )
    return false;
  if (value.causalParent !== undefined && !textId(value.causalParent)) return false;
  if (value.correlationId !== undefined && !textId(value.correlationId)) return false;
  const p = value.params;
  switch (value.type) {
    case "MOVE":
      return (
        keys(p, ["x", "y"]) &&
        [-1, 0, 1].includes(p.x as number) &&
        [-1, 0, 1].includes(p.y as number)
      );
    case "CROUCH":
    case "BLOCK":
    case "SET_AUTONOMY":
      return keys(p, ["active"]) && typeof p.active === "boolean";
    case "JUMP":
    case "ATTACK_LIGHT":
    case "ATTACK_HEAVY":
    case "SPECIAL":
    case "RETRY":
      return keys(p, []);
    case "INTERACT":
      return (
        keys(p, ["kind", "active"]) &&
        ["shop", "close-shop", "hide"].includes(p.kind as string) &&
        (p.kind === "hide"
          ? p.active === undefined || typeof p.active === "boolean"
          : p.active === undefined)
      );
    case "USE_ITEM":
      return keys(p, ["item"]) && ["stars", "smoke"].includes(p.item as string);
    case "BUY":
      return keys(p, ["shopId"]) && typeof p.shopId === "string" && Object.hasOwn(SHOPS, p.shopId);
    case "EQUIP":
      return keys(p, ["gearId"]) && typeof p.gearId === "string" && Object.hasOwn(GEAR, p.gearId);
    case "ENTER_ROOM":
      return (
        keys(p, ["direction", "automatic"]) &&
        ["left", "right", "up", "down"].includes(p.direction as string) &&
        (p.automatic === undefined || typeof p.automatic === "boolean")
      );
    case "TRANSFER_AUTHORITY":
      return (
        keys(p, ["to", "capabilities"]) &&
        textId(p.to) &&
        Array.isArray(p.capabilities) &&
        p.capabilities.length > 0 &&
        p.capabilities.length <= CAPABILITIES.length &&
        new Set(p.capabilities).size === p.capabilities.length &&
        p.capabilities.every((c) => CAPABILITIES.includes(c as Capability))
      );
    case "SUMMON_AGENT":
      return keys(p, ["agent"]) && ["wren", "partner"].includes(p.agent as string);
    case "SET_PHASE":
      return (
        keys(p, ["phase"]) &&
        ["title", "select", "story", "play", "map"].includes(p.phase as string)
      );
    case "BEGIN_RUN": {
      if (!keys(p, ["characterId", "options"]) || !CHARACTERS.some((c) => c.id === p.characterId))
        return false;
      if (p.options === undefined) return true;
      if (
        !record(p.options) ||
        !keys(p.options, ["auto", "mate", "partnerId", "partnerBot", "duel"])
      )
        return false;
      return Object.entries(p.options).every(([k, v]) =>
        k === "partnerId" ? CHARACTERS.some((c) => c.id === v) : typeof v === "boolean",
      );
    }
    default:
      return false;
  }
}
