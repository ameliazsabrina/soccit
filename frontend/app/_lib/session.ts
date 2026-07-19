import bs58 from "bs58";
import { createSession, type SessionResponse } from "./api";

// Off-chain profile edits are authorized by a short-lived session token. The
// user signs ONE message (per wallet, per token lifetime) to obtain it; the
// token is cached in localStorage and reused for avatar/username edits so there
// are no repeated wallet popups.

type SignMessage = (message: Uint8Array) => Promise<Uint8Array>;

const STORAGE_PREFIX = "soccit.session.";
// Refresh a little before the real expiry to avoid edge-of-expiry 401s.
const EXPIRY_SKEW_MS = 30_000;

function storageKey(wallet: string): string {
  return `${STORAGE_PREFIX}${wallet}`;
}

export function getStoredSession(wallet: string): SessionResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(wallet));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionResponse;
    if (typeof parsed?.token !== "string" || typeof parsed?.expiresAt !== "number")
      return null;
    if (parsed.expiresAt - EXPIRY_SKEW_MS <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeSession(wallet: string, session: SessionResponse): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(wallet), JSON.stringify(session));
  } catch {
    // storage may be unavailable (private mode) — token simply won't persist.
  }
}

export function clearSession(wallet: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(wallet));
  } catch {
    // ignore
  }
}

/**
 * Returns a valid session token for `wallet`, prompting a single message
 * signature only when there is no cached (unexpired) token.
 */
export async function ensureSession(
  wallet: string,
  signMessage: SignMessage,
): Promise<string> {
  const cached = getStoredSession(wallet);
  if (cached) return cached.token;

  const issuedAt = Date.now();
  const message = `Soccit session: ${wallet} @ ${issuedAt}`;
  const signatureBytes = await signMessage(new TextEncoder().encode(message));
  const signature = bs58.encode(signatureBytes);

  const session = await createSession({ wallet, message, signature });
  storeSession(wallet, session);
  return session.token;
}
