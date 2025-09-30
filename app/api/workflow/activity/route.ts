import { NextRequest, NextResponse } from 'next/server';
import { verifyExternalId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/workflow/activity - Get activity log
export async function GET(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');
    if (!externalId) {
      return NextResponse.json({ error: 'External ID required' }, { status: 401 });
    }

    const isValid = await verifyExternalId(externalId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid external ID' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const resourceId = searchParams.get('resourceId');
    const action = searchParams.get('action');
    const memberId = searchParams.get('memberId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;

    // Build where clause
    const where: any = { externalId };

    if (resource) where.resource = resource;
    if (resourceId) where.resourceId = resourceId;
    if (action) where.action = action;
    if (memberId) where.memberId = memberId;
    if (since) where.timestamp = { gte: since };

    // Get activities with pagination
    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Group activities by date for better presentation
    const groupedActivities = activities.reduce((groups: any, activity) => {
      const date = activity.timestamp.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push({
        id: activity.id,
        action: activity.action,
        resource: activity.resource,
        resourceId: activity.resourceId,
        details: activity.details,
        metadata: activity.metadata,
        timestamp: activity.timestamp,
        member: activity.member,
      });
      return groups;
    }, {});

    return NextResponse.json({
      activities: groupedActivities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}