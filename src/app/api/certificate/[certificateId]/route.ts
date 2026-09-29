import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { certificateId: string } }
) {
  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { certificateId: params.certificateId },
    });

    if (!attempt || attempt.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Valid certificate not found." },
        { status: 404 }
      );
    }

    const settings = await prisma.quizSettings.findUnique({
      where: { id: "default-settings" },
      select: { quizTitle: true },
    });

    // Compute rank
    const betterCount = await prisma.quizAttempt.count({
      where: {
        status: "COMPLETED",
        OR: [
          { totalScore: { gt: attempt.totalScore } },
          {
            totalScore: attempt.totalScore,
            totalTime: { lt: attempt.totalTime },
          },
        ],
      },
    });
    const rank = betterCount + 1;

    return NextResponse.json({
      certificateId: attempt.certificateId,
      participantName: attempt.participantName,
      quizTitle: settings?.quizTitle || "NextGen Knowledge Challenge",
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      totalTime: attempt.totalTime,
      completedAt: attempt.completedAt,
      rank,
    });
  } catch (error) {
    console.error("Failed to load certificate data:", error);
    return NextResponse.json(
      { error: "Failed to load certificate." },
      { status: 500 }
    );
  }
}
