import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { questionFormSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const question = await prisma.question.findUnique({
      where: { id: params.questionId },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Failed to get question:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
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
    const updated = await prisma.question.update({
      where: { id: params.questionId },
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

    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    console.error("Failed to update question:", error);
    return NextResponse.json(
      { error: "Failed to update question." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    const question = await prisma.question.findUnique({
      where: { id: params.questionId },
      include: { _count: { select: { answers: true } } },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    // If permanent deletion requested but question has historical answers, forbid it
    if (permanent) {
      if (question._count.answers > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot permanently delete question because it is referenced in past participant results. Please deactivate it instead.",
          },
          { status: 400 }
        );
      }

      await prisma.question.delete({
        where: { id: params.questionId },
      });

      return NextResponse.json({
        success: true,
        message: "Question permanently removed.",
      });
    }

    // Soft delete (deactivate)
    const deactivated = await prisma.question.update({
      where: { id: params.questionId },
      data: { isActive: !question.isActive }, // Toggles active/inactive
    });

    return NextResponse.json({
      success: true,
      question: deactivated,
      message: deactivated.isActive
        ? "Question activated successfully."
        : "Question deactivated successfully.",
    });
  } catch (error) {
    console.error("Failed to delete/toggle question:", error);
    return NextResponse.json(
      { error: "Failed to update question status." },
      { status: 500 }
    );
  }
}
