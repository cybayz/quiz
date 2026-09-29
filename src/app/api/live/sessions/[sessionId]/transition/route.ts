import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { liveEvents } from "@/lib/live-events";
import { generateCertificateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LiveQuizStatus = "WAITING" | "QUESTION_READY" | "QUESTION_ACTIVE" | "LEADERBOARD" | "COMPLETED";

const VALID_TRANSITIONS: Record<LiveQuizStatus, LiveQuizStatus[]> = {
  WAITING: ["QUESTION_READY", "QUESTION_ACTIVE"],
  QUESTION_READY: ["QUESTION_ACTIVE", "COMPLETED"],
  QUESTION_ACTIVE: ["LEADERBOARD", "COMPLETED"],
  LEADERBOARD: ["QUESTION_READY", "QUESTION_ACTIVE", "COMPLETED"],
  COMPLETED: [],
};

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const targetStatus = body.targetStatus as LiveQuizStatus;

    if (!targetStatus) {
      return NextResponse.json({ error: "Target status required." }, { status: 400 });
    }

    const session = await prisma.liveQuizSession.findUnique({
      where: { id: params.sessionId },
      include: {
        participants: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    const currentStatus = session.status as LiveQuizStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      return NextResponse.json(
        {
          error: `Invalid transition from ${currentStatus} to ${targetStatus}.`,
        },
        { status: 400 }
      );
    }

    const questionIds: string[] = JSON.parse(session.questionOrder || "[]");
    let nextIndex = session.currentQuestionIndex;
    const now = new Date();
    let questionStartedAt = session.questionStartedAt;
    let questionEndsAt = session.questionEndsAt;
    let completedAt = session.completedAt;

    if (targetStatus === "QUESTION_READY") {
      // If advancing from LEADERBOARD to next question
      if (currentStatus === "LEADERBOARD") {
        nextIndex = session.currentQuestionIndex + 1;
        if (nextIndex >= questionIds.length) {
          return NextResponse.json(
            { error: "All questions have been completed. Please finish the quiz." },
            { status: 400 }
          );
        }
      }
      questionStartedAt = null;
      questionEndsAt = null;
    } else if (targetStatus === "QUESTION_ACTIVE") {
      // Configurable question timer from session
      const durationSeconds = session.timePerQuestion || 30;
      questionStartedAt = now;
      questionEndsAt = new Date(now.getTime() + durationSeconds * 1000);
    } else if (targetStatus === "LEADERBOARD") {
      // End active answering
      // Keep questionStartedAt so response times can still be checked if needed
    } else if (targetStatus === "COMPLETED") {
      completedAt = now;

      // Calculate final stats and rankings for all participants
      const participants = await prisma.liveQuizParticipant.findMany({
        where: { sessionId: session.id },
        include: { answers: true },
        orderBy: [
          { totalScore: "desc" },
          { totalResponseTime: "asc" },
          { joinedAt: "asc" },
        ],
      });

      const totalQuestionsCount = questionIds.length;

      // Update each participant's final stats
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const correctCount = p.answers.filter((a) => a.isCorrect).length;
        const wrongCount = p.answers.filter((a) => !a.isCorrect).length;
        const unansweredCount = Math.max(0, totalQuestionsCount - p.answers.length);
        const certId = p.certificateId || generateCertificateId();

        await prisma.liveQuizParticipant.update({
          where: { id: p.id },
          data: {
            finalRank: i + 1,
            correctCount,
            wrongCount,
            unansweredCount,
            certificateId: certId,
          },
        });
      }
    }

    const updated = await prisma.liveQuizSession.update({
      where: { id: session.id },
      data: {
        status: targetStatus,
        currentQuestionIndex: nextIndex,
        questionStartedAt,
        questionEndsAt,
        completedAt,
        stateVersion: { increment: 1 },
      },
    });

    // Broadcast state transition event to all participants
    liveEvents.broadcast(session.id, targetStatus, {
      status: targetStatus,
      currentQuestionIndex: nextIndex,
      questionStartedAt: questionStartedAt?.toISOString() || null,
      questionEndsAt: questionEndsAt?.toISOString() || null,
      stateVersion: updated.stateVersion,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: updated.id,
        status: updated.status,
        currentQuestionIndex: updated.currentQuestionIndex,
        questionStartedAt: updated.questionStartedAt,
        questionEndsAt: updated.questionEndsAt,
        stateVersion: updated.stateVersion,
      },
    });
  } catch (error) {
    console.error("Failed to transition session state:", error);
    return NextResponse.json(
      { error: "Failed to transition live session state." },
      { status: 500 }
    );
  }
}
