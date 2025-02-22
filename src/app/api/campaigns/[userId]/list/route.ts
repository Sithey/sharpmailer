import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Record<string, string> }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { userId } = context.params;

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: {
        sendLogs: {
          orderBy: { sentAt: "desc" },
        },
        leads: true,
      },
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
