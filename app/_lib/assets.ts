/** Resolve an asset key through the frontend's proxy to the Mongo-backed API. */
export function assetUrl(path: string): string {
  const key = path.replace(/^\/+/, "");
  return `/api/assets/${key}`;
}
