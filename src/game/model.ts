import type { RuleEvent, Capability } from "../runtime/core.ts";
import type { ClanId, GearId, Pattern, RoomId, ShopId, SpecialId } from "./content.ts";

export const VW = 960;
export const VH = 540;
export const TOP = 268;
export const BOT = 470;

export type Phase =
  | "title"
  | "select"
  | "story"
  | "play"
  | "shop"
  | "map"
  | "cleared"
  | "win"
  | "lose";
export type Pose =
  | "idle"
  | "walk"
  | "punch"
  | "kick"
  | "jump"
  | "special"
  | "hurt"
  | "block"
  | "attack"
  | "crouch";

export type Actor = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  vz: number;
  vx: number;
  face: 1 | -1;
  hp: number;
  maxHp: number;
  pwr: number;
  agi: number;
  state: Pose;
  timer: number;
  inv: number;
  stun: number;
  alive: boolean;
  boss: boolean;
  clan: ClanId;
  pattern: Pattern | null;
  cool: number;
  didSummon: boolean;
  dash: number;
  charge: number;
  scale: number;
  title: string;
  attackCause?: string;
  aggro: boolean;
  agent: boolean;
};

export type Player = Actor & {
  cash: number;
  meter: number;
  special: SpecialId;
  charId: string;
  combo: number;
  hitdone: boolean;
  buff: number;
  weapon: number;
  charm: number;
  kx: number;
  rushLeft: number;
  rushGap: number;
  gear: GearId[];
  hiding: boolean;
  callsign: string;
  stealthAttack: boolean;
};

export type Shot = {
  sourceId?: string;
  causalParent?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  friendly: boolean;
  life: number;
  visual: "orb" | "star";
};
export type Drop = {
  x: number;
  y: number;
  kind: "cash" | "pipe" | "food";
  amount: number;
  life: number;
};
export type Floater = { x: number; y: number; text: string; life: number; good: boolean };
export type PlacedShop = { id: ShopId; x: number };

export type World = {
  phase: Phase;
  level: number;
  player: Player;
  foes: Actor[];
  shots: Shot[];
  drops: Drop[];
  floaters: Floater[];
  shops: PlacedShop[];
  time: number;
  shake: number;
  hitstop: number;
  banner: string;
  bannerT: number;
  clearT: number | null;
  shopId: ShopId | null;
  best: number;
  clears: number;
  picked: string;
  room: RoomId;
  alert: number;
  smoke: number;
  smokeCd: number;
  starCd: number;
  taken: GearId[];
  cleared: RoomId[];
  visited: RoomId[];
  mate: Player | null;
  partner: Player | null;
  log: string[];
  heard: string[];
  auto: boolean;
  duel: boolean;
  rival: Player | null;
  randomState: number;
  actorSequence: number;
  pendingEvents: RuleEvent[];
  actionCauses: Record<string, Partial<Record<Capability, string>>>;
  detected: string[];
};

export type Input = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  jump: boolean;
  special: boolean;
  block: boolean;
  shop: boolean;
  crouch: boolean;
  hide: boolean;
  throwStar: boolean;
  smoke: boolean;
  p2left: boolean;
  p2right: boolean;
  p2up: boolean;
  p2down: boolean;
  p2punch: boolean;
  p2kick: boolean;
  p2jump: boolean;
};
