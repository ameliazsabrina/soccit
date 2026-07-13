# Arena `model=subs` — Data Requirements

This document describes the data needed to power the Substitute Manager arena
(`/matches/[pda]/arena?model=subs`) so that the pitch renders the correct
formation and each player token is placed in the right position.

## Source

Fixture and lineup membership come from the **TxLINE API** (TxODDS). TxLINE
does not currently document a tactical formation string, detailed roles such as
LB/LWF, or pitch coordinates.

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

The Soccit frontend accepts a formation string and per-player coordinates when
an upstream enrichment source supplies them. These fields are optional because
the current TxLINE payload does not supply them.

### Team-level fields to add

| Field | Type | Example | Notes |
|---|---|---|---|
| `formation` | string | `"4-3-3"` | Optional enriched formation label; not currently supplied by TxLINE. |

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
| `positionId` | number \| null | TxLINE currently uses 34=GK, 35=DEF, 36=MID, 37=FWD for the observed soccer feed. Demo data also uses 1-4. |
| `position` | string \| null | Full position label |
| `onPitch` | boolean \| null | Live status |
| `warmingUp` | boolean \| null | Live status |

## 4. Data Flow

```
TxLINE API  →  Soccit backend  →  getLineup(pda)  →  PitchArena component
```

The current Soccit backend maps TxLINE's generic position IDs to position-group
names. The frontend then counts the starting defenders, midfielders, and
forwards and renders that observed shape. For example, 4 defenders + 4
midfielders + 2 forwards renders as 4-4-2; 3 + 5 + 2 renders as 3-5-2.

The arena labels this explicitly as **Inferred lineup shape** and displays a
**TXLINE starting XI** source badge. If the response does not contain one
goalkeeper plus ten recognised outfield starters, the UI uses a neutral display
layout and does not print a formation number.

If a future enrichment source provides coordinates, the backend should convert
them to 0-100 normalized values. Exact coordinates always take precedence over
the inferred group layout.

## 5. Verified TxODDS Fields (2026-07-13)

The canonical OpenAPI schema and Soccer Feed v1.1 guide expose
`PlayerLineupData` with `fixturePlayerId`, `statusId`, `positionId`, `unitId`,
`rosterNumber`, `starter`, `starred`, and `player`.

Neither source defines `formation`, `positionCode`, `gridX`, `gridY`, or a
detailed-role field. The guide describes `positionId` only as "Position Id in
the fixture" and `unitId` only as "Unit Id"; it does not publish an enum table
that would make LB/LWF inference safe.

- OpenAPI: <https://txline.txodds.com/docs/docs.yaml>
- Soccer feed: <https://txline-docs.txodds.com/documentation/scores/soccer-feed>
- Soccer Feed v1.1 PDF: <https://txodds.github.io/tx-on-chain/assets/txodds-soccer-feed-v1.1.pdf>

### Backend recommendation

No backend change is required for the current hackathon UI as long as it
returns `id`, `starter`, `positionId`, `position`, and the roster number. Those
fields are enough to build the inferred broad shape and substitution choices.

The backend should still preserve `statusId`, `unitId`, and `starred` as
optional raw fields in its normalized lineup response. Do not derive LB/RB/LW
or a formation from them until TxODDS publishes an enum or confirms their
meaning. Keeping them now avoids another ingestion migration if that metadata
becomes documented during the hackathon.

## 6. Fallback

`PitchArena` uses exact `gridX` / `gridY` first, then unique detailed position
codes when available, then the inferred position-group shape. The index-based
4-3-3 slots are only a last resort for players with no recognizable position.

## 7. Position Color Map (TCG token)

Tokens on the pitch are colored by position group:

| positionId | Position | Color token |
|---|---|---|
| 1 | Goalkeeper | `#034694` (purple) |
| 2 | Defender | `#034694` (purple, lighter variant) |
| 3 | Midfielder | `#DBA111` (gold) |
| 4 | Forward | `#ED1C24` (red) |
