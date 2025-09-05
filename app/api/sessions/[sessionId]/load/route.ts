import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    const externalId = request.nextUrl.searchParams.get('externalId');

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Get session data including messages
    const sessionData = await prisma.savedSession.findUnique({
      where: { userSession: sessionId },
      include: {
        messages: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // Verify session exists and belongs to the external ID
    if (!sessionData || sessionData.externalId !== externalId) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    // Get completed documents for this session
    const docs = await prisma.specification.findMany({
      where: { userSession: sessionId },
      select: { documentType: true },
      orderBy: { createdAt: 'asc' }
    });

    // Format messages for frontend
    const messages = sessionData.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    return NextResponse.json({
      messages,
      completedDocs: docs.map(d => d.documentType),
      sessionName: sessionData.sessionName,
      sessionType: sessionData.sessionType,
      isComplete: sessionData.isComplete,
      lastActivity: sessionData.lastActivity,
      createdAt: sessionData.createdAt
    });

  } catch (error) {
    console.error('Session load API error:', error);
    return NextResponse.json(
      { error: 'Failed to load session' }, 
      { status: 500 }
    );
  }
}