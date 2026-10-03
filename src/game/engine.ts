import type { RuleEvent, Capability } from "../runtime/core.ts";
import { random } from "../runtime/random.ts";
import type { Meta } from "./meta-storage.ts";
import {
  CHARACTERS,
  CLANS,
  GEAR,
  GRUNT_NAMES,
  LEVELS,
  ROOMS,
  SHOPS,
  ENEMY_AGENTS,
  bossLine,
  roomById,
  roomLine,
  type CharacterDef,
  type ClanId,
  type Dir,
  type GearId,
  type Pattern,
  type RoomId,
  type ShopId,
  type SpecialId,
} from "./content.ts";

export const VW = 960;
export const VH = 540;
export const TOP = 268;
export const BOT = 470;

export type Phase =
  "title" | "select" | "story" | "play" | "shop" | "map" | "cleared" | "win" | "lose";
export type Pose =
  "idle" | "walk" | "punch" | "kick" | "jump" | "special" | "hurt" | "block" | "attack" | "crouch";

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

function blankActor(
  partial: Partial<Actor> & Pick<Actor, "id" | "name" | "x" | "y" | "clan">,
): Actor {
  return {
    z: 0,
    vz: 0,
    vx: 0,
    face: 1,
    hp: 30,
    maxHp: 30,
    pwr: 1,
    agi: 1,
    state: "idle",
    timer: 0,
    inv: 0,
    stun: 0,
    alive: true,
    boss: false,
    pattern: null,
    cool: 1,
    didSummon: false,
    dash: 0,
    charge: 0,
    scale: 2.1,
    title: "",
    aggro: false,
    agent: false,
    ...partial,
  };
}

export function makePlayer(def: CharacterDef): Player {
  const base = blankActor({
    id: def.id,
    name: def.name,
    x: 90,
    y: 370,
    clan: def.clan,
    hp: def.hp,
    maxHp: def.hp,
    pwr: def.pwr,
    agi: def.agi,
    face: 1,
    scale: 2.35,
  });
  return {
    ...base,
    cash: 18,
    meter: 0,
    special: def.special,
    charId: def.id,
    combo: 0,
    hitdone: false,
    buff: 0,
    weapon: 0,
    charm: 0,
    kx: 0,
    rushLeft: 0,
    rushGap: 0,
    gear: [],
    hiding: false,
    callsign: "",
    stealthAttack: false,
  };
}

export function createWorld(options: { seed?: number; meta?: Meta } = {}): World {
  const meta = options.meta ?? { best: 0, clears: 0, last: "reed" };
  const def = CHARACTERS.find((c) => c.id === meta.last) ?? CHARACTERS[0];
  const w: World = {
    randomState: (options.seed ?? 369) >>> 0,
    actorSequence: 0,
    pendingEvents: [],
    actionCauses: {},
    detected: [],
    phase: "title",
    level: 0,
    player: makePlayer(def),
    foes: [],
    shots: [],
    drops: [],
    floaters: [],
    shops: [],
    time: 0,
    shake: 0,
    hitstop: 0,
    banner: "",
    bannerT: 0,
    clearT: null,
    shopId: null,
    best: meta.best,
    clears: meta.clears,
    picked: def.id,
    room: "oak",
    alert: 0,
    smoke: 0,
    smokeCd: 0,
    starCd: 0,
    taken: [],
    cleared: [],
    visited: ["oak"],
    mate: null,
    partner: null,
    log: [],
    heard: [],
    auto: false,
    duel: false,
    rival: null,
  };
  w.player.id = `player:${def.id}`;
  dressPreview(w);
  return w;
}

function dressPreview(w: World) {
  const lvl = LEVELS[0];
  w.shops = lvl.shops.map((id, i) => ({ id, x: 230 + i * 170 }));
  w.foes = [0, 1, 2].map((i) => grunt(w, lvl.clan, 420 + i * 90, 340 + (i % 2) * 30, 0));
  w.foes.forEach((f) => {
    f.state = "idle";
  });
}

function grunt(w: World, clan: ClanId, x: number, y: number, n: number): Actor {
  const names = GRUNT_NAMES[clan];
  const hp = 22 + n * 7 + Math.floor(random(w) * 8);
  return blankActor({
    id: `g-${++w.actorSequence}-${clan}-${random(w).toString(36).slice(2, 6)}`,
    name: names[Math.floor(random(w) * names.length)],
    x,
    y,
    clan,
    hp,
    maxHp: hp,
    pwr: 1 + Math.floor(n / 2),
    agi: 1,
    face: -1,
    scale: 2.05,
    cool: 0.4 + random(w),
  });
}

export function beginRun(
  w: World,
  charId: string,
  opts?: {
    auto?: boolean;
    mate?: boolean;
    partnerId?: string;
    partnerBot?: boolean;
    duel?: boolean;
  },
) {
  const def = CHARACTERS.find((c) => c.id === charId) ?? CHARACTERS[0];
  w.player = makePlayer(def);
  w.player.id = `player:${def.id}`;
  w.picked = def.id;
  w.alert = 0;
  w.smoke = 0;
  w.smokeCd = 0;
  w.starCd = 0;
  w.taken = [];
  w.cleared = [];
  w.visited = [];
  w.mate = null;
  w.partner = null;
  w.rival = null;
  w.log = [];
  w.heard = [];
  w.detected = [];
  w.actionCauses = {};
  w.auto = !!opts?.auto;
  w.duel = !!opts?.duel;
  w.shots = [];
  w.drops = [];
  enterRoom(w, "oak", opts?.duel ? 220 : 78, 380);
  if (opts?.duel) {
    const other = CHARACTERS.find((c) => c.id !== def.id) ?? CHARACTERS[1];
    const rival = makePlayer(other);
    rival.id = "agent:sable";
    rival.name = "Sable";
    rival.callsign = "RIVAL";
    rival.x = 740;
    rival.y = 380;
    rival.face = -1;
    rival.hp = 90;
    rival.maxHp = 90;
    w.rival = rival;
    w.auto = true;
    w.foes = [];
    w.shops = [];
    w.banner = `${def.name} versus Sable. No humans on the wire.`;
    w.bannerT = 3;
    w.log.push("Agent duel. Wren's channel is dark. Sable fights for the Choir.");
  } else {
    if (opts?.mate) toggleMate(w);
    if (opts?.partnerId) {
      const pdef = CHARACTERS.find((c) => c.id === opts.partnerId);
      if (pdef && pdef.id !== def.id) {
        const partner = makePlayer(pdef);
        partner.id = `partner:${pdef.id}`;
        partner.x = 140;
        partner.y = 390;
        partner.gear = w.player.gear;
        partner.callsign = opts.partnerBot || opts.auto ? "BOT" : "P2";
        w.partner = partner;
        emit(w, {
          type: "AGENT_JOINED",
          sourceId: partner.id,
          targetId: w.player.id,
          payload: { agent: "partner" },
        });
        w.log.push(`${pdef.name} is on the crew. ${pdef.tie}`);
      }
    }
    if (w.auto) {
      w.banner = "Agents have the street. H takes the body back.";
      w.bannerT = 2.6;
      w.log.push("Hands off. The crew moves itself.");
    }
  }
}

export function enterRoom(w: World, id: RoomId, x: number, y: number) {
  const room = roomById(id);
  w.room = id;
  w.level = Math.max(
    0,
    ROOMS.findIndex((r) => r.id === id),
  );
  w.foes = [];
  w.shots = [];
  w.clearT = null;
  w.shopId = null;
  w.shops = room.shops.map((sid, i) => ({ id: sid, x: 220 + i * 180 }));
  if (!w.cleared.includes(id)) {
    for (let i = 0; i < room.grunts; i++) {
      const gx = 260 + (i * 380) / Math.max(1, room.grunts) + random(w) * 24;
      const gy = TOP + 24 + random(w) * (BOT - TOP - 36);
      const g = grunt(w, room.clan, gx, gy, w.level);
      if (i === 0) {
        g.agent = true;
        g.name = ENEMY_AGENTS[(w.level + i) % ENEMY_AGENTS.length] ?? "Sable";
        g.title = "Street agent";
        g.hp += 12;
        g.maxHp += 12;
        g.agi += 1;
      }
      w.foes.push(g);
    }
    if (room.boss) w.foes.push(makeBossFor(room));
  }
  w.player.x = x;
  w.player.y = y;
  w.player.z = 0;
  w.player.vz = 0;
  w.player.vx = 0;
  w.player.state = "idle";
  w.player.timer = 0;
  if (w.mate?.alive) {
    w.mate.x = clamp(x - 48, 40, VW - 40);
    w.mate.y = y;
    w.mate.z = 0;
    w.mate.state = "idle";
  }
  if (w.partner?.alive) {
    w.partner.x = clamp(x + 48, 40, VW - 40);
    w.partner.y = y;
    w.partner.z = 0;
    w.partner.state = "idle";
  }
  if (w.rival?.alive) {
    w.rival.x = clamp(x + 280, 80, VW - 80);
    w.rival.y = y;
    w.rival.face = -1;
    w.rival.z = 0;
  }
  w.phase = "play";
  const key = `${w.player.charId}:${id}`;
  const line = roomLine(w.player.charId, id);
  const boss = room.boss ? bossLine(w.player.charId, room.boss.name) : "";
  if (!w.heard.includes(key)) {
    w.heard.push(key);
    if (line) {
      w.log.push(line);
      emit(w, { type: "NPC_LINE_HEARD", sourceId: w.player.id, payload: { room: id, line } });
    }
    if (boss) {
      w.log.push(boss);
      emit(w, {
        type: "NPC_LINE_HEARD",
        sourceId: `boss-${id}`,
        targetId: w.player.id,
        payload: { room: id, line: boss },
      });
    }
  }
  w.banner = boss || line || room.name;
  w.bannerT = 3.2;
  if (!w.visited.includes(id)) w.visited.push(id);
  w.best = Math.max(w.best, w.visited.length);
  emit(w, {
    type: "ACTOR_ENTERED_ROOM",
    sourceId: w.player.id,
    causalParent: w.actionCauses[w.player.id]?.navigation ?? w.actionCauses[w.player.id]?.movement,
    payload: { room: id },
  });
}

function makeBossFor(room: (typeof ROOMS)[number]): Actor {
  const b = room.boss!;
  return blankActor({
    id: `boss-${room.id}`,
    name: b.name,
    title: b.title,
    x: 860,
    y: 360,
    clan: room.clan,
    hp: b.hp,
    maxHp: b.hp,
    pwr: b.pwr,
    boss: true,
    pattern: b.pattern,
    face: -1,
    scale: 3.05,
    cool: 1.2,
  });
}

export function loadLevel(w: World, index: number) {
  const room = ROOMS[index] ?? ROOMS[0];
  enterRoom(w, room.id, 78, 380);
}

export function retryLevel(w: World) {
  w.player.alive = true;
  w.player.hp = w.player.maxHp;
  w.player.inv = 1;
  w.player.state = "idle";
  w.player.z = 0;
  if (w.cleared.includes(w.room)) w.cleared = w.cleared.filter((id) => id !== w.room);
  enterRoom(w, w.room, 78, 380);
}

export function advance(w: World) {
  if (w.level >= LEVELS.length - 1) {
    w.phase = "win";
    w.clears += 1;
    w.best = LEVELS.length;
    return;
  }
  loadLevel(w, w.level + 1);
}

function floater(w: World, x: number, y: number, text: string, good: boolean) {
  w.floaters.push({ x, y, text, life: 0.85, good });
}

function meterGain(p: Player, n: number) {
  let m = n;
  if (p.charId === "reed") m *= 1.25;
  if (p.charId === "nia") m *= 1.5;
  p.meter = Math.min(100, p.meter + m);
}

function outDmg(p: Player, base: number) {
  let d = base + p.pwr * 3 + p.combo;
  if (p.buff > 0) d *= 1.45;
  if (p.weapon > 0) d *= 1.4;
  d *= 1 + p.charm * 0.2;
  if (p.z > 8) d += 4;
  return Math.max(1, Math.round(d));
}

function hurtFoe(
  w: World,
  f: Actor,
  dmg: number,
  face: 1 | -1,
  stun = 0,
  source: Player = w.player,
  causalParent?: string,
) {
  if (!f.alive || f.inv > 0) return;
  f.hp -= dmg;
  f.inv = 0.28;
  f.x += face * (f.boss ? 10 : 16);
  f.state = "hurt";
  f.timer = 0.26;
  f.stun = Math.max(f.stun, stun);
  f.aggro = true;
  const p = source;
  const behind = Math.sign(p.x - f.x || f.face) !== f.face;
  const quiet = p.stealthAttack && behind && p.gear.includes("wrap");
  w.alert = quiet ? Math.min(100, w.alert + 6) : 100;
  emit(w, {
    type: "ATTACK_LANDED",
    sourceId: source.id,
    targetId: f.id,
    causalParent: causalParent ?? source.attackCause,
    payload: { damage: dmg, hp: Math.max(0, f.hp), quiet },
  });
  emit(w, {
    type: "FACTION_HOSTILITY_CHANGED",
    sourceId: source.id,
    targetId: f.id,
    payload: { clan: f.clan, disposition: "hostile" },
  });
  w.shake = Math.max(w.shake, f.boss ? 5 : 3);
  w.hitstop = 0.035;
  floater(w, f.x, f.y - 70 - f.z, `-${dmg}`, false);
  if (f.hp <= 0) {
    f.alive = false;
    f.hp = 0;
    emit(w, {
      type: "ACTOR_DEFEATED",
      sourceId: source.id,
      targetId: f.id,
      causalParent: causalParent ?? source.attackCause,
      payload: { boss: f.boss, room: w.room, name: f.name },
    });
    const cash = f.boss ? 28 + w.level * 6 : 2 + Math.floor(random(w) * 4) + w.level;
    const paid = w.player.charId === "mara" ? Math.round(cash * 1.25) : cash;
    w.drops.push({ x: f.x, y: f.y, kind: "cash", amount: paid, life: 9 });
    if (!f.boss && random(w) < 0.22)
      w.drops.push({ x: f.x + 14, y: f.y, kind: "pipe", amount: 5, life: 8 });
    if (!f.boss && random(w) < 0.16)
      w.drops.push({ x: f.x - 12, y: f.y + 6, kind: "food", amount: 14, life: 8 });
    floater(w, f.x, f.y - 48, `${f.name} down`, true);
    if (f.boss && w.room === "sanctum") {
      w.phase = "win";
      w.clears += 1;
      w.best = ROOMS.length;
    }
  }
}

function crew(w: World) {
  return [w.player, w.partner, w.mate].filter((p): p is Player => !!p && p.alive);
}

function hurtPlayer(w: World, dmg: number, srcX: number, sourceId?: string, causalParent?: string) {
  const list = crew(w);
  if (!list.length) {
    w.phase = "lose";
    return;
  }
  let p = list[0];
  let best = Infinity;
  for (const c of list) {
    const d = Math.abs(c.x - srcX);
    if (d < best) {
      best = d;
      p = c;
    }
  }
  if (p.inv > 0 || !p.hp) return;
  let d = dmg;
  if (p.charId === "brick") d *= 0.75;
  if (p.state === "block") d *= 0.35;
  d = Math.max(1, Math.round(d));
  p.hp -= d;
  emit(w, {
    type: "ATTACK_LANDED",
    sourceId,
    targetId: p.id,
    causalParent,
    payload: { damage: d, hp: Math.max(0, p.hp), blocked: p.state === "block" },
  });
  p.inv = p.state === "block" ? 0.25 : 0.7;
  p.combo = 0;
  p.kx = Math.sign(p.x - srcX) * (p.state === "block" ? 20 : 110);
  if (p.state !== "block") {
    p.state = "hurt";
    p.timer = 0.28;
  }
  meterGain(p, 6);
  w.shake = 6;
  floater(w, p.x, p.y - 80 - p.z, `-${d}`, false);
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    emit(w, {
      type: "ACTOR_DEFEATED",
      sourceId,
      targetId: p.id,
      causalParent,
      payload: { boss: false, room: w.room, name: p.name },
    });
    floater(w, p.x, p.y - 48, `${p.callsign || p.name} down`, false);
    if (!crew(w).length) {
      w.phase = "lose";
      w.banner = `Down on ${roomById(w.room).name}`;
      w.bannerT = 3;
    }
  }
}

function strike(w: World, reach: number, base: number, stun = 0) {
  strikeFrom(w, w.player, reach, base, stun);
}

function strikeFrom(w: World, p: Player, reach: number, base: number, stun = 0) {
  if (p === w.rival) {
    const dmg = outDmg(p, base);
    for (const c of crew(w)) {
      const dx = c.x - p.x;
      if (Math.abs(dx) > reach || Math.abs(c.y - p.y) > 26) continue;
      if (Math.sign(dx || p.face) !== p.face && Math.abs(dx) > 14) continue;
      hurtPlayer(w, dmg, p.x, p.id, p.attackCause);
    }
    return;
  }
  const dmg = outDmg(p, base);
  let hit = false;
  for (const f of w.foes) {
    if (!f.alive) continue;
    const dx = f.x - p.x;
    if (Math.abs(dx) > reach || Math.abs(f.y - p.y) > 26) continue;
    if (Math.sign(dx || p.face) !== p.face && Math.abs(dx) > 14) continue;
    hurtFoe(w, f, dmg, p.face, stun, p);
    hit = true;
  }
  if (w.rival?.alive && w.rival !== p) {
    const dx = w.rival.x - p.x;
    const facing = Math.sign(dx || p.face) === p.face || Math.abs(dx) <= 14;
    if (facing && Math.abs(dx) <= reach && Math.abs(w.rival.y - p.y) <= 26) {
      hurtRival(w, dmg, p.face, p);
      hit = true;
    }
  }
  if (hit) {
    if (p.weapon > 0) p.weapon -= 1;
    meterGain(p, 9);
    if (p.charId === "reed" && p.state === "punch") p.hp = Math.min(p.maxHp, p.hp + 2);
    p.combo = Math.min(4, p.combo + 1);
  }
}

function hurtRival(w: World, dmg: number, face: 1 | -1, source: Player) {
  const r = w.rival;
  if (!r || !r.alive || r.inv > 0) return;
  r.hp -= dmg;
  emit(w, {
    type: "ATTACK_LANDED",
    sourceId: source.id,
    targetId: r.id,
    causalParent: source.attackCause,
    payload: { damage: dmg, hp: Math.max(0, r.hp) },
  });
  r.inv = 0.28;
  r.x += face * 12;
  r.state = "hurt";
  r.timer = 0.26;
  r.kx = face * 90;
  floater(w, r.x, r.y - 70, `-${dmg}`, true);
  if (r.hp <= 0) {
    r.hp = 0;
    r.alive = false;
    emit(w, {
      type: "ACTOR_DEFEATED",
      sourceId: source.id,
      targetId: r.id,
      causalParent: source.attackCause,
      payload: { boss: false, room: w.room, name: r.name },
    });
    w.phase = "win";
    w.banner = "Sable is off the wire";
    w.bannerT = 3;
    w.log.push("The rival agent drops. The channel is yours.");
    w.clears += 1;
  }
}
function aoe(w: World, radius: number, base: number, stun: number) {
  const p = w.player;
  const dmg = outDmg(p, base);
  for (const f of w.foes) {
    if (!f.alive) continue;
    if (Math.abs(f.x - p.x) < radius && Math.abs(f.y - p.y) < 36)
      hurtFoe(w, f, dmg, p.face, stun, p);
  }
  meterGain(p, 8);
}

function castSpecial(w: World) {
  const p = w.player;
  if (p.meter < 100 || p.state === "hurt") return;
  p.meter = 0;
  p.stealthAttack = false;
  p.state = "special";
  p.hitdone = true;
  p.timer = 0.32;
  const base = 12 + p.charm * 3;
  if (p.special === "rush") {
    p.timer = 0.5;
    p.rushLeft = 4;
    p.rushGap = 0;
  } else if (p.special === "blink") {
    p.x = clamp(p.x + p.face * 110, 36, VW - 36);
    aoe(w, 42, base + 6, 0.2);
    w.shake = 4;
  } else if (p.special === "slam") {
    aoe(w, 86, base + 8, 0.85);
    w.shake = 9;
    p.timer = 0.4;
  } else {
    w.shots.push({
      sourceId: p.id,
      causalParent: p.attackCause,
      x: p.x + p.face * 20,
      y: p.y - 20,
      vx: p.face * 340,
      vy: 0,
      r: 10,
      dmg: outDmg(p, base + 4),
      friendly: true,
      life: 0.8,
      visual: "orb",
    });
  }
}

function living(w: World) {
  return w.foes.some((f) => f.alive);
}

export type SimulationControls = {
  forActor(actor: Player): Input;
  requestExit(direction: Dir, automatic: boolean): void;
};

export function step(w: World, dt: number, input: Input, controls?: SimulationControls) {
  w.time += dt;
  w.shake = Math.max(0, w.shake - dt * 18);
  w.bannerT = Math.max(0, w.bannerT - dt);
  for (const fl of w.floaters) {
    fl.life -= dt;
    fl.y -= 22 * dt;
  }
  w.floaters = w.floaters.filter((f) => f.life > 0);

  if (w.phase !== "play") return;

  if (w.hitstop > 0) {
    w.hitstop -= dt;
    return;
  }

  const p = w.player;
  p.buff = Math.max(0, p.buff - dt);
  p.inv = Math.max(0, p.inv - dt);
  p.timer = Math.max(0, p.timer - dt);
  w.smoke = Math.max(0, w.smoke - dt);
  w.smokeCd = Math.max(0, w.smokeCd - dt);
  w.starCd = Math.max(0, w.starCd - dt);
  p.vx = 0;
  if (controls) input = controls.forActor(p);
  if (!controls && !w.partner) {
    input.left = input.left || input.p2left;
    input.right = input.right || input.p2right;
    input.up = input.up || input.p2up;
    input.down = input.down || input.p2down;
    input.punch = input.punch || input.p2punch;
    input.kick = input.kick || input.p2kick;
    input.jump = input.jump || input.p2jump;
  }

  let speed = 150 + p.agi * 18;
  const busy =
    p.state === "punch" || p.state === "kick" || p.state === "hurt" || p.state === "special";
  const crouch = input.crouch && p.z <= 0 && !busy && p.alive;
  if (crouch) speed *= 0.45;

  if (w.auto && p.alive) {
    moveFighter(w, p, input, dt);
  } else if (!p.alive) {
    p.vx = 0;
  } else if (p.state === "hurt") {
    p.x += p.kx * dt;
    if (p.timer <= 0) p.state = "idle";
  } else if (p.state === "special" && p.special === "rush") {
    p.x += p.face * 280 * dt;
    p.rushGap -= dt;
    if (p.rushGap <= 0 && p.rushLeft > 0) {
      strike(w, 36, 8, 0.05);
      p.rushLeft -= 1;
      p.rushGap = 0.1;
    }
    if (p.timer <= 0 || p.rushLeft <= 0) p.state = "idle";
  } else if (!busy) {
    let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    ix = clamp(ix, -1, 1);
    iy = clamp(iy, -1, 1);
    if (input.block && p.z <= 0) {
      p.state = "block";
      ix *= 0.35;
      iy *= 0.35;
    } else if (p.state === "block") p.state = "idle";
    p.x += ix * speed * dt;
    p.vx = ix * speed;
    if (p.z <= 0) p.y += iy * speed * 0.72 * dt;
    if (ix) p.face = ix > 0 ? 1 : -1;
    const hiding =
      input.hide &&
      p.gear.includes("crate") &&
      Math.abs(ix) < 0.1 &&
      Math.abs(iy) < 0.1 &&
      p.z <= 0;
    p.hiding = hiding;
    if (hiding) p.state = "crouch";
    else if (crouch && p.state !== "block") p.state = "crouch";
    else if (Math.abs(ix) + Math.abs(iy) > 0 && p.state !== "block" && p.z <= 0) p.state = "walk";
    else if ((p.state === "walk" || p.state === "crouch") && p.z <= 0 && !crouch) p.state = "idle";
    if (input.punch) startAttack(p, "punch");
    else if (input.kick) startAttack(p, "kick");
    else if (input.jump && p.z <= 0 && !hiding) {
      p.vz = 360;
      p.state = "jump";
    } else if (input.special) castSpecial(w);
    else if (input.throwStar) throwStar(w);
    else if (input.smoke) popSmoke(w);
  } else if (p.state === "punch" || p.state === "kick") {
    if (!p.hitdone && p.timer <= 0.12) {
      const kick = p.state === "kick";
      const reach =
        (kick ? 52 : 38) + (p.charId === "mara" && kick ? 14 : 0) + (p.weapon > 0 ? 12 : 0);
      const stun = p.charId === "brick" && !kick ? 0.28 : 0;
      strike(w, reach, kick ? 11 : 7, stun);
      p.hitdone = true;
    }
    if (p.timer <= 0) {
      p.state = "idle";
      p.hitdone = false;
    }
  } else if (p.timer <= 0 && p.state === "special") {
    p.state = "idle";
  }

  if (!w.auto) {
    p.z += p.vz * dt;
    p.vz -= 980 * dt;
    if (p.z <= 0) {
      p.z = 0;
      p.vz = 0;
      if (p.state === "jump") p.state = "idle";
    }
    p.x = clamp(p.x, 28, VW - 28);
    p.y = clamp(p.y, TOP, BOT);
  }

  if (input.shop && p.alive && !w.auto) tryShop(w);
  tickGear(w);
  if (p.alive && !w.duel) tryLeave(w, input, controls);
  tickCrew(w, input, dt, controls);
  if (w.rival?.alive) moveFighter(w, w.rival, controls?.forActor(w.rival) ?? emptyInput(), dt);
  if (w.auto && !w.duel) autoLeave(w, dt, controls);
  tickRevive(w);

  tickAlert(w, dt);
  tickFoes(w, dt);
  tickShots(w, dt);
  tickDrops(w, dt);

  if (w.phase === "play" && !living(w) && !w.cleared.includes(w.room)) {
    w.cleared.push(w.room);
    emit(w, { type: "ROOM_CLEARED", sourceId: w.player.id, payload: { room: w.room } });
    w.banner = `${roomById(w.room).name} is quiet`;
    w.bannerT = 1.6;
    w.best = Math.max(w.best, w.cleared.length);
  }
}

function startAttack(p: Player, kind: "punch" | "kick") {
  p.stealthAttack = p.state === "crouch";
  p.state = kind;
  p.timer = kind === "punch" ? 0.26 : 0.34;
  p.hitdone = false;
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
  block?: boolean;
  hide?: boolean;
  special?: boolean;
  throwStar?: boolean;
  smoke?: boolean;
};

function moveFighter(w: World, p: Player, s: Stick, dt: number) {
  if (!p.alive) return;
  p.inv = Math.max(0, p.inv - dt);
  p.timer = Math.max(0, p.timer - dt);
  p.vx = 0;
  const busy = p.state === "punch" || p.state === "kick" || p.state === "hurt";
  let speed = 140 + p.agi * 16;
  if (s.crouch && p.z <= 0 && !busy) speed *= 0.45;
  if (p.state === "hurt") {
    p.x += p.kx * dt;
    if (p.timer <= 0) p.state = "idle";
  } else if (p === w.player && p.state === "special" && p.special === "rush") {
    p.x += p.face * 280 * dt;
    p.rushGap -= dt;
    if (p.rushGap <= 0 && p.rushLeft > 0) {
      strikeFrom(w, p, 36, 8, 0.05);
      p.rushLeft -= 1;
      p.rushGap = 0.1;
    }
    if (p.timer <= 0 || p.rushLeft <= 0) p.state = "idle";
  } else if (p === w.player && p.state === "special") {
    if (p.timer <= 0) p.state = "idle";
  } else if (!busy) {
    let ix = clamp((s.right ? 1 : 0) - (s.left ? 1 : 0), -1, 1);
    let iy = clamp((s.down ? 1 : 0) - (s.up ? 1 : 0), -1, 1);
    if (s.block && p.z <= 0) {
      p.state = "block";
      ix *= 0.35;
      iy *= 0.35;
    } else if (p.state === "block") p.state = "idle";
    p.x += ix * speed * dt;
    p.vx = ix * speed;
    if (p.z <= 0) p.y += iy * speed * 0.7 * dt;
    if (ix) p.face = ix > 0 ? 1 : -1;
    p.hiding = !!s.hide && p.gear.includes("crate") && !ix && !iy && p.z <= 0;
    if (p.state !== "block") {
      if ((s.crouch || p.hiding) && p.z <= 0) p.state = "crouch";
      else if (ix || iy) p.state = "walk";
      else if (p.state === "walk" || p.state === "crouch") p.state = "idle";
    }
    if (s.punch) startAttack(p, "punch");
    else if (s.kick) startAttack(p, "kick");
    else if (s.jump && p.z <= 0) {
      p.vz = 340;
      p.state = "jump";
    } else if (p === w.player && s.special) castSpecial(w);
    else if (p === w.player && s.throwStar) throwStar(w);
    else if (p === w.player && s.smoke) popSmoke(w);
  } else if (!p.hitdone && p.timer <= 0.12) {
    strikeFrom(w, p, p.state === "kick" ? 50 : 36, p.state === "kick" ? 10 : 6, 0);
    p.hitdone = true;
  } else if (p.timer <= 0) {
    p.state = "idle";
    p.hitdone = false;
  }
  p.z += p.vz * dt;
  p.vz -= 980 * dt;
  if (p.z <= 0) {
    p.z = 0;
    p.vz = 0;
    if (p.state === "jump") p.state = "idle";
  }
  p.x = clamp(p.x, 28, VW - 28);
  p.y = clamp(p.y, TOP, BOT);
}

function autoLeave(w: World, dt: number, controls?: SimulationControls) {
  if (living(w)) {
    w.clearT = null;
    return;
  }
  w.clearT = (w.clearT ?? 1.3) - dt;
  if (w.clearT > 0) return;
  const room = roomById(w.room);
  const ex = room.exits.find((e) => !e.need || w.player.gear.includes(e.need));
  if (!ex) return;
  if (controls) {
    controls.requestExit(ex.dir, true);
    return;
  }
  const blank = {
    left: false,
    right: false,
    up: false,
    down: false,
    punch: false,
    kick: false,
    jump: false,
    special: false,
    block: false,
    shop: false,
    crouch: false,
    hide: false,
    throwStar: false,
    smoke: false,
    p2left: false,
    p2right: false,
    p2up: false,
    p2down: false,
    p2punch: false,
    p2kick: false,
    p2jump: false,
  };
  w.player.x = ex.dir === "right" ? VW - 32 : ex.dir === "left" ? 32 : w.player.x;
  w.player.y = ex.dir === "up" ? TOP + 16 : ex.dir === "down" ? BOT - 8 : w.player.y;
  tryLeave(w, {
    ...blank,
    [ex.dir]: true,
    left: ex.dir === "left",
    right: ex.dir === "right",
    up: ex.dir === "up",
    down: ex.dir === "down",
  });
}

export function toggleAuto(w: World) {
  if (w.phase !== "play" || w.duel) return;
  w.auto = !w.auto;
  w.banner = w.auto ? "Agents have the body" : "You have the body";
  w.bannerT = 1.5;
  w.log.push(w.banner);
}

function tickCrew(w: World, input: Input, dt: number, controls?: SimulationControls) {
  if (w.partner)
    moveFighter(
      w,
      w.partner,
      controls?.forActor(w.partner) ?? {
        left: input.p2left,
        right: input.p2right,
        up: input.p2up,
        down: input.p2down,
        punch: input.p2punch,
        kick: input.p2kick,
        jump: input.p2jump,
        crouch: false,
      },
      dt,
    );
  if (w.mate) moveFighter(w, w.mate, controls?.forActor(w.mate) ?? emptyInput(), dt);
}

function tickRevive(w: World) {
  const down = [w.player, w.partner, w.mate].filter((p): p is Player => !!p && !p.alive);
  const up = crew(w);
  if (!up.length) return;
  for (const p of down) {
    if (!up.some((h) => Math.abs(h.x - p.x) < 46 && Math.abs(h.y - p.y) < 28)) continue;
    p.alive = true;
    p.hp = Math.max(12, Math.round(p.maxHp * 0.45));
    p.inv = 1.4;
    p.state = "idle";
    emit(w, { type: "ACTOR_REVIVED", targetId: p.id, payload: { hp: p.hp } });
    floater(w, p.x, p.y - 60, `${p.callsign || p.name} up`, true);
  }
}

export function toggleMate(w: World) {
  if (w.phase !== "play") return;
  if (w.mate) {
    w.log.push("Wren pulls off the wire.");
    emit(w, { type: "AGENT_LEFT", sourceId: w.mate.id, payload: { agent: "wren" } });
    w.mate = null;
    w.banner = "Wren pulled out";
    w.bannerT = 1.6;
    return;
  }
  const id = w.player.charId === "nia" ? "reed" : "nia";
  const m = makePlayer(characterById(id));
  m.id = "agent:wren";
  m.name = "Wren";
  m.callsign = "AGENT";
  m.x = clamp(w.player.x - 46, 40, VW - 40);
  m.y = w.player.y;
  m.gear = w.player.gear;
  m.hp = 72;
  m.maxHp = 72;
  w.mate = m;
  emit(w, {
    type: "AGENT_JOINED",
    sourceId: m.id,
    targetId: w.player.id,
    payload: { agent: "wren" },
  });
  const line =
    "Wren, Nia's field agent, takes the rear. She crouches when the street is quiet and hits when it isn't.";
  w.log.push(line);
  w.banner = "Wren on the wire";
  w.bannerT = 2.4;
}

export function togglePartner(w: World) {
  if (w.phase !== "play") return;
  if (w.partner) {
    w.log.push(`${w.partner.name} peels off.`);
    emit(w, { type: "AGENT_LEFT", sourceId: w.partner.id, payload: { agent: "partner" } });
    w.partner = null;
    w.banner = "Partner left";
    w.bannerT = 1.4;
    return;
  }
  const used = new Set([w.player.charId, w.mate?.charId].filter(Boolean));
  const def = CHARACTERS.find((c) => !used.has(c.id)) ?? CHARACTERS[1];
  const p = makePlayer(def);
  p.id = `partner:${def.id}`;
  p.x = clamp(w.player.x + 42, 40, VW - 40);
  p.y = w.player.y;
  p.gear = w.player.gear;
  p.callsign = "P2";
  w.partner = p;
  emit(w, {
    type: "AGENT_JOINED",
    sourceId: p.id,
    targetId: w.player.id,
    payload: { agent: "partner" },
  });
  const line = `${def.name} joins. ${def.tie}`;
  w.log.push(line);
  w.banner = `${def.name} in. Arrows move, U punch, I kick, O jump.`;
  w.bannerT = 2.8;
}

function tryShop(w: World) {
  const p = w.player;
  let best: PlacedShop | null = null;
  let bestD = 64;
  for (const s of w.shops) {
    const d = Math.abs(s.x - p.x);
    if (d < bestD && p.y < 400) {
      best = s;
      bestD = d;
    }
  }
  if (!best) {
    floater(w, p.x, p.y - 60, "Get closer to a shop", false);
    return;
  }
  w.shopId = best.id;
  w.phase = "shop";
}

export function buyShop(w: World): string {
  const id = w.shopId;
  if (!id) return "";
  const shop = SHOPS[id];
  const p = w.player;
  if (p.cash < shop.price) return `Need $${shop.price}`;
  p.cash -= shop.price;
  emit(w, { type: "PURCHASE_COMPLETED", sourceId: p.id, payload: { shop: id, price: shop.price } });
  switch (id) {
    case "burger":
      p.maxHp += 2;
      p.hp = Math.min(p.maxHp, p.hp + 30);
      break;
    case "soda":
      p.pwr += 1;
      break;
    case "coffee":
      p.agi += 1;
      break;
    case "chili":
      p.buff = 14;
      break;
    case "gloves":
      p.pwr += 2;
      break;
    case "sneakers":
      p.agi += 2;
      break;
    case "aid":
      p.hp = Math.min(p.maxHp, p.hp + 55);
      break;
    case "protein":
      p.maxHp += 10;
      p.hp = Math.min(p.maxHp, p.hp + 10);
      break;
    case "drink":
      p.meter = 100;
      break;
    case "charm":
      p.charm += 1;
      break;
    case "medkit":
      p.hp = p.maxHp;
      break;
    case "ice":
      p.hp = Math.min(p.maxHp, p.hp + 16);
      p.inv = Math.max(p.inv, 2.2);
      break;
    default:
      break;
  }
  w.phase = "play";
  w.shopId = null;
  w.banner = `${shop.name}: ${shop.blurb}`;
  w.bannerT = 2.2;
  return shop.blurb;
}

export function closeShop(w: World) {
  w.phase = "play";
  w.shopId = null;
}

function throwStar(w: World) {
  const p = w.player;
  if (!p.gear.includes("stars") || w.starCd > 0) return;
  w.starCd = 0.32;
  p.stealthAttack = false;
  w.shots.push({
    sourceId: p.id,
    causalParent: w.actionCauses[p.id]?.inventory,
    x: p.x + p.face * 18,
    y: p.y - 28 - p.z,
    vx: p.face * 420,
    vy: 0,
    r: 6,
    dmg: 6 + p.pwr * 2,
    friendly: true,
    life: 0.7,
    visual: "star",
  });
}

function popSmoke(w: World) {
  const p = w.player;
  if (!p.gear.includes("smoke") || w.smokeCd > 0) return;
  w.smoke = 2.6;
  w.smokeCd = 7;
  w.alert = Math.max(0, w.alert * 0.25);
  floater(w, p.x, p.y - 40, "Smoke", true);
}

function tickGear(w: World) {
  const room = roomById(w.room);
  if (!room.gear || w.taken.includes(room.gear)) return;
  const p = w.player;
  if (Math.abs(p.x - 520) < 32 && Math.abs(p.y - 350) < 40) {
    p.gear.push(room.gear);
    w.taken.push(room.gear);
    emit(w, {
      type: "ITEM_ACQUIRED",
      sourceId: `gear:${w.room}`,
      targetId: p.id,
      payload: { gear: room.gear },
    });
    emit(w, { type: "DOOR_UNLOCKED", sourceId: p.id, payload: { capability: room.gear } });
    floater(w, p.x, p.y - 50, GEAR[room.gear].name, true);
    w.banner = GEAR[room.gear].blurb;
    w.bannerT = 2.4;
  }
}

function tryLeave(w: World, input: Input, controls?: SimulationControls) {
  if (w.duel) return;
  const room = roomById(w.room);
  const p = w.player;
  let dir: Dir | null = null;
  if (p.x >= VW - 40 && input.right) dir = "right";
  else if (p.x <= 40 && input.left) dir = "left";
  else if (p.y <= TOP + 22 && input.up) dir = "up";
  else if (p.y >= BOT - 12 && input.down) dir = "down";
  if (!dir) return;
  const ex = room.exits.find((e) => e.dir === dir);
  if (!ex) return;
  if (ex.need && !p.gear.includes(ex.need)) {
    w.banner = `Need ${GEAR[ex.need].name}`;
    w.bannerT = 1.1;
    if (dir === "right") p.x = VW - 56;
    if (dir === "left") p.x = 56;
    if (dir === "up") p.y = TOP + 28;
    if (dir === "down") p.y = BOT - 20;
    return;
  }
  if (controls) {
    controls.requestExit(dir, false);
    return;
  }
  const x = dir === "left" ? VW - 90 : dir === "right" ? 80 : p.x;
  const y = dir === "up" ? BOT - 24 : dir === "down" ? TOP + 36 : p.y;
  enterRoom(w, ex.to, x, y);
}

function sees(f: Actor, p: Player, w: World) {
  if (w.smoke > 0) return false;
  if (p.hiding) return false;
  const dx = p.x - f.x;
  const range = (f.boss ? 200 : 150) * (p.state === "crouch" ? 0.55 : 1);
  if (Math.abs(dx) > range || Math.abs(p.y - f.y) > 34) return false;
  if (Math.sign(dx || f.face) !== f.face && Math.abs(dx) > 16) return false;
  if (p.z > 48) return false;
  return true;
}

function tickAlert(w: World, dt: number) {
  const bodies = crew(w);
  let seen = false;
  const detected: string[] = [];
  for (const f of w.foes) {
    if (!f.alive) continue;
    for (const p of bodies)
      if (sees(f, p, w)) {
        seen = true;
        const pair = `${f.id}:${p.id}`;
        detected.push(pair);
        if (!w.detected.includes(pair))
          emit(w, {
            type: "ENEMY_DETECTED_ACTOR",
            sourceId: f.id,
            targetId: p.id,
            payload: { room: w.room },
          });
      }
  }
  w.detected = detected;
  if (seen) w.alert = Math.min(100, w.alert + 55 * dt);
  else w.alert = Math.max(0, w.alert - 16 * dt);
  if (w.alert < 18) {
    for (const f of w.foes) if (!f.boss) f.aggro = false;
  }
}

function tickFoes(w: World, dt: number) {
  for (const f of w.foes) {
    if (!f.alive) continue;
    const bodies = crew(w);
    const p = bodies.reduce(
      (best, c) =>
        Math.hypot(c.x - f.x, c.y - f.y) < Math.hypot(best.x - f.x, best.y - f.y) ? c : best,
      bodies[0] ?? w.player,
    );
    f.inv = Math.max(0, f.inv - dt);
    f.timer -= dt;
    f.stun = Math.max(0, f.stun - dt);
    f.dash = Math.max(0, f.dash - dt);
    f.charge = Math.max(0, f.charge - dt);
    f.z += f.vz * dt;
    f.vz -= 980 * dt;
    if (f.z < 0) {
      f.z = 0;
      f.vz = 0;
    }
    if (f.state === "hurt") {
      if (f.timer <= 0) f.state = "idle";
      continue;
    }
    if (f.stun > 0) continue;
    const calm = w.alert < 36 && !f.aggro && !(f.boss && w.alert > 48);
    if (calm) {
      if (f.agent && sees(f, p, w) && !f.didSummon) {
        f.didSummon = true;
        w.alert = Math.min(100, w.alert + 22);
        floater(w, f.x, f.y - 70, `${f.name} radios`, false);
      }
      if (f.timer <= 0) {
        f.face = f.face === 1 ? -1 : 1;
        f.timer = 1.2 + random(w);
      }
      f.x += f.face * (f.boss ? 0 : 32) * dt;
      f.state = f.boss ? "idle" : "walk";
      f.x = clamp(f.x, 48, VW - 36);
      continue;
    }
    const dx = p.x - f.x;
    const flank = f.agent ? (Math.sin(w.time * 1.4 + f.x) > 0 ? 36 : -36) : 0;
    const dy = p.y + flank - f.y;
    f.face = dx >= 0 ? 1 : -1;
    bossPattern(w, f, dt, dx, dy);
    if (f.dash > 0) {
      f.x += f.face * (f.boss ? 260 : 180) * dt;
      if (Math.abs(dx) < 28 && Math.abs(dy) < 22) hurtPlayer(w, f.boss ? f.pwr + 4 : 6, f.x, f.id);
      continue;
    }
    if (f.state === "attack") {
      if (f.timer <= 0) {
        const reach = f.pattern === "wide" ? 62 : f.boss ? 42 : 30;
        if (Math.abs(dx) < reach && Math.abs(dy) < 22 && p.z < 30)
          hurtPlayer(w, f.boss ? f.pwr : 6, f.x, f.id);
        f.state = "idle";
        f.cool = f.boss ? 0.7 : 0.5;
      }
      continue;
    }
    if (f.state === "block") {
      if (f.timer <= 0) f.state = "idle";
      continue;
    }
    const dist = Math.hypot(dx, dy);
    const prefer = f.clan === "choir" || f.pattern === "throw" || f.pattern === "pulse" ? 120 : 34;
    if (dist > prefer) {
      f.x += Math.sign(dx || 1) * (46 + w.level * 6 + (f.boss ? 16 : 0)) * dt;
      f.y += Math.sign(dy || 1) * (36 + (f.boss ? 8 : 0)) * dt;
      f.state = "walk";
    } else if (f.clan === "choir" && dist < 80) {
      f.x -= f.face * 40 * dt;
      f.state = "walk";
    } else if (f.cool <= 0 && p.z < 36) {
      if (f.clan === "varsity" && random(w) < 0.25) {
        f.state = "block";
        f.timer = 0.45;
      } else {
        f.state = "attack";
        f.timer = f.pattern === "wide" ? 0.48 : 0.32;
      }
    } else {
      f.state = "idle";
      f.cool -= dt;
    }
    f.x = clamp(f.x, 40, VW - 24);
    f.y = clamp(f.y, TOP, BOT);
  }
  separate(w);
  w.foes = w.foes.filter((f) => f.alive);
}

function bossPattern(w: World, f: Actor, dt: number, dx: number, dy: number) {
  if (!f.boss || !f.pattern) return;
  f.cool -= dt;
  if (f.pattern === "summon" && !f.didSummon && f.hp < f.maxHp * 0.55 && w.foes.length < 12) {
    f.didSummon = true;
    const room = roomById(w.room);
    w.foes.push(grunt(w, room.clan, f.x - 40, f.y - 10, w.level));
    w.foes.push(grunt(w, room.clan, f.x - 70, f.y + 16, w.level));
    floater(w, f.x, f.y - 90, "Rats!", false);
    return;
  }
  if (f.cool > 0) return;
  if (f.pattern === "dash") {
    f.dash = 0.32;
    f.cool = 1.7;
    f.face = dx >= 0 ? 1 : -1;
  } else if (f.pattern === "throw" || f.pattern === "pulse") {
    const n = f.pattern === "pulse" ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) / 2) * 40;
      w.shots.push({
        sourceId: f.id,
        x: f.x + f.face * 16,
        y: f.y - 24,
        vx: f.face * 220,
        vy: spread,
        r: f.pattern === "pulse" ? 9 : 7,
        dmg: f.pattern === "pulse" ? 10 : 7,
        friendly: false,
        life: 1.3,
        visual: "orb",
      });
    }
    f.cool = f.pattern === "pulse" ? 2.1 : 1.6;
  } else if (f.pattern === "charge") {
    f.dash = 0.45;
    f.cool = 2.3;
    f.face = dx >= 0 ? 1 : -1;
  } else if (f.pattern === "wide") {
    f.cool = 1.4;
  } else {
    f.cool = 1.5;
  }
  void dy;
}

function separate(w: World) {
  const list = w.foes.filter((f) => f.alive);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      if (Math.abs(dx) < 26 && Math.abs(a.y - b.y) < 18) {
        const push = (26 - Math.abs(dx)) * 0.5 * Math.sign(dx || 1);
        if (!b.boss) b.x += push;
        if (!a.boss) a.x -= push;
      }
    }
  }
}

function tickShots(w: World, dt: number) {
  const next: Shot[] = [];
  for (const s of w.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0 || s.x < -20 || s.x > VW + 20) continue;
    if (s.friendly) {
      let used = false;
      for (const f of w.foes) {
        if (!f.alive) continue;
        if (Math.abs(f.x - s.x) < 20 + s.r && Math.abs(f.y - 16 - s.y) < 28) {
          hurtFoe(
            w,
            f,
            s.dmg,
            s.vx > 0 ? 1 : -1,
            0.15,
            crew(w).find((p) => p.id === s.sourceId) ?? w.player,
            s.causalParent,
          );
          used = true;
          break;
        }
      }
      if (!used) next.push(s);
    } else {
      const hit = crew(w).find(
        (c) => Math.abs(c.x - s.x) < 16 + s.r && Math.abs(c.y - 16 - s.y) < 26 && c.z < 24,
      );
      if (hit) hurtPlayer(w, s.dmg, s.x, s.sourceId, s.causalParent);
      else next.push(s);
    }
  }
  w.shots = next;
}

function tickDrops(w: World, dt: number) {
  const keep: Drop[] = [];
  for (const d of w.drops) {
    d.life -= dt;
    const p = crew(w).find((c) => Math.abs(d.x - c.x) < 22 && Math.abs(d.y - c.y) < 22 && c.z < 16);
    if (p) {
      emit(w, {
        type: "ITEM_ACQUIRED",
        targetId: d.kind === "cash" ? w.player.id : p.id,
        payload: { item: d.kind, amount: d.amount },
      });
      if (d.kind === "cash") {
        w.player.cash += d.amount;
        floater(w, p.x, p.y - 50, `+$${d.amount}`, true);
      } else if (d.kind === "pipe") {
        p.weapon += d.amount;
        floater(w, p.x, p.y - 50, "Pipe", true);
      } else {
        p.hp = Math.min(p.maxHp, p.hp + d.amount);
        floater(w, p.x, p.y - 50, `+${d.amount} HP`, true);
      }
    } else if (d.life > 0) keep.push(d);
  }
  w.drops = keep;
}

export function nearestShop(w: World): PlacedShop | null {
  let best: PlacedShop | null = null;
  let bestD = 64;
  for (const s of w.shops) {
    const d = Math.abs(s.x - w.player.x);
    if (d < bestD && w.player.y < 400) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function characterById(id: string) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function clanName(id: ClanId) {
  return CLANS[id].name;
}

function emit(w: World, event: RuleEvent) {
  w.pendingEvents.push(event);
}

export function emptyInput(): Input {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    punch: false,
    kick: false,
    jump: false,
    special: false,
    block: false,
    shop: false,
    crouch: false,
    hide: false,
    throwStar: false,
    smoke: false,
    p2left: false,
    p2right: false,
    p2up: false,
    p2down: false,
    p2punch: false,
    p2kick: false,
    p2jump: false,
  };
}

/** Called only after the runtime's navigation decision; legacy exit placement. */
export function leaveThroughExit(w: World, direction: Dir, automatic = false) {
  const input = { ...emptyInput(), [direction]: true };
  if (automatic) {
    w.player.x = direction === "right" ? VW - 32 : direction === "left" ? 32 : w.player.x;
    w.player.y = direction === "up" ? TOP + 16 : direction === "down" ? BOT - 8 : w.player.y;
  }
  tryLeave(w, input);
}
