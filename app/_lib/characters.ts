export type Position = "GK" | "DF" | "MD" | "FW";
export type SquadStatus = "Starter" | "Bench";

export interface Character {
  number: number;
  name: string;
  position: Position;
  positionFull: string;
  squadStatus: SquadStatus;
  priority: number;
  avatar: string;
  /** Tailwind text color class for accent */
  accentColor: string;
  /** Hex color for card glow / shadow */
  glowColor: string;
}

const POSITIONS: Record<Position, string> = {
  GK: "Goalkeeper",
  DF: "Defender",
  MD: "Midfielder",
  FW: "Forward",
};

function avatar(position: Position, number: number, name: string): string {
  const paddedNumber = String(number).padStart(2, "0");
  const fileName = `${position}_${paddedNumber}_${name.replace(/\s+/g, "_")}.webp`;
  return `/ava-tcg/${fileName}`;
}

// ─── Starter roster (Priority 1) ─────────────────────────────
const starters: Character[] = [
  { number: 1,  name: "Dog",       position: "GK", positionFull: POSITIONS.GK, squadStatus: "Starter", priority: 1,  avatar: avatar("GK", 1, "Dog"),       accentColor: "text-gold",   glowColor: "#dba111" },
  { number: 3,  name: "Shark",     position: "DF", positionFull: POSITIONS.DF, squadStatus: "Starter", priority: 2,  avatar: avatar("DF", 3, "Shark"),     accentColor: "text-purple", glowColor: "#034694" },
  { number: 6,  name: "Rhino",     position: "DF", positionFull: POSITIONS.DF, squadStatus: "Starter", priority: 3,  avatar: avatar("DF", 6, "Rhino"),     accentColor: "text-purple", glowColor: "#034694" },
  { number: 4,  name: "Giraffe",   position: "MD", positionFull: POSITIONS.MD, squadStatus: "Starter", priority: 4,  avatar: avatar("MD", 4, "Giraffe"),   accentColor: "text-cyan",   glowColor: "#dba111" },
  { number: 8,  name: "Wolf",      position: "MD", positionFull: POSITIONS.MD, squadStatus: "Starter", priority: 5,  avatar: avatar("MD", 8, "Wolf"),      accentColor: "text-cyan",   glowColor: "#dba111" },
  { number: 11, name: "Black Cat", position: "MD", positionFull: POSITIONS.MD, squadStatus: "Starter", priority: 6,  avatar: avatar("MD", 11, "Black_Cat"),accentColor: "text-cyan",   glowColor: "#dba111" },
  { number: 17, name: "Monkey",    position: "MD", positionFull: POSITIONS.MD, squadStatus: "Starter", priority: 7,  avatar: avatar("MD", 17, "Monkey"),   accentColor: "text-cyan",   glowColor: "#dba111" },
  { number: 5,  name: "Fox",       position: "FW", positionFull: POSITIONS.FW, squadStatus: "Starter", priority: 8,  avatar: avatar("FW", 5, "Fox"),       accentColor: "text-rose",   glowColor: "#ed1c24" },
  { number: 7,  name: "Lion",      position: "FW", positionFull: POSITIONS.FW, squadStatus: "Starter", priority: 9,  avatar: avatar("FW", 7, "Lion"),      accentColor: "text-rose",   glowColor: "#ed1c24" },
  { number: 9,  name: "Bull",      position: "FW", positionFull: POSITIONS.FW, squadStatus: "Starter", priority: 10, avatar: avatar("FW", 9, "Bull"),      accentColor: "text-rose",   glowColor: "#ed1c24" },
  { number: 10, name: "Eagle",     position: "FW", positionFull: POSITIONS.FW, squadStatus: "Starter", priority: 11, avatar: avatar("FW", 10, "Eagle"),    accentColor: "text-rose",   glowColor: "#ed1c24" },
];

// ─── Bench roster (Priority 2) ───────────────────────────────
const bench: Character[] = [
  { number: 12, name: "Bear",      position: "GK", positionFull: POSITIONS.GK, squadStatus: "Bench", priority: 1, avatar: avatar("GK", 12, "Bear"),      accentColor: "text-gold",   glowColor: "#dba111" },
  { number: 16, name: "Crocodile", position: "DF", positionFull: POSITIONS.DF, squadStatus: "Bench", priority: 2, avatar: avatar("DF", 16, "Crocodile"), accentColor: "text-purple", glowColor: "#034694" },
  { number: 19, name: "Panther",   position: "DF", positionFull: POSITIONS.DF, squadStatus: "Bench", priority: 3, avatar: avatar("DF", 19, "Panther"),   accentColor: "text-purple", glowColor: "#034694" },
  { number: 14, name: "Deer",      position: "MD", positionFull: POSITIONS.MD, squadStatus: "Bench", priority: 4, avatar: avatar("MD", 14, "Deer"),      accentColor: "text-cyan",   glowColor: "#dba111" },
  { number: 15, name: "Otter",     position: "MD", positionFull: POSITIONS.MD, squadStatus: "Bench", priority: 5, avatar: avatar("MD", 15, "Otter"),     accentColor: "text-cyan",   glowColor: "#dba111" },
  { number: 18, name: "Gorilla",   position: "DF", positionFull: POSITIONS.DF, squadStatus: "Bench", priority: 6, avatar: avatar("DF", 18, "Gorilla"),   accentColor: "text-purple", glowColor: "#034694" },
  { number: 21, name: "Elephant",  position: "DF", positionFull: POSITIONS.DF, squadStatus: "Bench", priority: 7, avatar: avatar("DF", 21, "Elephant"),  accentColor: "text-purple", glowColor: "#034694" },
  { number: 20, name: "Boar",      position: "DF", positionFull: POSITIONS.DF, squadStatus: "Bench", priority: 8, avatar: avatar("DF", 20, "Boar"),      accentColor: "text-purple", glowColor: "#034694" },
  { number: 13, name: "Owl",       position: "GK", positionFull: POSITIONS.GK, squadStatus: "Bench", priority: 9, avatar: avatar("GK", 13, "Owl"),       accentColor: "text-gold",   glowColor: "#dba111" },
];

export const ROSTER: Character[] = [...starters, ...bench];

export const STARTERS = starters.sort((a, b) => a.priority - b.priority);
export const BENCH_PLAYERS = bench.sort((a, b) => a.priority - b.priority);

// ─── Lookup helpers ──────────────────────────────────────────

export function characterByNumber(number: number): Character | undefined {
  return ROSTER.find((c) => c.number === number);
}

export function characterByName(name: string): Character | undefined {
  const lower = name.toLowerCase();
  return ROSTER.find((c) => c.name.toLowerCase() === lower);
}

export function characterById(id: number): Character | undefined {
  return characterByNumber(id);
}

/**
 * Get starter characters grouped by position, sorted by priority.
 * Used for formation layouts.
 */
export function startersByPosition(position: Position): Character[] {
  return STARTERS.filter((c) => c.position === position);
}

/**
 * Get all starter characters for a formation, ordered by priority.
 * Returns the 11 starting lineup characters.
 */
export function starterFormation(): Character[] {
  return STARTERS.slice().sort((a, b) => a.priority - b.priority);
}

/**
 * Get bench characters, ordered by bench priority.
 */
export function benchRoster(): Character[] {
  return BENCH_PLAYERS.slice().sort((a, b) => a.priority - b.priority);
}

// ─── Position-based avatar assignment ────────────────────────
// Characters grouped by position, sorted by priority (starters first).
const BY_POSITION: Record<Position, Character[]> = {
  GK: ROSTER.filter((c) => c.position === "GK").sort((a, b) => a.priority - b.priority),
  DF: ROSTER.filter((c) => c.position === "DF").sort((a, b) => a.priority - b.priority),
  MD: ROSTER.filter((c) => c.position === "MD").sort((a, b) => a.priority - b.priority),
  FW: ROSTER.filter((c) => c.position === "FW").sort((a, b) => a.priority - b.priority),
};

/**
 * Convert a player's position string to our Position enum.
 * Handles "Goalkeeper", "Defender", "Midfielder", "Forward",
 * positionId (1-4), and position codes (GK, DF, MD, FW, RB, CB, etc.).
 */
function toPosition(player: {
  position: string | null;
  positionId?: number | null;
  positionCode?: string | null;
}): Position | null {
  if (player.positionCode) {
    const code = player.positionCode.toUpperCase();
    if (code === "GK") return "GK";
    if (["DF", "LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(code)) return "DF";
    if (["MD", "DM", "LDM", "CDM", "RDM", "LM", "LCM", "CM", "RCM", "RM", "LAM", "CAM", "RAM"].includes(code)) return "MD";
    if (["FW", "LW", "LF", "SS", "CF", "ST", "RF", "RW", "LST", "RST"].includes(code)) return "FW";
  }
  if (player.positionId) {
    switch (player.positionId) {
      // Demo/local IDs
      case 1: return "GK";
      case 2: return "DF";
      case 3: return "MD";
      case 4: return "FW";
      // TxODDS lineup position IDs used by the Soccit backend
      case 34: return "GK";
      case 35: return "DF";
      case 36: return "MD";
      case 37: return "FW";
    }
  }
  if (player.position) {
    const pos = player.position.toLowerCase();
    if (pos.includes("goal")) return "GK";
    if (pos.includes("def")) return "DF";
    if (pos.includes("mid")) return "MD";
    if (pos.includes("for") || pos.includes("att") || pos.includes("wing") || pos.includes("striker")) return "FW";
  }
  return null;
}

/**
 * Assign character avatars to a list of players based on position and priority.
 *
 * - Players prefer characters from the same position group.
 * - Starters get first pick, followed by substitutes.
 * - If a position pool is exhausted, the next unused global character is used.
 * - Once all 20 characters are assigned, callers render an initials fallback.
 * - A `seedOffset` rotates the starting index (use 0 for team 1, 3 for team 2)
 *   so both teams don't get the same characters.
 *
 * Returns a map of playerId → avatar image path.
 */
export function assignAvatars(
  players: Array<{
    id: number;
    position: string | null;
    positionId?: number | null;
    positionCode?: string | null;
    starter?: boolean;
  }>,
  seedOffset = 0,
): Map<number, string> {
  const result = new Map<number, string>();
  const used = new Set<string>();
  const rotation = ((seedOffset % ROSTER.length) + ROSTER.length) % ROSTER.length;
  const globalPool = [...ROSTER.slice(rotation), ...ROSTER.slice(0, rotation)];

  // Sort: starters first, then subs
  const sorted = [...players].sort((a, b) => {
    if (a.starter && !b.starter) return -1;
    if (!a.starter && b.starter) return 1;
    return 0;
  });

  for (const player of sorted) {
    const pos = toPosition(player);
    const preferred = pos ? BY_POSITION[pos] : [];
    const preferredRotation = preferred.length
      ? ((seedOffset % preferred.length) + preferred.length) % preferred.length
      : 0;
    const preferredPool = [
      ...preferred.slice(preferredRotation),
      ...preferred.slice(0, preferredRotation),
    ];

    // Prefer a matching position, then borrow any unused character. Never wrap
    // and silently duplicate an avatar. A real World Cup squad can exceed the
    // 20 available characters; those overflow players use an initials fallback.
    const character = [...preferredPool, ...globalPool].find(
      (candidate) => !used.has(candidate.avatar),
    );
    if (!character) continue;

    used.add(character.avatar);
    result.set(player.id, character.avatar);
  }

  return result;
}

/**
 * Get a single avatar for a player based on position and a deterministic seed.
 * Useful when you don't have the full team context (e.g. a standalone card).
 */
export function avatarForPlayer(
  player: {
    id: number;
    position: string | null;
    positionId?: number | null;
    positionCode?: string | null;
    starter?: boolean;
  },
  seedOffset = 0,
): string | null {
  const pos = toPosition(player);
  if (!pos) return null;

  const pool = BY_POSITION[pos];
  if (pool.length === 0) return null;

  // Use player.id as a deterministic seed
  const idx = (Math.abs(player.id) + seedOffset) % pool.length;
  return pool[idx].avatar;
}

// ─── Demo lineup generation ──────────────────────────────────
// 4-3-3 formation grid positions for starters
const FORMATION_433: Array<{ pos: Position; code: string; gridX: number; gridY: number; positionId: number }> = [
  { pos: "GK", code: "GK",  gridX: 50, gridY: 82, positionId: 1 },
  { pos: "DF", code: "RB",  gridX: 83, gridY: 70, positionId: 2 },
  { pos: "DF", code: "RCB", gridX: 65, gridY: 76, positionId: 2 },
  { pos: "DF", code: "LCB", gridX: 35, gridY: 76, positionId: 2 },
  { pos: "DF", code: "LB",  gridX: 17, gridY: 70, positionId: 2 },
  { pos: "MD", code: "CDM", gridX: 50, gridY: 58, positionId: 3 },
  { pos: "MD", code: "RCM", gridX: 64, gridY: 42, positionId: 3 },
  { pos: "MD", code: "LCM", gridX: 36, gridY: 42, positionId: 3 },
  { pos: "FW", code: "RW",  gridX: 80, gridY: 32, positionId: 4 },
  { pos: "FW", code: "ST",  gridX: 50, gridY: 16, positionId: 4 },
  { pos: "FW", code: "LW",  gridX: 20, gridY: 32, positionId: 4 },
];

// 4-2-3-1 formation grid positions (dual pivot + attacking mid)
const FORMATION_4231: Array<{ pos: Position; code: string; gridX: number; gridY: number; positionId: number }> = [
  { pos: "GK", code: "GK",  gridX: 50, gridY: 82, positionId: 1 },
  { pos: "DF", code: "RB",  gridX: 83, gridY: 70, positionId: 2 },
  { pos: "DF", code: "RCB", gridX: 65, gridY: 76, positionId: 2 },
  { pos: "DF", code: "LCB", gridX: 35, gridY: 76, positionId: 2 },
  { pos: "DF", code: "LB",  gridX: 17, gridY: 70, positionId: 2 },
  { pos: "MD", code: "RDM", gridX: 62, gridY: 58, positionId: 3 },
  { pos: "MD", code: "LDM", gridX: 38, gridY: 58, positionId: 3 },
  { pos: "MD", code: "CAM", gridX: 50, gridY: 40, positionId: 3 },
  { pos: "FW", code: "RW",  gridX: 80, gridY: 28, positionId: 4 },
  { pos: "FW", code: "ST",  gridX: 50, gridY: 12, positionId: 4 },
  { pos: "FW", code: "LW",  gridX: 20, gridY: 28, positionId: 4 },
];

const POSITION_NAME: Record<number, string> = {
  1: "Goalkeeper",
  2: "Defender",
  3: "Midfielder",
  4: "Forward",
};

export interface DemoPlayer {
  id: number;
  name: string;
  number: string;
  starter: boolean;
  positionId: number;
  position: string;
  positionCode: string;
  gridX: number;
  gridY: number;
  onPitch: boolean;
}

export interface DemoTeam {
  side: 1 | 2;
  teamId: number;
  teamName: string;
  formation: string;
  players: DemoPlayer[];
}

type FormationSlot = { pos: Position; code: string; gridX: number; gridY: number; positionId: number };

/**
 * Build a demo team from a real-world national team roster.
 * Maps the 11 starters into the given formation + up to 6 bench subs.
 */
function buildRealDemoTeam(
  side: 1 | 2,
  teamId: number,
  teamName: string,
  formation: string,
  formationSlots: FormationSlot[],
  starters: Array<{ id: number; name: string; number: string; positionId: number; position: string; positionCode: string }>,
  bench: Array<{ id: number; name: string; number: string; positionId: number; position: string }>,
): DemoTeam {
  const starterPlayers: DemoPlayer[] = formationSlots.map((slot, i) => {
    const p = starters[i];
    return {
      id: p.id,
      name: p.name,
      number: p.number,
      starter: true,
      positionId: slot.positionId,
      position: POSITION_NAME[slot.positionId] ?? p.position,
      positionCode: slot.code,
      gridX: slot.gridX,
      gridY: slot.gridY,
      onPitch: true,
    };
  });

  const benchCount = Math.min(6, bench.length);
  const subs: DemoPlayer[] = Array.from({ length: benchCount }, (_, i) => {
    const p = bench[i];
    return {
      id: p.id,
      name: p.name,
      number: p.number,
      starter: false,
      positionId: p.positionId,
      position: p.position,
      positionCode: "",
      gridX: 0,
      gridY: 0,
      onPitch: false,
    };
  });

  return {
    side,
    teamId,
    teamName,
    formation,
    players: [...starterPlayers, ...subs],
  };
}

// ─── France — World Cup 2026 starting XI (4-2-3-1) ───────────
// Source: en.wikipedia.org/wiki/2026_FIFA_World_Cup (squad + QF v Morocco)
// Deschamps' dual pivot (Tchouaméni + Koné), Olise as #10, Dembélé-Mbappé-Barcola front three
const FRANCE_STARTERS = [
  { id: 16, name: "Mike Maignan",        number: "16", positionId: 1, position: "Goalkeeper", positionCode: "GK" },
  { id: 5,  name: "Jules Koundé",        number: "5",  positionId: 2, position: "Defender",   positionCode: "RB" },
  { id: 17, name: "William Saliba",      number: "17", positionId: 2, position: "Defender",   positionCode: "RCB" },
  { id: 4,  name: "Dayot Upamecano",     number: "4",  positionId: 2, position: "Defender",   positionCode: "LCB" },
  { id: 19, name: "Théo Hernandez",      number: "19", positionId: 2, position: "Defender",   positionCode: "LB" },
  { id: 8,  name: "Aurélien Tchouaméni", number: "8",  positionId: 3, position: "Midfielder", positionCode: "RDM" },
  { id: 6,  name: "Manu Koné",           number: "6",  positionId: 3, position: "Midfielder", positionCode: "LDM" },
  { id: 11, name: "Michael Olise",       number: "11", positionId: 3, position: "Midfielder", positionCode: "CAM" },
  { id: 7,  name: "Ousmane Dembélé",     number: "7",  positionId: 4, position: "Forward",    positionCode: "RW" },
  { id: 10, name: "Kylian Mbappé",       number: "10", positionId: 4, position: "Forward",    positionCode: "ST" },
  { id: 12, name: "Bradley Barcola",     number: "12", positionId: 4, position: "Forward",    positionCode: "LW" },
];

const FRANCE_BENCH = [
  { id: 1,  name: "Brice Samba",        number: "1",  positionId: 1, position: "Goalkeeper" },
  { id: 15, name: "Ibrahima Konaté",   number: "15", positionId: 2, position: "Defender" },
  { id: 3,  name: "Lucas Digne",        number: "3",  positionId: 2, position: "Defender" },
  { id: 13, name: "N'Golo Kanté",       number: "13", positionId: 3, position: "Midfielder" },
  { id: 18, name: "Warren Zaïre-Emery", number: "18", positionId: 3, position: "Midfielder" },
  { id: 9,  name: "Marcus Thuram",      number: "9",  positionId: 4, position: "Forward" },
  { id: 20, name: "Désiré Doué",        number: "20", positionId: 4, position: "Forward" },
];

// ─── Argentina — World Cup 2026 starting XI (4-3-3) ──────────
// Source: en.wikipedia.org/wiki/2026_FIFA_World_Cup (squad + QF v Switzerland)
const ARGENTINA_STARTERS = [
  { id: 23, name: "Emiliano Martínez",  number: "23", positionId: 1, position: "Goalkeeper", positionCode: "GK" },
  { id: 26, name: "Nahuel Molina",      number: "26", positionId: 2, position: "Defender",   positionCode: "RB" },
  { id: 13, name: "Cristian Romero",    number: "13", positionId: 2, position: "Defender",   positionCode: "RCB" },
  { id: 6,  name: "Lisandro Martínez",  number: "6",  positionId: 2, position: "Defender",   positionCode: "LCB" },
  { id: 3,  name: "Nicolás Tagliafico", number: "3",  positionId: 2, position: "Defender",   positionCode: "LB" },
  { id: 24, name: "Enzo Fernández",     number: "24", positionId: 3, position: "Midfielder", positionCode: "CDM" },
  { id: 20, name: "Alexis Mac Allister",number: "20", positionId: 3, position: "Midfielder", positionCode: "RCM" },
  { id: 11, name: "Giovani Lo Celso",   number: "11", positionId: 3, position: "Midfielder", positionCode: "LCM" },
  { id: 10, name: "Lionel Messi",       number: "10", positionId: 4, position: "Forward",    positionCode: "RW" },
  { id: 9,  name: "Julián Álvarez",     number: "9",  positionId: 4, position: "Forward",    positionCode: "ST" },
  { id: 22, name: "Lautaro Martínez",   number: "22", positionId: 4, position: "Forward",    positionCode: "LW" },
];

const ARGENTINA_BENCH = [
  { id: 1,  name: "Juan Musso",         number: "1",  positionId: 1, position: "Goalkeeper" },
  { id: 2,  name: "Marcos Senesi",      number: "2",  positionId: 2, position: "Defender" },
  { id: 4,  name: "Gonzalo Montiel",    number: "4",  positionId: 2, position: "Defender" },
  { id: 7,  name: "Rodrigo De Paul",    number: "7",  positionId: 3, position: "Midfielder" },
  { id: 5,  name: "Leandro Paredes",    number: "5",  positionId: 3, position: "Midfielder" },
  { id: 16, name: "Thiago Almada",      number: "16", positionId: 4, position: "Forward" },
  { id: 18, name: "Nico Paz",           number: "18", positionId: 4, position: "Forward" },
];

/**
 * Generate a full demo lineup with two real national teams.
 * France (side 1) vs Argentina (side 2) — World Cup 2026 Final.
 */
export function demoLineup(fixtureId = 999999): {
  fixtureId: number;
  updatedAt: number;
  teams: DemoTeam[];
  names: Record<string, string>;
} {
  return {
    fixtureId,
    updatedAt: Date.now(),
    teams: [
      buildRealDemoTeam(1, 101, "France", "4-2-3-1", FORMATION_4231, FRANCE_STARTERS, FRANCE_BENCH),
      buildRealDemoTeam(2, 202, "Argentina", "4-3-3", FORMATION_433, ARGENTINA_STARTERS, ARGENTINA_BENCH),
    ],
    names: {},
  };
}
