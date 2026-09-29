import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { submitAnswerSchema } from "@/lib/validations";
import {
  calculateCorrectAnswerScore,
  calculateWrongAnswerScore,
  calculateNewTotalScore,
  calculatePercentage,
} from "@/lib/scoring";
import { generateCertificateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const body = await request.json();
    const validation = submitAnswerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid answer submission." },
        { status: 400 }
      );
    }

    const { questionId, selectedOption } = validation.data;

    // 1. Fetch Attempt
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        answers: {
          where: { questionId },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    if (attempt.status === "COMPLETED") {
      return NextResponse.json(
        { error: "This quiz attempt has already been completed." },
        { status: 400 }
      );
    }

    // 2. Idempotency Check: if this question has already been answered, return the stored answer!
    if (attempt.answers.length > 0) {
      const existingAnswer = attempt.answers[0];
      let snapshot: any = {};
      try {
        snapshot = JSON.parse(existingAnswer.questionSnapshot);
      } catch {}

      const questionIds: string[] = JSON.parse(attempt.questionOrder || "[]");
      const isQuizCompleted = attempt.currentQuestionIndex >= questionIds.length - 1;

      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        isCorrect: existingAnswer.isCorrect,
        selectedOption: existingAnswer.selectedOption,
        correctOption: existingAnswer.correctOption,
        pointsAwarded: existingAnswer.pointsAwarded,
        timeTaken: existingAnswer.timeTaken,
        explanation: snapshot.explanation || null,
        updatedTotalScore: attempt.totalScore,
        isQuizCompleted,
      });
    }

    // 3. Verify that the submitted question is the current active question
    const questionIds: string[] = JSON.parse(attempt.questionOrder || "[]");
    const currentExpectedId = questionIds[attempt.currentQuestionIndex];

    if (currentExpectedId !== questionId) {
      return NextResponse.json(
        { error: "Invalid question sequence. Please answer the active question." },
        { status: 400 }
      );
    }

    // 4. Fetch Question & Settings
    const [question, settings] = await Promise.all([
      prisma.question.findUnique({ where: { id: questionId } }),
      prisma.quizSettings.findUnique({ where: { id: "default-settings" } }),
    ]);

    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const now = new Date();

    // 5. Server-side Timing
    const elapsedMs = now.getTime() - new Date(attempt.currentQuestionStartedAt).getTime();
    const timeTakenSeconds = Math.max(0.5, elapsedMs / 1000);

    // 6. Check Answer
    const isCorrect = selectedOption.toUpperCase() === question.correctOption.toUpperCase();

    // 7. Calculate Points
    let pointsAwarded = 0;
    if (isCorrect) {
      pointsAwarded = calculateCorrectAnswerScore(timeTakenSeconds, {
        basePoints: settings?.basePoints ?? 100,
        gracePeriodSeconds: settings?.gracePeriodSeconds ?? 5,
        pointsPerSecond: settings?.pointsPerSecond ?? 1,
        minimumCorrectPoints: settings?.minimumCorrectPoints ?? 0,
      });
    } else {
      pointsAwarded = calculateWrongAnswerScore({
        negativeMarkingEnabled: settings?.negativeMarkingEnabled ?? false,
        negativePoints: settings?.negativePoints ?? 10,
      });
    }

    // 8. Cumulative Score Calculation
    const newTotalScore = calculateNewTotalScore(
      attempt.totalScore,
      pointsAwarded,
      settings?.allowNegativeTotal ?? false
    );

    const isLastQuestion = attempt.currentQuestionIndex >= questionIds.length - 1;

    // 9. Snapshot of question for permanent historical record
    const questionSnapshot = JSON.stringify({
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctOption: question.correctOption,
      explanation: question.explanation,
    });

    // 10. Execute Transaction
    await prisma.$transaction(async (tx) => {
      // Create Answer Record
      await tx.quizAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          questionSnapshot,
          selectedOption,
          correctOption: question.correctOption,
          isCorrect,
          pointsAwarded,
          timeTaken: Math.round(timeTakenSeconds * 10) / 10,
          startedAt: attempt.currentQuestionStartedAt,
          answeredAt: now,
        },
      });

      // Update Quiz Attempt
      if (isLastQuestion) {
        const totalDurationSec = Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000);
        const percentage = calculatePercentage(newTotalScore, attempt.maxScore);
        const certificateId = generateCertificateId();

        await tx.quizAttempt.update({
          where: { id: attempt.id },
          data: {
            totalScore: newTotalScore,
            correctCount: attempt.correctCount + (isCorrect ? 1 : 0),
            wrongCount: attempt.wrongCount + (isCorrect ? 0 : 1),
            status: "COMPLETED",
            completedAt: now,
            totalTime: totalDurationSec,
            percentage,
            certificateId,
          },
        });
      } else {
        await tx.quizAttempt.update({
          where: { id: attempt.id },
          data: {
            totalScore: newTotalScore,
            correctCount: attempt.correctCount + (isCorrect ? 1 : 0),
            wrongCount: attempt.wrongCount + (isCorrect ? 0 : 1),
            currentQuestionIndex: attempt.currentQuestionIndex + 1,
            currentQuestionStartedAt: now,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      isCorrect,
      selectedOption,
      correctOption: question.correctOption,
      pointsAwarded,
      timeTaken: Math.round(timeTakenSeconds * 10) / 10,
      explanation: question.explanation || null,
      updatedTotalScore: newTotalScore,
      isQuizCompleted: isLastQuestion,
    });
  } catch (error) {
    console.error("Failed to process quiz answer:", error);
    return NextResponse.json(
      { error: "Failed to record your answer. Please retry." },
      { status: 500 }
    );
  }
}
