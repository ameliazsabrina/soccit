# Arena `model=subs` — Data Requirements

This document describes the data needed to power the Substitute Manager arena
(`/matches/[pda]/arena?model=subs`) so that the pitch renders the correct
formation and each player token is placed in the right position.

## Source

All fixture/lineup/formation data comes from the **TxLINE API** (TxODDS).

- Base URL: `https://txline.txodds.com/api` (mainnet) or `https://txline-dev.txodds.com/api` (devnet)
- Auth: `Authorization: Bearer ${jwt}` + `X-Api-Token: ${apiToken}`
- Docs: <https://txline.txodds.com/documentation/quickstart>

## 1. Fixture

Identifies the match. Already available via `getMatch(pda)` / `getMatches()`.

| Field | Type | Notes |
|---|---|---|
| `fixtureId` | number | TxODDS fixture ID |
| `team1Id` | number | Home team |
| `team2Id` | number | Away team |

## 2. Lineup (per team)

Returned by `getLineup(pda)`.

Each team object must include a **formation** string and every player must
carry an `x` / `y` grid coordinate so the pitch can render the starting XI
in the correct tactical shape.

### Team-level fields to add

| Field | Type | Example | Notes |
|---|---|---|---|
| `formation` | string | `"4-3-3"` | Canonical formation label. Used as fallback / label only. |
| `formationId` | number | `433` | (optional) TxODDS internal formation ID |

### Player-level fields to add

| Field | Type | Example | Notes |
|---|---|---|---|
| `positionCode` | string | `"LW"` | Short position code. Drives token label on pitch. |
| `gridX` | number (0-100) | `10` | Horizontal position on pitch (0 = left, 100 = right). |
| `gridY` | number (0-100) | `15` | Vertical position on pitch (0 = top/attack, 100 = bottom/defense). |

> `gridX` / `gridY` are **normalized 0-100** so the pitch component can place
> tokens with a simple `left: x%` / `top: y%` regardless of screen size.
> TxODDS may provide raw coordinates in a different range — convert before
> storing.

## 3. Current Player Fields (already available)

| Field | Type | Notes |
|---|---|---|
| `id` | number | Unique player ID |
| `name` | string | Display name |
| `number` | string \| null | Squad number |
| `starter` | boolean | true = starting XI, false = bench |
| `positionId` | number \| null | 1=GK, 2=DEF, 3=MID, 4=FWD |
| `position` | string \| null | Full position label |
| `onPitch` | boolean \| null | Live status |
| `warmingUp` | boolean \| null | Live status |

## 4. Data Flow

```
TxLINE API  →  Soccit backend  →  getLineup(pda)  →  PitchArena component
```

The Soccit backend should proxy the TxODDS lineup endpoint and augment each
player with `gridX` / `gridY` / `positionCode` and each team with `formation`.

If the TxODDS API provides a formation coordinate system (e.g. 1-12 × 1-16),
the backend converts to 0-100 normalized before returning to the frontend.

## 5. Suggested TxODDS Endpoints to Explore

Fetch the full API reference to find the endpoint that returns lineups with
formation coordinates:

- `GET /api-reference` — discover all endpoints
- Lineup / formation endpoints (search the API reference for "lineup",
  "formation", "starting eleven", or "player position")

The free World Cup tier (<https://txline.txodds.com/documentation/worldcup>)
covers World Cup and International Friendlies — sufficient for the MVP.

## 6. Fallback

While the backend is being built, the PitchArena component uses a built-in
`FORMATION_SLOTS` array that defines a default 4-3-3. When real `gridX` /
`gridY` data arrives, the component reads those values instead and
`FORMATION_SLOTS` is only used as a fallback.

## 7. Position Color Map (TCG token)

Tokens on the pitch are colored by position group:

| positionId | Position | Color token |
|---|---|---|
| 1 | Goalkeeper | `#034694` (purple) |
| 2 | Defender | `#034694` (purple, lighter variant) |
| 3 | Midfielder | `#DBA111` (gold) |
| 4 | Forward | `#ED1C24` (red) |