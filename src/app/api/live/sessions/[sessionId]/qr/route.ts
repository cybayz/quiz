import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateQrDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await prisma.liveQuizSession.findUnique({
      where: { id: params.sessionId },
      select: { id: true, sessionCode: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const joinUrl = `${appUrl}/live/join/${session.sessionCode}`;

    const qrDataUrl = await generateQrDataUrl(joinUrl);

    return NextResponse.json({
      joinUrl,
      sessionCode: session.sessionCode,
      qrDataUrl,
    });
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code." },
      { status: 500 }
    );
  }
}
