import {
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
  SOCCIT_USDC_MINT,
  type MatchState,
  type Lineup,
  type Leaderboard,
  type EventEntry,
} from "./api";
import type { MatchSummary } from "./api";
import { demoLineup } from "./characters";

export const DEMO_PDA = "demo";
export const DEMO_SETTLED_PDA = "demo-settled";

// ===== France vs Argentina (LIVE demo — World Cup 2026 Final)

export const DEMO_MATCH_SUMMARY: MatchSummary = {
  pda: DEMO_PDA,
  fixtureId: 999999,
  featured: false,
  phase: "LIVE",
  onchain: {
    status: 0, statusLabel: "OPEN", settled: false,
    entryFee: "1000000", poolTotal: "2500000", participantCount: 2,
    startTime: 0,
    team1Id: 101, team2Id: 202,
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    winners: [null, null, null],
  },
  live: { statusId: 1, minute: 63, goals: { team1: 2, team2: 1 }, ts: Date.now() },
  finalScore: null,
  teamNames: { team1: "France", team2: "Argentina" },
};

export const DEMO_MATCH_STATE: MatchState = {
  fixtureId: 999999,
  phase: "LIVE",
  onchain: {
    status: 0, statusLabel: "OPEN", settled: false,
    entryFee: "1000000", poolTotal: "5000000", participantCount: 12,
    team1Id: 101, team2Id: 202,
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    winners: [null, null, null],
  },
  live: { statusId: 1, minute: 63, goals: { team1: 2, team2: 1 }, ts: Date.now() },
  updatedAt: Date.now(),
};

export const DEMO_LINEUP: Lineup = demoLineup();

export const DEMO_LEADERBOARD: Leaderboard = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  final: false,
  winners: [null, null, null],
  ranking: [
    { owner: "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", points: 12, earliestScoringLockMinute: 23, user: { username: "demoking", avatar: "avatar-1" }, predictions: [] },
    { owner: "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7", points: 9, earliestScoringLockMinute: 31, user: { username: "rivalX", avatar: "avatar-3" }, predictions: [] },
    { owner: "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt", points: 6, earliestScoringLockMinute: 44, user: null, predictions: [] },
    { owner: "9ycQEcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR", points: 3, earliestScoringLockMinute: 58, user: { username: "newbie", avatar: "avatar-6" }, predictions: [] },
  ],
};

export const DEMO_EVENTS: EventEntry[] = [
  { id: "1", type: "goal", payload: { minute: 24, side: 1 }, players: { out: null, in: { id: 10, name: "Kylian Mbappé", number: "10", positionId: 4, position: "Forward", side: 1 } } },
  { id: "2", type: "prediction", payload: { user: "demoking", points: 3, kind: 2 } },
  { id: "3", type: "goal", payload: { minute: 38, side: 2 }, players: { out: null, in: { id: 9, name: "Julián Álvarez", number: "9", positionId: 4, position: "Forward", side: 2 } } },
  { id: "4", type: "yellow_card", payload: { minute: 41, side: 1 }, players: { out: null, in: { id: 5, name: "Jules Koundé", number: "5", positionId: 2, position: "Defender", side: 1 } } },
  { id: "5", type: "prediction", payload: { user: "rivalX", points: 1, kind: 0 } },
  { id: "6", type: "goal", payload: { minute: 57, side: 1 }, players: { out: null, in: { id: 7, name: "Ousmane Dembélé", number: "7", positionId: 4, position: "Forward", side: 1 } } },
  { id: "7", type: "substitution", payload: { minute: 63, side: 1 }, players: { out: { id: 7, name: "Ousmane Dembélé", number: "7", positionId: 4, position: "Forward", side: 1 }, in: { id: 12, name: "Bradley Barcola", number: "12", positionId: 4, position: "Forward", side: 1 } } },
  { id: "8", type: "prediction", payload: { user: "newbie", points: 3, kind: 3 } },
];

// ===== France vs Argentina (SETTLED demo — World Cup 2026 Final)

export const DEMO_SETTLED_MATCH_SUMMARY: MatchSummary = {
  pda: DEMO_SETTLED_PDA,
  fixtureId: 888888,
  featured: false,
  phase: "SETTLED",
  onchain: {
    status: 2, statusLabel: "SETTLED", settled: true,
    entryFee: "1000000", poolTotal: "8000000", participantCount: 8,
    startTime: 0,
    team1Id: 301, team2Id: 302,
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    winners: ["EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", null, null],
  },
  // Terminal: backend nulls `live` and moves the score to `finalScore`.
  live: null,
  finalScore: { team1: 2, team2: 1 },
  teamNames: { team1: "France", team2: "Argentina" },
};

export const DEMO_SETTLED_MATCH_STATE: MatchState = {
  fixtureId: 888888,
  phase: "SETTLED",
  onchain: {
    status: 2, statusLabel: "SETTLED", settled: true,
    entryFee: "1000000", poolTotal: "8000000", participantCount: 8,
    team1Id: 301, team2Id: 302,
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    winners: ["EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7", "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt"],
  },
  // Terminal: backend nulls `live` and moves the score to `finalScore`.
  live: null,
  finalScore: { team1: 2, team2: 1 },
  updatedAt: Date.now(),
};

export const DEMO_SETTLED_LINEUP: Lineup = {
  fixtureId: 888888,
  updatedAt: Date.now(),
  teams: [
    { side: 1, teamId: 301, teamName: "France", formation: "4-2-3-1", players: [] },
    { side: 2, teamId: 302, teamName: "Argentina", formation: "4-3-3", players: [] },
  ],
  names: {},
};

export const DEMO_SETTLED_LEADERBOARD: Leaderboard = {
  fixtureId: 888888,
  updatedAt: Date.now(),
  final: true,
  winners: ["EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7", "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt"],
  ranking: [
    { owner: "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", points: 15, earliestScoringLockMinute: 18, user: { username: "demoking", avatar: "avatar-1" }, predictions: [] },
    { owner: "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7", points: 11, earliestScoringLockMinute: 25, user: { username: "rivalX", avatar: "avatar-3" }, predictions: [] },
    { owner: "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt", points: 8, earliestScoringLockMinute: 42, user: null, predictions: [] },
  ],
};

export const DEMO_SETTLED_EVENTS: EventEntry[] = [
  { id: "s1", type: "goal", payload: { minute: 18, side: 1 }, players: { out: null, in: { id: 10, name: "Kylian Mbappé", number: "10", positionId: 4, position: "Forward", side: 1 } } },
  { id: "s2", type: "prediction", payload: { user: "demoking", points: 3, kind: 2 } },
  { id: "s3", type: "goal", payload: { minute: 34, side: 2 }, players: { out: null, in: { id: 22, name: "Lionel Messi", number: "10", positionId: 4, position: "Forward", side: 2 } } },
  { id: "s4", type: "yellow_card", payload: { minute: 52, side: 1 }, players: { out: null, in: { id: 8, name: "Aurélien Tchouaméni", number: "8", positionId: 3, position: "Midfielder", side: 1 } } },
  { id: "s5", type: "goal", payload: { minute: 67, side: 1 }, players: { out: null, in: { id: 7, name: "Ousmane Dembélé", number: "7", positionId: 4, position: "Forward", side: 1 } } },
  { id: "s6", type: "substitution", payload: { minute: 75, side: 2 }, players: { out: { id: 22, name: "Lautaro Martínez", number: "22", positionId: 4, position: "Forward", side: 2 }, in: { id: 16, name: "Thiago Almada", number: "16", positionId: 4, position: "Forward", side: 2 } } },
  { id: "s7", type: "prediction", payload: { user: "rivalX", points: 1, kind: 0 } },
];

// ===== Seed match =====

export const SEED_MATCH_STATE: MatchState = {
  fixtureId: SOCCIT_SEED_FIXTURE_ID,
  phase: "OPEN",
  onchain: {
    status: 0, statusLabel: "OPEN", settled: false,
    entryFee: "5000000", poolTotal: "0", participantCount: 0,
    team1Id: 101, team2Id: 202,
    usdcMint: SOCCIT_USDC_MINT,
    winners: [null, null, null],
  },
  live: null,
  updatedAt: Date.now(),
};

// ===== Settlement demo (FRA/ARG settled version) =====

export const DEMO_SETTLEMENT_MATCH: MatchState = {
  fixtureId: 999999,
  phase: "SETTLED",
  onchain: {
    status: 2, statusLabel: "SETTLED", settled: true,
    entryFee: "1000000", poolTotal: "5000000", participantCount: 12,
    team1Id: 101, team2Id: 202,
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    winners: [
      "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ",
      "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7",
      "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt",
    ],
  },
  // Terminal: backend nulls `live` and moves the score to `finalScore`.
  live: null,
  finalScore: { team1: 2, team2: 1 },
  updatedAt: Date.now(),
};

export const DEMO_SETTLEMENT_LINEUP: Lineup = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  teams: [
    { side: 1, teamId: 101, teamName: "France", formation: "4-2-3-1", players: [] },
    { side: 2, teamId: 202, teamName: "Argentina", formation: "4-3-3", players: [] },
  ],
  names: {},
};

export const DEMO_SETTLEMENT_LEADERBOARD: Leaderboard = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  final: true,
  winners: [
    "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ",
    "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7",
    "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt",
  ],
  ranking: [
    { owner: "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", points: 12, earliestScoringLockMinute: 23, user: { username: "demoking", avatar: "avatar-1" }, predictions: [] },
    { owner: "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7", points: 9, earliestScoringLockMinute: 31, user: { username: "rivalX", avatar: "avatar-3" }, predictions: [] },
    { owner: "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt", points: 6, earliestScoringLockMinute: 44, user: null, predictions: [] },
  ],
};

// ===== Seed match summary (for /matches list) =====

export const SEED_MATCH_SUMMARY: MatchSummary = {
  pda: SOCCIT_SEED_MATCH_PDA,
  fixtureId: 900001,
  featured: false,
  phase: "LIVE",
  onchain: {
    status: 0, statusLabel: "OPEN", settled: false,
    entryFee: "5000000", poolTotal: "5000000", participantCount: 1,
    startTime: 0,
    team1Id: 101, team2Id: 202,
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    winners: [null, null, null],
  },
  live: { statusId: 1, minute: 34, goals: { team1: 1, team2: 0 }, ts: Date.now() },
  finalScore: null,
  teamNames: { team1: "France", team2: "Argentina" },
};
