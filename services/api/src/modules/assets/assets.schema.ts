import type { Binary } from "mongodb";

export type AssetDoc = {
  _id: string;
  contentType: string;
  data: Binary;
  etag: string;
  bytes: number;
  updatedAt: number;
};

/** A stored asset with its bytes materialised for the HTTP layer. */
export type Asset = {
  path: string;
  contentType: string;
  etag: string;
  body: Uint8Array;
};
