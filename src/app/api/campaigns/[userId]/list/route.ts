import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Not authenticated", campaigns: [] },
        { status: 401 }
      );
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: params.userId,
      },
      include: {
        sendLogs: {
          orderBy: {
            sentAt: 'desc'
          }
        },
        leads: true
      }
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch campaigns", 
        campaigns: [] 
      },
      { status: 500 }
    );
  }
}