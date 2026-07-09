# Soccit Backend Developer Guide

This document provides a comprehensive overview of the Soccit prediction market platform's frontend architecture, UI states, and the backend APIs needed to make everything work. It is written for backend developers who need to implement the server-side systems, Solana programs, and TxODDS data integration.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Platform States](#platform-states)
3. [Prediction Models](#prediction-models)
4. [API Contracts](#api-contracts)
5. [Solana On-Chain Integration](#solana-on-chain-integration)
6. [TxODDS Data Integration](#txodds-data-integration)
7. [Real-Time Event Streaming](#real-time-event-streaming)
8. [Demo Data Reference](#demo-data-reference)

---

## Architecture Overview

Soccit is a **gamified football prediction market** on Solana. Users predict:
- **Substitutions** (who comes off, who comes on)
- **Final scores**
- **Goalscorers**

The platform has three data layers:
1. **Solana on-chain** — match vaults, prediction locking, settlement, prize distribution
2. **TxODDS TxLINE API** — live match data (fixtures, lineups, events, scores)
3. **Soccit backend** — orchestrates between on-chain and TxODDS, manages user profiles, leaderboards, SSE streams

---

## Platform States

Every match goes through these states. The UI renders entirely differently depending on which state the match is in.

### Match Lifecycle

```
OPEN → LIVE → RESOLVED → SETTLED
```

| State | `statusLabel` | `status` | `settled` | UI Behavior |
|-------|-------------|----------|-----------|-------------|
| **OPEN** | `"OPEN"` | `0` | `false` | Match page shows Vault card + Enter card. Users can enter the arena and lock predictions. |
| **LIVE** | `"OPEN"` | `0` | `false` | `live.statusId = 1`, `live.minute` > 0. Scoreboard shows live score. Users can still predict. |
| **RESOLVED** | `"RESOLVED"` | `1` | `false` | Match finished, waiting for on-chain settlement. Arena locked. |
| **SETTLED** | `"SETTLED"` | `2` | `true` | Match fully settled. Match page shows Logs + Results cards. Winners paid. |

### Arena Page States

| State | Condition | What Renders |
|-------|-----------|--------------|
| **Loading** | Data fetching | EventsTransition with "Loading Match" title + black Soccit logo |
| **Score model** | `model=score` (default) | ScorePredictionPanel — +/- score picker, slide to lock |
| **Pitch model** | `model=sub` | TeamPicker → slide to unlock → PitchArena with field + bench |
| **Goalscorer** | `model=goalscorer` | "Coming Soon" placeholder |
| **No lineup** | Lineup not fetched | "Lineups Not Out Yet" message |

### Match Page (`/matches/{pda}`)

**When Open/Live:**
- Top: Scoreboard (team logos/flags, score, live indicator)
- Below: 2 cards — **Vault** (pool, entry fee, prizes — click opens modal) + **Enter Match** (button → arena score model)

**When Settled:**
- Top: Scoreboard (final score)
- Below: 2 cards — **Match Logs** (preview + "View Full Logs" button) + **Match Results** (score, winner, prize pool, top winners + "View Full Results" button)

---

## Prediction Models

### 1. Substitution Model (`kind: 2`)

**User flow:**
1. User enters arena → Score model (default)
2. Switches to Pitch tab → TeamPickerModal opens
3. Picks team (Portugal or Argentina) → SlideToLock confirms
4. Pitch loads with the selected team's 11 starters + bench
5. User drags a bench TCG card onto a field player (or taps to select + tap to swap)
6. ConfirmSubsModal opens showing the swap (OUT player → IN player)
7. User slides to lock → prediction submitted on-chain
8. Locked cards show grayscale + LOCKED badge, no X button
9. Trying to interact with locked cards → LockedWarningModal

**Data shape:**
```typescript
{
  kind: 2,           // substitution
  side: 1 | 2,       // which team
  outPlayerId: number, // starter being substituted
  inPlayerId: number,  // sub coming on
  lockMinute: number,  // match minute when locked
}
```

**Scoring:**
- Correct substitution (both OUT and IN correct): **3 pts**
- Correct OUT player only: **1 pt**
- Correct IN player only: **1 pt**

### 2. Score Model (`kind: 3`)

**User flow:**
1. User is on Score model by default
2. Sees team flags + current live score
3. +/- buttons to adjust predicted final score
4. SlideToLock → prediction submitted

**Data shape:**
```typescript
{
  kind: 3,           // score prediction
  side: 0,           // neutral
  outPlayerId: number, // re-used as score1 (team1 goals)
  inPlayerId: number,  // re-used as score2 (team2 goals)
  lockMinute: number,
}
```

**Scoring:**
- Exact score correct: **5 pts**
- Correct outcome (win/draw/loss) only: **3 pts**

### 3. Goalscorer Model (`kind: 1`)

**Status:** Coming Soon — UI shows placeholder.

**Planned:**
- User picks up to 3 goalscorers per team
- Correct pick: **2 pts per scorer**

---

## API Contracts

The frontend expects these API endpoints. All return JSON. Base URLs depend on environment (devnet/mainnet).

### Match Data

#### `GET /api/matches`
Returns list of available matches.

```typescript
type MatchSummary = {
  pda: string;                    // Solana PDA (match vault address)
  fixtureId: number;              // TxODDS fixture ID
  onchain: {
    status: number;               // 0=OPEN, 1=RESOLVED, 2=SETTLED
    statusLabel: string;          // "OPEN" | "RESOLVED" | "SETTLED"
    settled: boolean;
    entryFee: string;             // USDC base units (e.g. "1000000" = 1 USDC)
    poolTotal: string;            // total pool in USDC base units
    participantCount: number;
    team1Id: number;
    team2Id: number;
    usdcMint: string;             // USDC mint address
    winners: (string | null)[];   // top 3 wallet addresses
  };
  live: {
    statusId: number;             // 1=live, 0=not live
    minute: number;
    goals: { team1: number; team2: number };
    ts: number;
  } | null;
  teamNames: { team1: string; team2: string };
};
```

#### `GET /api/matches/{pda}`
Returns full match state for a specific match vault.

```typescript
type MatchState = {
  fixtureId: number;
  onchain: { /* same as above */ };
  live: { /* same as above */ } | null;
  updatedAt: number;
};
```

#### `GET /api/matches/{pda}/lineup`
Returns team lineups for the match.

```typescript
type Lineup = {
  fixtureId: number;
  updatedAt: number;
  teams: Array<{
    side: 1 | 2;
    teamId: number;
    teamName: string | null;
    formation: string | null;
    players: Array<{
      id: number;
      name: string;
      number: string | null;
      starter: boolean;
      positionId: number | null;   // 1=GK, 2=DF, 3=MF, 4=FW
      position: string | null;
      positionCode: string | null; // "GK", "RB", "ST", etc.
      gridX: number | null;         // 0-100, pitch position
      gridY: number | null;         // 0-100, pitch position
      onPitch: boolean | null;
      warmingUp: boolean | null;
    }>;
  }>;
  names: Record<string, string>;
};
```

### User Profiles

#### `GET /api/users/{wallet}`
```typescript
type UserProfile = {
  wallet: string;
  username: string;
  avatar: string;  // "avatar-1" through "avatar-6"
  createdAt: number;
};
```

#### `POST /api/users` (create profile)
Request: `{ wallet, username, avatar, message, signature }`
Response: `{ user: UserProfile, session: string }`

### Leaderboard

#### `GET /api/matches/{pda}/leaderboard`
```typescript
type Leaderboard = {
  fixtureId: number;
  updatedAt: number;
  final: boolean;
  winners: (string | null)[];     // top 3 wallets
  ranking: Array<{
    owner: string;                // wallet address
    points: number;
    earliestScoringLockMinute: number;
    user: { username: string; avatar: string } | null;
    predictions: Array<any>;
  }>;
};
```

### Event Stream

#### `GET /api/matches/{pda}/events/stream` (SSE)
Server-Sent Events stream. Each event:

```typescript
type EventEntry = {
  id: string;
  type: string;                   // "goal", "substitution", "yellow_card", "red_card", "prediction"
  payload: Record<string, any>;   // { minute, side, scorerId, playerOutId, playerInId, ... }
  players: {
    out: { id, name, number, positionId, position, side } | null;
    in: { id, name, number, positionId, position, side } | null;
  };
};
```

### Prize Calculation

```typescript
// Platform fee: 20%
// Prize distribution: 50% / 30% / 20% (1st/2nd/3rd)
function calculatePrizes(poolTotal: string) {
  const pool = Number(poolTotal) * 0.8;
  return {
    total: pool,
    first: pool * 0.5,
    second: pool * 0.3,
    third: pool * 0.2,
  };
}
```

---

## Solana On-Chain Integration

### Match Vault Program

Each match is a PDA (Program Derived Address) that acts as a vault.

**Key account:**
- `pda`: Match vault PDA — derived from fixture ID
- `entryFee`: USDC amount to enter (e.g. 1 USDC = 1,000,000 base units)
- `poolTotal`: Accumulated entry fees
- `participantCount`: Number of unique participants
- `team1Id` / `team2Id`: TxODDS team IDs
- `usdcMint`: USDC token mint address
- `status`: 0=OPEN, 1=RESOLVED, 2=SETTLED
- `winners`: Array of 3 wallet addresses (filled at settlement)

### Prediction Submission

When a user locks a prediction:

```typescript
// Frontend calls submitPrediction() which:
// 1. Creates a transaction instruction with the prediction data
// 2. User signs with their wallet
// 3. Transaction sent to Solana

type PredictionInput = {
  wallet: string;        // user's wallet address
  fixtureId: number;
  outPlayerId: number;  // or score1 for score predictions
  inPlayerId: number;   // or score2 for score predictions
  lockMinute: number;
  side: 0 | 1 | 2;     // 0=neutral (score), 1=home, 2=away
  kind: 0 | 1 | 2 | 3; // 0=out, 1=in, 2=sub, 3=score
};
```

**Prediction kinds:**
| kind | Meaning | Data mapping |
|------|---------|-------------|
| 0 | OUT player only | `outPlayerId` = player ID |
| 1 | IN player only | `inPlayerId` = player ID |
| 2 | Substitution (both) | `outPlayerId` + `inPlayerId` |
| 3 | Score prediction | `outPlayerId` = team1 score, `inPlayerId` = team2 score |

---

## TxODDS Data Integration

Soccit uses **TxODDS TxLINE API** for all live match data. The integration involves:

### TxODDS TxLINE Authentication

```typescript
// 1. Get guest JWT
const authResponse = await POST(`${apiOrigin}/auth/guest/start`);
const jwt = authResponse.data.token;

// 2. Subscribe on-chain (Solana program)
// 3. Activate API token
const activationResponse = await POST(`${apiBaseUrl}/token/activate`, {
  txSig,              // on-chain subscription signature
  walletSignature,    // base64 signed message
  leagues: [],        // selected league IDs (empty = standard bundle)
});

// 4. Use API with both credentials
// Headers:
//   Authorization: Bearer ${jwt}
//   X-Api-Token: ${apiToken}
```

### Data Soccit Needs from TxODDS

1. **Fixtures** (`/api/fixtures`) — match schedule, team IDs, kickoff times
2. **Lineups** (`/api/fixtures/{id}/lineups`) — starting XI, substitutes, formations, player positions
3. **Live events** (SSE stream) — goals, cards, substitutions, with minute and player data
4. **Live score** — current score, match minute, match status (live/finished)

### TxODDS → Soccit Data Mapping

| TxODDS Field | Soccit Field | Notes |
|-------------|-------------|-------|
| Fixture ID | `fixtureId` | Primary key linking everything |
| Home team ID | `team1Id` | |
| Away team ID | `team2Id` | |
| Home score | `live.goals.team1` | |
| Away score | `live.goals.team2` | |
| Match minute | `live.minute` | |
| Match status | `live.statusId` | 1=live, 0=not live |
| Player ID | `players[].id` | Must match across lineups + events |
| Player name | `players[].name` | |
| Player number | `players[].number` | Jersey number |
| Position | `players[].position` | "Goalkeeper", "Defender", "Midfielder", "Forward" |
| Position code | `players[].positionCode` | "GK", "RB", "CB", "CM", "ST", etc. |
| Grid position | `players[].gridX/gridY` | 0-100, for pitch placement |

### Event Types from TxODDS

| TxODDS event type | Soccit `type` | Display |
|-------------------|---------------|---------|
| Goal | `"goal"` | Goal icon, minute, scorer |
| Substitution | `"substitution"` | Swap icon, OUT → IN players |
| Yellow card | `"yellow_card"` | Yellow icon, player |
| Red card | `"red_card"` | Red icon, player |
| Prediction lock | `"prediction"` | User + pts (internal, not from TxODDS) |

---

## Real-Time Event Streaming

### SSE (Server-Sent Events)

The frontend connects to `/api/matches/{pda}/events/stream` via `EventSource`.

**Connection states:**
| `SseStatus` | Display | Meaning |
|-------------|---------|---------|
| `"idle"` | "Idle" | Not connected (demo or pre-connect) |
| `"connecting"` | "Connecting..." | Opening EventSource |
| `"open"` | "Live" | Stream active, receiving events |
| `"error"` | "Reconnecting" | Auto-retry on disconnect |

**Event flow:**
1. TxODDS sends live event → Soccit backend receives
2. Soccit backend formats as `EventEntry` and broadcasts via SSE
3. Frontend receives, prepends to events list
4. If event is a goal → score updates
5. If event is a substitution → player data updates
6. If event is match end → status changes to RESOLVED

### Leaderboard Stream

Same SSE pattern but for leaderboard updates. Real-time ranking changes as users lock predictions.

---

## Demo Data Reference

Demo data lives in `app/_lib/demo-data.ts`. Two demo matches:

### 1. Portugal vs Argentina (LIVE demo)
- **PDA:** `"demo"`
- **Status:** OPEN, live at 63', score 2-1
- **Full lineups:** 17 players per team with real names, positions, grid coordinates
- **Events:** 8 events (goals, cards, substitutions, predictions)
- **Leaderboard:** 4 participants with points

### 2. France vs Spain (SETTLED demo)
- **PDA:** `"demo-settled"`
- **Status:** SETTLED, full time 2-1 France
- **Events:** 7 events with real player names
- **Leaderboard:** 3 winners with points and prizes

### 3. Seed Match
- **PDA:** `SOCCIT_SEED_MATCH_PDA` (from api.ts)
- **Status:** OPEN, devnet
- **Teams:** "Soccit FC" vs "Devnet United"

---

## Key Frontend Files Reference

| File | Purpose |
|------|---------|
| `app/_lib/api.ts` | API types, fetch functions, utility functions (formatUsdc, calculatePrizes, etc.) |
| `app/_lib/demo-data.ts` | All demo match data (Portugal/Argentina, France/Spain, seed) |
| `app/_lib/prediction.ts` | `submitPrediction()` — builds and sends Solana transaction |
| `app/_components/pitch-arena.tsx` | Substitution model UI — field, bench, sidebar, drag-drop |
| `app/_components/score-prediction-panel.tsx` | Score model UI |
| `app/_components/team-badge.tsx` | Shared team flag/logo component |
| `app/_components/confirm-subs-modal.tsx` | Confirmation modal for sub predictions |
| `app/_components/top-nav.tsx` | Navigation bar with arena tabs (Score/Pitch/Goalscorer) |
| `app/matches/[pda]/page.tsx` | Match details page — scoreboard, vault/enter cards, settled cards |
| `app/matches/[pda]/arena/page.tsx` | Arena page — loads match, routes to model |
| `app/matches/[pda]/logs/page.tsx` | Full match logs (timeline of events) |
| `app/matches/[pda]/settlement/page.tsx` | Settlement page — final score, winners, prizes |