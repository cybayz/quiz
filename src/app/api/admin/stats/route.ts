import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalQuestions,
      activeQuestions,
      totalAttempts,
      completedAttempts,
      scoreAggregates,
      recentAttempts,
      allCompleted,
    ] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { isActive: true } }),
      prisma.quizAttempt.count(),
      prisma.quizAttempt.count({ where: { status: "COMPLETED" } }),
      prisma.quizAttempt.aggregate({
        where: { status: "COMPLETED" },
        _avg: {
          totalScore: true,
          totalTime: true,
          percentage: true,
        },
        _max: {
          totalScore: true,
        },
      }),
      prisma.quizAttempt.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          participantName: true,
          totalScore: true,
          maxScore: true,
          percentage: true,
          totalTime: true,
          status: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      prisma.quizAttempt.findMany({
        where: { status: "COMPLETED" },
        select: { totalScore: true, percentage: true },
      }),
    ]);

    // Calculate score distribution bands
    const distribution = {
      "90-100%": 0,
      "75-89%": 0,
      "50-74%": 0,
      "Below 50%": 0,
    };

    allCompleted.forEach((attempt) => {
      const pct = attempt.percentage;
      if (pct >= 90) distribution["90-100%"]++;
      else if (pct >= 75) distribution["75-89%"]++;
      else if (pct >= 50) distribution["50-74%"]++;
      else distribution["Below 50%"]++;
    });

    return NextResponse.json({
      totalQuestions,
      activeQuestions,
      inactiveQuestions: totalQuestions - activeQuestions,
      totalAttempts,
      completedAttempts,
      inProgressAttempts: totalAttempts - completedAttempts,
      averageScore: Math.round(scoreAggregates._avg.totalScore || 0),
      highestScore: scoreAggregates._max.totalScore || 0,
      averageTime: Math.round(scoreAggregates._avg.totalTime || 0),
      averagePercentage: Math.round((scoreAggregates._avg.percentage || 0) * 10) / 10,
      recentAttempts,
      distribution,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to calculate dashboard statistics." },
      { status: 500 }
    );
  }
}
