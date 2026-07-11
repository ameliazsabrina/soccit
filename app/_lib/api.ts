export const SOCCIT_API_BASE_URL = "https://13.213.196.237.sslip.io";

// Fallback/demo fixture for local testing. In production the frontend should
// discover matches via `GET /api/matches` and use each row's `pda` and
// `fixtureId`. These constants remain only for the demo path and hardcoded
// reference examples.
export const SOCCIT_SEED_FIXTURE_ID = 900001;
export const SOCCIT_SEED_MATCH_PDA =
  "CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq";
export const SOCCIT_PROGRAM_ID = "TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v";
export const SOCCIT_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export type AvatarId =
  | "avatar-0"
  | "avatar-1"
  | "avatar-2"
  | "avatar-3"
  | "avatar-4"
  | "avatar-5"
  | "avatar-6"
  | "avatar-7"
  | "avatar-8"
  | "avatar-9"
  | "avatar-10"
  | "avatar-11";

export type AvatarDescriptor = {
  id: AvatarId;
  src: string;
};

export type Score = { team1: number; team2: number };

export type ResolvedPlayer = {
  id: number;
  name: string;
  number: string | null;
  positionId: number | null;
  position: string | null;
  side: 1 | 2;
};

// Authoritative match phase computed server-side (services/api phase.ts).
// Single source of truth for UPCOMING vs LIVE — never re-derive it from `live`.
// UPCOMING → announced (keeper), kickoff still >10min away, entries not open yet.
// OPEN     → within the KO−10min entry window (prediction/prepare returns 200).
// LIVE     → feed in-play (statusId ∈ {2,3,4}); `live` is non-null only in this phase.
export type MatchPhase = "UPCOMING" | "OPEN" | "LIVE" | "RESOLVED" | "SETTLED";

export type MatchSummary = {
  pda: string;
  fixtureId: number;
  featured: boolean;
  phase: MatchPhase;
  onchain: {
    status: number;
    statusLabel: "OPEN" | "RESOLVED" | "SETTLED" | "UNKNOWN";
    settled: boolean;
    entryFee: string;
    poolTotal: string;
    participantCount: number;
    startTime: number; // unix SECONDS; 0 = no entry gate
    team1Id: number;
    team2Id: number;
    usdcMint: string;
    winners: [string | null, string | null, string | null];
  };
  // Non-null only when phase === "LIVE" (backend nulls a stale pre-kickoff ts).
  live: null | {
    statusId: number | null;
    minute: number | null;
    goals: Score;
    ts: number | null;
  };
  // Definitive full-time result. Populated once the match is terminal
  // (FINISHED/RESOLVED/SETTLED) and survives after `live` goes null; null while
  // UPCOMING/OPEN/LIVE. Never set at the same time as `live` — read the running
  // score from `live.goals` and the final score from here. Use `displayScore`.
  finalScore: Score | null;
  teamNames: null | { team1: string | null; team2: string | null };
};

export type MatchState = {
  fixtureId: number;
  // Nullable for a live-only fixture with no on-chain account yet. Optional so
  // demo/seed fixtures without a phase stay valid; real API responses set it.
  phase?: MatchPhase | null;
  onchain: null | {
    status: number;
    statusLabel: "OPEN" | "RESOLVED" | "SETTLED" | "UNKNOWN";
    settled: boolean;
    entryFee: string;
    poolTotal: string;
    participantCount: number;
    startTime?: number; // unix SECONDS; 0 = no entry gate
    team1Id: number;
    team2Id: number;
    usdcMint: string;
    winners: [string | null, string | null, string | null];
  };
  // Non-null only when phase === "LIVE".
  live: null | {
    statusId: number | null;
    minute: number | null;
    goals: Score;
    ts: number | null;
  };
  // Definitive full-time result; see MatchSummary.finalScore. Optional so demo/
  // seed fixtures without it stay valid; real API responses always include it.
  finalScore?: Score | null;
  updatedAt: number;
};

export type PredictionKind = 0 | 1 | 2 | 3;

export type PredictionScore = { score1: number; score2: number };

export type LeaderboardPrediction = {
  kind: PredictionKind;
  points: number;
  side: 0 | 1 | 2;
  outPlayerId: number;
  inPlayerId: number;
  players: {
    out: ResolvedPlayer | null;
    in: ResolvedPlayer | null;
  };
  score: PredictionScore | null;
};

export type Leaderboard = {
  fixtureId: number;
  updatedAt: number;
  final: boolean;
  winners: [string | null, string | null, string | null];
  ranking: Array<{
    owner: string;
    points: number;
    earliestScoringLockMinute: number | null;
    user: null | { username: string; avatar: AvatarId | null };
    predictions: LeaderboardPrediction[];
  }>;
};

export type Lineup = {
  fixtureId: number;
  updatedAt: number;
  teams: Array<{
    side: 1 | 2;
    teamId: number;
    teamName: string | null;
    formation?: string | null;
    players: Array<{
      id: number;
      name: string;
      number: string | null;
      starter: boolean;
      positionId: number | null;
      position: string | null;
      positionCode?: string | null;
      gridX?: number | null;
      gridY?: number | null;
      onPitch?: boolean | null;
      warmingUp?: boolean | null;
    }>;
  }>;
  names: Record<string, string>;
};

export type EventEntry = {
  id: string;
  type: string;
  payload: unknown;
  players?: {
    out: ResolvedPlayer | null;
    in: ResolvedPlayer | null;
  };
};

export type UserProfile = {
  wallet: string;
  username: string;
  avatar: AvatarId | null;
  createdAt: number;
};

export type UserMatchPrediction = {
  kind: PredictionKind;
  points: number;
  side: 0 | 1 | 2;
  outPlayerId: number;
  inPlayerId: number;
  score: PredictionScore | null;
};

export type UserMatch = {
  wallet: string;
  fixtureId: number;
  points: number;
  final: boolean;
  rank: number | null;
  predictions: UserMatchPrediction[];
};

// ---- Portfolio (USDC balance + active positions) -------------------------
// GET /api/user/:wallet/portfolio. Every monetary field is a USDC base-unit
// string (BigInt-safe) — format with `formatUsdcAmount`, never float-math the
// raw strings. There is deliberately no 24h-change field (no historical
// snapshots exist), so don't derive a fake delta client-side.

// The portfolio feed can report a mid-lifecycle FINISHED phase that the lighter
// MatchSummary shape collapses away, so keep it as its own union.
export type PortfolioPhase =
  | "UPCOMING"
  | "OPEN"
  | "LIVE"
  | "FINISHED"
  | "RESOLVED"
  | "SETTLED";

export type PortfolioPosition = {
  pda: string;
  fixtureId: number;
  status: number;
  statusLabel: "OPEN" | "RESOLVED";
  entryFee: string; // USDC base units
  side: number;
  slotsUsed: number;
  team1Id: number;
  team2Id: number;
  startTime: number; // unix SECONDS
  phase: PortfolioPhase;
  // Non-null only while the fixture is in-play (mirrors MatchSummary.live).
  live: null | {
    statusId: number | null;
    minute: number | null;
    goals: Score;
    ts: number | null;
  };
};

export type Portfolio = {
  wallet: string;
  usdcMint: string | null;
  usdcBalance: string; // base units
  lockedStake: string; // Σ entry fees across active positions
  portfolioValue: string; // usdcBalance + lockedStake — the headline number
  usdcDecimals: number; // 6
  activeCount: number;
  positions: PortfolioPosition[];
  updatedAt: number;
};

export function getPortfolio(wallet: string) {
  return apiJson<Portfolio>(`/api/user/${wallet}/portfolio`);
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${SOCCIT_API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    clearTimeout(timeout);
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.error ?? `Request failed with ${response.status}`);
    }

    return body as T;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. The backend may be unreachable.");
    }
    throw err;
  }
}

export function getMatches() {
  return apiJson<MatchSummary[]>("/api/matches");
}

export function getMatch(pda: string) {
  return apiJson<MatchState>(`/api/match/${pda}`);
}

export function getLineup(pda: string) {
  return apiJson<Lineup>(`/api/lineup/${pda}`);
}

export function getLeaderboard(pda: string) {
  return apiJson<Leaderboard>(`/api/leaderboard/${pda}`);
}

export function getUser(wallet: string) {
  return apiJson<UserProfile>(`/api/user/${wallet}`);
}

export function getUserMatches(wallet: string) {
  return apiJson<UserMatch[]>(`/api/user/${wallet}/matches`);
}

export function getAvatars() {
  return apiJson<AvatarDescriptor[]>("/api/avatars");
}

// ---- World Cup 2026 bracket ------------------------------------------------

export type WorldCupMatch = {
  id: string;
  round: "group" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  date: string | null;
  venue: string | null;
  winner: "home" | "away" | "draw" | null;
};

export type WorldCupGroup = {
  name: string;
  teams: Array<{
    name: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    points: number;
  }>;
};

export type WorldCupBracket = {
  updatedAt: number;
  groups: WorldCupGroup[];
  knockout: WorldCupMatch[];
};

export function getWorldCupBracket() {
  return apiJson<WorldCupBracket>("/api/events/bracket");
}

// ---- Session auth (off-chain profile edits) ------------------------------
// A one-time signed message is exchanged for a short-lived JWT; avatar/username
// edits then authorize with `Authorization: Bearer <token>` (no per-edit popup).

export type SessionResponse = { token: string; expiresAt: number };

export function createSession(input: {
  wallet: string;
  message: string;
  signature: string;
}) {
  return apiJson<SessionResponse>("/api/auth/session", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Registration response: the profile plus an immediate session (when enabled). */
export type RegisterResponse = UserProfile & {
  session: SessionResponse | null;
};

export function createUserProfile(input: {
  wallet: string;
  username: string;
  avatar?: AvatarId;
  message: string;
  signature: string;
}) {
  return apiJson<RegisterResponse>("/api/user", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAvatar(input: {
  wallet: string;
  avatar: AvatarId;
  token: string;
}) {
  return apiJson<UserProfile>(`/api/user/${input.wallet}/avatar`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${input.token}` },
    body: JSON.stringify({ avatar: input.avatar }),
  });
}

export function updateUsername(input: {
  wallet: string;
  username: string;
  token: string;
}) {
  return apiJson<UserProfile>(`/api/user/${input.wallet}/username`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${input.token}` },
    body: JSON.stringify({ username: input.username }),
  });
}

// ---- Prediction prepare (on-chain submission) ----------------------------
// Builds the unsigned "place a prediction" transaction. The frontend deserializes
// the base64 tx, signs it with the wallet adapter, and submits it client-side
// via `connection.sendRawTransaction`. There is no `/submit` endpoint.

export type PreparePredictionInput = {
  wallet: string; // base58 signer wallet; becomes tx fee payer
  fixtureId: number; // from GET /api/matches row.fixtureId
  outPlayerId: number; // starter going out (0 when unused) OR team1 goals for kind 3
  inPlayerId: number; // sub coming in (0 when unused) OR team2 goals for kind 3
  lockMinute: number; // match minute the prediction locks at
  side: 0 | 1 | 2; // 1=home, 2=away for sub picks; 0 for score pick
  kind: PredictionKind; // 0=OUT, 1=IN, 2=COMBO, 3=SCORE
};

export type PreparePredictionOutput = {
  transaction: string; // base64 serialized unsigned legacy Solana tx
  fixtureId: number;
  prediction: string; // prediction-account PDA (base58)
  matchAccount: string; // match-account PDA (base58) — canonical route id
  userUsdcAta: string; // user's USDC ATA (created idempotently by tx)
  usdcMint: string;
  entryFee: string; // USDC base units (6 dp)
  blockhash: string;
  lastValidBlockHeight: number;
};

export function preparePrediction(input: PreparePredictionInput) {
  return apiJson<PreparePredictionOutput>("/api/prediction/prepare", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useLeaderboardStream(
  pda: string,
  onUpdate: (data: Leaderboard) => void,
) {
  const url = `${SOCCIT_API_BASE_URL}/api/leaderboard/${pda}/stream`;
  const source = new EventSource(url);
  source.addEventListener("leaderboard", (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);
    } catch {
      // ignore malformed events
    }
  });
  return source;
}

// The events stream emits NAMED SSE events (event: goal|status|substitution|
// red_card), so we must addEventListener per type — `onmessage` only fires for
// unnamed ("message") events and would receive nothing.
export const MATCH_EVENT_TYPES = [
  "goal",
  "status",
  "substitution",
  "red_card",
] as const;

export function useMatchEventsStream(
  pda: string,
  onEvent: (entry: EventEntry) => void,
  fromId = "0-0",
) {
  const url = `${SOCCIT_API_BASE_URL}/api/events/${pda}?fromId=${fromId}`;
  const source = new EventSource(url);
  const handle = (event: MessageEvent) => {
    try {
      onEvent(JSON.parse(event.data));
    } catch {
      // ignore malformed events
    }
  };
  for (const type of MATCH_EVENT_TYPES) source.addEventListener(type, handle);
  return source;
}

export type SseStatus = "idle" | "connecting" | "open" | "error" | "closed";

// Keep this function outside React so components can call it imperatively if needed.
export function openMatchEventsStream(
  pda: string,
  handlers: {
    onEvent: (entry: EventEntry) => void;
    onStatus?: (status: SseStatus) => void;
    onError?: (message: string) => void;
  },
  fromId = "0-0",
) {
  const url = `${SOCCIT_API_BASE_URL}/api/events/${pda}?fromId=${fromId}`;
  const source = new EventSource(url);

  source.onopen = () => handlers.onStatus?.("open");

  // Server emits named events (goal/status/substitution/red_card); listen for
  // each — `onmessage` only fires for unnamed events and would stay silent.
  const handle = (event: MessageEvent) => {
    try {
      handlers.onEvent(JSON.parse(event.data) as EventEntry);
    } catch {
      // ignore malformed events
    }
  };
  for (const type of MATCH_EVENT_TYPES) source.addEventListener(type, handle);

  source.onerror = () => {
    // EventSource reconnects automatically unless the error is fatal.
    // We surface it as "error" so the UI can show a warning.
    handlers.onStatus?.("error");
    handlers.onError?.("Event stream encountered an error. Reconnecting…");
  };

  return source;
}

export function openLeaderboardStream(
  pda: string,
  handlers: {
    onUpdate: (data: Leaderboard) => void;
    onStatus?: (status: SseStatus) => void;
    onError?: (message: string) => void;
  },
) {
  const url = `${SOCCIT_API_BASE_URL}/api/leaderboard/${pda}/stream`;
  const source = new EventSource(url);

  source.onopen = () => handlers.onStatus?.("open");

  source.addEventListener("leaderboard", (event) => {
    try {
      const data: Leaderboard = JSON.parse(event.data);
      handlers.onUpdate(data);
    } catch {
      // ignore malformed events
    }
  });

  source.onerror = () => {
    handlers.onStatus?.("error");
    handlers.onError?.(
      "Leaderboard stream encountered an error. Reconnecting…",
    );
  };

  return source;
}

export function isValidPda(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function formatWallet(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatUsdc(lamports: string) {
  const n = Number(lamports);
  if (Number.isNaN(n)) return lamports;
  return (n / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a USDC base-unit amount for display, e.g. `("14093500000", 6)` →
 * `"14,093.50"`. BigInt-safe: no float math on the raw string, so large
 * balances never lose precision. Always renders 2 fraction digits with grouped
 * thousands. Invalid/empty input → `"--"`. Never emits a signed zero.
 */
export function formatUsdcAmount(base: string, decimals = 6): string {
  if (base == null) return "--";
  const negative = base.trim().startsWith("-");
  const digits = base.replace(/[^0-9]/g, "");
  if (digits === "") return "--";
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = decimals > 0 ? padded.slice(padded.length - decimals) : "";
  // Truncate (not round) to 2dp so a displayed balance never overstates funds.
  const cents = `${fraction}00`.slice(0, 2);
  const grouped = BigInt(whole).toLocaleString("en-US");
  const isZero = /^0+$/.test(digits);
  const sign = negative && !isZero ? "-" : "";
  return `${sign}${grouped}.${cents}`;
}

/** Prize pool after 20% platform fee is deducted. */
export function prizePoolAfterFee(poolTotal: string): number {
  const n = Number(poolTotal);
  if (Number.isNaN(n)) return 0;
  return n * 0.8;
}

/** Split prize pool among top 3: 50/30/20. Returns USDC base units. */
export function calculatePrizes(poolTotal: string): {
  first: number;
  second: number;
  third: number;
  total: number;
} {
  const pool = prizePoolAfterFee(poolTotal);
  return {
    first: pool * 0.5,
    second: pool * 0.3,
    third: pool * 0.2,
    total: pool,
  };
}

/**
 * The scoreline to display for a match, or `null` when there is none yet.
 *
 * LIVE     → running score from `live.goals`.
 * terminal → `finalScore` (FINISHED/RESOLVED/SETTLED); `live` is null by then.
 * UPCOMING/OPEN → `null` — render "vs"/kickoff, NEVER 0–0.
 *
 * `live` and `finalScore` are never both set, so preferring `live` is safe.
 * A terminal match can rarely return `finalScore: null` (feed never ingested);
 * that also yields `null` here and should render a neutral placeholder, not 0–0.
 */
export function displayScore(m: {
  live: { goals: Score } | null;
  finalScore?: Score | null;
}): Score | null {
  if (m.live) return m.live.goals;
  return m.finalScore ?? null;
}

export function predictionKindLabel(kind: PredictionKind): string {
  switch (kind) {
    case 0:
      return "Out";
    case 1:
      return "In";
    case 2:
      return "Combo";
    case 3:
      return "Score";
    default:
      return "Unknown";
  }
}

export function positionCode(
  position: string | null,
): "fw" | "md" | "df" | "gk" {
  if (!position) return "fw";
  const p = position.toLowerCase();
  if (p.includes("forward") || p.includes("striker") || p.includes("wing"))
    return "fw";
  if (p.includes("midfield") || p.includes("mid")) return "md";
  if (p.includes("defender") || p.includes("back")) return "df";
  if (p.includes("goal") || p.includes("keeper")) return "gk";
  return "fw";
}

export function playerRarity(
  rating?: number,
): "bronze" | "gold" | "iridescent" {
  const r = rating ?? 75;
  if (r >= 86) return "iridescent";
  if (r >= 80) return "gold";
  return "bronze";
}

export function tcgCardImage(position: string | null): string {
  const code = positionCode(position);
  return `/assets/cards/players/${code}.webp`;
}
