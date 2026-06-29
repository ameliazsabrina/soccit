#!/usr/bin/env bash
set -euo pipefail

FIXTURE_ID="${FIXTURE_ID:-900001}"
API_URL="${API_URL:-http://127.0.0.1:8787}"
OWNER="EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ"

echo "> building and starting redis, mongo, api"
docker compose up -d --build redis mongo api

echo "> waiting for api health"
for _ in $(seq 1 60); do
  if curl -fsS "$API_URL/healthz" >/dev/null; then
    break
  fi
  sleep 2
done
curl -fsS "$API_URL/healthz" >/dev/null

echo "> resetting fixture $FIXTURE_ID"
docker compose exec -T redis redis-cli DEL "events:$FIXTURE_ID" "leaderboard:$FIXTURE_ID" "fixture:$FIXTURE_ID" >/dev/null

echo "> starting scoring projector"
docker compose rm -sf scoring >/dev/null 2>&1 || true
SCORING_FIXTURE_ID="$FIXTURE_ID" PREDICTIONS_SOURCE=file PREDICTIONS_FILE=infra/e2e/predictions.local.json \
  docker compose --profile e2e up -d --build scoring

sleep 2

echo "> injecting deterministic events"
docker compose exec -T redis redis-cli XADD "events:$FIXTURE_ID" "*" \
  type substitution \
  json "{\"fixtureId\":$FIXTURE_ID,\"type\":\"substitution\",\"side\":1,\"playerOutId\":101,\"playerInId\":202,\"minute\":20}" >/dev/null
docker compose exec -T redis redis-cli XADD "events:$FIXTURE_ID" "*" \
  type status \
  json "{\"fixtureId\":$FIXTURE_ID,\"type\":\"status\",\"action\":\"game_finalised\",\"terminal\":true}" >/dev/null

echo "> waiting for final leaderboard"
FIXTURE_ID="$FIXTURE_ID" API_URL="$API_URL" OWNER="$OWNER" node -e '
const fixtureId = process.env.FIXTURE_ID;
const apiUrl = process.env.API_URL;
const owner = process.env.OWNER;
const deadline = Date.now() + 60000;
async function getJson(path) {
  const res = await fetch(`${apiUrl}${path}`);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}
while (Date.now() < deadline) {
  try {
    const board = await getJson(`/api/leaderboard/${fixtureId}`);
    if (board.final && board.winners[0] === owner && board.ranking[0]?.points === 3) {
      const matches = await getJson(`/api/user/${owner}/matches`);
      if (matches.some((m) => m.fixtureId === Number(fixtureId) && m.final === true && m.rank === 1)) {
        console.log(JSON.stringify({ fixtureId: Number(fixtureId), winner: board.winners[0], points: board.ranking[0].points }));
        process.exit(0);
      }
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
throw new Error("timed out waiting for final leaderboard and participation readback");
'

echo "> local off-chain e2e passed"
