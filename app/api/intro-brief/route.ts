import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { 
      userSession, 
      externalId, 
      whatTheyreDoing,
      projectType,
      audience,
      problem,
      timeline,
      teamSize,
      isComplete = false
    } = await request.json();

    if (!userSession || !externalId) {
      return NextResponse.json({ error: 'userSession and externalId are required' }, { status: 400 });
    }

    // Save or update intro brief
    const introBrief = await prisma.introBrief.upsert({
      where: { userSession },
      update: {
        whatTheyreDoing: whatTheyreDoing || '',
        projectType: projectType || '',
        audience: audience || '',
        problem: problem || '',
        timeline: timeline || '',
        teamSize: teamSize || '',
        isComplete,
        updatedAt: new Date()
      },
      create: {
        userSession,
        externalId,
        whatTheyreDoing: whatTheyreDoing || '',
        projectType: projectType || '',
        audience: audience || '',
        problem: problem || '',
        timeline: timeline || '',
        teamSize: teamSize || '',
        isComplete
      }
    });

    return NextResponse.json({ success: true, introBrief });
  } catch (error) {
    console.error('Error saving intro brief:', error);
    return NextResponse.json({ error: 'Failed to save intro brief' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userSession = searchParams.get('userSession');
    const externalId = searchParams.get('externalId');

    if (!userSession && !externalId) {
      return NextResponse.json({ error: 'Either userSession or externalId is required' }, { status: 400 });
    }

    const where = userSession ? { userSession } : { externalId };
    const introBrief = await prisma.introBrief.findFirst({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ introBrief });
  } catch (error) {
    console.error('Error fetching intro brief:', error);
    return NextResponse.json({ error: 'Failed to fetch intro brief' }, { status: 500 });
  }
}