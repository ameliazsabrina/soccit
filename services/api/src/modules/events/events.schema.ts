import { z } from "zod";
import { pdaString } from "../match/match.schema.js";
import { resolvedPlayerSchema } from "../lineup/lineup.schema.js";

export const eventEntrySchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  players: z
    .object({
      out: resolvedPlayerSchema.nullable(),
      in: resolvedPlayerSchema.nullable(),
    })
    .optional(),
});

export const eventsInput = z.object({
  pda: pdaString,
  fromId: z.string().optional(),
});

export type EventEntry = z.infer<typeof eventEntrySchema>;
export type EventsInput = z.infer<typeof eventsInput>;
