import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { userid: string } }
) {
  try {
    const userid = params.userid;
    const templates = await prisma.template.findMany({
      where: {
        userId: userid,
      },
    });

    return NextResponse.json(
      { success: true, templates },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates', templates: [] },
      { status: 500 }
    );
  }
}