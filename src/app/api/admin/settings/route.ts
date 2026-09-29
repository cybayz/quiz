import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { settingsSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings = await prisma.quizSettings.findUnique({
      where: { id: "default-settings" },
    });

    if (!settings) {
      settings = await prisma.quizSettings.create({
        data: {
          id: "default-settings",
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve settings." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updated = await prisma.quizSettings.upsert({
      where: { id: "default-settings" },
      update: {
        quizTitle: data.quizTitle,
        quizDescription: data.quizDescription,
        basePoints: data.basePoints,
        gracePeriodSeconds: data.gracePeriodSeconds,
        pointsPerSecond: data.pointsPerSecond,
        minimumCorrectPoints: data.minimumCorrectPoints,
        negativeMarkingEnabled: data.negativeMarkingEnabled,
        negativePoints: data.negativePoints,
        allowNegativeTotal: data.allowNegativeTotal,
        quizEnabled: data.quizEnabled,
      },
      create: {
        id: "default-settings",
        quizTitle: data.quizTitle,
        quizDescription: data.quizDescription,
        basePoints: data.basePoints,
        gracePeriodSeconds: data.gracePeriodSeconds,
        pointsPerSecond: data.pointsPerSecond,
        minimumCorrectPoints: data.minimumCorrectPoints,
        negativeMarkingEnabled: data.negativeMarkingEnabled,
        negativePoints: data.negativePoints,
        allowNegativeTotal: data.allowNegativeTotal,
        quizEnabled: data.quizEnabled,
      },
    });

    return NextResponse.json({
      success: true,
      settings: updated,
      message: "Settings saved successfully.",
    });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings." },
      { status: 500 }
    );
  }
}
