export type XpBreakdown = {
  pushupXp: number;
  sessionXp: number;
  vsXp: number;
  bossXp: number;
  dailyXp: number;
  badgeXp: number;
  streakXp: number;
  total: number;
};

export function getLevelFromXp(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const progress = nextLevelXp === currentLevelXp
    ? 100
    : Math.round(((safeXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress: Math.max(0, Math.min(100, progress)),
  };
}

/**
 * XP rules are intentionally centralized here. The same rules are mirrored
 * by the Supabase secure RPC in supabase/migrations.
 */
export function calculateXp(input: {
  reps: number;
  sessions: number;
  wins: number;
  draws?: number;
  bossWins?: number;
  dailyClears?: number;
  badges: number;
  streak: number;
}) {
  return getXpBreakdown(input).total;
}

export function getXpBreakdown(input: {
  reps: number;
  sessions: number;
  wins: number;
  draws?: number;
  bossWins?: number;
  dailyClears?: number;
  badges: number;
  streak: number;
}): XpBreakdown {
  const pushupXp = Math.max(0, Math.floor(input.reps));
  const sessionXp = Math.max(0, Math.floor(input.sessions * 20));
  const vsXp = Math.max(0, Math.floor(input.wins * 100 + (input.draws ?? 0) * 25));
  const bossXp = Math.max(0, Math.floor((input.bossWins ?? 0) * 100));
  const dailyXp = Math.max(0, Math.floor((input.dailyClears ?? 0) * 50));
  const badgeXp = Math.max(0, Math.floor(input.badges * 50));
  const streakXp = Math.max(0, Math.floor(input.streak * 10));
  return {
    pushupXp, sessionXp, vsXp, bossXp, dailyXp, badgeXp, streakXp,
    total: pushupXp + sessionXp + vsXp + bossXp + dailyXp + badgeXp + streakXp,
  };
}
