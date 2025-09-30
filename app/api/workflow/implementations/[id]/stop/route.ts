import { NextRequest, NextResponse } from 'next/server';
import { verifyExternalId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const externalId = request.headers.get('x-external-id');
    if (!externalId) {
      return NextResponse.json({ error: 'External ID required' }, { status: 401 });
    }

    const isValid = await verifyExternalId(externalId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid external ID' }, { status: 401 });
    }

    const implementation = await prisma.implementation.findUnique({
      where: { id: params.id }
    });

    if (!implementation) {
      return NextResponse.json({ error: 'Implementation not found' }, { status: 404 });
    }

    if (implementation.externalId !== externalId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update implementation status to cancelled
    const updatedImplementation = await prisma.implementation.update({
      where: { id: params.id },
      data: {
        status: 'cancelled',
        completedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, implementation: updatedImplementation });
  } catch (error) {
    console.error('Stop implementation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}