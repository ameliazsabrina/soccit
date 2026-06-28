import { describe, expect, it } from "vitest";
import { applyPlayerData, extractLineup } from "./lineup.js";
import { RawEvent } from "../txline/types.js";
import rawLineups from "./__fixtures__/lineups.json";
import pitchBeats from "./__fixtures__/pitch-beats.json";

const lineupsEvent = (): RawEvent => RawEvent.parse(rawLineups);

describe("extractLineup (real TxLINE wire format)", () => {
  it("returns null for a non-lineups action", () => {
    expect(extractLineup({ FixtureId: 1, Action: "goal" })).toBeNull();
  });

  it("returns null when Lineups is absent", () => {
    expect(extractLineup({ FixtureId: 1, Action: "lineups" })).toBeNull();
  });

  it("maps both teams to the correct sides via participant ids", () => {
    const snap = extractLineup(lineupsEvent());
    expect(snap).not.toBeNull();
    expect(snap?.fixtureId).toBe(17588325);
    expect(snap?.teams).toHaveLength(2);
    const side1 = snap?.teams.find((t) => t.side === 1);
    const side2 = snap?.teams.find((t) => t.side === 2);
    expect(side1?.teamId).toBe(1149);
    expect(side1?.teamName).toBe("Jordan");
    expect(side2?.teamId).toBe(1489);
    expect(side2?.teamName).toBe("Argentina");
  });

  it("extracts players with number, starter flag, and position", () => {
    const snap = extractLineup(lineupsEvent());
    const jordan = snap?.teams.find((t) => t.side === 1);
    const starters = jordan?.players.filter((p) => p.starter) ?? [];
    expect(starters).toHaveLength(3);
    const keeper = jordan?.players.find((p) => p.id === 279394);
    expect(keeper).toMatchObject({ name: "Abulaila, Yazeed Moien Hasan", number: "1", positionId: 34 });
  });

  it("builds a flat normativeId -> name map across both teams", () => {
    const snap = extractLineup(lineupsEvent());
    expect(snap?.names["10282425"]).toBe("Abu Dahab, Husam");
    expect(snap?.names["1072568"]).toBe("Alvarez, Julian");
    expect(Object.keys(snap?.names ?? {})).toHaveLength(8);
  });

  it("skips teams whose normativeId matches neither participant", () => {
    const raw = lineupsEvent();
    raw.Participant2Id = 99999;
    const snap = extractLineup(raw);
    expect(snap?.teams).toHaveLength(1);
    expect(snap?.teams[0]?.side).toBe(1);
  });

  it("applies players_on_the_pitch updates to a cached lineup", () => {
    const snap = extractLineup(lineupsEvent());
    expect(snap).not.toBeNull();
    const updated = applyPlayerData(snap!, {
      FixtureId: 17588325,
      Action: "players_on_the_pitch",
      Ts: 1782610978000,
      Data: { Players: [{ PlayerId: 10282425 }, { PlayerId: 279394 }] },
    });
    const player = updated?.teams[0]?.players.find((p) => p.id === 10282425);
    expect(player?.onPitch).toBe(true);
    expect(updated?.updatedAt).toBe(1782610978000);
  });

  it("applies warming-up and jersey updates to cached players", () => {
    const snap = extractLineup(lineupsEvent());
    const warming = applyPlayerData(snap!, {
      FixtureId: 17588325,
      Action: "players_warming_up",
      Data: { PlayerIds: [1072568] },
    });
    const jersey = applyPlayerData(warming!, {
      FixtureId: 17588325,
      Action: "jersey",
      Data: { PlayerId: 1072568, JerseyNumber: 99 },
    });
    const player = jersey?.teams[1]?.players.find((p) => p.id === 1072568);
    expect(player?.warmingUp).toBe(true);
    expect(player?.number).toBe("99");
  });

  it("ignores player-data actions until the player exists in the lineup", () => {
    const snap = extractLineup(lineupsEvent());
    const updated = applyPlayerData(snap!, {
      FixtureId: 17588325,
      Action: "players_warming_up",
      Data: { PlayerIds: [123456789] },
    });
    expect(updated).toBeNull();
  });
});

// Captured live 2026-06-29 from /api/scores/updates/17926593 (a finished World
// Cup fixture, 1098 events). Empirically: players_on_the_pitch and
// players_warming_up each appear EXACTLY ONCE, pre-kickoff (Seq 13/14,
// StatusId 1, Clock 0), carry NO player payload, and 16 substitutions produce
// ZERO subsequent players_on_the_pitch beats. So the feed never sends an
// authoritative "current on-pitch set" mid-match — substitution events are the
// roster-change signal. The original "onPitch is never cleared" concern is moot.
describe("applyPlayerData against the REAL TxLINE players_on_the_pitch/warming beats", () => {
  it("is a safe no-op for the real id-less players_on_the_pitch beat (cannot corrupt onPitch)", () => {
    const snap = extractLineup(lineupsEvent())!;
    const onPitchBefore = snap.teams.flatMap((t) => t.players).map((p) => p.onPitch);
    const beat = RawEvent.parse(pitchBeats.players_on_the_pitch);
    expect(beat.Action).toBe("players_on_the_pitch");
    // real beat carries no player ids → no change is produced
    expect(applyPlayerData(snap, beat)).toBeNull();
    expect(snap.teams.flatMap((t) => t.players).map((p) => p.onPitch)).toEqual(onPitchBefore);
  });

  it("is a safe no-op for the real id-less players_warming_up beat", () => {
    const snap = extractLineup(lineupsEvent())!;
    const beat = RawEvent.parse(pitchBeats.players_warming_up);
    expect(beat.Action).toBe("players_warming_up");
    expect(applyPlayerData(snap, beat)).toBeNull();
  });

  // The real `jersey` action is a per-TEAM kit color ({Color} + top-level
  // Participant), pre-kickoff — NOT a per-player shirt-number update. Verified
  // 2026-06-29 across fixtures 18167317 (live) and 17926593. Per-player numbers
  // come from `lineups.rosterNumber` (handled by extractLineup). So applyPlayerData's
  // jersey branch (which expects PlayerId + JerseyNumber) is a safe no-op and must
  // never overwrite a player's number from a team-color beat.
  it("is a safe no-op for the real team-color jersey beat (never clobbers player numbers)", () => {
    const snap = extractLineup(lineupsEvent())!;
    const numbersBefore = snap.teams.flatMap((t) => t.players).map((p) => p.number);
    const beat = RawEvent.parse(pitchBeats.jersey);
    expect(beat.Action).toBe("jersey");
    expect((beat.Data as { Color?: string }).Color).toBeTypeOf("string");
    expect(applyPlayerData(snap, beat)).toBeNull();
    expect(snap.teams.flatMap((t) => t.players).map((p) => p.number)).toEqual(numbersBefore);
  });
});
