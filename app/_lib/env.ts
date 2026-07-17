type SolanaNetwork = "devnet" | "testnet" | "mainnet-beta";

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function requiredUrl(name: string, value: string | undefined): string {
  const configured = required(name, value);

  try {
    return new URL(configured).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
}

function requiredNetwork(value: string | undefined): SolanaNetwork {
  const network = required("NEXT_PUBLIC_SOLANA_NETWORK", value);
  if (network !== "devnet" && network !== "testnet" && network !== "mainnet-beta") {
    throw new Error(
      "NEXT_PUBLIC_SOLANA_NETWORK must be devnet, testnet, or mainnet-beta",
    );
  }

  return network;
}

// NEXT_PUBLIC_ values are intentionally public: Next.js embeds them in the
// browser bundle. Centralizing and validating them prevents a deployment from
// silently mixing devnet, mainnet, or the wrong backend.
export const publicEnv = Object.freeze({
  apiBaseUrl: requiredUrl(
    "NEXT_PUBLIC_SOCCIT_API_BASE_URL",
    process.env.NEXT_PUBLIC_SOCCIT_API_BASE_URL,
  ),
  solanaNetwork: requiredNetwork(process.env.NEXT_PUBLIC_SOLANA_NETWORK),
  solanaRpcUrl: requiredUrl(
    "NEXT_PUBLIC_SOLANA_RPC_URL",
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  ),
  solanaExplorerUrl: requiredUrl(
    "NEXT_PUBLIC_SOLANA_EXPLORER_URL",
    process.env.NEXT_PUBLIC_SOLANA_EXPLORER_URL,
  ),
  programId: required(
    "NEXT_PUBLIC_SOCCIT_PROGRAM_ID",
    process.env.NEXT_PUBLIC_SOCCIT_PROGRAM_ID,
  ),
  usdcMint: required(
    "NEXT_PUBLIC_SOCCIT_USDC_MINT",
    process.env.NEXT_PUBLIC_SOCCIT_USDC_MINT,
  ),
});
