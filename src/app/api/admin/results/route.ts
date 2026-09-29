import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status") || "ALL"; // ALL, COMPLETED, IN_PROGRESS
    const sortBy = searchParams.get("sortBy") || "date"; // date, score, time

    const where: any = {};
    if (status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.participantName = { contains: search, mode: "insensitive" };
    }

    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "score") {
      orderBy = [{ totalScore: "desc" }, { totalTime: "asc" }];
    } else if (sortBy === "time") {
      orderBy = { totalTime: "asc" };
    }

    const [total, attempts] = await Promise.all([
      prisma.quizAttempt.count({ where }),
      prisma.quizAttempt.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          participantName: true,
          startedAt: true,
          completedAt: true,
          totalScore: true,
          maxScore: true,
          percentage: true,
          totalTime: true,
          correctCount: true,
          wrongCount: true,
          status: true,
          certificateId: true,
          createdAt: true,
          _count: { select: { answers: true } },
        },
      }),
    ]);

    // Calculate rank for completed attempts if not yet attached
    // Fetch all completed attempts to compute ranks accurately
    const completedList = await prisma.quizAttempt.findMany({
      where: { status: "COMPLETED" },
      select: { id: true, totalScore: true, totalTime: true, completedAt: true },
      orderBy: [{ totalScore: "desc" }, { totalTime: "asc" }, { completedAt: "asc" }],
    });

    const rankMap = new Map<string, number>();
    completedList.forEach((item, index) => {
      rankMap.set(item.id, index + 1);
    });

    const attemptsWithRank = attempts.map((a) => ({
      ...a,
      rank: rankMap.get(a.id) || null,
    }));

    return NextResponse.json({
      attempts: attemptsWithRank,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin results:", error);
    return NextResponse.json(
      { error: "Failed to retrieve quiz attempts." },
      { status: 500 }
    );
  }
}
