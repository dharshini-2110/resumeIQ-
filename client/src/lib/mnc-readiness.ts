export function clampReadinessScore(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
}

export function calculateReadiness(values: Array<number | null | undefined>): number | null {
  const available = values.map(clampReadinessScore).filter((value): value is number => value !== null);
  return available.length ? Math.round(available.reduce((sum, value) => sum + value, 0) / available.length) : null;
}

export function calculateInterviewSignal(completedSessions: number): number | null {
  return completedSessions > 0 ? Math.min(100, 35 + completedSessions * 15) : null;
}

export function calculateMomentumSignal(currentStreak: number | null | undefined): number | null {
  return currentStreak ? Math.min(100, 30 + currentStreak * 10) : null;
}
