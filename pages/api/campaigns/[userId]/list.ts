import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Data = {
  success: boolean;
  campaigns?: object[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await auth();

    if (!session?.user?.email) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { userId } = req.query;

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: userId as string,
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

    return res.status(200).json({ success: true, campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch campaigns" });
  }
}