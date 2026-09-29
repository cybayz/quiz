import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const clientVersion = parseInt(searchParams.get("version") || "0", 10);

    const session = await prisma.liveQuizSession.findUnique({
      where: { id: params.sessionId },
      select: {
        id: true,
        status: true,
        stateVersion: true,
        currentQuestionIndex: true,
        questionStartedAt: true,
        questionEndsAt: true,
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.stateVersion === clientVersion) {
      return NextResponse.json({
        changed: false,
        stateVersion: session.stateVersion,
        participantsCount: session._count.participants,
      });
    }

    return NextResponse.json({
      changed: true,
      stateVersion: session.stateVersion,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      questionStartedAt: session.questionStartedAt,
      questionEndsAt: session.questionEndsAt,
      participantsCount: session._count.participants,
    });
  } catch (error) {
    return NextResponse.json({ error: "Sync error" }, { status: 500 });
  }
}
