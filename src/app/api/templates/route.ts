import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';

// GET /api/templates - Get all templates
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
    
    const templates = await prisma.template.findMany({
      where: {
        userId,
      },
    });
    
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}