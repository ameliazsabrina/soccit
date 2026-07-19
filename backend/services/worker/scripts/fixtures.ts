import { TokenManager } from "../src/txline/auth.js";
import { listFixtures } from "../src/txline/fixtures.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const epochDay = arg("epoch-day") ? Number(arg("epoch-day")) : undefined;
  const tokens = new TokenManager();
  const fixtures = await listFixtures(tokens, epochDay);

  fixtures.sort((a, b) => (a.StartTime ?? 0) - (b.StartTime ?? 0));
  console.error(`> ${fixtures.length} fixtures\n`);
  for (const f of fixtures) {
    const when = f.StartTime
      ? new Date(f.StartTime).toISOString().slice(0, 16).replace("T", " ")
      : "??";
    const comp = (f.Competition ?? "").padEnd(22);
    console.log(
      `${when}Z  ${comp} ${f.Participant1 ?? "?"} v ${f.Participant2 ?? "?"}  fixtureId=${f.FixtureId}`,
    );
  }
}

main().catch((err) => {
  console.error("fixtures failed:", err);
  process.exit(1);
});
