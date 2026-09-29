import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { liveEvents } from "@/lib/live-events";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionCode = body.sessionCode?.trim().toUpperCase();
    const sessionId = body.sessionId?.trim();
    const participantName = body.participantName?.trim();
    const existingToken = body.participantToken?.trim();

    if (!sessionCode && !sessionId) {
      return NextResponse.json({ error: "Session code or session ID is required." }, { status: 400 });
    }

    let session = null;
    if (sessionId) {
      session = await prisma.liveQuizSession.findUnique({
        where: { id: sessionId },
      });
    } else if (sessionCode) {
      session = await prisma.liveQuizSession.findUnique({
        where: { sessionCode },
      });
    }

    if (!session) {
      return NextResponse.json({ error: "Quiz session not found. Please check your join code." }, { status: 404 });
    }

    if (session.status === "COMPLETED") {
      return NextResponse.json({ error: "This live quiz session has already completed." }, { status: 400 });
    }

    // 1. Reconnection by Token
    if (existingToken) {
      const existing = await prisma.liveQuizParticipant.findFirst({
        where: {
          sessionId: session.id,
          participantToken: existingToken,
        },
      });

      if (existing) {
        await prisma.liveQuizParticipant.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date() },
        });

        liveEvents.broadcast(session.id, "PARTICIPANT_RECONNECTED", {
          participantId: existing.id,
          participantName: existing.participantName,
        });

        return NextResponse.json({
          success: true,
          reconnected: true,
          sessionId: session.id,
          sessionCode: session.sessionCode,
          quizTitle: session.quizTitle,
          status: session.status,
          participant: {
            id: existing.id,
            name: existing.participantName,
            token: existing.participantToken,
            totalScore: existing.totalScore,
          },
        });
      }
    }

    // 2. New Join
    if (!participantName || participantName.length < 2) {
      return NextResponse.json(
        { error: "Please provide a name with at least 2 characters." },
        { status: 400 }
      );
    }

    // Check if name is taken in this session
    const nameCollision = await prisma.liveQuizParticipant.findUnique({
      where: {
        sessionId_participantName: {
          sessionId: session.id,
          participantName,
        },
      },
    });

    if (nameCollision) {
      // If client provided the token of this user, reconnect
      if (existingToken && nameCollision.participantToken === existingToken) {
        return NextResponse.json({
          success: true,
          reconnected: true,
          sessionId: session.id,
          sessionCode: session.sessionCode,
          quizTitle: session.quizTitle,
          status: session.status,
          participant: {
            id: nameCollision.id,
            name: nameCollision.participantName,
            token: nameCollision.participantToken,
            totalScore: nameCollision.totalScore,
          },
        });
      }
      return NextResponse.json(
        { error: `The name "${participantName}" is already taken in this session. Please pick another name.` },
        { status: 400 }
      );
    }

    // Create participant
    const participant = await prisma.liveQuizParticipant.create({
      data: {
        sessionId: session.id,
        participantName,
      },
    });

    // Notify admin and participants
    const participantsCount = await prisma.liveQuizParticipant.count({
      where: { sessionId: session.id },
    });

    liveEvents.broadcast(session.id, "PARTICIPANT_JOINED", {
      participantId: participant.id,
      participantName: participant.participantName,
      participantsCount,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionCode: session.sessionCode,
      quizTitle: session.quizTitle,
      status: session.status,
      participant: {
        id: participant.id,
        name: participant.participantName,
        token: participant.participantToken,
        totalScore: participant.totalScore,
      },
    });
  } catch (error) {
    console.error("Failed to join live quiz:", error);
    return NextResponse.json(
      { error: "Failed to join live session. Please retry." },
      { status: 500 }
    );
  }
}
