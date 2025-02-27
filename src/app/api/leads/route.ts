import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';

// GET /api/leads - Get all leads
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    
    const userId = request.nextUrl.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }
    
    const leads = await prisma.lead.findMany({
      where: { userId },
      include: {
        campaigns: true
      }
    });

    // Parse variables back to objects
    const parsedLeads = leads.map(lead => ({
      ...lead,
      variables: lead.variables ? JSON.parse(lead.variables) : {}
    }));
    
    return NextResponse.json({ success: true, leads: parsedLeads });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}