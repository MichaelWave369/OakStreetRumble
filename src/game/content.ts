export type SpecialId = "rush" | "blink" | "slam" | "pulse";
export type ClanId = "rats" | "kings" | "varsity" | "choir";
export type ShopId =
  | "burger"
  | "soda"
  | "coffee"
  | "chili"
  | "gloves"
  | "sneakers"
  | "aid"
  | "protein"
  | "drink"
  | "charm"
  | "medkit"
  | "ice";
export type Pattern = "summon" | "wide" | "dash" | "throw" | "charge" | "pulse";

export type Palette = {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoe: string;
  accent: string;
};

export type CharacterDef = {
  id: string;
  name: string;
  aka: string;
  clan: ClanId;
  special: SpecialId;
  specialName: string;
  blurb: string;
  passive: string;
  hp: number;
  pwr: number;
  agi: number;
  pal: Palette;
  tie: string;
};

export type ShopDef = {
  id: ShopId;
  name: string;
  price: number;
  blurb: string;
};

export type LevelDef = {
  id: string;
  name: string;
  clan: ClanId;
  clanName: string;
  sky: string;
  walk: string;
  road: string;
  trim: string;
  grunts: number;
  shops: ShopId[];
  boss: { name: string; title: string; hp: number; pattern: Pattern; pwr: number };
};

export const CLANS: Record<ClanId, { name: string; shirt: string; note: string }> = {
  rats: { name: "Dock Rats", shirt: "#3f6b4e", note: "Rush in and swarm." },
  kings: { name: "Mall Kings", shirt: "#3d5f8a", note: "Flank, then strike." },
  varsity: { name: "Varsity", shirt: "#8a3d3d", note: "Heavy hits. They shell up." },
  choir: { name: "Iron Choir", shirt: "#5c3d7a", note: "Keep range. They throw pulses." },
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: "reed",
    name: "Reed",
    aka: "Oak defector",
    clan: "rats",
    special: "rush",
    specialName: "Chain Rush",
    blurb: "Balanced striker. Punches give a little life back, and the meter fills faster.",
    passive: "Lifesteal on punch. Meter +25%.",
    hp: 78,
    pwr: 2,
    agi: 2,
    pal: {
      skin: "#e0b48a",
      hair: "#2a2118",
      shirt: "#204060",
      pants: "#1c2430",
      shoe: "#111",
      accent: "#e8b84a",
    },
    tie: "Walked out on Vex. Mara hid him. Brick still wants the rematch. Nia's wire is the only reason the pier kids got a warning.",
  },
  {
    id: "mara",
    name: "Mara",
    aka: "Mall runaway",
    clan: "kings",
    special: "blink",
    specialName: "Blink Kick",
    blurb: "Fast. Longer kicks, and every wallet she drops pays extra.",
    passive: "Kick reach up. Cash +25%.",
    hp: 62,
    pwr: 2,
    agi: 4,
    pal: {
      skin: "#d7a07a",
      hair: "#1a1a1a",
      shirt: "#d4543c",
      pants: "#241820",
      shoe: "#111",
      accent: "#f6efe2",
    },
    tie: "Vitrine's sister, not her soldier. She shares a channel with Nia. Brick owes her a stitch. Reed is the only Rat she will stand beside.",
  },
  {
    id: "brick",
    name: "Brick",
    aka: "Linebacker",
    clan: "varsity",
    special: "slam",
    specialName: "Quake Slam",
    blurb: "Slow wall. Takes less damage. Punches stagger.",
    passive: "Damage taken −25%. Punch stun.",
    hp: 104,
    pwr: 3,
    agi: 1,
    pal: {
      skin: "#c48a62",
      hair: "#3a2a22",
      shirt: "#8a3d3d",
      pants: "#2a241c",
      shoe: "#111",
      accent: "#e8b84a",
    },
    tie: "Roe's old captain. He quit when choir money hit the locker room. He covers Mara. He thinks Nia talks too much and Reed hits too clean.",
  },
  {
    id: "nia",
    name: "Nia",
    aka: "Night circuit",
    clan: "choir",
    special: "pulse",
    specialName: "Pulse Wave",
    blurb: "Glass cannon. Special is a ranged blast. Meter climbs fast.",
    passive: "Meter gain +50%.",
    hp: 58,
    pwr: 3,
    agi: 3,
    pal: {
      skin: "#e8c3a0",
      hair: "#6b3fa0",
      shirt: "#2a2140",
      pants: "#16141e",
      shoe: "#111",
      accent: "#7fd0c8",
    },
    tie: "Built the wire the Choir now hunts. Wren is her field agent. She wants Vale off the circuit. Mara knows the exits. Reed's rush makes her nervous.",
  },
];

export const SHOPS: Record<ShopId, ShopDef> = {
  burger: { id: "burger", name: "Burger Barn", price: 8, blurb: "Heal 30 and +2 max HP" },
  soda: { id: "soda", name: "Soda Stop", price: 14, blurb: "+1 Power" },
  coffee: { id: "coffee", name: "Night Coffee", price: 14, blurb: "+1 Agility" },
  chili: { id: "chili", name: "Chili Cart", price: 10, blurb: "Damage up for 14s" },
  gloves: { id: "gloves", name: "Ring Gloves", price: 26, blurb: "+2 Power" },
  sneakers: { id: "sneakers", name: "Alley Sneakers", price: 26, blurb: "+2 Agility" },
  aid: { id: "aid", name: "Corner Clinic", price: 16, blurb: "Heal 55" },
  protein: { id: "protein", name: "Protein Shake", price: 22, blurb: "+10 max HP and heal 10" },
  drink: { id: "drink", name: "Surge Can", price: 12, blurb: "Fill the special meter" },
  charm: { id: "charm", name: "Choir Charm", price: 30, blurb: "Specials hit harder" },
  medkit: { id: "medkit", name: "Field Medkit", price: 36, blurb: "Full heal" },
  ice: { id: "ice", name: "Ice Brick", price: 18, blurb: "Heal 16 and brief invulnerability" },
};

export const LEVELS: LevelDef[] = [
  {
    id: "oak",
    name: "Oak Street",
    clan: "rats",
    clanName: "Dock Rats",
    sky: "#6e93b8",
    walk: "#8d9294",
    road: "#5c6470",
    trim: "#d4543c",
    grunts: 4,
    shops: ["burger", "soda", "chili", "gloves"],
    boss: { name: "Vex", title: "Rat King", hp: 96, pattern: "summon", pwr: 7 },
  },
  {
    id: "pier",
    name: "Pier Walk",
    clan: "rats",
    clanName: "Dock Rats",
    sky: "#5e88a8",
    walk: "#8a9498",
    road: "#4e5964",
    trim: "#3f6b4e",
    grunts: 5,
    shops: ["coffee", "aid", "sneakers", "ice"],
    boss: { name: "Hook", title: "Pier Boss", hp: 128, pattern: "wide", pwr: 9 },
  },
  {
    id: "mall",
    name: "Mall Block",
    clan: "kings",
    clanName: "Mall Kings",
    sky: "#7e8eb8",
    walk: "#9aa0a6",
    road: "#555c68",
    trim: "#3d5f8a",
    grunts: 5,
    shops: ["burger", "charm", "protein", "soda"],
    boss: { name: "Vitrine", title: "Window King", hp: 120, pattern: "dash", pwr: 8 },
  },
  {
    id: "court",
    name: "Food Court",
    clan: "kings",
    clanName: "Mall Kings",
    sky: "#8a7e68",
    walk: "#a39c92",
    road: "#5a534c",
    trim: "#e8b84a",
    grunts: 5,
    shops: ["chili", "medkit", "coffee", "gloves"],
    boss: { name: "Register", title: "Court Captain", hp: 140, pattern: "throw", pwr: 8 },
  },
  {
    id: "school",
    name: "High School",
    clan: "varsity",
    clanName: "Varsity",
    sky: "#8a6e98",
    walk: "#868c90",
    road: "#4e5560",
    trim: "#8a3d3d",
    grunts: 6,
    shops: ["protein", "aid", "sneakers", "drink"],
    boss: { name: "Roe", title: "Captain", hp: 176, pattern: "charge", pwr: 11 },
  },
  {
    id: "roof",
    name: "Night Circuit",
    clan: "choir",
    clanName: "Iron Choir",
    sky: "#2a3350",
    walk: "#6e7680",
    road: "#3a414c",
    trim: "#5c3d7a",
    grunts: 4,
    shops: ["medkit", "charm", "ice", "burger"],
    boss: { name: "Vale", title: "Choir Lead", hp: 230, pattern: "pulse", pwr: 12 },
  },
];

export const GRUNT_NAMES: Record<ClanId, string[]> = {
  rats: ["Dock Rat", "Alley Cat", "Wharf Kid", "Bilge"],
  kings: ["Mall King", "Window Punk", "Food Court", "Atrium"],
  varsity: ["Hall Monitor", "Varsity", "Bench", "Letterman"],
  choir: ["Cantor", "Static", "Neon", "Hymn"],
};

export type GearId = "stars" | "smoke" | "grip" | "wire" | "lens" | "crate" | "wrap";
export type RoomId =
  | "oak"
  | "roof"
  | "pier"
  | "hold"
  | "mall"
  | "vent"
  | "court"
  | "school"
  | "gym"
  | "circuit"
  | "sanctum"
  | "warehouse"
  | "relay";
export type Dir = "left" | "right" | "up" | "down";

export type ExitDef = { dir: Dir; to: RoomId; need?: GearId };

export type RoomDef = {
  id: RoomId;
  name: string;
  clan: ClanId;
  clanName: string;
  sky: string;
  walk: string;
  road: string;
  trim: string;
  grunts: number;
  shops: ShopId[];
  boss?: { name: string; title: string; hp: number; pattern: Pattern; pwr: number };
  exits: ExitDef[];
  gear?: GearId;
  col: number;
  row: number;
};

export const GEAR: Record<GearId, { name: string; blurb: string }> = {
  stars: { name: "Star Case", blurb: "Throwing stars. Press R." },
  smoke: { name: "Smoke Vial", blurb: "Breaks sight for a few seconds. Press G." },
  grip: { name: "Grip Gloves", blurb: "Opens roof hatches." },
  wire: { name: "Wire Ear", blurb: "Live radar. Patrol cones show on the street." },
  lens: { name: "Night Lens", blurb: "Opens sealed vents." },
  crate: { name: "Market Crate", blurb: "Hold Q and stand still. Patrols walk past." },
  wrap: { name: "Quiet Wrap", blurb: "A crouched hit from behind does not raise the alarm." },
};

export const ROOMS: RoomDef[] = [
  {
    id: "oak",
    name: "Oak Street",
    clan: "rats",
    clanName: "Dock Rats",
    sky: "#6e93b8",
    walk: "#8d9294",
    road: "#5c6470",
    trim: "#d4543c",
    grunts: 3,
    shops: ["burger", "soda", "chili"],
    boss: { name: "Vex", title: "Rat King", hp: 90, pattern: "summon", pwr: 7 },
    col: 0,
    row: 1,
    exits: [
      { dir: "right", to: "pier" },
      { dir: "up", to: "roof", need: "grip" },
      { dir: "down", to: "warehouse" },
    ],
  },
  {
    id: "roof",
    name: "Oak Roof",
    clan: "rats",
    clanName: "Dock Rats",
    sky: "#8eb4d4",
    walk: "#9aa3a8",
    road: "#6a7380",
    trim: "#e8b84a",
    grunts: 2,
    shops: ["coffee"],
    gear: "stars",
    col: 0,
    row: 0,
    exits: [{ dir: "down", to: "oak" }],
  },
  {
    id: "pier",
    name: "Pier Walk",
    clan: "rats",
    clanName: "Dock Rats",
    sky: "#5e88a8",
    walk: "#8a9498",
    road: "#4e5964",
    trim: "#3f6b4e",
    grunts: 3,
    shops: ["aid", "sneakers", "ice"],
    gear: "grip",
    col: 1,
    row: 1,
    exits: [
      { dir: "left", to: "oak" },
      { dir: "right", to: "hold" },
      { dir: "down", to: "mall" },
    ],
  },
  {
    id: "hold",
    name: "Pier Hold",
    clan: "rats",
    clanName: "Dock Rats",
    sky: "#4e7088",
    walk: "#7d868c",
    road: "#45505a",
    trim: "#3f6b4e",
    grunts: 2,
    shops: ["gloves"],
    boss: { name: "Hook", title: "Pier Boss", hp: 120, pattern: "wide", pwr: 9 },
    col: 2,
    row: 1,
    exits: [{ dir: "left", to: "pier" }],
  },
  {
    id: "mall",
    name: "Mall Block",
    clan: "kings",
    clanName: "Mall Kings",
    sky: "#7e8eb8",
    walk: "#9aa0a6",
    road: "#555c68",
    trim: "#3d5f8a",
    grunts: 3,
    shops: ["protein", "soda"],
    boss: { name: "Vitrine", title: "Window King", hp: 110, pattern: "dash", pwr: 8 },
    col: 1,
    row: 2,
    exits: [
      { dir: "up", to: "pier" },
      { dir: "right", to: "vent", need: "lens" },
      { dir: "down", to: "school" },
    ],
  },
  {
    id: "vent",
    name: "Service Vent",
    clan: "kings",
    clanName: "Mall Kings",
    sky: "#3a4458",
    walk: "#6e7680",
    road: "#3e4652",
    trim: "#7fd0c8",
    grunts: 2,
    shops: ["drink"],
    gear: "crate",
    col: 2,
    row: 2,
    exits: [
      { dir: "left", to: "mall" },
      { dir: "right", to: "court" },
    ],
  },
  {
    id: "court",
    name: "Food Court",
    clan: "kings",
    clanName: "Mall Kings",
    sky: "#8a7e68",
    walk: "#a39c92",
    road: "#5a534c",
    trim: "#e8b84a",
    grunts: 2,
    shops: ["chili", "medkit"],
    gear: "wrap",
    boss: { name: "Register", title: "Court Captain", hp: 130, pattern: "throw", pwr: 8 },
    col: 3,
    row: 2,
    exits: [{ dir: "left", to: "vent" }],
  },
  {
    id: "school",
    name: "High School",
    clan: "varsity",
    clanName: "Varsity",
    sky: "#8a6e98",
    walk: "#868c90",
    road: "#4e5560",
    trim: "#8a3d3d",
    grunts: 3,
    shops: ["protein", "aid"],
    gear: "lens",
    col: 1,
    row: 3,
    exits: [
      { dir: "up", to: "mall" },
      { dir: "right", to: "gym" },
      { dir: "down", to: "circuit", need: "wire" },
    ],
  },
  {
    id: "gym",
    name: "Gym",
    clan: "varsity",
    clanName: "Varsity",
    sky: "#6a5878",
    walk: "#8a847c",
    road: "#4a4550",
    trim: "#8a3d3d",
    grunts: 2,
    shops: ["gloves"],
    gear: "wire",
    boss: { name: "Roe", title: "Captain", hp: 160, pattern: "charge", pwr: 11 },
    col: 2,
    row: 3,
    exits: [{ dir: "left", to: "school" }],
  },
  {
    id: "circuit",
    name: "Night Circuit",
    clan: "choir",
    clanName: "Iron Choir",
    sky: "#2a3350",
    walk: "#6e7680",
    road: "#3a414c",
    trim: "#5c3d7a",
    grunts: 3,
    shops: ["charm", "coffee"],
    gear: "smoke",
    col: 1,
    row: 4,
    exits: [
      { dir: "up", to: "school" },
      { dir: "right", to: "sanctum", need: "stars" },
      { dir: "left", to: "relay" },
    ],
  },
  {
    id: "sanctum",
    name: "Choir Sanctum",
    clan: "choir",
    clanName: "Iron Choir",
    sky: "#241c38",
    walk: "#5c5668",
    road: "#2e2838",
    trim: "#7fd0c8",
    grunts: 2,
    shops: ["medkit"],
    boss: { name: "Vale", title: "Choir Lead", hp: 210, pattern: "pulse", pwr: 12 },
    col: 2,
    row: 4,
    exits: [{ dir: "left", to: "circuit" }],
  },
  {
    id: "warehouse",
    name: "Crate Warehouse",
    clan: "rats",
    clanName: "Dock Rats",
    sky: "#4a5560",
    walk: "#7a7368",
    road: "#3e3a34",
    trim: "#c47a3a",
    grunts: 3,
    shops: ["chili", "gloves"],
    boss: { name: "Nail", title: "Crate Boss", hp: 140, pattern: "wide", pwr: 9 },
    col: 0,
    row: 2,
    exits: [{ dir: "up", to: "oak" }],
  },
  {
    id: "relay",
    name: "Relay Tower",
    clan: "choir",
    clanName: "Iron Choir",
    sky: "#1c2438",
    walk: "#5a6474",
    road: "#2a3140",
    trim: "#7fd0c8",
    grunts: 2,
    shops: ["drink", "charm"],
    boss: { name: "Static", title: "Relay", hp: 150, pattern: "pulse", pwr: 10 },
    col: 0,
    row: 4,
    exits: [{ dir: "right", to: "circuit" }],
  },
];

export function roomById(id: RoomId) {
  return ROOMS.find((r) => r.id === id) ?? ROOMS[0];
}

export const ROOM_LINES: Record<string, Partial<Record<RoomId, string>>> = {
  reed: {
    oak: "Reed: Vex still works this block like I never left.",
    roof: "Reed: I used this roof to count patrols. Nia can hear them from here.",
    pier: "Reed: Hook pays the Rats in crates. Kids carry them.",
    hold: "Reed: Hook taught me the wide swing. I am not here to thank him.",
    mall: "Mara's old door is two shops down. Vitrine painted over her name.",
    vent: "Reed: Stay low. Kings post an agent in the duct.",
    court: "Reed: Register calls this neutral ground. It is not.",
    school: "Reed: Brick's number is still on the trophy case.",
    gym: "Reed: Roe wants the linebacker back. Brick will not go.",
    circuit: "Reed: Nia said Vale sings the alerts. I believe her now.",
    sanctum: "Reed: Four of us against the Choir. That was always the plan.",
    warehouse: "Reed: Nail stacks crates like walls. Hook's stash is in there.",
    relay: "Reed: Nia called this her first tower. Static lives in it now.",
  },
  mara: {
    oak: "Mara: Reed's old street. Don't say his name where the Rats can hear.",
    roof: "Mara: Stars up here. Nia wanted this case before the Choir did.",
    pier: "Mara: Grip gloves. The roof hatch is Reed's, not Hook's.",
    hold: "Mara: Hook smiled at me once. I still don't like it.",
    mall: "Mara: Vitrine is my sister. She picked the glass over me.",
    vent: "Mara: This is my exit. Kings never learned the turns.",
    court: "Mara: Register kept my tab. I'm closing it.",
    school: "Mara: Brick bled on these stairs. I stitched him. He stayed.",
    gym: "Mara: Tell Roe the linebacker has a new crew.",
    circuit: "Mara: Nia, if you're listening, we're at the door.",
    sanctum: "Mara: Vale, you don't get my sister and the city.",
    warehouse: "Mara: I hid in these crates the night I left the mall.",
    relay: "Mara: If Nia's voice is in the static, we're close.",
  },
  brick: {
    oak: "Brick: Rats. Small hits. Don't let them stack.",
    roof: "Brick: High ground. I hate high ground. Use it anyway.",
    pier: "Brick: Hook swings wide. Step inside it.",
    hold: "Brick: I'll take the big one. Cover the door.",
    mall: "Brick: Mara grew up under these lights. Keep the glass off her.",
    vent: "Brick: Too tight for a charge. Crouch.",
    court: "Brick: Register talks. I don't.",
    school: "Brick: My school. My mess.",
    gym: "Brick: Roe. You sold the team. I'm the receipt.",
    circuit: "Brick: Nia's toys. I'll watch the corners.",
    sanctum: "Brick: Choir lead. One slam. Then we go home.",
    warehouse: "Brick: Tight aisles. Don't let Nail circle you.",
    relay: "Brick: Too many wires. Nia, talk. I'll hit.",
  },
  nia: {
    oak: "Nia: Reed, your old king radios on an open channel. Sloppy.",
    roof: "Nia: Star case is mine. Wren, mark the hatch.",
    pier: "Nia: Hook's men face the water. Their backs are a gift.",
    hold: "Nia: Don't brawl him in the open. Smoke, then strike.",
    mall: "Nia: Vitrine hired a wire of her own. It is worse than mine.",
    vent: "Nia: Lens on. The sealed door is a Choir drop.",
    court: "Nia: Register launders Choir cash through the fryers.",
    school: "Nia: Brick, your captain is on my tape.",
    gym: "Nia: Roe charges like a truck. Let him. Then cut the channel.",
    circuit: "Nia: This signal is Vale. I've been jamming it for a year.",
    sanctum: "Nia: Wren, if I drop, keep the wire up. Vale does not leave.",
    warehouse: "Nia: Nail radios Hook every time a crate moves.",
    relay: "Nia: Static stole my tower. I want the channel back.",
  },
};

export const BOSS_LINES: Record<string, Record<string, string>> = {
  Vex: {
    reed: "Vex: You ran, Reed. The block didn't.",
    mara: "Vex: Rat-friend. You don't get to walk my street.",
    brick: "Vex: Big body. Slow radio.",
    nia: "Vex: Turn that wire off or I break it.",
  },
  Hook: {
    reed: "Hook: I fed you. This is the bill.",
    mara: "Hook: Pretty runaway. Crates don't care.",
    brick: "Hook: Come inside the swing, boy.",
    nia: "Hook: I hear your agent in the walls.",
  },
  Vitrine: {
    reed: "Vitrine: Mara sent you. She still hides.",
    mara: "Vitrine: Sister. The glass was always mine.",
    brick: "Vitrine: You don't belong in my mall.",
    nia: "Vitrine: Your wire is loud in my atrium.",
  },
  Register: {
    reed: "Register: Cash on the counter or blood.",
    mara: "Register: Your tab is still open.",
    brick: "Register: I don't do tabs.",
    nia: "Register: Choir money smells like oil.",
  },
  Roe: {
    reed: "Roe: Brick's pet rat.",
    mara: "Roe: The girl who stole my captain.",
    brick: "Roe: Captain. You are late for practice.",
    nia: "Roe: I have your payouts, coach.",
  },
  Vale: {
    reed: "Vale: The defector, the runaway, the captain, the wire. Cute.",
    mara: "Vale: Your sister already sang for me.",
    brick: "Vale: Kneel, linebacker.",
    nia: "Vale: Wren can't save you in here.",
  },
  Nail: {
    reed: "Nail: Vex said you'd come back hungry.",
    mara: "Nail: Crates don't care who your sister is.",
    brick: "Nail: Big man. Small aisle.",
    nia: "Nail: I hear your agent on the dock band.",
  },
  Static: {
    reed: "Static: Nia's pet rat.",
    mara: "Static: The runaway doesn't get a channel.",
    brick: "Static: You can't tackle a frequency.",
    nia: "Static: This tower sings for Vale now.",
  },
};

export function roomLine(charId: string, room: RoomId) {
  return ROOM_LINES[charId]?.[room] ?? ROOM_LINES.reed[room] ?? "";
}

export function bossLine(charId: string, boss: string) {
  return BOSS_LINES[boss]?.[charId] ?? BOSS_LINES[boss]?.reed ?? "";
}

export const ENEMY_AGENTS = ["Sable", "Pike", "Quill", "Hex", "Moth", "Lark"];
