import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const externalId = request.nextUrl.searchParams.get('externalId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Find the session and verify ownership
    const session = await prisma.savedSession.findUnique({
      where: { userSession: sessionId }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify ownership
    if (session.externalId !== externalId) {
      return NextResponse.json({ error: 'Unauthorized: Session does not belong to this user' }, { status: 403 });
    }

    // Check if session is already completed - only allow discarding non-completed sessions
    if (session.isComplete) {
      return NextResponse.json({ 
        error: 'Cannot discard completed sessions' 
      }, { status: 400 });
    }

    // Check if session is already discarded
    if (session.isDiscarded) {
      return NextResponse.json({ 
        error: 'Session is already discarded' 
      }, { status: 400 });
    }

    // Soft delete the session by setting isDiscarded flag
    const updatedSession = await prisma.savedSession.update({
      where: { userSession: sessionId },
      data: {
        isDiscarded: true,
        discardedAt: new Date(),
        lastActivity: new Date()
      }
    });

    // Track tool usage for session discard
    const currentMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
    await prisma.toolUsage.create({
      data: {
        externalId,
        usageType: 'session_discarded',
        userSession: sessionId,
        month: currentMonth
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Session discarded successfully',
      sessionId: updatedSession.userSession,
      discardedAt: updatedSession.discardedAt
    });

  } catch (error) {
    console.error('Session discard API error:', error);
    return NextResponse.json(
      { error: 'Failed to discard session' },
      { status: 500 }
    );
  }
}

// POST method for bulk discard operations (for parent app integration)
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { action, sessionIds } = await request.json();
    const externalId = request.nextUrl.searchParams.get('externalId');

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    if (action === 'bulk_discard' && Array.isArray(sessionIds)) {
      // Verify all sessions belong to the user and are not completed
      const sessions = await prisma.savedSession.findMany({
        where: {
          userSession: { in: sessionIds },
          externalId,
          isComplete: false,
          isDiscarded: false
        }
      });

      if (sessions.length !== sessionIds.length) {
        return NextResponse.json({ 
          error: 'Some sessions not found, already discarded, or completed' 
        }, { status: 400 });
      }

      // Bulk update sessions to discarded
      const result = await prisma.savedSession.updateMany({
        where: {
          userSession: { in: sessionIds },
          externalId,
          isComplete: false,
          isDiscarded: false
        },
        data: {
          isDiscarded: true,
          discardedAt: new Date(),
          lastActivity: new Date()
        }
      });

      // Track tool usage for bulk discard
      const currentMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
      const usageRecords = sessionIds.map(sessionId => ({
        externalId,
        usageType: 'session_discarded_bulk',
        userSession: sessionId,
        month: currentMonth
      }));

      await prisma.toolUsage.createMany({
        data: usageRecords
      });

      // Return updated session list
      const remainingSessions = await prisma.savedSession.findMany({
        where: {
          externalId,
          isDiscarded: false
        },
        orderBy: { lastActivity: 'desc' }
      });

      return NextResponse.json({ 
        success: true, 
        message: `${result.count} sessions discarded successfully`,
        discardedCount: result.count,
        remainingSessions
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing sessionIds' }, { status: 400 });

  } catch (error) {
    console.error('Bulk session discard API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk discard' },
      { status: 500 }
    );
  }
}