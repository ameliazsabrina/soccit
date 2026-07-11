import type { PlatformConfig } from "./config.schema.js";

const PLATFORM_CONFIG: PlatformConfig = {
  platformFeePct: 20,
  prizeSplit: [50, 30, 20],
  scoring: {
    scoreExact: 5,
    scoreOutcome: 3,
    subCombo: 3,
    subPartial: 1,
  },
  usdcDecimals: 6,
};

export function getPlatformConfig(): PlatformConfig {
  return PLATFORM_CONFIG;
}
