import { config } from "./config.js";

export class TxlineNotConfiguredError extends Error {
  constructor() {
    super(
      "TxLINE is not configured: set TXLINE_API_TOKEN to enable schedule data",
    );
    this.name = "TxlineNotConfiguredError";
  }
}

async function startGuestSession(): Promise<string> {
  const res = await fetch(`${config.txline.baseUrl}/auth/guest/start`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`guest/start failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("guest/start returned no token");
  return body.token;
}

let jwt: string | undefined;

async function jwtToken(): Promise<string> {
  if (!jwt) jwt = await startGuestSession();
  return jwt;
}

export async function txlineGet(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<unknown> {
  const apiToken = config.txline.apiToken;
  if (!apiToken) throw new TxlineNotConfiguredError();

  const url = new URL(`${config.txline.baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  const send = async (): Promise<Response> =>
    fetch(url, {
      headers: {
        Authorization: `Bearer ${await jwtToken()}`,
        "X-Api-Token": apiToken,
      },
    });

  let res = await send();
  if (res.status === 401) {
    jwt = undefined;
    res = await send();
  }
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
