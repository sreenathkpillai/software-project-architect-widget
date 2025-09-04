import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Document order and display names
const documentOrder = [
  { type: 'prd', title: 'Product Requirements', order: 1 },
  { type: 'frontend', title: 'Frontend Architecture', order: 2 },
  { type: 'backend', title: 'Backend Architecture', order: 3 },
  { type: 'state_management', title: 'State Management', order: 4 },
  { type: 'database_schema', title: 'Database Schema', order: 5 },
  { type: 'api', title: 'API Specifications', order: 6 },
  { type: 'devops', title: 'DevOps & Deployment', order: 7 },
  { type: 'testing_plan', title: 'Testing Strategy', order: 8 },
  { type: 'code_documentation', title: 'Documentation Standards', order: 9 },
  { type: 'performance_optimization', title: 'Performance Optimization', order: 10 },
  { type: 'user_flow', title: 'User Flow Diagrams', order: 11 },
  { type: 'third_party_libraries', title: 'Third-Party Libraries', order: 12 },
  { type: 'readme', title: 'README', order: 13 }
];

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

    // Verify session ownership
    const session = await prisma.savedSession.findFirst({
      where: {
        userSession: sessionId,
        externalId: externalId
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    // Get all documents for the session
    const documents = await prisma.specification.findMany({
      where: {
        userSession: sessionId
      },
      orderBy: {
        order: 'asc'
      }
    });

    // Map documents with proper order and titles
    const formattedDocuments = documents.map(doc => {
      const docMeta = documentOrder.find(d => d.type === doc.documentType);
      return {
        type: doc.documentType,
        title: docMeta?.title || doc.filename,
        content: doc.content,
        order: docMeta?.order || doc.order,
        description: doc.description
      };
    }).sort((a, b) => a.order - b.order);

    return NextResponse.json({
      sessionId,
      sessionName: session.sessionName,
      isComplete: session.isComplete,
      completedAt: session.completedAt,
      documents: formattedDocuments
    });
  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}