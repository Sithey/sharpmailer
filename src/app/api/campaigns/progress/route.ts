import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';

// GET /api/campaigns/progress - Get progress for a specific campaign
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    
    const campaignId = request.nextUrl.searchParams.get("campaignId");
    
    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 });
    }
    
    const [campaign, sendLogs] = await Promise.all([
      prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { description: true },
      }),
      prisma.campaignSendLog.groupBy({
        by: ["success"],
        where: { campaignId },
        _count: true,
      }),
    ]);

    const successCount = sendLogs.find(log => log.success)?._count ?? 0;
    const failureCount = sendLogs.find(log => !log.success)?._count ?? 0;

    let current = 0;
    let total = 0;

    if (campaign?.description?.startsWith("Sending:")) {
      const [, progress] = campaign.description.split(": ");
      const [currentStr, totalStr] = progress.split("/").map(s => s.trim());
      current = parseInt(currentStr);
      total = parseInt(totalStr);
    }
    
    return NextResponse.json({ 
      success: true, 
      stats: {
        current,
        total,
        success: successCount,
        failure: failureCount,
      }
    });
  } catch (error) {
    console.error("Error getting campaign progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get campaign progress" },
      { status: 500 }
    );
  }
}