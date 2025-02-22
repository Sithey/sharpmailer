import { NextResponse } from "next/server";
import type { NextApiRequest } from 'next'

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextApiRequest): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    let userId = request.query.userId as string;
    if (Array.isArray(userId)) {
      userId = userId[0];
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
