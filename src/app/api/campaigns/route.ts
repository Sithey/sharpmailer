import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';

// GET /api/campaigns - Get all campaigns for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    
    const userId = request.nextUrl.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }
    
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