import { readFileSync } from "node:fs";
import nacl from "tweetnacl";
import { config } from "../config.js";
import { logger } from "../logger.js";

export interface Credentials {
  jwt: string;
  apiToken: string;
}

async function startGuestSession(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/guest/start`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`guest/start failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("guest/start returned no token");
  return body.token;
}

function loadSecretKey(path: string): Uint8Array {
  const raw = JSON.parse(readFileSync(path, "utf8")) as number[];
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error(`expected a 64-byte secret key at ${path}`);
  }
  return Uint8Array.from(raw);
}

async function activate(
  baseUrl: string,
  jwt: string,
  txSig: string,
  leagues: number[],
  secretKey: Uint8Array,
): Promise<string> {
  const message = new TextEncoder().encode(`${txSig}:${leagues.join(",")}:${jwt}`);
  const walletSignature = Buffer.from(nacl.sign.detached(message, secretKey)).toString("base64");

  const res = await fetch(`${baseUrl}/api/token/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ txSig, walletSignature, leagues }),
  });
  if (!res.ok) {
    throw new Error(`token/activate failed: ${res.status} ${await res.text()}`);
  }

  const text = (await res.text()).trim();
  try {
    const parsed = JSON.parse(text) as { token?: string };
    if (parsed?.token) return parsed.token;
  } catch {}
  return text.replace(/^"|"$/g, "");
}

export class TokenManager {
  private creds: Credentials | undefined;

  async get(): Promise<Credentials> {
    if (this.creds) return this.creds;
    return this.refresh();
  }

  async refresh(): Promise<Credentials> {
    const { baseUrl, apiToken, txSig, leagues } = config.txline;
    const jwt = await startGuestSession(baseUrl);

    let resolvedToken = apiToken;
    if (!resolvedToken) {
      if (!txSig) {
        throw new Error(
          "No TXLINE_API_TOKEN and no TXLINE_TX_SIG. Run the one-time on-chain " +
            "subscribe (`pnpm subscribe`) and set TXLINE_TX_SIG, or paste an API token.",
        );
      }
      const secretKey = loadSecretKey(config.solana.keypairPath);
      resolvedToken = await activate(baseUrl, jwt, txSig, leagues, secretKey);
      logger.info("activated TxLINE API token from txSig");
    }

    this.creds = { jwt, apiToken: resolvedToken };
    return this.creds;
  }
}

export { startGuestSession, activate, loadSecretKey };
