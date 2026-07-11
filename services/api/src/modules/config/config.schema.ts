import { z } from "zod";

export const platformConfigOutput = z.object({
  /** Platform's cut of the gross pool, as a percentage. */
  platformFeePct: z.number(),
  /** Winner split of the NET (post-fee) pool: 1st / 2nd / 3rd, as percentages. */
  prizeSplit: z.tuple([z.number(), z.number(), z.number()]),
  scoring: z.object({
    scoreExact: z.number(),
    scoreOutcome: z.number(),
    subCombo: z.number(),
    subPartial: z.number(),
  }),
  usdcDecimals: z.number(),
});

export type PlatformConfig = z.infer<typeof platformConfigOutput>;
