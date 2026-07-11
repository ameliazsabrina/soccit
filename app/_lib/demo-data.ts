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

export const DEMO_PDA = "demo";
export const DEMO_SETTLED_PDA = "demo-settled";

// ===== Portugal vs Argentina (LIVE demo) =====

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
    usdcMint: "2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac",
    winners: [null, null, null],
  },
  live: { statusId: 1, minute: 63, goals: { team1: 2, team2: 1 }, ts: Date.now() },
  finalScore: null,
  teamNames: { team1: "Portugal", team2: "Argentina" },
};

export const DEMO_MATCH_STATE: MatchState = {
  fixtureId: 999999,
  phase: "LIVE",
  onchain: {
    status: 0, statusLabel: "OPEN", settled: false,
    entryFee: "1000000", poolTotal: "5000000", participantCount: 12,
    team1Id: 101, team2Id: 202,
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    winners: [null, null, null],
  },
  live: { statusId: 1, minute: 63, goals: { team1: 2, team2: 1 }, ts: Date.now() },
  updatedAt: Date.now(),
};

export const DEMO_LINEUP: Lineup = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  teams: [
    {
      side: 1, teamId: 101, teamName: "Portugal", formation: "4-3-3",
      players: [
        { id: 1001, name: "Diogo Costa", number: "22", starter: true, positionId: 1, position: "Goalkeeper", positionCode: "GK", gridX: 50, gridY: 82, onPitch: true },
        { id: 1002, name: "João Cancelo", number: "2", starter: true, positionId: 2, position: "Defender", positionCode: "RB", gridX: 83, gridY: 70, onPitch: true },
        { id: 1003, name: "Rúben Dias", number: "4", starter: true, positionId: 2, position: "Defender", positionCode: "RCB", gridX: 65, gridY: 76, onPitch: true },
        { id: 1004, name: "Gonçalo Inácio", number: "14", starter: true, positionId: 2, position: "Defender", positionCode: "LCB", gridX: 35, gridY: 76, onPitch: true },
        { id: 1005, name: "Nuno Mendes", number: "3", starter: true, positionId: 2, position: "Defender", positionCode: "LB", gridX: 17, gridY: 70, onPitch: true },
        { id: 1006, name: "João Neves", number: "6", starter: true, positionId: 3, position: "Midfielder", positionCode: "CDM", gridX: 50, gridY: 58, onPitch: true },
        { id: 1007, name: "Bruno Fernandes", number: "8", starter: true, positionId: 3, position: "Midfielder", positionCode: "RCM", gridX: 64, gridY: 42, onPitch: true },
        { id: 1008, name: "Vitinha", number: "23", starter: true, positionId: 3, position: "Midfielder", positionCode: "LCM", gridX: 36, gridY: 42, onPitch: true },
        { id: 1009, name: "Bernardo Silva", number: "10", starter: true, positionId: 4, position: "Forward", positionCode: "RW", gridX: 80, gridY: 32, onPitch: true },
        { id: 1010, name: "Cristiano Ronaldo", number: "7", starter: true, positionId: 4, position: "Forward", positionCode: "ST", gridX: 50, gridY: 16, onPitch: true },
        { id: 1011, name: "Rafael Leão", number: "17", starter: true, positionId: 4, position: "Forward", positionCode: "LW", gridX: 20, gridY: 32, onPitch: true },
        { id: 1101, name: "Rui Patrício", number: "1", starter: false, positionId: 1, position: "Goalkeeper", positionCode: "GK", onPitch: false },
        { id: 1102, name: "Pepe", number: "5", starter: false, positionId: 2, position: "Defender", positionCode: "CB", onPitch: false },
        { id: 1103, name: "Danilo Pereira", number: "13", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1104, name: "Rúben Neves", number: "18", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1105, name: "Otávio", number: "15", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1106, name: "Gonçalo Ramos", number: "9", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
      ],
    },
    {
      side: 2, teamId: 202, teamName: "Argentina", formation: "4-3-3",
      players: [
        { id: 2001, name: "Emiliano Martínez", number: "23", starter: true, positionId: 1, position: "Goalkeeper", positionCode: "GK", gridX: 50, gridY: 82, onPitch: true },
        { id: 2002, name: "Nahuel Molina", number: "4", starter: true, positionId: 2, position: "Defender", positionCode: "RB", gridX: 83, gridY: 70, onPitch: true },
        { id: 2003, name: "Cristian Romero", number: "13", starter: true, positionId: 2, position: "Defender", positionCode: "RCB", gridX: 65, gridY: 76, onPitch: true },
        { id: 2004, name: "Nicolás Otamendi", number: "19", starter: true, positionId: 2, position: "Defender", positionCode: "LCB", gridX: 35, gridY: 76, onPitch: true },
        { id: 2005, name: "Nicolás Tagliafico", number: "3", starter: true, positionId: 2, position: "Defender", positionCode: "LB", gridX: 17, gridY: 70, onPitch: true },
        { id: 2006, name: "Rodrigo De Paul", number: "7", starter: true, positionId: 3, position: "Midfielder", positionCode: "CDM", gridX: 50, gridY: 58, onPitch: true },
        { id: 2007, name: "Enzo Fernández", number: "24", starter: true, positionId: 3, position: "Midfielder", positionCode: "RCM", gridX: 64, gridY: 42, onPitch: true },
        { id: 2008, name: "Alexis Mac Allister", number: "20", starter: true, positionId: 3, position: "Midfielder", positionCode: "LCM", gridX: 36, gridY: 42, onPitch: true },
        { id: 2009, name: "Lionel Messi", number: "10", starter: true, positionId: 4, position: "Forward", positionCode: "RW", gridX: 80, gridY: 32, onPitch: true },
        { id: 2010, name: "Julián Álvarez", number: "9", starter: true, positionId: 4, position: "Forward", positionCode: "ST", gridX: 50, gridY: 16, onPitch: true },
        { id: 2011, name: "Ángel Di María", number: "11", starter: true, positionId: 4, position: "Forward", positionCode: "LW", gridX: 20, gridY: 32, onPitch: true },
        { id: 2101, name: "Franco Armani", number: "1", starter: false, positionId: 1, position: "Goalkeeper", positionCode: "GK", onPitch: false },
        { id: 2102, name: "Lisandro Martínez", number: "25", starter: false, positionId: 2, position: "Defender", positionCode: "CB", onPitch: false },
        { id: 2103, name: "Leandro Paredes", number: "5", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 2104, name: "Giovani Lo Celso", number: "16", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 2105, name: "Lautaro Martínez", number: "22", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
        { id: 2106, name: "Paulo Dybala", number: "21", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
      ],
    },
  ],
  names: {},
};

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
  { id: "1", type: "goal", payload: { minute: 24, side: 1 }, players: { out: null, in: { id: 1010, name: "Cristiano Ronaldo", number: "7", positionId: 4, position: "Forward", side: 1 } } },
  { id: "2", type: "prediction", payload: { user: "demoking", points: 3, kind: 2 } },
  { id: "3", type: "goal", payload: { minute: 38, side: 2 }, players: { out: null, in: { id: 2009, name: "Lionel Messi", number: "10", positionId: 4, position: "Forward", side: 2 } } },
  { id: "4", type: "yellow_card", payload: { minute: 41, side: 1 }, players: { out: null, in: { id: 1003, name: "Rúben Dias", number: "4", positionId: 2, position: "Defender", side: 1 } } },
  { id: "5", type: "prediction", payload: { user: "rivalX", points: 1, kind: 0 } },
  { id: "6", type: "goal", payload: { minute: 57, side: 1 }, players: { out: null, in: { id: 1009, name: "Bernardo Silva", number: "10", positionId: 4, position: "Forward", side: 1 } } },
  { id: "7", type: "substitution", payload: { minute: 63, side: 1 }, players: { out: { id: 1010, name: "Cristiano Ronaldo", number: "7", positionId: 4, position: "Forward", side: 1 }, in: { id: 1106, name: "Gonçalo Ramos", number: "9", positionId: 4, position: "Forward", side: 1 } } },
  { id: "8", type: "prediction", payload: { user: "newbie", points: 3, kind: 3 } },
];

// ===== France vs Spain (SETTLED demo) =====

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
    usdcMint: "2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac",
    winners: ["EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", null, null],
  },
  // Terminal: backend nulls `live` and moves the score to `finalScore`.
  live: null,
  finalScore: { team1: 2, team2: 1 },
  teamNames: { team1: "France", team2: "Spain" },
};

export const DEMO_SETTLED_MATCH_STATE: MatchState = {
  fixtureId: 888888,
  phase: "SETTLED",
  onchain: {
    status: 2, statusLabel: "SETTLED", settled: true,
    entryFee: "1000000", poolTotal: "8000000", participantCount: 8,
    team1Id: 301, team2Id: 302,
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
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
    { side: 1, teamId: 301, teamName: "France", formation: "4-3-3", players: [] },
    { side: 2, teamId: 302, teamName: "Spain", formation: "4-3-3", players: [] },
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
  { id: "s1", type: "goal", payload: { minute: 18, side: 1 }, players: { out: null, in: { id: 3001, name: "Kylian Mbappé", number: "10", positionId: 4, position: "Forward", side: 1 } } },
  { id: "s2", type: "prediction", payload: { user: "demoking", points: 3, kind: 2 } },
  { id: "s3", type: "goal", payload: { minute: 34, side: 2 }, players: { out: null, in: { id: 4001, name: "Lamine Yamal", number: "19", positionId: 4, position: "Forward", side: 2 } } },
  { id: "s4", type: "yellow_card", payload: { minute: 52, side: 1 }, players: { out: null, in: { id: 3002, name: "Aurélien Tchouaméni", number: "8", positionId: 3, position: "Midfielder", side: 1 } } },
  { id: "s5", type: "goal", payload: { minute: 67, side: 1 }, players: { out: null, in: { id: 3003, name: "Antoine Griezmann", number: "7", positionId: 4, position: "Forward", side: 1 } } },
  { id: "s6", type: "substitution", payload: { minute: 75, side: 2 }, players: { out: { id: 4002, name: "Álvaro Morata", number: "9", positionId: 4, position: "Forward", side: 2 }, in: { id: 4003, name: "Mikel Oyarzabal", number: "21", positionId: 4, position: "Forward", side: 2 } } },
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

// ===== Settlement demo (POR/ARG settled version) =====

export const DEMO_SETTLEMENT_MATCH: MatchState = {
  fixtureId: 999999,
  phase: "SETTLED",
  onchain: {
    status: 2, statusLabel: "SETTLED", settled: true,
    entryFee: "1000000", poolTotal: "5000000", participantCount: 12,
    team1Id: 101, team2Id: 202,
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
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
    { side: 1, teamId: 101, teamName: "Portugal", formation: "4-3-3", players: [] },
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
    usdcMint: "2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac",
    winners: [null, null, null],
  },
  live: { statusId: 1, minute: 34, goals: { team1: 1, team2: 0 }, ts: Date.now() },
  finalScore: null,
  teamNames: { team1: "Soccit FC", team2: "Devnet United" },
};
