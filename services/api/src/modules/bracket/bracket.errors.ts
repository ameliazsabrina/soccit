export class BracketNotFoundError extends Error {
  constructor(slug: string) {
    super(`No bracket found for competition ${slug}`);
    this.name = "BracketNotFoundError";
  }
}
