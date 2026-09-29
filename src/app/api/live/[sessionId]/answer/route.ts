import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { submitAnswerSchema } from "@/lib/validations";
import {
  calculateCorrectAnswerScore,
  calculateWrongAnswerScore,
  calculateNewTotalScore,
} from "@/lib/scoring";
import { liveEvents } from "@/lib/live-events";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();
    const participantId = body.participantId?.trim();
    const questionId = body.questionId?.trim();
    const selectedOption = body.selectedOption?.trim().toUpperCase();

    if (!participantId || !questionId || !selectedOption) {
      return NextResponse.json(
        { error: "Participant ID, Question ID, and selected option are required." },
        { status: 400 }
      );
    }

    if (!["A", "B", "C", "D"].includes(selectedOption)) {
      return NextResponse.json(
        { error: "Selected option must be A, B, C, or D." },
        { status: 400 }
      );
    }

    // 1. Fetch Session & Participant
    const [session, participant] = await Promise.all([
      prisma.liveQuizSession.findUnique({
        where: { id: params.sessionId },
      }),
      prisma.liveQuizParticipant.findUnique({
        where: { id: participantId },
      }),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Live session not found." }, { status: 404 });
    }

    if (!participant || participant.sessionId !== session.id) {
      return NextResponse.json(
        { error: "Participant does not belong to this session." },
        { status: 403 }
      );
    }

    // 2. Validate Session State
    if (session.status !== "QUESTION_ACTIVE") {
      return NextResponse.json(
        { error: "Question is not currently active for answering." },
        { status: 400 }
      );
    }

    if (!session.questionStartedAt) {
      return NextResponse.json(
        { error: "Question has not officially started." },
        { status: 400 }
      );
    }

    // 3. Verify Active Question Sequence
    const questionIds: string[] = JSON.parse(session.questionOrder || "[]");
    const activeQuestionId = questionIds[session.currentQuestionIndex];
    if (activeQuestionId !== questionId) {
      return NextResponse.json(
        { error: "Submitted answer does not match the currently active question." },
        { status: 400 }
      );
    }

    // 4. Server-Side 30-Second Timer Check
    const now = new Date();
    const elapsedMs = now.getTime() - new Date(session.questionStartedAt).getTime();
    const timeTakenSeconds = Math.max(0.1, elapsedMs / 1000);

    // 30 seconds limit + 0.5s grace for network transit
    if (timeTakenSeconds > 30.5) {
      return NextResponse.json(
        { error: "Time is up! Answers can no longer be submitted for this question." },
        { status: 400 }
      );
    }

    // 5. Prevent Duplicate Submissions (Answer Locking)
    const existingAnswer = await prisma.liveQuizAnswer.findUnique({
      where: {
        sessionId_participantId_questionId: {
          sessionId: session.id,
          participantId: participant.id,
          questionId,
        },
      },
    });

    if (existingAnswer) {
      return NextResponse.json(
        {
          error: "You have already submitted your answer for this question.",
          hasAnswered: true,
          selectedOption: existingAnswer.selectedOption,
        },
        { status: 409 }
      );
    }

    // 6. Fetch Question & Scoring Rules
    const [question, settings] = await Promise.all([
      prisma.question.findUnique({ where: { id: questionId } }),
      prisma.quizSettings.findUnique({ where: { id: "default-settings" } }),
    ]);

    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const isCorrect = selectedOption === question.correctOption.toUpperCase();

    // 7. Calculate Points
    let pointsAwarded = 0;
    if (isCorrect) {
      pointsAwarded = calculateCorrectAnswerScore(timeTakenSeconds, {
        basePoints: settings?.basePoints ?? 100,
        gracePeriodSeconds: settings?.gracePeriodSeconds ?? 5,
        pointsPerSecond: settings?.pointsPerSecond ?? 1,
        minimumCorrectPoints: settings?.minimumCorrectPoints ?? 0,
      });
    } else {
      pointsAwarded = calculateWrongAnswerScore({
        negativeMarkingEnabled: settings?.negativeMarkingEnabled ?? false,
        negativePoints: settings?.negativePoints ?? 10,
      });
    }

    // 8. Cumulative Score Calculation
    const newTotalScore = calculateNewTotalScore(
      participant.totalScore,
      pointsAwarded,
      settings?.allowNegativeTotal ?? false
    );

    const questionSnapshot = JSON.stringify({
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctOption: question.correctOption,
      explanation: question.explanation,
    });

    // 9. Execute Atomic DB Transaction
    await prisma.$transaction(async (tx) => {
      await tx.liveQuizAnswer.create({
        data: {
          sessionId: session.id,
          participantId: participant.id,
          questionId: question.id,
          questionIndex: session.currentQuestionIndex,
          questionSnapshot,
          selectedOption,
          correctOption: question.correctOption,
          isCorrect,
          pointsAwarded,
          responseTime: Math.round(timeTakenSeconds * 10) / 10,
          cumulativeScore: newTotalScore,
          answeredAt: now,
        },
      });

      await tx.liveQuizParticipant.update({
        where: { id: participant.id },
        data: {
          totalScore: newTotalScore,
          totalResponseTime: participant.totalResponseTime + timeTakenSeconds,
          lastSeenAt: now,
        },
      });
    });

    // Count how many answered this question so far
    const totalAnswered = await prisma.liveQuizAnswer.count({
      where: {
        sessionId: session.id,
        questionIndex: session.currentQuestionIndex,
      },
    });

    // Broadcast answer event to update presenter screen count in real time
    liveEvents.broadcast(session.id, "ANSWER_SUBMITTED", {
      questionIndex: session.currentQuestionIndex,
      answeredCount: totalAnswered,
      participantId: participant.id,
    });

    // Return to participant (WITHOUT revealing correctness or correct option yet!)
    return NextResponse.json({
      success: true,
      hasAnswered: true,
      selectedOption,
      responseTime: Math.round(timeTakenSeconds * 10) / 10,
    });
  } catch (error) {
    console.error("Failed to process live answer:", error);
    return NextResponse.json(
      { error: "Failed to record your answer. Please retry." },
      { status: 500 }
    );
  }
}
