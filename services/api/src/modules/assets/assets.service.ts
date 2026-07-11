import { getAssetsCollection } from "../../mongo.js";
import type { Asset } from "./assets.schema.js";

export async function getAsset(path: string): Promise<Asset | null> {
  const assets = await getAssetsCollection();
  const doc = await assets.findOne({ _id: path });
  if (!doc) return null;
  return {
    path: doc._id,
    contentType: doc.contentType,
    etag: doc.etag,
    body: new Uint8Array(doc.data.buffer),
  };
}
