import { NextResponse } from "next/server";
import { publicEnv } from "./app/_lib/env";

function sourceOrigin(value: string): string {
  return new URL(value).origin;
}

function websocketOrigin(value: string): string {
  const url = new URL(value);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

const connectSources = [
  "'self'",
  sourceOrigin(publicEnv.apiBaseUrl),
  sourceOrigin(publicEnv.solanaRpcUrl),
  websocketOrigin(publicEnv.solanaRpcUrl),
];

const scriptSources = ["'self'", "'unsafe-inline'"];
if (process.env.NODE_ENV !== "production") scriptSources.push("'unsafe-eval'");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSources.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://flagcdn.com",
  "media-src 'self' blob:",
  `connect-src ${connectSources.join(" ")}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export function proxy() {
  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  // Wallet adapters may open an extension or web-wallet popup. Preserve popup
  // compatibility without allowing this app to be embedded by another site.
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|wav)$).*)",
  ],
};
