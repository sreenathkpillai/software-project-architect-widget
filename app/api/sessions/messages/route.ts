import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userSession, messages, externalId } = await request.json();

    if (!userSession || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'userSession and messages array required' }, { status: 400 });
    }

    // Check if session exists, create if it doesn't
    let session = await prisma.savedSession.findUnique({
      where: { userSession }
    });

    if (!session) {
      if (!externalId) {
        return NextResponse.json({ error: 'externalId required for new session' }, { status: 400 });
      }

      // Create session with auto-generated name
      session = await prisma.savedSession.create({
        data: {
          userSession,
          externalId,
          sessionName: `Draft ${new Date().toLocaleDateString()}`,
          sessionType: 'architect',
          isComplete: false,
          lastActivity: new Date()
        }
      });
      
      console.log(`✅ Created new session: ${userSession}`);
    }

    // Get current max order for this session
    const maxOrder = await prisma.chatMessage.findFirst({
      where: { sessionId: userSession },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const startOrder = (maxOrder?.order ?? -1) + 1;

    // Add new messages with proper ordering
    const messageData = messages.map((msg: any, idx: number) => ({
      sessionId: userSession,
      role: msg.role,
      content: msg.content,
      order: startOrder + idx,
      timestamp: new Date()
    }));

    await prisma.chatMessage.createMany({
      data: messageData
    });

    // Update session last activity
    await prisma.savedSession.update({
      where: { userSession },
      data: { lastActivity: new Date() }
    });

    console.log(`✅ Saved ${messages.length} messages for session: ${userSession}`);
    
    return NextResponse.json({ 
      success: true, 
      messagesSaved: messages.length,
      startOrder,
      endOrder: startOrder + messages.length - 1
    });

  } catch (error) {
    console.error('Sessions messages API error:', error);
    return NextResponse.json(
      { error: 'Failed to save messages' }, 
      { status: 500 }
    );
  }
}