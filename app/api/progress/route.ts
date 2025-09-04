import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userSession = request.nextUrl.searchParams.get('userSession');

    if (!userSession) {
      return NextResponse.json({ error: 'userSession required' }, { status: 400 });
    }

    // Get completed documents for this session
    const completedDocs = await prisma.specification.findMany({
      where: { userSession },
      select: { documentType: true },
      orderBy: { createdAt: 'asc' }
    });

    const completedDocTypes = completedDocs.map(doc => doc.documentType);

    return NextResponse.json({ 
      completedDocs: completedDocTypes,
      totalCompleted: completedDocTypes.length,
      totalRequired: 13
    });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' }, 
      { status: 500 }
    );
  }
}