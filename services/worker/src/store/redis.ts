import { Redis } from "ioredis";
import { PublicKey } from "@solana/web3.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import type { DomainEvent } from "../domain/events.js";
import type { LineupSnapshot } from "../domain/lineup.js";
import { matchMinute, type RawEvent } from "../txline/types.js";

const LAST_EVENT_ID_KEY = "txline:scores:lastEventId";
const WORKER_HEARTBEAT_KEY = "txline:worker:heartbeat";
const LAST_BEAT_AT_KEY = "txline:scores:lastBeatAt";
const fixtureKey = (id: number) => `fixture:${id}`;
const eventStreamKey = (id: number) => `events:${id}`;
const lineupKey = (id: number) => `lineup:${id}`;
const matchPdaKey = (pda: string) => `matchpda:${pda}`;

const MATCH_SEED = Buffer.from("match");
const PROGRAM_ID = new PublicKey(config.solana.programId);

function matchPda(fixtureId: number): string {
  const idLe = Buffer.alloc(8);
  idLe.writeBigUInt64LE(BigInt(fixtureId));
  return PublicKey.findProgramAddressSync(
    [MATCH_SEED, idLe],
    PROGRAM_ID,
  )[0].toBase58();
}

export class RedisStore {
  private redis: Redis;

  constructor(url = config.redis.url) {
    this.redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    this.redis.on("error", (err) =>
      logger.warn({ err: String(err) }, "redis error"),
    );
  }

  async init(): Promise<void> {
    await this.redis.connect();
    logger.info("redis connected");
  }

  async getLastEventId(): Promise<string | undefined> {
    return (await this.redis.get(LAST_EVENT_ID_KEY)) ?? undefined;
  }

  async setLastEventId(id: string): Promise<void> {
    await this.redis.set(LAST_EVENT_ID_KEY, id);
  }
  async heartbeat(): Promise<void> {
    await this.redis.set(WORKER_HEARTBEAT_KEY, String(Date.now()));
  }

  async recordBeat(): Promise<void> {
    await this.redis.set(LAST_BEAT_AT_KEY, String(Date.now()));
  }

  async hasFixture(fixtureId: number): Promise<boolean> {
    return (await this.redis.exists(fixtureKey(fixtureId))) === 1;
  }

  async persist(raw: RawEvent, events: DomainEvent[]): Promise<void> {
    const pipe = this.redis.pipeline();

    const stats = raw.Stats ?? {};
    const fields: Record<string, string> = {
      fixtureId: String(raw.FixtureId),
      statusId: String(raw.StatusId ?? ""),
      minute: String(matchMinute(raw) ?? ""),
      goals1: String(stats["1"] ?? 0),
      goals2: String(stats["2"] ?? 0),
      ts: String(raw.Ts ?? Date.now()),
    };
    if (events.some((e) => e.type === "status" && e.terminal)) {
      fields.terminal = "1";
    }
    pipe.hset(fixtureKey(raw.FixtureId), fields);
    pipe.set(matchPdaKey(matchPda(raw.FixtureId)), String(raw.FixtureId));

    for (const e of events) {
      pipe.xadd(
        eventStreamKey(raw.FixtureId),
        "MAXLEN",
        "~",
        "5000",
        "*",
        "type",
        e.type,
        "json",
        JSON.stringify(e),
      );
    }

    await pipe.exec();
  }

  async writeLineup(snap: LineupSnapshot): Promise<void> {
    await this.redis
      .pipeline()
      .set(lineupKey(snap.fixtureId), JSON.stringify(snap))
      .set(matchPdaKey(matchPda(snap.fixtureId)), String(snap.fixtureId))
      .exec();
  }

  async writeProvisionalLineup(snap: LineupSnapshot): Promise<boolean> {
    const existing = await this.redis.get(lineupKey(snap.fixtureId));
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as LineupSnapshot;
        const hasPlayers = parsed.teams?.some((t) => t.players?.length > 0);
        if (hasPlayers) {
          await this.redis.set(
            matchPdaKey(matchPda(snap.fixtureId)),
            String(snap.fixtureId),
          );
          return false;
        }
      } catch {}
    }
    await this.redis
      .pipeline()
      .set(lineupKey(snap.fixtureId), JSON.stringify(snap))
      .set(matchPdaKey(matchPda(snap.fixtureId)), String(snap.fixtureId))
      .exec();
    return true;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
