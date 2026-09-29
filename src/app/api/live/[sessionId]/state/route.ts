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

    const session = await prisma.liveQuizSession.findUnique({
      where: { id: params.sessionId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    const questionIds: string[] = JSON.parse(session.questionOrder || "[]");
    const currentQIndex = session.currentQuestionIndex;
    const totalQuestions = questionIds.length;
    const participantsCount = session._count.participants;

    const baseResponse: any = {
      sessionId: session.id,
      sessionCode: session.sessionCode,
      quizTitle: session.quizTitle,
      status: session.status,
      currentQuestionIndex: currentQIndex,
      currentQuestionNumber: currentQIndex + 1,
      totalQuestions,
      questionStartedAt: session.questionStartedAt,
      questionEndsAt: session.questionEndsAt,
      stateVersion: session.stateVersion,
      participantsCount,
    };

    // If Question is active or ready or leaderboard, fetch question
    if (session.status === "QUESTION_ACTIVE" || session.status === "QUESTION_READY" || session.status === "LEADERBOARD") {
      if (currentQIndex < questionIds.length) {
        const qId = questionIds[currentQIndex];
        const question = await prisma.question.findUnique({
          where: { id: qId },
          select: {
            id: true,
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            // Expose correctOption & explanation ONLY on LEADERBOARD (after answering is closed)
            correctOption: session.status === "LEADERBOARD",
            explanation: session.status === "LEADERBOARD",
          },
        });
        baseResponse.question = question;
      }
    }

    // Include participant list in WAITING phase or for admin
    if (session.status === "WAITING" || searchParams.get("admin") === "true") {
      const participantsList = await prisma.liveQuizParticipant.findMany({
        where: { sessionId: session.id },
        select: {
          id: true,
          participantName: true,
          totalScore: true,
          joinedAt: true,
        },
        orderBy: { joinedAt: "asc" },
      });
      baseResponse.participants = participantsList;
    }

    // Active question answered count
    if (session.status === "QUESTION_ACTIVE" && currentQIndex < questionIds.length) {
      const currentQId = questionIds[currentQIndex];
      const count = await prisma.liveQuizAnswer.count({
        where: {
          sessionId: session.id,
          questionId: currentQId,
        },
      });
      baseResponse.answeredCount = count;
    }

    // Check participant's specific status for the active question
    if (participantId) {
      const participant = await prisma.liveQuizParticipant.findUnique({
        where: { id: participantId },
      });

      if (participant) {
        baseResponse.participant = {
          id: participant.id,
          name: participant.participantName,
          totalScore: participant.totalScore,
          finalRank: participant.finalRank,
          certificateId: participant.certificateId,
        };

        if (session.status === "QUESTION_ACTIVE" && currentQIndex < questionIds.length) {
          const currentQId = questionIds[currentQIndex];
          const ans = await prisma.liveQuizAnswer.findUnique({
            where: {
              sessionId_participantId_questionId: {
                sessionId: session.id,
                participantId,
                questionId: currentQId,
              },
            },
          });

          baseResponse.participantAnswer = ans
            ? {
                hasAnswered: true,
                selectedOption: ans.selectedOption,
                responseTime: ans.responseTime,
              }
            : { hasAnswered: false };
        }
      }
    }

    // If state is LEADERBOARD or COMPLETED, calculate Top 10 with rank shifts
    if (session.status === "LEADERBOARD" || session.status === "COMPLETED") {
      // Fetch all participants with their answers for this session
      const allParticipants = await prisma.liveQuizParticipant.findMany({
        where: { sessionId: session.id },
        include: {
          answers: {
            where: {
              questionIndex: { lte: currentQIndex },
            },
          },
        },
      });

      // Sort by cumulative total score after current question
      const rankedCurrent = allParticipants
        .map((p) => {
          const thisQAnswer = p.answers.find((a) => a.questionIndex === currentQIndex);
          const prevScore = p.answers
            .filter((a) => a.questionIndex < currentQIndex)
            .reduce((sum, a) => sum + a.pointsAwarded, 0);

          return {
            id: p.id,
            name: p.participantName,
            totalScore: p.totalScore,
            thisQuestionPoints: thisQAnswer ? thisQAnswer.pointsAwarded : 0,
            hasAnsweredThisQ: Boolean(thisQAnswer),
            prevScore,
          };
        })
        .sort((a, b) => b.totalScore - a.totalScore);

      // Previous rank for rank-shift calculation
      const rankedPrevious = [...allParticipants]
        .map((p) => {
          const prevScore = p.answers
            .filter((a) => a.questionIndex < currentQIndex)
            .reduce((sum, a) => sum + a.pointsAwarded, 0);
          return { id: p.id, prevScore };
        })
        .sort((a, b) => b.prevScore - a.prevScore);

      const prevRankMap = new Map<string, number>();
      rankedPrevious.forEach((item, idx) => {
        prevRankMap.set(item.id, idx + 1);
      });

      const top10 = rankedCurrent.slice(0, 10).map((item, currentIdx) => {
        const curRank = currentIdx + 1;
        const prevRank = prevRankMap.get(item.id) || curRank;
        let rankShift = 0;
        let isNew = false;

        if (currentQIndex === 0) {
          isNew = true;
        } else {
          rankShift = prevRank - curRank; // Positive means jumped up!
        }

        return {
          rank: curRank,
          id: item.id,
          name: item.name,
          thisQuestionPoints: item.thisQuestionPoints,
          totalScore: item.totalScore,
          rankShift,
          isNew,
        };
      });

      // Question stats
      const answeredCount = rankedCurrent.filter((r) => r.hasAnsweredThisQ).length;
      const totalPointsThisQ = rankedCurrent.reduce(
        (sum, r) => sum + (r.thisQuestionPoints > 0 ? r.thisQuestionPoints : 0),
        0
      );
      const questionAverage =
        answeredCount > 0 ? Math.round(totalPointsThisQ / answeredCount) : 0;

      baseResponse.leaderboard = {
        top10,
        answeredCount,
        participantsCount: allParticipants.length,
        questionAverage,
      };

      // If participantId provided, compute their position
      if (participantId) {
        const myIndex = rankedCurrent.findIndex((r) => r.id === participantId);
        if (myIndex !== -1) {
          const myCurRank = myIndex + 1;
          const myPrevRank = prevRankMap.get(participantId) || myCurRank;
          baseResponse.myPosition = {
            rank: myCurRank,
            totalScore: rankedCurrent[myIndex].totalScore,
            thisQuestionPoints: rankedCurrent[myIndex].thisQuestionPoints,
            rankShift: currentQIndex === 0 ? 0 : myPrevRank - myCurRank,
            inTop10: myCurRank <= 10,
          };
        }
      }
    }

    return NextResponse.json(baseResponse);
  } catch (error) {
    console.error("Failed to get live session state:", error);
    return NextResponse.json(
      { error: "Failed to load live session state." },
      { status: 500 }
    );
  }
}
