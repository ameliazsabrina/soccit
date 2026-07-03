export const SOCCIT_API_BASE_URL = "https://13.213.196.237.sslip.io";

// Fallback/demo fixture for local testing. In production the frontend should
// discover matches via `GET /api/matches` and use each row's `pda` and
// `fixtureId`. These constants remain only for the demo path and hardcoded
// reference examples.
export const SOCCIT_SEED_FIXTURE_ID = 900001;
export const SOCCIT_SEED_MATCH_PDA = "CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq";
export const SOCCIT_PROGRAM_ID = "TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v";
export const SOCCIT_USDC_MINT = "2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac";

export type AvatarId =
  | "avatar-1"
  | "avatar-2"
  | "avatar-3"
  | "avatar-4"
  | "avatar-5"
  | "avatar-6"
  | "avatar-7"
  | "avatar-8";

export type AvatarDescriptor = {
  id: AvatarId;
  src: string;
};

export type ResolvedPlayer = {
  id: number;
  name: string;
  number: string | null;
  positionId: number | null;
  position: string | null;
  side: 1 | 2;
};

export type MatchSummary = {
  pda: string;
  fixtureId: number;
  onchain: {
    status: number;
    statusLabel: "OPEN" | "RESOLVED" | "SETTLED" | "UNKNOWN";
    settled: boolean;
    entryFee: string;
    poolTotal: string;
    participantCount: number;
    team1Id: number;
    team2Id: number;
    usdcMint: string;
    winners: [string | null, string | null, string | null];
  };
  live: null | {
    statusId: number | null;
    minute: number | null;
    goals: { team1: number; team2: number };
    ts: number | null;
  };
  teamNames: null | { team1: string | null; team2: string | null };
};

export type MatchState = {
  fixtureId: number;
  onchain: null | {
    status: number;
    statusLabel: "OPEN" | "RESOLVED" | "SETTLED" | "UNKNOWN";
    settled: boolean;
    entryFee: string;
    poolTotal: string;
    participantCount: number;
    team1Id: number;
    team2Id: number;
    usdcMint: string;
    winners: [string | null, string | null, string | null];
  };
  live: null | {
    statusId: number | null;
    minute: number | null;
    goals: { team1: number; team2: number };
    ts: number | null;
  };
  updatedAt: number;
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
    predictions: Array<{
      kind: 0 | 1 | 2;
      points: number;
      side: 1 | 2;
      outPlayerId: number;
      inPlayerId: number;
      players: {
        out: ResolvedPlayer | null;
        in: ResolvedPlayer | null;
      };
    }>;
  }>;
};

export type Lineup = {
  fixtureId: number;
  updatedAt: number;
  teams: Array<{
    side: 1 | 2;
    teamId: number;
    teamName: string | null;
    players: Array<{
      id: number;
      name: string;
      number: string | null;
      starter: boolean;
      positionId: number | null;
      position: string | null;
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

export type UserMatch = {
  wallet: string;
  fixtureId: number;
  points: number;
  final: boolean;
  rank: number | null;
  predictions: Array<{
    kind: 0 | 1 | 2;
    points: number;
    side: 1 | 2;
    outPlayerId: number;
    inPlayerId: number;
  }>;
};

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SOCCIT_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed with ${response.status}`);
  }

  return body as T;
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

export function createUserProfile(input: {
  wallet: string;
  username: string;
  avatar?: AvatarId;
  message: string;
  signature: string;
}) {
  return apiJson<UserProfile>("/api/user", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---- Prediction prepare (on-chain submission) ----------------------------
// Builds the unsigned "place a prediction" transaction. The frontend deserializes
// the base64 tx, signs it with the wallet adapter, and submits it client-side
// via `connection.sendRawTransaction`. There is no `/submit` endpoint.

export type PredictionKind = 0 | 1 | 2; // 0=OUT, 1=IN, 2=COMBO(out+in)

export type PreparePredictionInput = {
  wallet: string;        // base58 signer wallet; becomes tx fee payer
  fixtureId: number;     // from GET /api/matches row.fixtureId
  outPlayerId: number;   // starter going out (0 when unused)
  inPlayerId: number;    // sub coming in (0 when unused)
  lockMinute: number;    // match minute the prediction locks at
  slotIndex: number;     // per-wallet prediction slot (0, 1, 2…)
  side: 1 | 2;           // 1=home, 2=away
  kind: PredictionKind;  // 0=OUT, 1=IN, 2=COMBO
};

export type PreparePredictionOutput = {
  transaction: string;          // base64 serialized unsigned legacy Solana tx
  fixtureId: number;
  prediction: string;           // prediction-account PDA (base58)
  matchAccount: string;         // match-account PDA (base58) — canonical route id
  userUsdcAta: string;          // user's USDC ATA (created idempotently by tx)
  usdcMint: string;
  entryFee: string;             // USDC base units (6 dp)
  blockhash: string;
  lastValidBlockHeight: number;
};

export function preparePrediction(input: PreparePredictionInput) {
  return apiJson<PreparePredictionOutput>("/api/prediction/prepare", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useLeaderboardStream(pda: string, onUpdate: (data: Leaderboard) => void) {
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

export function useMatchEventsStream(
  pda: string,
  onEvent: (entry: EventEntry) => void,
  fromId = "0-0"
) {
  const url = `${SOCCIT_API_BASE_URL}/api/events/${pda}?fromId=${fromId}`;
  const source = new EventSource(url);
  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch {
      // ignore malformed events
    }
  };
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
  fromId = "0-0"
) {
  const url = `${SOCCIT_API_BASE_URL}/api/events/${pda}?fromId=${fromId}`;
  const source = new EventSource(url);

  source.onopen = () => handlers.onStatus?.("open");

  source.onmessage = (event) => {
    try {
      const entry: EventEntry = JSON.parse(event.data);
      handlers.onEvent(entry);
    } catch {
      // ignore malformed events
    }
  };

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
  }
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
    handlers.onError?.("Leaderboard stream encountered an error. Reconnecting…");
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
