import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    
    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Get all incomplete sessions for this external ID
    const incompleteSessions = await prisma.savedSession.findMany({
      where: {
        externalId,
        isComplete: false
      },
      orderBy: {
        lastActivity: 'desc'
      }
    });

    // Get document count for each session
    const sessionsWithCounts = await Promise.all(
      incompleteSessions.map(async (session) => {
        const documentCount = await prisma.specification.count({
          where: {
            userSession: session.userSession
          }
        });

        return {
          sessionId: session.userSession,
          sessionName: session.sessionName,
          externalId: session.externalId,
          lastActivity: session.lastActivity,
          documentsGenerated: documentCount,
          totalDocuments: 13
        };
      })
    );

    return NextResponse.json({ sessions: sessionsWithCounts });
  } catch (error) {
    console.error('Incomplete sessions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incomplete sessions' },
      { status: 500 }
    );
  }
}