import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const externalId = request.nextUrl.searchParams.get('externalId');
    const userSession = request.nextUrl.searchParams.get('userSession');

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    if (userSession) {
      // Get specific session data including messages
      const sessionData = await prisma.savedSession.findUnique({
        where: { userSession }
      });

      if (!sessionData || sessionData.externalId !== externalId) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // Get documents for this session
      const docs = await prisma.specification.findMany({
        where: { userSession },
        select: { documentType: true },
        orderBy: { createdAt: 'asc' }
      });

      // For this MVP, we'll reconstruct a simple message history
      const messages = [
        { role: 'assistant', content: 'Welcome back! Continuing your saved project...' }
      ];

      return NextResponse.json({
        messages,
        completedDocs: docs.map(d => d.documentType),
        sessionName: sessionData.sessionName,
        sessionType: sessionData.sessionType
      });
    }

    // Get all saved sessions for external ID (excluding completed ones)
    const sessions = await prisma.savedSession.findMany({
      where: { 
        externalId,
        isComplete: false
      },
      orderBy: { lastActivity: 'desc' }
    });

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Failed to process session request' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userSession, externalId, sessionName, action, sessionType = 'architect' } = await request.json();

    if (!userSession || !externalId) {
      return NextResponse.json({ error: 'userSession and externalId required' }, { status: 400 });
    }

    if (action === 'save') {
      // Save or update session
      await prisma.savedSession.upsert({
        where: { userSession },
        update: { 
          sessionName,
          sessionType,
          lastActivity: new Date()
        },
        create: {
          userSession,
          externalId,
          sessionName,
          sessionType,
          lastActivity: new Date()
        }
      });

      // Track tool usage for session save
      const currentMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
      await prisma.toolUsage.create({
        data: {
          externalId,
          usageType: 'session_saved',
          userSession,
          month: currentMonth
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Sessions POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to save session' }, 
      { status: 500 }
    );
  }
}