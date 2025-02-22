import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: { userId: string } } 
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return new NextResponse(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401 }
      );
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: context.params.userId, 
      },
      include: {
        sendLogs: {
          orderBy: {
            sentAt: "desc",
          },
        },
        leads: true,
      },
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return new NextResponse(
      JSON.stringify({ success: false, error: "Failed to fetch campaigns" }),
      { status: 500 }
    );
  }
}
