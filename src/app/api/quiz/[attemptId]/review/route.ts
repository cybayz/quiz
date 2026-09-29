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
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    if (attempt.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Review is only available after completing the quiz." },
        { status: 403 }
      );
    }

    const questionIds: string[] = JSON.parse(attempt.questionOrder || "[]");
    const answersMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    const reviews = questionIds.map((qid, index) => {
      const ans = answersMap.get(qid);
      let snapshot: any = {};
      if (ans) {
        try {
          snapshot = JSON.parse(ans.questionSnapshot);
        } catch {}
      }

      return {
        number: index + 1,
        questionId: qid,
        questionText: snapshot.questionText || "Question text unavailable",
        optionA: snapshot.optionA,
        optionB: snapshot.optionB,
        optionC: snapshot.optionC,
        optionD: snapshot.optionD,
        selectedOption: ans?.selectedOption || null,
        correctOption: ans?.correctOption || snapshot.correctOption,
        isCorrect: ans ? ans.isCorrect : false,
        pointsAwarded: ans ? ans.pointsAwarded : 0,
        timeTaken: ans ? ans.timeTaken : 0,
        explanation: snapshot.explanation || null,
      };
    });

    // Compute rank
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
    const rank = betterAttemptsCount + 1;

    return NextResponse.json({
      participantName: attempt.participantName,
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      totalTime: attempt.totalTime,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      completedAt: attempt.completedAt,
      certificateId: attempt.certificateId,
      rank,
      reviews,
    });
  } catch (error) {
    console.error("Failed to fetch review data:", error);
    return NextResponse.json(
      { error: "Failed to load review questions." },
      { status: 500 }
    );
  }
}
