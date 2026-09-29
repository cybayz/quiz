export interface ScoringConfig {
  basePoints: number;
  gracePeriodSeconds: number;
  pointsPerSecond: number;
  minimumCorrectPoints: number;
  negativeMarkingEnabled: boolean;
  negativePoints: number;
  allowNegativeTotal: boolean;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  basePoints: 100,
  gracePeriodSeconds: 5,
  pointsPerSecond: 1,
  minimumCorrectPoints: 0,
  negativeMarkingEnabled: false,
  negativePoints: 10,
  allowNegativeTotal: false,
};

/**
 * Calculates the score awarded for a correct answer based on elapsed time and configuration.
 * Adheres strictly to the specification:
 * - Within grace period (e.g. <= 5 sec): Full base points (e.g. 100).
 * - After grace period: Deducts pointsPerSecond for each second beyond grace period.
 * - If time reaches or exceeds basePoints / maximum time limit, score drops to minimumCorrectPoints (0).
 * - Never drops below minimumCorrectPoints.
 */
export function calculateCorrectAnswerScore(
  timeTakenSeconds: number,
  config: Partial<ScoringConfig> = {}
): number {
  const cfg = { ...DEFAULT_SCORING_CONFIG, ...config };
  const time = Math.max(0, Number(timeTakenSeconds) || 0);

  // If elapsed time is greater than or equal to basePoints, score is 0 / minimum
  if (time >= cfg.basePoints) {
    return cfg.minimumCorrectPoints;
  }

  // If answered within or at grace period, award full base points
  if (time <= cfg.gracePeriodSeconds) {
    return cfg.basePoints;
  }

  // Deduct points for each whole second spent past the grace period
  const secondsOverGrace = Math.floor(time - cfg.gracePeriodSeconds);
  const deduction = secondsOverGrace * cfg.pointsPerSecond;
  const rawScore = cfg.basePoints - deduction;

  return Math.max(cfg.minimumCorrectPoints, rawScore);
}

/**
 * Calculates points awarded or deducted for a wrong answer.
 */
export function calculateWrongAnswerScore(
  config: Partial<ScoringConfig> = {}
): number {
  const cfg = { ...DEFAULT_SCORING_CONFIG, ...config };
  if (!cfg.negativeMarkingEnabled) {
    return 0;
  }
  return -Math.abs(cfg.negativePoints);
}

/**
 * Calculates new cumulative total score, respecting allowNegativeTotal setting.
 */
export function calculateNewTotalScore(
  currentTotal: number,
  pointsDelta: number,
  allowNegativeTotal = false
): number {
  const sum = currentTotal + pointsDelta;
  if (!allowNegativeTotal && sum < 0) {
    return 0;
  }
  return sum;
}

/**
 * Calculates score percentage.
 */
export function calculatePercentage(totalScore: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  const pct = (totalScore / maxScore) * 100;
  return Math.round(pct * 10) / 10;
}

export interface LeaderboardEntry {
  id: string;
  participantName: string;
  totalScore: number;
  totalTime: number; // in seconds
  percentage: number;
  completedAt?: Date | string | null;
}

/**
 * Sorts attempts according to official tie-breaking rules:
 * 1. Highest score first
 * 2. Fastest total completion time if scores are tied
 * 3. Earliest completion time if both score and duration are tied
 */
export function sortLeaderboard<T extends { totalScore: number; totalTime: number; completedAt?: Date | string | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (a.totalTime !== b.totalTime) {
      return a.totalTime - b.totalTime;
    }
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return dateA - dateB;
  });
}

/**
 * Determines a participant's rank based on their score and total time compared to other attempts.
 */
export function determineRank(
  myScore: number,
  myTotalTime: number,
  allCompletedAttempts: Array<{ totalScore: number; totalTime: number }>
): number {
  let rank = 1;
  for (const other of allCompletedAttempts) {
    if (
      other.totalScore > myScore ||
      (other.totalScore === myScore && other.totalTime < myTotalTime)
    ) {
      rank++;
    }
  }
  return rank;
}
