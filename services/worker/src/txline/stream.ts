import { config } from "../config.js";
import { logger } from "../logger.js";
import type { TokenManager } from "./auth.js";
import { RawEvent, StreamEnvelope } from "./types.js";

export interface StreamOptions {
  tokens: TokenManager;
  fixtureId?: number;
  lastEventId?: string;
  signal?: AbortSignal;
}

interface SseMessage {
  id?: string;
  event?: string;
  data: string;
}

class SseParser {
  private buf = "";
  private id?: string;
  private event?: string;
  private data: string[] = [];

  push(chunk: string): SseMessage[] {
    this.buf += chunk;
    const out: SseMessage[] = [];
    let nl: number;
    while ((nl = this.buf.indexOf("\n")) !== -1) {
      let line = this.buf.slice(0, nl);
      this.buf = this.buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);

      if (line === "") {
        if (this.data.length > 0 || this.id || this.event) {
          out.push({ id: this.id, event: this.event, data: this.data.join("\n") });
        }
        this.id = undefined;
        this.event = undefined;
        this.data = [];
        continue;
      }
      if (line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);

      if (field === "id") this.id = value;
      else if (field === "event") this.event = value;
      else if (field === "data") this.data.push(value);
    }
    return out;
  }
}

export async function* streamScores(opts: StreamOptions): AsyncGenerator<RawEvent> {
  const { tokens, fixtureId, signal } = opts;
  let lastEventId = opts.lastEventId;
  let backoff = 1000;
  const maxBackoff = 30_000;

  const url = new URL(`${config.txline.baseUrl}/api/scores/stream`);
  if (fixtureId != null) url.searchParams.set("fixtureId", String(fixtureId));

  while (!signal?.aborted) {
    let creds = await tokens.get();
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${creds.jwt}`,
        "X-Api-Token": creds.apiToken,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      };
      if (lastEventId) headers["Last-Event-ID"] = lastEventId;

      const res = await fetch(url, { headers, signal });

      if (res.status === 401) {
        logger.warn("scores stream 401 — refreshing credentials");
        creds = await tokens.refresh();
        continue;
      }
      if (!res.ok || !res.body) {
        throw new Error(`scores stream ${res.status}: ${await res.text().catch(() => "")}`);
      }

      logger.info({ fixtureId, resumeFrom: lastEventId }, "scores stream connected");
      backoff = 1000;

      const parser = new SseParser();
      const decoder = new TextDecoder();
      const reader = res.body.getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const msg of parser.push(decoder.decode(value, { stream: true }))) {
          if (!msg.data) continue;
          let json: unknown;
          try {
            json = JSON.parse(msg.data);
          } catch {
            logger.debug({ data: msg.data }, "non-JSON SSE frame, skipping");
            continue;
          }
          if ((json as { event?: string }).event === "heartbeat") continue;

          const parsed = StreamEnvelope.safeParse(json);
          if (!parsed.success) {
            const bare = RawEvent.safeParse(json);
            if (!bare.success) {
              logger.debug({ json }, "unrecognized SSE payload, skipping");
              continue;
            }
            if (msg.id) lastEventId = msg.id;
            yield bare.data;
            continue;
          }
          lastEventId = parsed.data.id ?? msg.id ?? lastEventId;
          yield parsed.data.data;
        }
      }
    } catch (err) {
      if (signal?.aborted) return;
      logger.warn({ err: String(err), backoff }, "scores stream dropped — reconnecting");
      await sleep(backoff, signal);
      backoff = Math.min(backoff * 2, maxBackoff);
    }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      res();
    }, { once: true });
  });
}
