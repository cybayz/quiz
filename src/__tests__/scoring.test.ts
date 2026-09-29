import { describe, it, expect } from "vitest";
import {
  calculateCorrectAnswerScore,
  calculateWrongAnswerScore,
  calculateNewTotalScore,
  calculatePercentage,
  sortLeaderboard,
  determineRank,
  DEFAULT_SCORING_CONFIG,
} from "../lib/scoring";

describe("Scoring System Business Logic", () => {
  const config = {
    basePoints: 100,
    gracePeriodSeconds: 5,
    pointsPerSecond: 1,
    minimumCorrectPoints: 0,
    negativeMarkingEnabled: false,
    negativePoints: 10,
    allowNegativeTotal: false,
  };

  describe("Requirement 26 Exact Verification Cases", () => {
    it("0-5 sec -> 100 points", () => {
      expect(calculateCorrectAnswerScore(0, config)).toBe(100);
      expect(calculateCorrectAnswerScore(1, config)).toBe(100);
      expect(calculateCorrectAnswerScore(3, config)).toBe(100);
      expect(calculateCorrectAnswerScore(5, config)).toBe(100);
      expect(calculateCorrectAnswerScore(5.0, config)).toBe(100);
    });

    it("6 sec -> 99 points", () => {
      expect(calculateCorrectAnswerScore(6, config)).toBe(99);
      expect(calculateCorrectAnswerScore(6.4, config)).toBe(99);
    });

    it("7 sec -> 98 points", () => {
      expect(calculateCorrectAnswerScore(7, config)).toBe(98);
    });

    it("10 sec -> 95 points", () => {
      expect(calculateCorrectAnswerScore(10, config)).toBe(95);
    });

    it("20 sec -> 85 points", () => {
      expect(calculateCorrectAnswerScore(20, config)).toBe(85);
    });

    it("50 sec -> 55 points", () => {
      expect(calculateCorrectAnswerScore(50, config)).toBe(55);
    });

    it("100 sec -> 0 points", () => {
      expect(calculateCorrectAnswerScore(100, config)).toBe(0);
      expect(calculateCorrectAnswerScore(120, config)).toBe(0);
    });
  });

  describe("Customizable Scoring Parameters", () => {
    it("handles custom base points and custom deduction rates", () => {
      const customConfig = {
        basePoints: 200,
        gracePeriodSeconds: 10,
        pointsPerSecond: 2,
        minimumCorrectPoints: 10,
        negativeMarkingEnabled: false,
        negativePoints: 10,
        allowNegativeTotal: false,
      };

      // within 10s grace
      expect(calculateCorrectAnswerScore(8, customConfig)).toBe(200);
      expect(calculateCorrectAnswerScore(10, customConfig)).toBe(200);

      // 15s -> 5s over grace -> 5 * 2 = 10 deduction -> 190
      expect(calculateCorrectAnswerScore(15, customConfig)).toBe(190);

      // never drops below minimumCorrectPoints (10)
      expect(calculateCorrectAnswerScore(150, customConfig)).toBe(10);
      expect(calculateCorrectAnswerScore(250, customConfig)).toBe(10);
    });
  });

  describe("Negative Marking Rules", () => {
    it("returns 0 points for wrong answer when negative marking is OFF", () => {
      expect(
        calculateWrongAnswerScore({
          negativeMarkingEnabled: false,
          negativePoints: 10,
        })
      ).toBe(0);
    });

    it("returns negative points for wrong answer when negative marking is ON", () => {
      expect(
        calculateWrongAnswerScore({
          negativeMarkingEnabled: true,
          negativePoints: 10,
        })
      ).toBe(-10);

      expect(
        calculateWrongAnswerScore({
          negativeMarkingEnabled: true,
          negativePoints: 25,
        })
      ).toBe(-25);
    });
  });

  describe("Total Score Clamping & Negative Total Protection", () => {
    it("prevents negative overall total when allowNegativeTotal is false", () => {
      // Starting with 5 points, penalty -10 -> 0 (not -5)
      expect(calculateNewTotalScore(5, -10, false)).toBe(0);

      // Starting with 0 points, penalty -10 -> 0
      expect(calculateNewTotalScore(0, -10, false)).toBe(0);
    });

    it("allows negative overall total when allowNegativeTotal is true", () => {
      expect(calculateNewTotalScore(5, -10, true)).toBe(-5);
      expect(calculateNewTotalScore(0, -10, true)).toBe(-10);
    });

    it("correctly accumulates positive scores", () => {
      expect(calculateNewTotalScore(100, 95, false)).toBe(195);
    });
  });

  describe("Percentage Calculation", () => {
    it("computes accurate percentage rounded to 1 decimal place", () => {
      expect(calculatePercentage(847, 1000)).toBe(84.7);
      expect(calculatePercentage(100, 100)).toBe(100);
      expect(calculatePercentage(0, 1000)).toBe(0);
      expect(calculatePercentage(50, 0)).toBe(0);
    });
  });

  describe("Leaderboard Sorting and Tie-breaking", () => {
    const attempts = [
      { id: "1", participantName: "Alice", totalScore: 800, totalTime: 90 },
      { id: "2", participantName: "Bob", totalScore: 900, totalTime: 120 },
      { id: "3", participantName: "Charlie", totalScore: 900, totalTime: 95 }, // Tied score with Bob, but faster!
      { id: "4", participantName: "David", totalScore: 750, totalTime: 40 },
    ];

    it("sorts by highest score first, then fastest completion time as tie-breaker", () => {
      const sorted = sortLeaderboard(attempts);
      expect(sorted[0].participantName).toBe("Charlie"); // 900 pts, 95s
      expect(sorted[1].participantName).toBe("Bob");     // 900 pts, 120s
      expect(sorted[2].participantName).toBe("Alice");   // 800 pts, 90s
      expect(sorted[3].participantName).toBe("David");   // 750 pts, 40s
    });

    it("determines rank accurately including tie-breaker", () => {
      const charlieRank = determineRank(900, 95, attempts);
      const bobRank = determineRank(900, 120, attempts);
      const aliceRank = determineRank(800, 90, attempts);

      expect(charlieRank).toBe(1);
      expect(bobRank).toBe(2);
      expect(aliceRank).toBe(3);
    });
  });
});
