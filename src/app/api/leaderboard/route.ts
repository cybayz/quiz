import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        status: "COMPLETED",
      },
      orderBy: [
        { totalScore: "desc" },
        { totalTime: "asc" },
        { completedAt: "asc" },
      ],
      take: 100, // Top 100 on leaderboard
      select: {
        id: true,
        participantName: true,
        totalScore: true,
        maxScore: true,
        percentage: true,
        totalTime: true,
        completedAt: true,
      },
    });

    const rankedLeaderboard = attempts.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      participantName: item.participantName,
      totalScore: item.totalScore,
      maxScore: item.maxScore,
      percentage: item.percentage,
      totalTime: item.totalTime,
      completedAt: item.completedAt,
    }));

    // Also get active quiz settings for title/description
    const settings = await prisma.quizSettings.findUnique({
      where: { id: "default-settings" },
      select: { quizTitle: true, quizDescription: true },
    });

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      quizTitle: settings?.quizTitle || "NextGen Knowledge Challenge",
      totalParticipants: rankedLeaderboard.length,
    });
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to retrieve leaderboard data." },
      { status: 500 }
    );
  }
}
