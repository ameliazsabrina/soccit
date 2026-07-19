# Prediction Integrity: Backend and Solana Program Handoff

Status: implementation contract  
Prepared from: the current TypeScript frontend and observed live API behavior  
Not derived from: existing repository Markdown files

## 1. Purpose

The frontend now restores known predictions before enabling the arena, locks confirmed players after reload, and replays official substitution events into the displayed roster. Those changes prevent common accidental resubmissions, but the browser is not a security boundary.

The Solana program must enforce prediction uniqueness atomically. The backend must expose the program's confirmed state without waiting for scoring or leaderboard projections.

## 2. Required invariants

For one `(match, wallet)` pair:

1. The wallet may create at most one score prediction (`kind = 3`).
2. A football player ID may appear in at most one confirmed substitution prediction, whether that player is selected as OUT or IN.
3. The wallet may submit multiple substitution predictions only when every involved player ID is unique.
4. A prediction is locked only after its Solana transaction is confirmed.
5. A failed transaction must not reserve a score or player.
6. Only an entered participant may predict.
7. Predictions are accepted only while the match is in the program-defined prediction window.
8. Indexers and scoring jobs must be idempotent and must never score a duplicate legacy prediction twice.

These invariants must hold when requests are concurrent, submitted from different browsers, or constructed without this frontend.

## 3. Solana program changes

### 3.1 Score uniqueness PDA

Create one account whose address is deterministic for the match and user:

```text
seeds = ["score_lock", match.key(), user.key()]
```

Initialize it in the score-prediction instruction. A second score submission must fail because the PDA already exists. Do not model this as a mutable boolean on a client-selected prediction slot.

Suggested data:

```rust
pub struct ScoreLock {
    pub match_account: Pubkey,
    pub owner: Pubkey,
    pub prediction: Pubkey,
    pub score_team_1: u8,
    pub score_team_2: u8,
    pub lock_minute: u16,
    pub bump: u8,
}
```

Validate score values in the program. The current API transports scores through `outPlayerId` and `inPlayerId`; a later API version should use explicit score fields, but the program must still validate the encoded values during migration.

### 3.2 Player uniqueness PDAs

For a combo substitution (`kind = 2`), initialize two lock accounts in the same instruction:

```text
out_lock seeds = ["player_lock", match.key(), user.key(), out_player_id_le_bytes]
in_lock  seeds = ["player_lock", match.key(), user.key(), in_player_id_le_bytes]
```

The instruction must reject `out_player_id == in_player_id`. Both lock accounts and the prediction account must be created atomically in one transaction. If either player PDA already exists, the entire instruction fails and no new account remains.

Suggested data:

```rust
pub struct PlayerPredictionLock {
    pub match_account: Pubkey,
    pub owner: Pubkey,
    pub player_id: u32,
    pub prediction: Pubkey,
    pub role: u8, // 0 = OUT, 1 = IN
    pub bump: u8,
}
```

If `kind = 0` and `kind = 1` remain supported, they must use the same `player_lock` namespace. Otherwise a user could bypass the combo constraint by mixing prediction kinds.

### 3.3 Instruction constraints

Every prediction instruction must verify:

- signer equals the prediction owner;
- match account is the expected account for the fixture;
- participant/entry account belongs to the signer and match;
- match status and time allow predictions;
- side is `1` or `2` for player predictions and `0` for score predictions;
- player IDs are members of the selected side's fixture lineup, or are validated against an immutable lineup commitment maintained by the program/backend design;
- score and player values fit their declared ranges;
- no prediction instruction transfers another entry fee.

Recommended program errors:

```text
ScoreAlreadyLocked
PlayerAlreadyLocked
SamePlayerForInAndOut
InvalidPredictionKind
InvalidPredictionSide
InvalidPlayerForFixture
PredictionWindowClosed
ParticipantRequired
InvalidScore
```

### 3.4 Program tests

Add tests that submit transactions directly, without the web app:

- first score succeeds; second score with the same value fails;
- first score succeeds; second score with a different value fails;
- two simultaneous score transactions result in exactly one success;
- one combo succeeds; reuse of its OUT player as OUT fails;
- reuse of its OUT player as IN fails;
- reuse of its IN player as OUT or IN fails;
- a second combo using two new players succeeds;
- failure to initialize either player lock rolls back the prediction and the other lock;
- non-participant and closed-match submissions fail;
- a failed transaction leaves no lock PDA;
- predictions cannot charge the match entry fee again.

## 4. Backend changes

### 4.1 Authoritative prediction-state endpoint

Add an endpoint backed by confirmed program accounts, not by the scoring projection:

```http
GET /api/matches/:matchPda/predictions/:wallet
```

Suggested response:

```json
{
  "fixtureId": 18257865,
  "matchPda": "...",
  "wallet": "...",
  "commitment": "confirmed",
  "updatedAt": 0,
  "score": {
    "team1": 1,
    "team2": 0,
    "lockMinute": 12,
    "predictionPda": "...",
    "signature": "...",
    "slot": 0
  },
  "substitutions": [
    {
      "side": 1,
      "outPlayerId": 100,
      "inPlayerId": 200,
      "lockMinute": 12,
      "predictionPda": "...",
      "signature": "...",
      "slot": 0
    }
  ],
  "lockedPlayerIds": [100, 200]
}
```

Requirements:

- Return `200` with empty state when the wallet has no predictions.
- Return the same confirmed state immediately after the transaction is observable at the chosen commitment.
- Do not require the scoring worker, leaderboard, or match finalization to run first.
- Validate both route parameters and ensure returned accounts belong to that exact match and wallet.
- Define cache headers so a reload cannot receive a stale empty response after submission. Prefer no shared caching for wallet-specific state.

Once this endpoint ships, replace the frontend's temporary merge of `GET /api/user/:wallet/matches` and `GET /api/leaderboard/:pda` with this endpoint.

### 4.2 Prediction preparation

`POST /api/prediction/prepare` should preflight the same rules for clear UX, while treating the program as final authority.

Return `409 Conflict` with stable machine-readable codes for known duplicates:

```json
{
  "error": {
    "code": "SCORE_ALREADY_LOCKED",
    "message": "A score prediction is already confirmed for this match."
  },
  "state": { "score": {}, "lockedPlayerIds": [] }
}
```

Use equivalent codes for `PLAYER_ALREADY_LOCKED`, `PREDICTION_WINDOW_CLOSED`, and `PARTICIPANT_REQUIRED`. The prepared transaction must include the uniqueness PDA accounts, so a race after preflight still fails safely on-chain.

### 4.3 Current roster snapshot

The existing lineup response behaves as a pre-match snapshot. Provide a current roster snapshot either by extending `/api/lineup/:matchPda` or adding:

```http
GET /api/matches/:matchPda/roster
```

It should include:

- `baselineUpdatedAt` for the starting lineup;
- `eventCursor` or last applied event sequence;
- `updatedAt` for the current roster;
- explicit `onPitch` for every player;
- the formation slot currently occupied by each on-pitch player;
- an ordered list of applied substitution event IDs.

Apply each official event exactly once. A substitution chain such as `A -> B`, then `B -> C`, must leave `C` in A's formation slot and place A and B off the pitch. Event updates for the same provider event ID must replace/enrich the existing event rather than apply the swap again.

The SSE stream should expose a snapshot cursor or a `history_complete` control event. Without that signal, a reloaded client cannot know exactly when historical replay is complete.

### 4.4 Indexer and scoring rules

- Key indexed predictions by prediction account address/signature, not array position.
- Upserts must be idempotent.
- The wallet prediction-state view must derive from confirmed accounts.
- Scoring must use only canonical predictions that satisfy the uniqueness rules.
- Reprocessing a block or provider event must not create duplicate predictions or points.
- Store slot, signature, block time, and program account for reconciliation.

## 5. Legacy duplicate migration

Existing program data may already contain duplicates. Do not silently choose the last indexed record.

Use this deterministic policy:

1. For score predictions, select the earliest successfully confirmed prediction by Solana slot, then transaction index/signature as a stable tie-breaker.
2. For player predictions, process predictions in the same canonical order. Keep a prediction only when neither player has already been claimed; mark later conflicts invalid.
3. Exclude invalid duplicates from points, rankings, and settlement inputs.
4. Preserve invalid records for auditability and expose their invalid reason internally.
5. Recompute affected leaderboard and settlement projections before enabling the new endpoint in production.

If already-paid settlements were affected, produce a separate reconciliation report rather than mutating historical transfers without an approved recovery process.

## 6. Delivery order

1. Add program PDA locks, errors, and tests.
2. Deploy the upgraded program and update the backend IDL/program configuration.
3. Update transaction preparation to include lock accounts.
4. Backfill and canonicalize legacy predictions.
5. Ship the authoritative wallet prediction-state endpoint.
6. Ship the current roster snapshot and SSE replay cursor.
7. Switch the frontend from projection fallback to the authoritative endpoints.
8. Run concurrent transaction, reload, indexer replay, and scoring tests in staging before production.

## 7. Acceptance criteria

- Reloading after a confirmed score always displays that score as locked.
- A second score transaction is rejected by the program even when manually constructed.
- Reloading after confirmed substitution predictions keeps every involved player unavailable and visually locked.
- Reusing a locked player is rejected by the program in either role.
- Failed or rejected transactions never appear locked.
- Official substitutions move IN players onto the field and OUT players to the bench after reload and during live play.
- A later substitution of an earlier substitute updates the same formation slot correctly.
- Backend projection delay cannot reopen controls or cause a confirmed prediction to disappear.
- Duplicate legacy predictions are canonicalized once and are never double-scored.

