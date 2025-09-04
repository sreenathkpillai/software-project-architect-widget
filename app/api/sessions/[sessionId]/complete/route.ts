import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    const { externalId, completionMessage } = await request.json();
    
    if (!externalId || !completionMessage) {
      return NextResponse.json({ 
        error: 'externalId and completionMessage required' 
      }, { status: 400 });
    }

    // Verify session ownership and update completion status
    const updatedSession = await prisma.savedSession.updateMany({
      where: {
        userSession: sessionId,
        externalId: externalId
      },
      data: {
        isComplete: true,
        completedAt: new Date(),
        completionMessage: completionMessage
      }
    });

    if (updatedSession.count === 0) {
      return NextResponse.json({ 
        error: 'Session not found or access denied' 
      }, { status: 404 });
    }

    // Track completion for analytics
    const currentMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
    await prisma.toolUsage.create({
      data: {
        externalId,
        usageType: 'session_complete',
        userSession: sessionId,
        month: currentMonth
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Session marked as complete'
    });
  } catch (error) {
    console.error('Session completion API error:', error);
    return NextResponse.json(
      { error: 'Failed to mark session as complete' },
      { status: 500 }
    );
  }
}