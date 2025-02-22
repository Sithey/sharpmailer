import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.email) {
    return new NextResponse(
      JSON.stringify({ success: false, error: "Not authenticated" }),
      { status: 401 }
    );
  }

  // Récupération synchrone des headers via next/headers
  const headersList = headers();
  const accept = (await headersList).get("accept");

  if (accept === "text/event-stream") {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendUpdate = async (data: {
      type: string;
      current: number;
      total: number;
      success: number;
      failure: number;
    }) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    const { campaignId } = await params;

    const interval = setInterval(async () => {
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

      if (campaign?.description?.startsWith("Sending:")) {
        const [, progress] = campaign.description.split(": ");
        // Correction de la décomposition de la chaîne pour obtenir current et total
        const [currentStr, totalStr] = progress.split("/").map(s => s.trim());
        const current = parseInt(currentStr);
        const total = parseInt(totalStr);

        const successCount = sendLogs.find(log => log.success)?._count ?? 0;
        const failureCount = sendLogs.find(log => !log.success)?._count ?? 0;

        await sendUpdate({
          type: "progress",
          current,
          total,
          success: successCount,
          failure: failureCount,
        });
      }
    }, 500);

    request.signal.addEventListener("abort", () => {
      clearInterval(interval);
      writer.close();
    });

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  // Pour les requêtes normales
  const { campaignId } = await params;
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

  return NextResponse.json({
    success: true,
    campaign,
    stats: {
      success: sendLogs.find(log => log.success)?._count ?? 0,
      failure: sendLogs.find(log => !log.success)?._count ?? 0,
    },
  });
}
