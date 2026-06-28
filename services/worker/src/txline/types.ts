import { z } from "zod";

export const Clock = z
  .object({
    Running: z.boolean().optional(),
    Seconds: z.number().optional(),
  })
  .passthrough();

export const EventData = z
  .object({
    Participant: z.number().optional(),
    PlayerInId: z.number().optional(),
    PlayerOutId: z.number().optional(),
    PlayerId: z.number().optional(),
    GoalType: z.string().optional(),
    StatusId: z.number().optional(),
    Minutes: z.number().optional(),
  })
  .passthrough();

export const LineupPlayer = z
  .object({
    rosterNumber: z.string().optional(),
    starter: z.boolean().optional(),
    positionId: z.number().optional(),
    player: z
      .object({
        normativeId: z.number().optional(),
        preferredName: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const LineupTeam = z
  .object({
    normativeId: z.number().optional(),
    preferredName: z.string().optional(),
    lineups: z.array(LineupPlayer).optional(),
  })
  .passthrough();

export const RawEvent = z
  .object({
    FixtureId: z.number(),
    Action: z.string().optional(),
    GameState: z.string().optional(),
    StatusId: z.number().optional(),
    Clock: Clock.optional(),
    StartTime: z.number().optional(),
    CompetitionId: z.number().optional(),
    Participant1Id: z.number().optional(),
    Participant2Id: z.number().optional(),
    Participant1IsHome: z.boolean().optional(),
    Ts: z.number().optional(),
    Id: z.number().optional(),
    Seq: z.number().optional(),
    Data: EventData.optional(),
    Stats: z.record(z.string(), z.number()).optional(),
    Lineups: z.array(LineupTeam).optional(),
  })
  .passthrough();

export type RawEvent = z.infer<typeof RawEvent>;
export type EventData = z.infer<typeof EventData>;
export type LineupTeam = z.infer<typeof LineupTeam>;
export type LineupPlayer = z.infer<typeof LineupPlayer>;

export const StreamEnvelope = z
  .object({
    id: z.string().optional(),
    data: RawEvent,
  })
  .passthrough();

export type StreamEnvelope = z.infer<typeof StreamEnvelope>;

export function matchMinute(raw: RawEvent): number | undefined {
  const s = raw.Clock?.Seconds;
  return s == null ? undefined : Math.floor(s / 60);
}
