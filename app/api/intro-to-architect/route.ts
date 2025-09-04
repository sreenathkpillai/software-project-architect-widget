import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

/**
 * Intro to Architect Handoff API
 * 
 * Handles the transition from intro chat to architect session, including:
 * 1. Creating architect session with intro context
 * 2. Transferring intro brief data
 * 3. Setting up proper session types and tracking
 */
export async function POST(request: NextRequest) {
  try {
    const { introUserSession, externalId, createNewArchitectSession = true } = await request.json();

    if (!introUserSession || !externalId) {
      return NextResponse.json({ 
        error: 'introUserSession and externalId required' 
      }, { status: 400 });
    }

    // Get completed intro brief
    const introBrief = await prisma.introBrief.findUnique({
      where: { userSession: introUserSession }
    });

    if (!introBrief || !introBrief.isComplete) {
      return NextResponse.json({ 
        error: 'Intro brief not found or not completed' 
      }, { status: 404 });
    }

    let architectUserSession;
    
    if (createNewArchitectSession) {
      // Create new architect session
      architectUserSession = uuidv4();
      
      // Create saved session for architect
      await prisma.savedSession.create({
        data: {
          userSession: architectUserSession,
          externalId,
          sessionName: `Architecture: ${introBrief.whatTheyreDoing?.slice(0, 50)}...`,
          sessionType: 'architect',
          lastActivity: new Date()
        }
      });
    } else {
      // Use the same session but change type
      architectUserSession = introUserSession;
      
      // Update existing session to architect type
      await prisma.savedSession.upsert({
        where: { userSession: introUserSession },
        update: {
          sessionType: 'architect',
          sessionName: `Architecture: ${introBrief.whatTheyreDoing?.slice(0, 50)}...`,
          lastActivity: new Date()
        },
        create: {
          userSession: introUserSession,
          externalId,
          sessionName: `Architecture: ${introBrief.whatTheyreDoing?.slice(0, 50)}...`,
          sessionType: 'architect',
          lastActivity: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      architectUserSession,
      introBrief: {
        whatTheyreDoing: introBrief.whatTheyreDoing,
        projectType: introBrief.projectType,
        audience: introBrief.audience,
        problem: introBrief.problem,
        timeline: introBrief.timeline,
        teamSize: introBrief.teamSize,
        projectBrief: introBrief.projectBrief
      },
      initialMessage: `Perfect! I love your vision for ${introBrief.whatTheyreDoing}. Building something for ${introBrief.audience} to solve ${introBrief.problem} is exactly the kind of project that makes a real impact.\n\nNow let's dive deeper into the technical details to create your architecture blueprint. I'll ask you some focused questions to understand exactly what you need.\n\nTo start, what's the most important feature or capability your users absolutely must have on day one?`
    });

  } catch (error) {
    console.error('Intro to architect handoff error:', error);
    return NextResponse.json(
      { error: 'Failed to process handoff request' }, 
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if intro brief is ready for handoff
 */
export async function GET(request: NextRequest) {
  try {
    const userSession = request.nextUrl.searchParams.get('userSession');

    if (!userSession) {
      return NextResponse.json({ error: 'userSession required' }, { status: 400 });
    }

    const introBrief = await prisma.introBrief.findUnique({
      where: { userSession }
    });

    if (!introBrief) {
      return NextResponse.json({
        ready: false,
        reason: 'No intro brief found'
      });
    }

    if (!introBrief.isComplete) {
      return NextResponse.json({
        ready: false,
        reason: 'Intro brief not completed',
        progress: {
          currentQuestion: introBrief.currentQuestion,
          totalQuestions: 6,
          completedPercentage: Math.round((introBrief.currentQuestion / 6) * 100)
        }
      });
    }

    return NextResponse.json({
      ready: true,
      introBrief: {
        whatTheyreDoing: introBrief.whatTheyreDoing,
        projectType: introBrief.projectType,
        audience: introBrief.audience,
        problem: introBrief.problem,
        timeline: introBrief.timeline,
        teamSize: introBrief.teamSize,
        projectBrief: introBrief.projectBrief
      }
    });

  } catch (error) {
    console.error('Check handoff readiness error:', error);
    return NextResponse.json(
      { error: 'Failed to check handoff readiness' },
      { status: 500 }
    );
  }
}