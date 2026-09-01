/** Neon Free suspends compute after the monthly CU-hour cap. */
export function isNeonQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /compute time quota|HTTP status 402/i.test(message);
}
