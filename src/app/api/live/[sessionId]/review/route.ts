import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json({ error: "Participant ID required." }, { status: 400 });
    }

    const session = await prisma.liveQuizSession.findUnique({
      where: { id: params.sessionId },
      include: {
        participants: {
          orderBy: { totalScore: "desc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const participant = session.participants.find((p) => p.id === participantId);
    if (!participant) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 });
    }

    const questionIds: string[] = JSON.parse(session.questionOrder || "[]");

    // Fetch all questions with answers for this participant
    const [questions, answers] = await Promise.all([
      prisma.question.findMany({
        where: { id: { in: questionIds } },
      }),
      prisma.liveQuizAnswer.findMany({
        where: {
          sessionId: session.id,
          participantId: participant.id,
        },
      }),
    ]);

    const answersMap = new Map(answers.map((a) => [a.questionId, a]));
    const questionsMap = new Map(questions.map((q) => [q.id, q]));

    const reviews = questionIds.map((qId, index) => {
      const q = questionsMap.get(qId);
      const a = answersMap.get(qId);

      let snapshot: any = null;
      if (a) {
        try {
          snapshot = JSON.parse(a.questionSnapshot);
        } catch {}
      }

      return {
        number: index + 1,
        questionId: qId,
        questionText: snapshot?.questionText || q?.questionText || "Question unavailable",
        optionA: snapshot?.optionA || q?.optionA,
        optionB: snapshot?.optionB || q?.optionB,
        optionC: snapshot?.optionC || q?.optionC,
        optionD: snapshot?.optionD || q?.optionD,
        selectedOption: a?.selectedOption || null,
        correctOption: a?.correctOption || q?.correctOption,
        isCorrect: a ? a.isCorrect : false,
        pointsAwarded: a ? a.pointsAwarded : 0,
        responseTime: a ? a.responseTime : 0,
        explanation: snapshot?.explanation || q?.explanation || null,
        wasAnswered: Boolean(a),
      };
    });

    const maxScore = questionIds.length * 100;
    const percentage = maxScore > 0 ? Math.round((participant.totalScore / maxScore) * 1000) / 10 : 0;

    return NextResponse.json({
      participantName: participant.participantName,
      quizTitle: session.quizTitle,
      totalScore: participant.totalScore,
      maxScore,
      percentage,
      rank: participant.finalRank || 1,
      totalParticipants: session.participants.length,
      correctCount: participant.correctCount,
      wrongCount: participant.wrongCount,
      unansweredCount: participant.unansweredCount,
      totalResponseTime: Math.round(participant.totalResponseTime * 10) / 10,
      certificateId: participant.certificateId,
      completedAt: session.completedAt || session.updatedAt,
      reviews,
    });
  } catch (error) {
    console.error("Failed to load live review:", error);
    return NextResponse.json(
      { error: "Failed to load answer review." },
      { status: 500 }
    );
  }
}
