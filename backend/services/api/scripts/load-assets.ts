import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, posix, relative, sep } from "node:path";
import { Binary } from "mongodb";
import { getAssetsCollection, closeMongo } from "../src/mongo.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const DEFAULT_ASSET_DIR = join(process.cwd(), "assets");

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const assetDir = arg("assets") ?? arg("public") ?? DEFAULT_ASSET_DIR;
  const files = walk(assetDir);
  const assets = await getAssetsCollection();

  let loaded = 0;
  let skipped = 0;
  for (const file of files) {
    // Asset-relative path, normalised to POSIX so keys are stable across OSes.
    const rel = relative(assetDir, file).split(sep).join(posix.sep);
    const ext = extname(file).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      skipped++;
      if (!contentType) console.warn(`skip (unknown type): ${rel}`);
      continue;
    }
    const data = readFileSync(file);
    const etag = createHash("sha1").update(data).digest("hex");
    await assets.updateOne(
      { _id: rel },
      {
        $set: {
          contentType,
          data: new Binary(data),
          etag,
          bytes: data.length,
          updatedAt: Date.now(),
        },
      },
      { upsert: true },
    );
    loaded++;
    console.log(`loaded ${rel} (${data.length} bytes, ${contentType})`);
  }

  console.log(`\nDone: ${loaded} loaded, ${skipped} skipped, from ${assetDir}`);
  await closeMongo();
}

main().catch(async (err) => {
  console.error(err);
  await closeMongo();
  process.exit(1);
});
