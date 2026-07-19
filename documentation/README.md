---
description: Brief technical documentation for the Soccit prediction-market & settlement submission (TxODDS World Cup Track).
---

# Introduction

**Soccit** is a gamified football prediction market built on **Solana**, powered end‑to‑end
by the **TxODDS TxLINE** live data feed. Fans predict *what happens inside a match* —
substitutions, final scores, and (soon) goalscorers — lock those predictions into an
on‑chain match vault, and are scored and paid out automatically from the same feed that
referees the real game.

This GitBook is the **Brief Technical Documentation** for our submission. It covers three
things:

1. **Core idea** — what Soccit is and the prediction → settlement loop it closes.
2. **Business & technical highlights** — why it matters and how it is built.
3. **The specific TxLINE endpoints we used** — the exact TxODDS surface our pipeline
   consumes, both HTTP and on‑chain.

## At a glance

| | |
|---|---|
| **Category** | Prediction Markets & Settlement (World Cup Track) |
| **Data provider** | TxODDS — TxLINE Soccer feed, **Service Level 12** (free real‑time World Cup & International Friendlies) |
| **Chain** | Solana (program live on **devnet**; TxLINE subscription paid once on **mainnet**) |
| **On‑chain program** | `TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v` |
| **Frontend** | Next.js 16 · React 19 · Tailwind 4 · Solana wallet‑adapter |
| **Backend** | Node/TypeScript services — Hono + tRPC API, TxLINE worker, scoring projector, settlement keeper (MongoDB + Redis) |

## Repository layout

Everything lives in one repository (`ameliazsabrina/soccit`, `main`), split into two
workspaces:

* **`backend/`** — the Anchor program (`backend/programs/soccit`) plus the TypeScript
  services (`backend/services/*`): the TxLINE ingest worker, the scoring engine, the
  settlement keeper, and the read/stream API.
* **`frontend/`** — the Next.js app (`frontend/app`): match arena, live scoreboards,
  leaderboards, vault/settlement views, and wallet‑signed predictions.
* **`documentation/`** — this GitBook.

## How to read this

* Start with **[Core Idea](core-idea.md)** for the product and the prediction loop.
* **[Technical Highlights](technical-highlights.md)** and **[Business Highlights](business-highlights.md)**
  cover the *how* and the *why*.
* **[TxLINE Endpoints Used](txline-endpoints.md)** is the checklist reviewers are looking
  for — every TxODDS endpoint, with method, purpose, and where it lives in the code.
* **[Architecture Reference](architecture.md)** has the end‑to‑end data flow and the
  Soccit read/stream API surface.
