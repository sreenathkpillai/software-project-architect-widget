import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userSession, externalId, sessionType = 'architect', introBrief } = await request.json();

    if (!userSession || !externalId) {
      return NextResponse.json({ error: 'userSession and externalId required' }, { status: 400 });
    }

    // Create session if it doesn't exist, update lastActivity if it does
    const session = await prisma.savedSession.upsert({
      where: { userSession },
      update: { 
        lastActivity: new Date() 
      },
      create: {
        userSession,
        externalId,
        sessionName: `Draft ${new Date().toLocaleDateString()}`,
        sessionType,
        isComplete: false,
        lastActivity: new Date()
      }
    });

    console.log(`✅ Session ensured for userSession: ${userSession}, sessionId: ${session.id}`);
    
    return NextResponse.json({ 
      success: true, 
      sessionId: session.id,
      sessionName: session.sessionName
    });

  } catch (error) {
    console.error('Sessions ensure API error:', error);
    return NextResponse.json(
      { error: 'Failed to ensure session exists' }, 
      { status: 500 }
    );
  }
}