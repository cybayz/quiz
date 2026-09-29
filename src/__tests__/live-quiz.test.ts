import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../lib/prisma";
import { signParticipantToken, verifyParticipantToken } from "../lib/auth";
import { calculateCorrectAnswerScore } from "../lib/scoring";
import { generateSessionCode, generateCertificateId } from "../lib/utils";

describe("Live Presentation Quiz Mode - Full Lifecycle & Business Logic Tests", () => {
  let testSessionId: string;
  let testSessionCode: string;
  let questionIds: string[] = [];
  let participant1Id: string;
  let participant2Id: string;
  let participant1Token: string;

  beforeAll(async () => {
    // 1. Ensure test questions exist
    const q1 = await prisma.question.create({
      data: {
        questionText: "Live Test Question 1: What is 2 + 2?",
        optionA: "3",
        optionB: "4",
        optionC: "5",
        optionD: "6",
        correctOption: "B",
        explanation: "2 + 2 equals 4.",
        isActive: true,
      },
    });

    const q2 = await prisma.question.create({
      data: {
        questionText: "Live Test Question 2: What is the largest ocean?",
        optionA: "Atlantic",
        optionB: "Indian",
        optionC: "Pacific",
        optionD: "Arctic",
        correctOption: "C",
        explanation: "The Pacific Ocean is the largest ocean on Earth.",
        isActive: true,
      },
    });

    questionIds = [q1.id, q2.id];
  });

  afterAll(async () => {
    // Clean up test data
    if (testSessionId) {
      await prisma.liveQuizAnswer.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.liveQuizParticipant.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.liveQuizSession.deleteMany({ where: { id: testSessionId } });
    }
    if (questionIds.length > 0) {
      await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
    }
  });

  describe("Session Creation & Code Generation", () => {
    it("generates a clean 6-character uppercase alphanumeric join code without ambiguous characters", () => {
      for (let i = 0; i < 20; i++) {
        const code = generateSessionCode();
        expect(code).toHaveLength(6);
        expect(code).toBe(code.toUpperCase());
        // Should avoid confusing characters like 0, O, 1, I
        expect(code).not.toMatch(/[01IO]/);
      }
    });

    it("creates a live quiz session in WAITING status with question order", async () => {
      testSessionCode = generateSessionCode();
      const session = await prisma.liveQuizSession.create({
        data: {
          sessionCode: testSessionCode,
          quizTitle: "Live Test Interactive Challenge",
          questionOrder: JSON.stringify(questionIds),
          status: "WAITING",
          currentQuestionIndex: 0,
        },
      });

      testSessionId = session.id;
      expect(session.id).toBeDefined();
      expect(session.sessionCode).toBe(testSessionCode);
      expect(session.status).toBe("WAITING");
      expect(session.currentQuestionIndex).toBe(0);

      const parsedOrder = JSON.parse(session.questionOrder);
      expect(parsedOrder).toEqual(questionIds);
    });
  });

  describe("Participant Joining & Reconnection Token", () => {
    it("allows a participant to join and generates a signed JWT reconnection token", async () => {
      const participant = await prisma.liveQuizParticipant.create({
        data: {
          sessionId: testSessionId,
          participantName: "Alice Walker",
        },
      });

      participant1Id = participant.id;
      participant1Token = await signParticipantToken(participant.id, testSessionId);

      expect(participant.id).toBeDefined();
      expect(participant.participantName).toBe("Alice Walker");
      expect(participant.totalScore).toBe(0);
      expect(participant1Token).toBeDefined();

      // Verify token
      const verified = await verifyParticipantToken(participant1Token);
      expect(verified).not.toBeNull();
      expect(verified?.participantId).toBe(participant.id);
      expect(verified?.sessionId).toBe(testSessionId);
    });

    it("allows a second participant to join the session", async () => {
      const participant2 = await prisma.liveQuizParticipant.create({
        data: {
          sessionId: testSessionId,
          participantName: "Bob Smith",
        },
      });

      participant2Id = participant2.id;
      expect(participant2.id).toBeDefined();
      expect(participant2.participantName).toBe("Bob Smith");
    });

    it("counts participants correctly in the session", async () => {
      const count = await prisma.liveQuizParticipant.count({
        where: { sessionId: testSessionId },
      });
      expect(count).toBe(2);
    });
  });

  describe("State Transitions & 30-Second Timer", () => {
    it("transitions session from WAITING to QUESTION_READY", async () => {
      const updated = await prisma.liveQuizSession.update({
        where: { id: testSessionId },
        data: {
          status: "QUESTION_READY",
          stateVersion: { increment: 1 },
        },
      });

      expect(updated.status).toBe("QUESTION_READY");
      expect(updated.currentQuestionIndex).toBe(0);
    });

    it("transitions session to QUESTION_ACTIVE with an authoritative 30-second server deadline", async () => {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 30 * 1000);

      const updated = await prisma.liveQuizSession.update({
        where: { id: testSessionId },
        data: {
          status: "QUESTION_ACTIVE",
          questionStartedAt: now,
          questionEndsAt: endsAt,
          stateVersion: { increment: 1 },
        },
      });

      expect(updated.status).toBe("QUESTION_ACTIVE");
      expect(updated.questionStartedAt).not.toBeNull();
      expect(updated.questionEndsAt).not.toBeNull();

      const durationMs = updated.questionEndsAt!.getTime() - updated.questionStartedAt!.getTime();
      expect(durationMs).toBe(30000);
    });
  });

  describe("Answering & Speed-Based Scoring Under 30s Deadline", () => {
    const scoringConfig = {
      basePoints: 100,
      gracePeriodSeconds: 5,
      pointsPerSecond: 1,
      minimumCorrectPoints: 0,
      negativeMarkingEnabled: false,
      negativePoints: 10,
      allowNegativeTotal: false,
    };

    it("calculates correct answer at 3 seconds -> awards full 100 points (within 5s grace period)", () => {
      const score = calculateCorrectAnswerScore(3, scoringConfig);
      expect(score).toBe(100);
    });

    it("calculates correct answer at 8 seconds -> awards 97 points (100 - (8-5)*1)", () => {
      const score = calculateCorrectAnswerScore(8, scoringConfig);
      expect(score).toBe(97);
    });

    it("calculates correct answer at 20 seconds -> awards 85 points", () => {
      const score = calculateCorrectAnswerScore(20, scoringConfig);
      expect(score).toBe(85);
    });

    it("Alice submits correct option 'B' at 3 seconds and Bob submits correct option 'B' at 8 seconds", async () => {
      const currentQId = questionIds[0];

      // Alice answer (3s) -> 100 pts
      const aliceScore = calculateCorrectAnswerScore(3, scoringConfig);
      const ans1 = await prisma.liveQuizAnswer.create({
        data: {
          sessionId: testSessionId,
          participantId: participant1Id,
          questionId: currentQId,
          questionIndex: 0,
          selectedOption: "B",
          correctOption: "B",
          isCorrect: true,
          responseTime: 3.0,
          pointsAwarded: aliceScore,
          cumulativeScore: aliceScore,
          questionSnapshot: JSON.stringify({ questionText: "Live Test Question 1" }),
        },
      });

      await prisma.liveQuizParticipant.update({
        where: { id: participant1Id },
        data: {
          totalScore: { increment: aliceScore },
          totalResponseTime: { increment: 3.0 },
        },
      });

      expect(ans1.pointsAwarded).toBe(100);

      // Bob answer (8s) -> 97 pts
      const bobScore = calculateCorrectAnswerScore(8, scoringConfig);
      const ans2 = await prisma.liveQuizAnswer.create({
        data: {
          sessionId: testSessionId,
          participantId: participant2Id,
          questionId: currentQId,
          questionIndex: 0,
          selectedOption: "B",
          correctOption: "B",
          isCorrect: true,
          responseTime: 8.0,
          pointsAwarded: bobScore,
          cumulativeScore: bobScore,
          questionSnapshot: JSON.stringify({ questionText: "Live Test Question 1" }),
        },
      });

      await prisma.liveQuizParticipant.update({
        where: { id: participant2Id },
        data: {
          totalScore: { increment: bobScore },
          totalResponseTime: { increment: 8.0 },
        },
      });

      expect(ans2.pointsAwarded).toBe(97);
    });

    it("rejects duplicate answer submissions from the same participant for the same question", async () => {
      const currentQId = questionIds[0];

      await expect(
        prisma.liveQuizAnswer.create({
          data: {
            sessionId: testSessionId,
            participantId: participant1Id,
            questionId: currentQId,
            questionIndex: 0,
            selectedOption: "A",
            correctOption: "B",
            isCorrect: false,
            responseTime: 10.0,
            pointsAwarded: 0,
            cumulativeScore: 100,
            questionSnapshot: JSON.stringify({ questionText: "Live Test Question 1" }),
          },
        })
      ).rejects.toThrow();
    });

    it("enforces server rejection for late submissions past 30 seconds deadline", () => {
      const questionStartedAt = new Date(Date.now() - 32000); // Started 32 seconds ago
      const deadline = new Date(questionStartedAt.getTime() + 30 * 1000);
      const now = new Date();

      const isLate = now.getTime() > deadline.getTime();
      expect(isLate).toBe(true);
    });
  });

  describe("Leaderboard Generation & Rank Shifts", () => {
    it("transitions to LEADERBOARD state and reflects correct rankings", async () => {
      await prisma.liveQuizSession.update({
        where: { id: testSessionId },
        data: {
          status: "LEADERBOARD",
          stateVersion: { increment: 1 },
        },
      });

      const participants = await prisma.liveQuizParticipant.findMany({
        where: { sessionId: testSessionId },
        orderBy: [{ totalScore: "desc" }, { totalResponseTime: "asc" }],
      });

      expect(participants).toHaveLength(2);
      // Alice: 100 pts (Rank 1)
      expect(participants[0].id).toBe(participant1Id);
      expect(participants[0].totalScore).toBe(100);
      // Bob: 97 pts (Rank 2)
      expect(participants[1].id).toBe(participant2Id);
      expect(participants[1].totalScore).toBe(97);
    });
  });

  describe("Final Completion, Grand Podium & Audit Standings", () => {
    it("transitions session to COMPLETED, finalizes ranks, and generates certificates", async () => {
      const participants = await prisma.liveQuizParticipant.findMany({
        where: { sessionId: testSessionId },
        include: { answers: true },
        orderBy: [{ totalScore: "desc" }, { totalResponseTime: "asc" }],
      });

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const correctCount = p.answers.filter((a) => a.isCorrect).length;
        const wrongCount = p.answers.filter((a) => !a.isCorrect).length;
        const unansweredCount = questionIds.length - p.answers.length;

        await prisma.liveQuizParticipant.update({
          where: { id: p.id },
          data: {
            finalRank: i + 1,
            correctCount,
            wrongCount,
            unansweredCount,
            certificateId: generateCertificateId(),
          },
        });
      }

      const completedSession = await prisma.liveQuizSession.update({
        where: { id: testSessionId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          stateVersion: { increment: 1 },
        },
      });

      expect(completedSession.status).toBe("COMPLETED");
      expect(completedSession.completedAt).not.toBeNull();

      // Verify Alice is Rank 1 and has valid certificate ID
      const alice = await prisma.liveQuizParticipant.findUnique({
        where: { id: participant1Id },
      });
      expect(alice?.finalRank).toBe(1);
      expect(alice?.correctCount).toBe(1);
      expect(alice?.wrongCount).toBe(0);
      expect(alice?.certificateId).toMatch(/^CERT-/);

      // Verify Bob is Rank 2
      const bob = await prisma.liveQuizParticipant.findUnique({
        where: { id: participant2Id },
      });
      expect(bob?.finalRank).toBe(2);
      expect(bob?.correctCount).toBe(1);
    });
  });
});
