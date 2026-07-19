import { Keypair } from "@solana/web3.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "./index.js";
import { listMatches, getMatchState } from "./modules/match/match.service.js";
import { resolveFixtureId } from "./modules/match/pda.js";
import { MatchNotFoundError } from "./modules/match/match.errors.js";
import { listSchedule } from "./modules/schedule/schedule.service.js";
import { TxlineNotConfiguredError } from "./txline.js";
import { preparePrediction } from "./modules/prediction/prediction.service.js";
import { MatchNotOpenError } from "./modules/prediction/prediction.errors.js";
import {
  getUser,
  listAvatars,
  registerUser,
  setAvatar,
  setUsername,
} from "./modules/user/user.service.js";
import { issueToken } from "./modules/auth/auth.service.js";
import {
  InvalidSignatureError,
  UserNotFoundError,
  UsernameTakenError,
  WalletAlreadyRegisteredError,
} from "./modules/user/user.errors.js";
import { getUserMatches } from "./modules/participation/participation.service.js";
import { getPortfolio } from "./modules/portfolio/portfolio.service.js";
import { RpcUnavailableError } from "./modules/portfolio/portfolio.errors.js";
import { getLeaderboard } from "./modules/leaderboard/leaderboard.service.js";
import { LeaderboardNotReadyError } from "./modules/leaderboard/leaderboard.errors.js";
import { getLineup } from "./modules/lineup/lineup.service.js";
import { LineupNotReadyError } from "./modules/lineup/lineup.errors.js";
import { getAsset } from "./modules/assets/assets.service.js";

vi.mock("./modules/match/pda.js", async (importActual) => {
  const actual = await importActual<typeof import("./modules/match/pda.js")>();
  return { ...actual, resolveFixtureId: vi.fn() };
});
vi.mock("./modules/match/match.service.js", () => ({
  listMatches: vi.fn(),
  getMatchState: vi.fn(),
  toLiveMatch: vi.fn(() => null),
}));
vi.mock("./modules/schedule/schedule.service.js", () => ({
  listSchedule: vi.fn(),
}));
vi.mock("./modules/prediction/prediction.service.js", () => ({
  preparePrediction: vi.fn(),
}));
vi.mock("./modules/user/user.service.js", () => ({
  registerUser: vi.fn(),
  getUser: vi.fn(),
  setAvatar: vi.fn(),
  setUsername: vi.fn(),
  listAvatars: vi.fn(),
  loadUserProfiles: vi.fn(),
}));
vi.mock("./modules/participation/participation.service.js", () => ({
  getUserMatches: vi.fn(),
}));
vi.mock("./modules/portfolio/portfolio.service.js", () => ({
  getPortfolio: vi.fn(),
}));
vi.mock("./modules/leaderboard/leaderboard.service.js", () => ({
  getLeaderboard: vi.fn(),
  // referenced by the leaderboard stream route at import time
  leaderboardKey: (id: number) => `lb:${id}`,
  parseLeaderboard: vi.fn(),
  enrichLeaderboard: vi.fn(),
}));
vi.mock("./modules/lineup/lineup.service.js", () => ({
  getLineup: vi.fn(),
  loadPlayerIndex: vi.fn(),
}));
vi.mock("./modules/assets/assets.service.js", () => ({
  getAsset: vi.fn(),
}));

const VALID_PDA = Keypair.generate().publicKey.toBase58();
const BAD_PDA = "not-a-valid-pda-0OIl";
const WALLET = Keypair.generate().publicKey.toBase58();
const FIXTURE_ID = 18172379;

const FIXTURE = {
  fixtureId: FIXTURE_ID,
  startTime: 1_700_000_000,
  competition: "World Cup",
  competitionId: 7,
  team1: { id: 1, name: "USA" },
  team2: { id: 2, name: "Bosnia" },
  team1IsHome: true,
};

beforeEach(() => {
  vi.mocked(resolveFixtureId).mockResolvedValue(FIXTURE_ID);
});
afterEach(() => vi.clearAllMocks());

describe("GET /healthz", () => {
  it("returns ok plus best-effort worker/feed probes", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      worker: { alive: false, heartbeatAgeMs: null },
      feed: { lastBeatAgeMs: null },
    });
  });
});

describe("GET /api/matches", () => {
  it("returns the match list as JSON", async () => {
    const matches = [{ matchAccount: VALID_PDA, fixtureId: FIXTURE_ID }];
    vi.mocked(listMatches).mockResolvedValue(matches as never);
    const res = await app.request("/api/matches");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(matches);
  });
});

describe("GET /api/config", () => {
  it("returns server-authoritative game rules matching on-chain + scoring", async () => {
    const res = await app.request("/api/config");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      platformFeePct: 20,
      prizeSplit: [50, 30, 20],
      scoring: { scoreExact: 5, scoreOutcome: 3, subCombo: 3, subPartial: 1 },
      usdcDecimals: 6,
    });
  });
});

describe("GET /api/competitions", () => {
  it("returns the competition catalog with relative asset paths", async () => {
    const res = await app.request("/api/competitions");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      slug: string;
      bannerBg: string;
      logo: string;
      comingSoon: boolean;
    }>;
    expect(body.map((c) => c.slug)).toEqual(["worldcup", "ucl"]);
    // Asset paths are public-relative (no leading slash) so the frontend can
    // serve them from either public/ or the api's /api/assets route.
    for (const c of body) {
      expect(c.bannerBg.startsWith("/")).toBe(false);
      expect(c.logo.startsWith("/")).toBe(false);
    }
    expect(body.find((c) => c.slug === "ucl")?.comingSoon).toBe(true);
  });
});

describe("GET /api/competitions/:slug/bracket", () => {
  it("returns the world cup knockout structure (server-authoritative)", async () => {
    const res = await app.request("/api/competitions/worldcup/bracket");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      updatedAt: number;
      rounds: Array<{
        shortName: string;
        matches: Array<{
          fixtureId: number | null;
          status: string;
          homeScore: number | null;
          winner: string | null;
          home: { code: string; advancing: boolean; eliminated: boolean };
        }>;
      }>;
    };
    expect(body.rounds.map((r) => r.shortName)).toEqual([
      "R32",
      "R16",
      "QF",
      "SF",
      "Final",
    ]);
    expect(body.rounds[0]?.matches).toHaveLength(8);
    // Every slot is still unpinned → scheduled, no scores, nobody advancing.
    for (const round of body.rounds) {
      for (const match of round.matches) {
        expect(match.fixtureId).toBeNull();
        expect(match.status).toBe("scheduled");
        expect(match.homeScore).toBeNull();
        expect(match.winner).toBeNull();
        expect(match.home.advancing).toBe(false);
        expect(match.home.eliminated).toBe(false);
      }
    }
  });

  it("does NOT collide with the /api/events/:pda SSE route", async () => {
    // A bogus slug still hits the bracket handler (404), not the SSE route.
    const res = await app.request("/api/competitions/nope/bracket");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: expect.any(String) });
  });
});

describe("GET /api/schedule", () => {
  it("returns the schedule as JSON", async () => {
    vi.mocked(listSchedule).mockResolvedValue([FIXTURE] as never);
    const res = await app.request("/api/schedule");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([FIXTURE]);
    expect(listSchedule).toHaveBeenCalledWith({});
  });

  it("forwards coerced query params to the service", async () => {
    vi.mocked(listSchedule).mockResolvedValue([]);
    const res = await app.request(
      "/api/schedule?startEpochDay=20000&competitionId=7",
    );
    expect(res.status).toBe(200);
    expect(listSchedule).toHaveBeenCalledWith({
      startEpochDay: 20000,
      competitionId: 7,
    });
  });

  it("rejects a non-numeric query param with 400", async () => {
    const res = await app.request("/api/schedule?startEpochDay=abc");
    expect(res.status).toBe(400);
    expect(listSchedule).not.toHaveBeenCalled();
  });

  it("maps a missing TxLINE token to 503", async () => {
    vi.mocked(listSchedule).mockRejectedValue(new TxlineNotConfiguredError());
    const res = await app.request("/api/schedule");
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: expect.any(String) });
  });
});

describe("GET /api/match/:pda", () => {
  it("resolves the PDA and returns match state", async () => {
    const state = { fixtureId: FIXTURE_ID, status: "open" };
    vi.mocked(getMatchState).mockResolvedValue(state as never);
    const res = await app.request(`/api/match/${VALID_PDA}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(state);
    expect(resolveFixtureId).toHaveBeenCalledWith(VALID_PDA);
    expect(getMatchState).toHaveBeenCalledWith(FIXTURE_ID);
  });

  it("rejects a malformed address with 400", async () => {
    const res = await app.request(`/api/match/${BAD_PDA}`);
    expect(res.status).toBe(400);
    expect(resolveFixtureId).not.toHaveBeenCalled();
  });

  it("maps an unknown PDA to 404", async () => {
    vi.mocked(resolveFixtureId).mockRejectedValue(
      new MatchNotFoundError(VALID_PDA),
    );
    const res = await app.request(`/api/match/${VALID_PDA}`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/prediction/prepare", () => {
  const body = {
    wallet: WALLET,
    fixtureId: FIXTURE_ID,
    side: 1,
    kind: 0,
    outPlayerId: 11,
    inPlayerId: 0,
    lockMinute: 45,
  };

  const post = (payload: unknown) =>
    app.request("/api/prediction/prepare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  it("returns the prepared transaction", async () => {
    const prepared = { transaction: "base64tx", fixtureId: FIXTURE_ID };
    vi.mocked(preparePrediction).mockResolvedValue(prepared as never);
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(prepared);
    expect(preparePrediction).toHaveBeenCalledWith(body);
  });

  it("rejects an invalid body with 400", async () => {
    const res = await post({ ...body, side: 9 });
    expect(res.status).toBe(400);
    expect(preparePrediction).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON body with 400", async () => {
    const res = await app.request("/api/prediction/prepare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    expect(preparePrediction).not.toHaveBeenCalled();
  });

  it("maps an unknown match to 404", async () => {
    vi.mocked(preparePrediction).mockRejectedValue(
      new MatchNotFoundError(FIXTURE_ID),
    );
    const res = await post(body);
    expect(res.status).toBe(404);
  });

  it("maps a closed match to 409", async () => {
    vi.mocked(preparePrediction).mockRejectedValue(
      new MatchNotOpenError(FIXTURE_ID, "settled"),
    );
    const res = await post(body);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/user", () => {
  const body = {
    wallet: WALLET,
    username: "keeper_1",
    avatar: "avatar-2",
    message: "onboard",
    signature: "sig",
  };

  const post = (payload: unknown) =>
    app.request("/api/user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  it("registers a user", async () => {
    const profile = {
      wallet: WALLET,
      username: "keeper_1",
      avatar: "avatar-2",
    };
    vi.mocked(registerUser).mockResolvedValue(profile as never);
    const res = await post(body);
    expect(res.status).toBe(200);
    // Registration now returns the profile plus an immediate session token.
    const json = (await res.json()) as { session: { token: string } };
    expect(json).toMatchObject(profile);
    expect(typeof json.session.token).toBe("string");
    expect(registerUser).toHaveBeenCalledWith(body);
  });

  it("rejects an invalid username with 400", async () => {
    const res = await post({ ...body, username: "no" });
    expect(res.status).toBe(400);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("maps a bad signature to 401", async () => {
    vi.mocked(registerUser).mockRejectedValue(new InvalidSignatureError());
    const res = await post(body);
    expect(res.status).toBe(401);
  });

  it("maps a taken username to 409", async () => {
    vi.mocked(registerUser).mockRejectedValue(
      new UsernameTakenError("keeper_1"),
    );
    const res = await post(body);
    expect(res.status).toBe(409);
  });

  it("maps an already-registered wallet to 409", async () => {
    vi.mocked(registerUser).mockRejectedValue(
      new WalletAlreadyRegisteredError(WALLET),
    );
    const res = await post(body);
    expect(res.status).toBe(409);
  });
});

describe("GET /api/user/:wallet", () => {
  it("returns the profile", async () => {
    const profile = { wallet: WALLET, username: "keeper_1", avatar: null };
    vi.mocked(getUser).mockResolvedValue(profile as never);
    const res = await app.request(`/api/user/${WALLET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(profile);
    expect(getUser).toHaveBeenCalledWith(WALLET);
  });

  it("rejects a too-short wallet with 400", async () => {
    const res = await app.request("/api/user/short");
    expect(res.status).toBe(400);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("maps an unknown wallet to 404", async () => {
    vi.mocked(getUser).mockRejectedValue(new UserNotFoundError(WALLET));
    const res = await app.request(`/api/user/${WALLET}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/user/:wallet/avatar", () => {
  const token = () => issueToken(WALLET).token;
  const patch = (payload: unknown, auth?: string) =>
    app.request(`/api/user/${WALLET}/avatar`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(auth === undefined ? {} : { authorization: auth }),
      },
      body: JSON.stringify(payload),
    });

  it("updates with a valid bearer token", async () => {
    const profile = {
      wallet: WALLET,
      username: "keeper_1",
      avatar: "avatar-3",
    };
    vi.mocked(setAvatar).mockResolvedValue(profile as never);
    const res = await patch({ avatar: "avatar-3" }, `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(profile);
    expect(setAvatar).toHaveBeenCalledWith({
      wallet: WALLET,
      avatar: "avatar-3",
    });
  });

  it("rejects a missing bearer token with 401", async () => {
    const res = await patch({ avatar: "avatar-3" });
    expect(res.status).toBe(401);
    expect(setAvatar).not.toHaveBeenCalled();
  });

  it("rejects a token for a different wallet with 401", async () => {
    const other = issueToken(Keypair.generate().publicKey.toBase58()).token;
    const res = await patch({ avatar: "avatar-3" }, `Bearer ${other}`);
    expect(res.status).toBe(401);
    expect(setAvatar).not.toHaveBeenCalled();
  });

  it("rejects an unknown avatar id with 400", async () => {
    const res = await patch({ avatar: "avatar-99" }, `Bearer ${token()}`);
    expect(res.status).toBe(400);
    expect(setAvatar).not.toHaveBeenCalled();
  });

  it("maps an unknown wallet to 404", async () => {
    vi.mocked(setAvatar).mockRejectedValue(new UserNotFoundError(WALLET));
    const res = await patch({ avatar: "avatar-3" }, `Bearer ${token()}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/user/:wallet/username", () => {
  const token = () => issueToken(WALLET).token;
  const patch = (payload: unknown, auth?: string) =>
    app.request(`/api/user/${WALLET}/username`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(auth === undefined ? {} : { authorization: auth }),
      },
      body: JSON.stringify(payload),
    });

  it("updates with a valid bearer token", async () => {
    const profile = {
      wallet: WALLET,
      username: "new_name",
      avatar: "avatar-3",
    };
    vi.mocked(setUsername).mockResolvedValue(profile as never);
    const res = await patch({ username: "new_name" }, `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(profile);
    expect(setUsername).toHaveBeenCalledWith({
      wallet: WALLET,
      username: "new_name",
    });
  });

  it("rejects a missing bearer token with 401", async () => {
    const res = await patch({ username: "new_name" });
    expect(res.status).toBe(401);
    expect(setUsername).not.toHaveBeenCalled();
  });

  it("rejects an invalid username with 400", async () => {
    const res = await patch({ username: "no" }, `Bearer ${token()}`);
    expect(res.status).toBe(400);
    expect(setUsername).not.toHaveBeenCalled();
  });

  it("maps a taken username to 409", async () => {
    vi.mocked(setUsername).mockRejectedValue(
      new UsernameTakenError("new_name"),
    );
    const res = await patch({ username: "new_name" }, `Bearer ${token()}`);
    expect(res.status).toBe(409);
  });

  it("maps an unknown wallet to 404", async () => {
    vi.mocked(setUsername).mockRejectedValue(new UserNotFoundError(WALLET));
    const res = await patch({ username: "new_name" }, `Bearer ${token()}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/user/:wallet/matches", () => {
  it("returns the participation list", async () => {
    const matches = [{ wallet: WALLET, fixtureId: FIXTURE_ID, points: 3 }];
    vi.mocked(getUserMatches).mockResolvedValue(matches as never);
    const res = await app.request(`/api/user/${WALLET}/matches`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(matches);
    expect(getUserMatches).toHaveBeenCalledWith(WALLET);
  });

  it("rejects an invalid wallet with 400", async () => {
    const res = await app.request("/api/user/short/matches");
    expect(res.status).toBe(400);
    expect(getUserMatches).not.toHaveBeenCalled();
  });
});

describe("GET /api/user/:wallet/portfolio", () => {
  it("returns the wallet's balance and active positions", async () => {
    const portfolio = {
      wallet: WALLET,
      usdcMint: null,
      usdcBalance: "5000000",
      lockedStake: "1000000",
      portfolioValue: "6000000",
      usdcDecimals: 6,
      activeCount: 1,
      positions: [{ pda: VALID_PDA, fixtureId: FIXTURE_ID }],
      updatedAt: 1,
    };
    vi.mocked(getPortfolio).mockResolvedValue(portfolio as never);
    const res = await app.request(`/api/user/${WALLET}/portfolio`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(portfolio);
    expect(getPortfolio).toHaveBeenCalledWith(WALLET);
  });

  it("rejects an invalid wallet with 400", async () => {
    const res = await app.request("/api/user/short/portfolio");
    expect(res.status).toBe(400);
    expect(getPortfolio).not.toHaveBeenCalled();
  });

  it("maps an RPC failure to 502", async () => {
    vi.mocked(getPortfolio).mockRejectedValue(new RpcUnavailableError());
    const res = await app.request(`/api/user/${WALLET}/portfolio`);
    expect(res.status).toBe(502);
  });
});

describe("GET /api/avatars", () => {
  it("returns the avatar catalog", async () => {
    const avatars = [{ id: "avatar-1", src: "/avatars/avatar-1.png" }];
    vi.mocked(listAvatars).mockReturnValue(avatars as never);
    const res = await app.request("/api/avatars");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(avatars);
  });
});

describe("GET /api/leaderboard/:pda", () => {
  it("returns the leaderboard", async () => {
    const board = { fixtureId: FIXTURE_ID, ranking: [] };
    vi.mocked(getLeaderboard).mockResolvedValue(board as never);
    const res = await app.request(`/api/leaderboard/${VALID_PDA}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(board);
    expect(getLeaderboard).toHaveBeenCalledWith(FIXTURE_ID);
  });

  it("rejects a malformed address with 400", async () => {
    const res = await app.request(`/api/leaderboard/${BAD_PDA}`);
    expect(res.status).toBe(400);
  });

  it("maps an unknown PDA to 404", async () => {
    vi.mocked(resolveFixtureId).mockRejectedValue(
      new MatchNotFoundError(VALID_PDA),
    );
    const res = await app.request(`/api/leaderboard/${VALID_PDA}`);
    expect(res.status).toBe(404);
  });

  it("maps a not-yet-ready leaderboard to 404", async () => {
    vi.mocked(getLeaderboard).mockRejectedValue(
      new LeaderboardNotReadyError(FIXTURE_ID),
    );
    const res = await app.request(`/api/leaderboard/${VALID_PDA}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/lineup/:pda", () => {
  it("returns the lineup", async () => {
    const lineup = { fixtureId: FIXTURE_ID, home: [], away: [] };
    vi.mocked(getLineup).mockResolvedValue(lineup as never);
    const res = await app.request(`/api/lineup/${VALID_PDA}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(lineup);
    expect(getLineup).toHaveBeenCalledWith(FIXTURE_ID);
  });

  it("rejects a malformed address with 400", async () => {
    const res = await app.request(`/api/lineup/${BAD_PDA}`);
    expect(res.status).toBe(400);
  });

  it("maps a not-yet-ready lineup to 404", async () => {
    vi.mocked(getLineup).mockRejectedValue(new LineupNotReadyError(FIXTURE_ID));
    const res = await app.request(`/api/lineup/${VALID_PDA}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/assets/:path", () => {
  const ASSET = {
    path: "avatars/avatar-0.webp",
    contentType: "image/webp",
    etag: "abc123",
    body: new Uint8Array([1, 2, 3, 4]),
  };

  it("serves bytes with content-type, immutable cache, and ETag", async () => {
    vi.mocked(getAsset).mockResolvedValue(ASSET as never);
    const res = await app.request(`/api/assets/${ASSET.path}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("etag")).toBe('"abc123"');
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(ASSET.body);
    expect(getAsset).toHaveBeenCalledWith(ASSET.path);
  });

  it("returns 304 when If-None-Match matches the ETag", async () => {
    vi.mocked(getAsset).mockResolvedValue(ASSET as never);
    const res = await app.request(`/api/assets/${ASSET.path}`, {
      headers: { "If-None-Match": '"abc123"' },
    });
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe('"abc123"');
  });

  it("serves a nested path via the wildcard param", async () => {
    vi.mocked(getAsset).mockResolvedValue(ASSET as never);
    const res = await app.request("/api/assets/players/df.webp");
    expect(res.status).toBe(200);
    expect(getAsset).toHaveBeenCalledWith("players/df.webp");
  });

  it("returns 404 for an unknown asset", async () => {
    vi.mocked(getAsset).mockResolvedValue(null);
    const res = await app.request("/api/assets/nope.webp");
    expect(res.status).toBe(404);
  });
});

describe("SSE stream routes: pre-stream validation", () => {
  for (const path of ["/api/events", "/api/leaderboard"]) {
    const url = (pda: string) =>
      path === "/api/leaderboard"
        ? `/api/leaderboard/${pda}/stream`
        : `/api/events/${pda}`;

    it(`${url("<pda>")} rejects a malformed address with 400`, async () => {
      const res = await app.request(url(BAD_PDA));
      expect(res.status).toBe(400);
      expect(resolveFixtureId).not.toHaveBeenCalled();
    });

    it(`${url("<pda>")} maps an unknown PDA to 404`, async () => {
      vi.mocked(resolveFixtureId).mockRejectedValue(
        new MatchNotFoundError(VALID_PDA),
      );
      const res = await app.request(url(VALID_PDA));
      expect(res.status).toBe(404);
    });
  }
});
