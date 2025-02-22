import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userid: string } }
) {
  try {
    const userid = params.userid;
    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const deletedTemplate = await prisma.template.deleteMany({
      where: {
        id: templateId,
        userId: userid,
      },
    });

    if (deletedTemplate.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found or not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Template deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
