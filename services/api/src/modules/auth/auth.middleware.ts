import type { Context } from "hono";
import { UnauthorizedError } from "./auth.errors.js";
import { verifyToken } from "./auth.service.js";

/**
 * Asserts the request carries a valid Bearer session token whose subject
 * matches the `:wallet` route param. Returns the wallet on success; throws
 * UnauthorizedError otherwise (mapped to 401 by the caller).
 */
export function requireWallet(c: Context): string {
  const header = c.req.header("authorization") ?? c.req.header("Authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new UnauthorizedError("Missing bearer token");
  const claims = verifyToken(token);
  const wallet = c.req.param("wallet");
  if (claims.sub !== wallet) throw new UnauthorizedError("Wallet mismatch");
  return claims.sub;
}
