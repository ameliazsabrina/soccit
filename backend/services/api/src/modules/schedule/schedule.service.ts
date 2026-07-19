import { txlineGet } from "../../txline.js";
import {
  type RawFixture,
  type ScheduleFixture,
  type ScheduleInput,
  rawFixture,
  scheduleOutput,
} from "./schedule.schema.js";

/** Map a raw TxLINE fixture to the trimmed schedule shape the frontend uses. */
export function toScheduleFixture(raw: RawFixture): ScheduleFixture {
  return {
    fixtureId: raw.FixtureId,
    startTime: raw.StartTime ?? null,
    competition: raw.Competition ?? null,
    competitionId: raw.CompetitionId ?? null,
    team1: { id: raw.Participant1Id ?? null, name: raw.Participant1 ?? null },
    team2: { id: raw.Participant2Id ?? null, name: raw.Participant2 ?? null },
    team1IsHome: raw.Participant1IsHome ?? null,
  };
}

export async function listSchedule(
  input: ScheduleInput = {},
): Promise<ScheduleFixture[]> {
  const body = await txlineGet("/api/fixtures/snapshot", {
    startEpochDay: input.startEpochDay,
    competitionId: input.competitionId,
  });

  const arr = Array.isArray(body) ? body : [body];
  const fixtures: ScheduleFixture[] = [];
  for (const item of arr) {
    const parsed = rawFixture.safeParse(item);
    if (parsed.success) fixtures.push(toScheduleFixture(parsed.data));
  }
  fixtures.sort(
    (a, b) => (a.startTime ?? Infinity) - (b.startTime ?? Infinity),
  );
  return scheduleOutput.parse(fixtures);
}
