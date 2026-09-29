import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.liveQuizSession.findUnique({
      where: { id: params.sessionId },
      include: {
        participants: {
          orderBy: [{ totalScore: "desc" }, { totalResponseTime: "asc" }],
          include: {
            answers: {
              orderBy: { questionIndex: "asc" },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const questionIds: string[] = JSON.parse(session.questionOrder || "[]");
    const totalQuestions = questionIds.length;

    // Fetch questions to label the progression
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    });
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Format participant results with question-by-question progression
    const participantsData = session.participants.map((p, idx) => {
      const answersMap = new Map(p.answers.map((a) => [a.questionIndex, a]));
      let runningScore = 0;

      const progression = questionIds.map((qId, qIdx) => {
        const ans = answersMap.get(qIdx);
        if (ans) {
          runningScore += ans.pointsAwarded;
        }
        return {
          questionIndex: qIdx,
          questionNumber: qIdx + 1,
          pointsAwarded: ans ? ans.pointsAwarded : 0,
          isCorrect: ans ? ans.isCorrect : false,
          selectedOption: ans ? ans.selectedOption : null,
          responseTime: ans ? ans.responseTime : 0,
          cumulativeScore: runningScore,
        };
      });

      return {
        rank: p.finalRank || idx + 1,
        id: p.id,
        name: p.participantName,
        totalScore: p.totalScore,
        correctCount: p.correctCount,
        wrongCount: p.wrongCount,
        unansweredCount: p.unansweredCount,
        totalResponseTime: Math.round(p.totalResponseTime * 10) / 10,
        certificateId: p.certificateId,
        joinedAt: p.joinedAt,
        progression,
      };
    });

    // Compute session statistics
    const count = participantsData.length;
    const avgScore = count > 0 ? Math.round(participantsData.reduce((sum, p) => sum + p.totalScore, 0) / count) : 0;
    const highestScore = count > 0 ? Math.max(...participantsData.map((p) => p.totalScore)) : 0;
    const avgTime = count > 0 ? Math.round(participantsData.reduce((sum, p) => sum + p.totalResponseTime, 0) / count) : 0;

    return NextResponse.json({
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        quizTitle: session.quizTitle,
        status: session.status,
        totalQuestions,
        totalParticipants: count,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        stats: {
          avgScore,
          highestScore,
          avgTime,
        },
      },
      participants: participantsData,
    });
  } catch (error) {
    console.error("Failed to load session audit results:", error);
    return NextResponse.json(
      { error: "Failed to load session results." },
      { status: 500 }
    );
  }
}
