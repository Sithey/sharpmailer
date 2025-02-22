import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { userid: string } }
) {
  try {
    const userid = params.userid;
    const body = await request.json();
    const { template } = body;

    // Vérifier si la template existe déjà
    const existingTemplate = await prisma.template.findFirst({
      where: {
        subject: template.subject,
        userId: userid,
      },
    });

    let savedTemplate;
    if (existingTemplate) {
      // Mettre à jour la template existante
      savedTemplate = await prisma.template.update({
        where: { id: existingTemplate.id },
        data: {
          html: template.html,
        },
      });
    } else {
      // Créer une nouvelle template
      savedTemplate = await prisma.template.create({
        data: {
          subject: template.subject,
          html: template.html,
          userId: userid,
        },
      });
    }

    return NextResponse.json(
      { success: true, template: savedTemplate },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save template' },
      { status: 500 }
    );
  }
}
