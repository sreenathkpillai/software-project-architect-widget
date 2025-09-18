import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params;
    const externalId = request.nextUrl.searchParams.get('externalId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    if (!externalId) {
      return NextResponse.json({ error: 'externalId required' }, { status: 400 });
    }

    // Query documents directly by userSession and externalId for ownership verification
    const documents = await prisma.specification.findMany({
      where: {
        userSession: sessionId,
        externalId: externalId
      },
      select: {
        id: true,
        filename: true,
        content: true,
        description: true,
        documentType: true,
        nextSteps: true,
        skipTechnicalSummary: true,
        order: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { order: 'asc' }
    });

    console.log(`✅ Found ${documents.length} documents for session: ${sessionId}, externalId: ${externalId}`);
    
    return NextResponse.json({ 
      documents,
      sessionId,
      totalDocuments: documents.length
    });

  } catch (error) {
    console.error('Specifications API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' }, 
      { status: 500 }
    );
  }
}