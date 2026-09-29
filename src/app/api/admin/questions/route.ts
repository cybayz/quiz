import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { questionFormSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const filter = searchParams.get("filter") || "ALL"; // ALL, ACTIVE, INACTIVE

    const whereClause: any = {};

    if (filter === "ACTIVE") {
      whereClause.isActive = true;
    } else if (filter === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (search) {
      whereClause.OR = [
        { questionText: { contains: search, mode: "insensitive" } },
        { optionA: { contains: search, mode: "insensitive" } },
        { optionB: { contains: search, mode: "insensitive" } },
        { optionC: { contains: search, mode: "insensitive" } },
        { optionD: { contains: search, mode: "insensitive" } },
        { explanation: { contains: search, mode: "insensitive" } },
      ];
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Failed to fetch questions:", error);
    return NextResponse.json(
      { error: "Failed to retrieve questions." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = questionFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    const data = validation.data;
    const newQuestion = await prisma.question.create({
      data: {
        questionText: data.questionText,
        optionA: data.optionA,
        optionB: data.optionB,
        optionC: data.optionC,
        optionD: data.optionD,
        correctOption: data.correctOption,
        explanation: data.explanation || null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json({ success: true, question: newQuestion }, { status: 201 });
  } catch (error) {
    console.error("Failed to create question:", error);
    return NextResponse.json(
      { error: "Failed to create question." },
      { status: 500 }
    );
  }
}
