# @soccit/scoring

Phase 4 — scoring engine + leaderboard projector. Joins on-chain `Prediction` accounts with the off-chain TxLINE substitution stream (written by `@soccit/worker` into Redis `events:{fixtureId}`) and projects a live ranked leaderboard to `leaderboard:{fixtureId}` (Redis key + pub/sub channel, optional Mongo durability).

Schema-first per the nextjs-trpc-stack conventions: `src/leaderboard/leaderboard.schema.ts` (`leaderboardOutput`) and `src/leaderboard/leaderboard.service.ts` (pure `score()`) are exported for the Phase 3 tRPC API to wrap thinly.

## Scoring

Per-owner aggregate. A sub scores a prediction on the same `side` only if the pick was locked ≥5 min before the sub (`lockMinute <= subMinute - 5`). OUT/IN matches = +1; COMBO both legs = 3, single leg = 1. Rank by points desc, tiebreak earliest scoring lock minute, then owner. Winners = top-3 owners with points > 0 (null-padded). `match_id == fixtureId`.

## Run

```
cp .env.example .env        # set SCORING_FIXTURE_ID
pnpm install
pnpm test                   # unit tests for the scoring engine
pnpm start                  # run the projector
```

`PREDICTIONS_SOURCE=onchain` reads `Prediction` PDAs via RPC; `PREDICTIONS_SOURCE=file` loads `PREDICTIONS_FILE` (a JSON array of predictions) for testing without an on-chain match.
