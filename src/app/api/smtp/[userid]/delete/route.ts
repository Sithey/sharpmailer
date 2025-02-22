import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const smtpId = params.id;
    
    const deletedSMTP = await prisma.sMTP.delete({
      where: {
        id: smtpId,
      },
    });

    if (!deletedSMTP) {

      return NextResponse.json(
        { success: false, error: 'SMTP not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting SMTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete SMTP' },
      { status: 500 }
    );
  }
}