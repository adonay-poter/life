export function estimateTokensFromText(value: string | null | undefined): number {
  if (!value) return 0;
  return Math.ceil(value.length / 4);
}
