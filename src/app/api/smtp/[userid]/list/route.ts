import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { userid: string } }
) {
  try {
    const userid = params.userid;
    const smtps = await prisma.sMTP.findMany({
      where: {
        userId: userid,
      },
    });

    return NextResponse.json(
      { success: true, smtps },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching SMTPs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SMTPs', smtps: [] },
      { status: 500 }
    );
  }
}