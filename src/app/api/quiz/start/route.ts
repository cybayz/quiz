import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startQuizSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = startQuizSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid name provided." },
        { status: 400 }
      );
    }

    const { participantName } = validation.data;

    // 1. Check Settings
    let settings = await prisma.quizSettings.findUnique({
      where: { id: "default-settings" },
    });
    if (!settings) {
      settings = await prisma.quizSettings.create({
        data: { id: "default-settings" },
      });
    }

    if (!settings.quizEnabled) {
      return NextResponse.json(
        { error: "The quiz is currently unavailable or disabled by the administrator." },
        { status: 403 }
      );
    }

    // 2. Fetch Active Questions
    const activeQuestions = await prisma.question.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (activeQuestions.length === 0) {
      return NextResponse.json(
        { error: "No active quiz questions found. Please check back later." },
        { status: 404 }
      );
    }

    // 3. Randomize questions for this attempt
    const shuffledQuestionIds = shuffleArray(activeQuestions.map((q) => q.id));
    const maxScore = shuffledQuestionIds.length * settings.basePoints;
    const now = new Date();

    // 4. Create Quiz Attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        participantName,
        questionOrder: JSON.stringify(shuffledQuestionIds),
        currentQuestionIndex: 0,
        currentQuestionStartedAt: now,
        startedAt: now,
        totalScore: 0,
        maxScore,
        status: "IN_PROGRESS",
      },
    });

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      participantName: attempt.participantName,
      totalQuestions: shuffledQuestionIds.length,
      quizTitle: settings.quizTitle,
    });
  } catch (error) {
    console.error("Failed to start quiz attempt:", error);
    return NextResponse.json(
      { error: "Failed to initialize quiz. Please try again." },
      { status: 500 }
    );
  }
}
