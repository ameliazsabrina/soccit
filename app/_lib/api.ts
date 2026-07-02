export const SOCCIT_API_BASE_URL = "https://13.213.196.237.sslip.io";

// The only fixture seeded in the backend that `POST /api/prediction/prepare`
// accepts (discovered by live probing, 2026-07-02). Its match-account PDA is
// deterministic via findProgramAddress(["match", u64_le(900001)], programId).
// NOTE: the backend *read* endpoints (/api/match, /api/lineup, /api/leaderboard,
// /api/events) return 404 for this PDA because **nothing has been ingested** —
// see frontend-integration.md. The prepare→submit flow is the only real
// integration that currently produces an on-chain transaction on Devnet.
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

// ---- Prediction prepare (Devnet submission) -------------------------------
// Schema reverse-engineered from the backend's tRPC `prediction.prepare` Zod
// error envelope (live probe 2026-07-02). The REST endpoint
// `POST /api/prediction/prepare` is undocumented in frontend-integration.md
// but accepts this exact body and returns an unsigned base64 Solana transaction
// that the wallet must sign and submit to Devnet via `sendRawTransaction`.
// There is NO `/api/prediction/submit` — submission is purely client-side.

export type PredictionKind = 0 | 1 | 2; // 0=OUT, 1=IN, 2=COMBO(out+in)

export type PreparePredictionInput = {
  wallet: string;        // base58 signer wallet
  fixtureId: number;     // use SOCCIT_SEED_FIXTURE_ID for the live seed match
  outPlayerId: number;   // starter going out (0 for kind=1)
  inPlayerId: number;    // sub coming in (0 for kind=0)
  lockMinute: number;     // minute the prediction is locked (game clock)
  slotIndex: number;     // formation slot index
  side: 1 | 2;           // 1=home, 2=away
  kind: PredictionKind;  // 0=OUT, 1=IN, 2=COMBO
};

export type PreparePredictionOutput = {
  transaction: string;          // base64 serialized unsigned Solana tx (VersionedTransaction)
  fixtureId: number;
  prediction: string;           // prediction-account PDA (base58)
  matchAccount: string;         // match-account PDA (base58) — canonical route id
  userUsdcAta: string;          // user's USDC ATA for SOCCIT_USDC_MINT
  usdcMint: string;
  entryFee: string;            // stringified integer lamports/base units
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
