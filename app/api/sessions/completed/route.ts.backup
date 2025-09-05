import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    
    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Get all completed sessions for this external ID
    const completedSessions = await prisma.savedSession.findMany({
      where: {
        externalId,
        isComplete: true
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    // Verify each session has all 13 documents
    const sessionsWithStatus = await Promise.all(
      completedSessions.map(async (session) => {
        const documentCount = await prisma.specification.count({
          where: {
            userSession: session.userSession
          }
        });

        return {
          sessionId: session.userSession,
          sessionName: session.sessionName,
          externalId: session.externalId,
          completedAt: session.completedAt,
          hasAllDocuments: documentCount === 13
        };
      })
    );

    return NextResponse.json({ sessions: sessionsWithStatus });
  } catch (error) {
    console.error('Completed sessions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completed sessions' },
      { status: 500 }
    );
  }
}