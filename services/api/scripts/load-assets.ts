import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, posix, relative, sep } from "node:path";
import { Binary } from "mongodb";
import { getAssetsCollection, closeMongo } from "../src/mongo.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const DEFAULT_PUBLIC_DIR = join(
  process.cwd(),
  "..",
  "..",
  "..",
  "soccit-frontend",
  "public",
);

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

const SKIP = new Set<string>([
  "assets/cards/team-home.webp",
  "assets/cards/team-away.webp",
  "assets/Vector.png",
  "app-bg1.webp",
  "assets/events/ucl-logo-white.webp",
  "field-template.svg",
  "file.svg",
  "globe.svg",
  "next.svg",
  "vercel.svg",
  "window.svg",
]);

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
  const publicDir = arg("public") ?? DEFAULT_PUBLIC_DIR;
  const files = walk(publicDir);
  const assets = await getAssetsCollection();

  let loaded = 0;
  let skipped = 0;
  for (const file of files) {
    // Public-relative path, normalised to POSIX so keys are stable across OSes.
    const rel = relative(publicDir, file).split(sep).join(posix.sep);
    const ext = extname(file).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (SKIP.has(rel) || !contentType) {
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

  console.log(
    `\nDone: ${loaded} loaded, ${skipped} skipped, from ${publicDir}`,
  );
  await closeMongo();
}

main().catch(async (err) => {
  console.error(err);
  await closeMongo();
  process.exit(1);
});
