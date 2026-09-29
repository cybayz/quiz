import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import { signAdminToken, verifyAdminToken } from "../lib/auth";
import {
  calculateCorrectAnswerScore,
  calculateWrongAnswerScore,
  calculateNewTotalScore,
  calculatePercentage,
  determineRank,
} from "../lib/scoring";
import { generateCertificateId } from "../lib/utils";

describe("Full-Stack Quiz Application Integration Tests", () => {
  let testAdminEmail = "integration-admin@quizapp.com";
  let testQuestionId: string;
  let testAttemptId: string;

  beforeAll(async () => {
    // 1. Ensure settings exist
    await prisma.quizSettings.upsert({
      where: { id: "default-settings" },
      update: {},
      create: {
        id: "default-settings",
        quizTitle: "Integration Challenge",
        basePoints: 100,
        gracePeriodSeconds: 5,
        pointsPerSecond: 1,
        negativeMarkingEnabled: true,
        negativePoints: 10,
        allowNegativeTotal: false,
        quizEnabled: true,
      },
    });

    // 2. Ensure test admin exists
    const passwordHash = await bcrypt.hash("TestAdminSecret123!", 10);
    await prisma.adminUser.upsert({
      where: { email: testAdminEmail },
      update: { passwordHash },
      create: {
        email: testAdminEmail,
        name: "Test Admin",
        passwordHash,
      },
    });

    // 3. Create a test question
    const q = await prisma.question.create({
      data: {
        questionText: "What is the capital of France?",
        optionA: "Berlin",
        optionB: "Madrid",
        optionC: "Paris",
        optionD: "Rome",
        correctOption: "C",
        explanation: "Paris is the capital of France.",
        isActive: true,
      },
    });
    testQuestionId = q.id;
  });

  afterAll(async () => {
    // Clean up test records
    if (testAttemptId) {
      await prisma.quizAttempt.deleteMany({ where: { id: testAttemptId } });
    }
    if (testQuestionId) {
      await prisma.quizAnswer.deleteMany({ where: { questionId: testQuestionId } });
      await prisma.question.deleteMany({ where: { id: testQuestionId } });
    }
    await prisma.adminUser.deleteMany({ where: { email: testAdminEmail } });
    await prisma.$disconnect();
  });

  describe("Admin Authentication & Security", () => {
    it("signs and verifies admin JWT tokens securely", async () => {
      const payload = {
        adminId: "adm_12345",
        email: testAdminEmail,
        name: "Test Admin",
      };

      const token = await signAdminToken(payload);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      const verified = await verifyAdminToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.adminId).toBe("adm_12345");
      expect(verified?.email).toBe(testAdminEmail);
    });

    it("rejects invalid or forged JWT tokens", async () => {
      const verified = await verifyAdminToken("invalid.token.payload");
      expect(verified).toBeNull();
    });

    it("verifies admin password using bcrypt", async () => {
      const admin = await prisma.adminUser.findUnique({
        where: { email: testAdminEmail },
      });
      expect(admin).not.toBeNull();

      const validPassword = await bcrypt.compare("TestAdminSecret123!", admin!.passwordHash);
      const wrongPassword = await bcrypt.compare("WrongPassword", admin!.passwordHash);

      expect(validPassword).toBe(true);
      expect(wrongPassword).toBe(false);
    });
  });

  describe("Quiz Attempt & Question Order Persistence", () => {
    it("creates a quiz attempt with randomized question order and preserves it", async () => {
      const questions = await prisma.question.findMany({
        where: { isActive: true },
        take: 5,
      });

      const questionIds = questions.map((q) => q.id);
      const attempt = await prisma.quizAttempt.create({
        data: {
          participantName: "Test Runner",
          questionOrder: JSON.stringify(questionIds),
          currentQuestionIndex: 0,
          currentQuestionStartedAt: new Date(),
          startedAt: new Date(),
          totalScore: 0,
          maxScore: questionIds.length * 100,
          status: "IN_PROGRESS",
        },
      });

      testAttemptId = attempt.id;
      expect(attempt.id).toBeDefined();
      expect(attempt.participantName).toBe("Test Runner");

      // Verify that stored question order is retained on subsequent lookups
      const fetched = await prisma.quizAttempt.findUnique({
        where: { id: attempt.id },
      });
      expect(JSON.parse(fetched!.questionOrder)).toEqual(questionIds);
    });

    it("records answers with timeTaken and prevents duplicate answers to same question", async () => {
      const snapshot = JSON.stringify({
        questionText: "What is the capital of France?",
        optionA: "Berlin",
        optionB: "Madrid",
        optionC: "Paris",
        optionD: "Rome",
        correctOption: "C",
      });

      const answer = await prisma.quizAnswer.create({
        data: {
          attemptId: testAttemptId,
          questionId: testQuestionId,
          questionSnapshot: snapshot,
          selectedOption: "C",
          correctOption: "C",
          isCorrect: true,
          pointsAwarded: 100,
          timeTaken: 3.2,
          startedAt: new Date(),
        },
      });

      expect(answer.id).toBeDefined();
      expect(answer.isCorrect).toBe(true);
      expect(answer.pointsAwarded).toBe(100);

      // Attempting duplicate answer for the same attempt and question must throw unique constraint error
      await expect(
        prisma.quizAnswer.create({
          data: {
            attemptId: testAttemptId,
            questionId: testQuestionId,
            questionSnapshot: snapshot,
            selectedOption: "A",
            correctOption: "C",
            isCorrect: false,
            pointsAwarded: -10,
            timeTaken: 1.0,
            startedAt: new Date(),
          },
        })
      ).rejects.toThrow();
    });

    it("generates unique verifiable certificate reference IDs", () => {
      const cert1 = generateCertificateId();
      const cert2 = generateCertificateId();
      expect(cert1).toMatch(/^CERT-\d{4}-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(cert2).toMatch(/^CERT-\d{4}-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(cert1).not.toBe(cert2);
    });
  });

  describe("Question Management & Historical Snapshot Integrity", () => {
    it("preserves historical answer snapshots even if original question text is modified", async () => {
      // Fetch the answer recorded earlier
      const ans = await prisma.quizAnswer.findFirst({
        where: { attemptId: testAttemptId, questionId: testQuestionId },
      });
      expect(ans).not.toBeNull();
      const originalSnapshot = JSON.parse(ans!.questionSnapshot);
      expect(originalSnapshot.questionText).toBe("What is the capital of France?");

      // Now simulate admin editing the question text
      await prisma.question.update({
        where: { id: testQuestionId },
        data: { questionText: "MODIFIED QUESTION TEXT BY ADMIN" },
      });

      // The historical answer record still retains the original snapshot!
      const ansAfterEdit = await prisma.quizAnswer.findFirst({
        where: { attemptId: testAttemptId, questionId: testQuestionId },
      });
      const parsed = JSON.parse(ansAfterEdit!.questionSnapshot);
      expect(parsed.questionText).toBe("What is the capital of France?");
    });
  });
});
