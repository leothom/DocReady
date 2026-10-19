// One UTC daily allowance shared across every paid model call (probe and review).
// This is a soft guard, not a hard spending cap: it denies calls once the daily
// limit is reached, but it cannot undo usage already in flight or charged upstream.
export function createDailyAllowance(limit: number, now: () => number = Date.now): () => boolean {
  if (!Number.isInteger(limit) || limit <= 0 || limit > 10000) return () => false;
  let used = 0;
  let day = -1;
  return () => {
    const time = now();
    const currentDay = Math.floor(time / 86_400_000);
    if (currentDay !== day) {
      day = currentDay;
      used = 0;
    }
    if (used >= limit) return false;
    used += 1;
    return true;
  };
}
