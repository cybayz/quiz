import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        answers: {
          select: { questionId: true },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    if (attempt.status === "COMPLETED") {
      return NextResponse.json({
        isCompleted: true,
        attemptId: attempt.id,
        participantName: attempt.participantName,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        totalTime: attempt.totalTime,
      });
    }

    const questionIds: string[] = JSON.parse(attempt.questionOrder || "[]");
    if (questionIds.length === 0) {
      return NextResponse.json({ error: "Quiz contains no questions." }, { status: 400 });
    }

    const answeredIds = new Set(attempt.answers.map((a) => a.questionId));

    // Find the current unanswered question index
    let activeIndex = attempt.currentQuestionIndex;
    if (answeredIds.has(questionIds[activeIndex])) {
      // Find the next unanswered index
      const nextIndex = questionIds.findIndex((id) => !answeredIds.has(id));
      if (nextIndex === -1) {
        // All answered! Mark completed
        const now = new Date();
        const totalTime = Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000);
        const percentage = attempt.maxScore > 0 ? (attempt.totalScore / attempt.maxScore) * 100 : 0;
        const certId = `CERT-${now.getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const completedAttempt = await prisma.quizAttempt.update({
          where: { id: attempt.id },
          data: {
            status: "COMPLETED",
            completedAt: now,
            totalTime,
            percentage: Math.round(percentage * 10) / 10,
            certificateId: certId,
          },
        });

        return NextResponse.json({
          isCompleted: true,
          attemptId: completedAttempt.id,
          participantName: completedAttempt.participantName,
          totalScore: completedAttempt.totalScore,
          maxScore: completedAttempt.maxScore,
          percentage: completedAttempt.percentage,
          totalTime: completedAttempt.totalTime,
        });
      } else {
        activeIndex = nextIndex;
        // Update currentQuestionIndex and start time
        await prisma.quizAttempt.update({
          where: { id: attempt.id },
          data: {
            currentQuestionIndex: activeIndex,
            currentQuestionStartedAt: new Date(),
          },
        });
      }
    }

    const currentQuestionId = questionIds[activeIndex];
    const question = await prisma.question.findUnique({
      where: { id: currentQuestionId },
      select: {
        id: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        // STRICT SECURITY: Do NOT select correctOption or explanation!
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const settings = await prisma.quizSettings.findUnique({
      where: { id: "default-settings" },
    });

    return NextResponse.json({
      isCompleted: false,
      attemptId: attempt.id,
      participantName: attempt.participantName,
      currentQuestionIndex: activeIndex,
      currentQuestionNumber: activeIndex + 1,
      totalQuestions: questionIds.length,
      currentScore: attempt.totalScore,
      serverTime: new Date().toISOString(),
      questionStartedAt: attempt.currentQuestionStartedAt.toISOString(),
      question: {
        id: question.id,
        questionText: question.questionText,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
      },
      scoringConfig: {
        basePoints: settings?.basePoints ?? 100,
        gracePeriodSeconds: settings?.gracePeriodSeconds ?? 5,
        pointsPerSecond: settings?.pointsPerSecond ?? 1,
        minimumCorrectPoints: settings?.minimumCorrectPoints ?? 0,
        negativeMarkingEnabled: settings?.negativeMarkingEnabled ?? false,
        negativePoints: settings?.negativePoints ?? 10,
        allowNegativeTotal: settings?.allowNegativeTotal ?? false,
      },
    });
  } catch (error) {
    console.error("Failed to fetch quiz state:", error);
    return NextResponse.json(
      { error: "Failed to load quiz state." },
      { status: 500 }
    );
  }
}
