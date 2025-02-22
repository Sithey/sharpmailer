import { NextResponse, NextRequest } from 'next/server';
import sendMail from '@/lib/send-mail';
import { Mail, Template } from '@/interface/mail';

export async function POST(request: NextRequest) {
  try {
    const body: Mail = await request.json();
    const template: Template = body.template;
    
    if (!template.subject || !template.html) {
      return NextResponse.json(
        { success: false, error: 'Subject and text are required' },
        { status: 400, statusText: 'Bad Request' }
      );
    }

    await sendMail(body);
    return NextResponse.json(
      { success: true, message: 'Email sent successfully' },
      { status: 200, statusText: 'OK' }
    );
    
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500, statusText: 'Internal Server Error' }
    );
  }
}