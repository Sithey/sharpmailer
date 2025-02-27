import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendDirectEmails } from '@/lib/campaigns';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    
    const { smtpConfig, template, leads } = await request.json();
    
    if (!smtpConfig || !template || !leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request. Required fields: smtpConfig, template, leads" 
        }, 
        { status: 400 }
      );
    }
    
    const result = await sendDirectEmails(smtpConfig, template, leads);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        results: result.results 
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to send emails" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending direct emails:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send emails" },
      { status: 500 }
    );
  }
}