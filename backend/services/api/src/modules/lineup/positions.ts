const POSITION_LABELS: Record<number, string> = {
  34: "Goalkeeper",
  35: "Defender",
  36: "Midfielder",
  37: "Forward",
};

export function positionLabel(positionId: number | null): string | null {
  if (positionId === null) return null;
  return POSITION_LABELS[positionId] ?? null;
}
