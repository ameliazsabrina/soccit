import { config } from "../src/config.js";
import { startGuestSession, activate, loadSecretKey } from "../src/txline/auth.js";

async function main(): Promise<void> {
  const txSig = process.argv[2] ?? config.txline.txSig;
  if (!txSig) {
    console.error(
      "No txSig. Complete the on-chain subscribe first, then re-run:\n" +
        "  pnpm subscribe <txSig>",
    );
    process.exit(1);
  }

  const { baseUrl, leagues } = config.txline;
  console.error(`> guest session @ ${baseUrl}`);
  const jwt = await startGuestSession(baseUrl);

  console.error(`> signing activation message and activating (leagues=[${leagues.join(",")}])`);
  const secretKey = loadSecretKey(config.solana.keypairPath);
  const apiToken = await activate(baseUrl, jwt, txSig, leagues, secretKey);

  console.error("\nAPI token (set this as TXLINE_API_TOKEN):\n");
  console.log(apiToken);
}

main().catch((err) => {
  console.error("activation failed:", err);
  process.exit(1);
});
