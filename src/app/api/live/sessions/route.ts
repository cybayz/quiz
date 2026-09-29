import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { generateSessionCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.liveQuizSession.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            participants: true,
            answers: true,
          },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Failed to list live sessions:", error);
    return NextResponse.json(
      { error: "Failed to retrieve live sessions." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const questionCountRequested = Math.max(1, Math.min(50, Number(body.questionCount) || 10));
    const questionSet = body.questionSet === "SAMPLE" ? "SAMPLE" : "MAIN";

    const settings = await prisma.quizSettings.findUnique({
      where: { id: "default-settings" },
    });

    const timePerQuestion = Math.max(
      5,
      Math.min(300, Number(body.timePerQuestion) || settings?.defaultQuestionTimer || 30)
    );

    // Fetch active questions for the chosen question set
    const activeQuestions = await prisma.question.findMany({
      where: {
        isActive: true,
        ...(questionSet === "SAMPLE"
          ? { category: "SAMPLE" }
          : { OR: [{ category: "MAIN" }, { category: null }] }),
      },
      orderBy: { createdAt: "asc" }, // deterministic order for live presentation
      take: questionCountRequested,
    });

    if (activeQuestions.length === 0) {
      return NextResponse.json(
        {
          error: `No active questions found in the ${
            questionSet === "SAMPLE" ? "Sample / Practice" : "Main Exam"
          } question set.`,
        },
        { status: 400 }
      );
    }

    const defaultTitle =
      questionSet === "SAMPLE"
        ? "Sample Practice Quiz (Demo & Pre-Test)"
        : settings?.quizTitle || "Live Presentation Quiz";
    const quizTitle = body.quizTitle?.trim() || defaultTitle;
    const questionIds = activeQuestions.map((q) => q.id);

    // Generate unique session code
    let sessionCode = generateSessionCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await prisma.liveQuizSession.findUnique({
        where: { sessionCode },
      });
      if (!exists) break;
      sessionCode = generateSessionCode();
      attempts++;
    }

    const session = await prisma.liveQuizSession.create({
      data: {
        sessionCode,
        quizTitle,
        status: "WAITING",
        questionOrder: JSON.stringify(questionIds),
        currentQuestionIndex: 0,
        timePerQuestion,
        questionSet,
        createdById: admin.adminId,
        stateVersion: 1,
      },
    });

    return NextResponse.json(
      {
        success: true,
        session: {
          id: session.id,
          sessionCode: session.sessionCode,
          quizTitle: session.quizTitle,
          status: session.status,
          totalQuestions: questionIds.length,
          timePerQuestion: session.timePerQuestion,
          questionSet: session.questionSet,
          createdAt: session.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create live session:", error);
    return NextResponse.json(
      { error: "Failed to create live presentation session." },
      { status: 500 }
    );
  }
}
