import { NextRequest, NextResponse } from 'next/server';
import { verifyExternalId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const inviteTeamMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'member', 'viewer']),
  projectIds: z.array(z.string()).optional(),
  permissions: z.record(z.any()).optional(),
});

// POST /api/workflow/team - Invite team member
export async function POST(request: NextRequest) {
  try {
    const externalId = request.headers.get('x-external-id');
    if (!externalId) {
      return NextResponse.json({ error: 'External ID required' }, { status: 401 });
    }

    const isValid = await verifyExternalId(externalId);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid external ID' }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, role, projectIds = [], permissions = {} } = inviteTeamMemberSchema.parse(body);

    // Check if user is already a team member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        externalId_email: {
          externalId,
          email,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
    }

    // Create team member
    const teamMember = await prisma.teamMember.create({
      data: {
        externalId,
        email,
        name,
        role,
        invitedBy: externalId, // The current user is inviting
        invitedAt: new Date(),
        permissions,
      },
    });

    // Grant project access if specified
    if (projectIds.length > 0) {
      const projectAccessData = projectIds.map(projectId => ({
        projectId,
        memberId: teamMember.id,
        role: role === 'admin' ? 'editor' : 'viewer',
        grantedAt: new Date(),
        grantedBy: externalId,
      }));

      await prisma.projectAccess.createMany({
        data: projectAccessData,
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        externalId,
        action: 'invited',
        resource: 'team_member',
        resourceId: teamMember.id,
        details: {
          email,
          name,
          role,
          projectCount: projectIds.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      teamMember: {
        id: teamMember.id,
        email: teamMember.email,
        name: teamMember.name,
        role: teamMember.role,
        status: teamMember.status,
        invitedAt: teamMember.invitedAt,
      },
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/workflow/team - Get team members
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
    const status = searchParams.get('status');
    const role = searchParams.get('role');

    const where: any = { externalId };
    if (status) where.status = status;
    if (role) where.role = role;

    const teamMembers = await prisma.teamMember.findMany({
      where,
      include: {
        projectAccess: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            activities: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      teamMembers: teamMembers.map(member => ({
        id: member.id,
        email: member.email,
        name: member.name,
        role: member.role,
        status: member.status,
        invitedAt: member.invitedAt,
        joinedAt: member.joinedAt,
        projects: member.projectAccess.map(access => ({
          id: access.project.id,
          name: access.project.name,
          role: access.role,
          grantedAt: access.grantedAt,
        })),
        activityCount: member._count.activities,
      })),
    });
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}