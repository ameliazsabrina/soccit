import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { MongoServerError } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import nacl from "tweetnacl";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

function sign(kp: Keypair, message: string): string {
  return bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey));
}

describe("persisted user and participation round-trips", () => {
  let mongod: MongoMemoryServer;
  let api: typeof import("./mongo.js");
  let users: typeof import("./modules/user/user.service.js");
  let participations: typeof import("./modules/participation/participation.service.js");

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URL = mongod.getUri();
    process.env.MONGO_DB = "soccit-api-integration";
    api = await import("./mongo.js");
    users = await import("./modules/user/user.service.js");
    participations = await import("./modules/participation/participation.service.js");
  }, 120_000);

  afterAll(async () => {
    await api?.closeMongo();
    await mongod?.stop();
  });

  it("registers and reads a user through Mongo with unique indexes enforced", async () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = users.onboardingMessage(wallet);

    await expect(
      users.registerUser({
        wallet,
        username: "persisted_user",
        avatar: "avatar-2",
        message,
        signature: sign(kp, message),
      }),
    ).resolves.toMatchObject({ wallet, username: "persisted_user", avatar: "avatar-2" });

    await expect(users.getUser(wallet)).resolves.toMatchObject({ wallet, username: "persisted_user" });

    const collection = await api.getUsersCollection();
    const indexes = await collection.indexes();
    expect(indexes.some((idx) => idx.unique && idx.key.wallet === 1)).toBe(true);
    expect(indexes.some((idx) => idx.unique && idx.key.usernameLower === 1)).toBe(true);

    await expect(collection.insertOne({
      wallet: Keypair.generate().publicKey.toBase58(),
      username: "PERSISTED_USER",
      usernameLower: "persisted_user",
      avatar: null,
      createdAt: Date.now(),
    })).rejects.toBeInstanceOf(MongoServerError);
  });

  it("reads persisted participation docs in updated order with participation indexes", async () => {
    const wallet = Keypair.generate().publicKey.toBase58();
    const collection = await api.getParticipationsCollection();

    await collection.insertMany([
      {
        wallet,
        fixtureId: 101,
        points: 1,
        final: false,
        rank: null,
        predictions: [{ kind: 0, points: 1, side: 1, outPlayerId: 11, inPlayerId: 0 }],
        _updatedAt: 100,
      } as never,
      {
        wallet,
        fixtureId: 102,
        points: 3,
        final: true,
        rank: 1,
        predictions: [{ kind: 2, points: 3, side: 2, outPlayerId: 20, inPlayerId: 21 }],
        _updatedAt: 200,
      } as never,
    ]);

    await expect(participations.getUserMatches(wallet)).resolves.toMatchObject([
      { wallet, fixtureId: 102, points: 3, rank: 1 },
      { wallet, fixtureId: 101, points: 1, rank: null },
    ]);

    const indexes = await collection.indexes();
    expect(indexes.some((idx) => idx.unique && idx.key.wallet === 1 && idx.key.fixtureId === 1)).toBe(true);
    await expect(collection.insertOne({
      wallet,
      fixtureId: 102,
      points: 0,
      final: false,
      rank: null,
      predictions: [],
    })).rejects.toBeInstanceOf(MongoServerError);
  });
});
