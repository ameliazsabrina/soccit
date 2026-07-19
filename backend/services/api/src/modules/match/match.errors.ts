export class MatchNotFoundError extends Error {
  constructor(ref: number | string) {
    super(
      typeof ref === "number"
        ? `No match found for fixture ${ref}`
        : `No match found for match account ${ref}`,
    );
    this.name = "MatchNotFoundError";
  }
}
