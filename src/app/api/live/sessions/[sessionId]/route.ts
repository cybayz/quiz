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
          orderBy: { totalScore: "desc" },
          select: {
            id: true,
            participantName: true,
            totalScore: true,
            correctCount: true,
            wrongCount: true,
            joinedAt: true,
            lastSeenAt: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    const questionIds: string[] = JSON.parse(session.questionOrder || "[]");

    // Fetch current question if within bounds
    let currentQuestion: any = null;
    if (session.currentQuestionIndex < questionIds.length) {
      const qId = questionIds[session.currentQuestionIndex];
      currentQuestion = await prisma.question.findUnique({
        where: { id: qId },
      });
    }

    // Answers for current question count
    let answeredCurrentCount = 0;
    if (currentQuestion) {
      answeredCurrentCount = await prisma.liveQuizAnswer.count({
        where: {
          sessionId: session.id,
          questionId: currentQuestion.id,
        },
      });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        quizTitle: session.quizTitle,
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        questionStartedAt: session.questionStartedAt,
        questionEndsAt: session.questionEndsAt,
        stateVersion: session.stateVersion,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        totalQuestions: questionIds.length,
        currentQuestion,
        answeredCurrentCount,
        participantsCount: session.participants.length,
        participants: session.participants,
      },
    });
  } catch (error) {
    console.error("Failed to load session details:", error);
    return NextResponse.json(
      { error: "Failed to load live session." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.liveQuizSession.delete({
      where: { id: params.sessionId },
    });

    return NextResponse.json({ success: true, message: "Session deleted." });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json({ error: "Failed to delete session." }, { status: 500 });
  }
}
