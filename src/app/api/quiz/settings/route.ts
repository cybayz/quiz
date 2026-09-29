import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings = await prisma.quizSettings.findUnique({
      where: { id: "default-settings" },
      select: {
        quizTitle: true,
        quizDescription: true,
        basePoints: true,
        gracePeriodSeconds: true,
        pointsPerSecond: true,
        minimumCorrectPoints: true,
        negativeMarkingEnabled: true,
        negativePoints: true,
        allowNegativeTotal: true,
        quizEnabled: true,
      },
    });

    if (!settings) {
      settings = await prisma.quizSettings.create({
        data: { id: "default-settings" },
        select: {
          quizTitle: true,
          quizDescription: true,
          basePoints: true,
          gracePeriodSeconds: true,
          pointsPerSecond: true,
          minimumCorrectPoints: true,
          negativeMarkingEnabled: true,
          negativePoints: true,
          allowNegativeTotal: true,
          quizEnabled: true,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch public quiz settings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve quiz settings." },
      { status: 500 }
    );
  }
}
