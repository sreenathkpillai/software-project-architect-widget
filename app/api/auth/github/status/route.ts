import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you'd check stored auth data
    // For now, we'll return a simple response
    // The frontend will handle checking sessionStorage for the auth result

    return NextResponse.json({
      authenticated: false,
      message: 'Check sessionStorage for auth result'
    });

  } catch (error) {
    console.error('GitHub auth status error:', error);
    return NextResponse.json(
      { error: 'Failed to check auth status' },
      { status: 500 }
    );
  }
}