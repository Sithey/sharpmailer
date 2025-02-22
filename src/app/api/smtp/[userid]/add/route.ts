import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { userid: string } }
) {
  try {
    const userid = params.userid;
    const body = await request.json();
    const { smtp } = body;

    // Vérifier si le SMTP existe déjà
    const existingSMTP = await prisma.sMTP.findFirst({
      where: {
        host: smtp.host,
        username: smtp.username,
        userId: userid,
      },
    });

    let savedSMTP;
    if (existingSMTP) {
      // Mettre à jour le SMTP existant
      savedSMTP = await prisma.sMTP.update({
        where: { id: existingSMTP.id },
        data: {
          port: smtp.port,
          password: smtp.password,
          secure: smtp.secure,
          from: smtp.from,
        },
      });
    } else {
      // Créer un nouveau SMTP
      savedSMTP = await prisma.sMTP.create({
        data: {
          host: smtp.host,
          port: smtp.port,
          username: smtp.username,
          password: smtp.password,
          secure: smtp.secure,
          from: smtp.from,
          userId: userid,
        },
      });
    }

    return NextResponse.json(
      { success: true, smtp: savedSMTP },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving SMTP:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save SMTP' },
      { status: 500 }
    );
  }
}