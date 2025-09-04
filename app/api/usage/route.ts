import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Get current month in YYYYMM format
    const currentMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));

    // Get tool usage for this external ID this month
    const usage = await prisma.toolUsage.findMany({
      where: { 
        externalId,
        month: currentMonth
      },
      orderBy: { createdAt: 'desc' }
    });

    const sessionsSaved = usage.filter(u => u.usageType === 'session_saved').length;
    const sessionsCompleted = usage.filter(u => u.usageType === 'session_complete').length;
    const totalUsage = sessionsSaved + sessionsCompleted;

    return NextResponse.json({
      externalId,
      month: currentMonth,
      totalUsage,
      sessionsSaved,
      sessionsCompleted,
      usage
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' }, 
      { status: 500 }
    );
  }
}