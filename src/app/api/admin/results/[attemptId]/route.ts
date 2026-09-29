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
          orderBy: { answeredAt: "asc" },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Quiz attempt not found." }, { status: 404 });
    }

    // Parse question snapshots for full historical view
    const formattedAnswers = attempt.answers.map((ans, idx) => {
      let snapshot: any = {};
      try {
        snapshot = JSON.parse(ans.questionSnapshot);
      } catch {
        snapshot = {};
      }

      return {
        number: idx + 1,
        questionId: ans.questionId,
        questionText: snapshot.questionText || "Question text unavailable",
        optionA: snapshot.optionA,
        optionB: snapshot.optionB,
        optionC: snapshot.optionC,
        optionD: snapshot.optionD,
        selectedOption: ans.selectedOption,
        correctOption: ans.correctOption,
        isCorrect: ans.isCorrect,
        pointsAwarded: ans.pointsAwarded,
        timeTaken: ans.timeTaken,
        explanation: snapshot.explanation || null,
        answeredAt: ans.answeredAt,
      };
    });

    // Compute rank
    let rank: number | null = null;
    if (attempt.status === "COMPLETED") {
      const betterAttemptsCount = await prisma.quizAttempt.count({
        where: {
          status: "COMPLETED",
          OR: [
            { totalScore: { gt: attempt.totalScore } },
            {
              totalScore: attempt.totalScore,
              totalTime: { lt: attempt.totalTime },
            },
          ],
        },
      });
      rank = betterAttemptsCount + 1;
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        participantName: attempt.participantName,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        totalTime: attempt.totalTime,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        status: attempt.status,
        certificateId: attempt.certificateId,
        rank,
        createdAt: attempt.createdAt,
      },
      answers: formattedAnswers,
    });
  } catch (error) {
    console.error("Failed to fetch detailed attempt:", error);
    return NextResponse.json(
      { error: "Failed to retrieve attempt details." },
      { status: 500 }
    );
  }
}
