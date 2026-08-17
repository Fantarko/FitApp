export function getLevelFromXp(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const progress = nextLevelXp === currentLevelXp ? 100 : Math.round(((safeXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
  return { level, currentLevelXp, nextLevelXp, progress: Math.max(0, Math.min(100, progress)) };
}

export function calculateXp(input: { reps: number; sessions: number; wins: number; badges: number; streak: number }) {
  return Math.max(0, Math.floor(input.reps + input.sessions * 20 + input.wins * 100 + input.badges * 50 + input.streak * 10));
}
